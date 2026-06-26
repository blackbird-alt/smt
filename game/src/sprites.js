// ============================================================================
// Procedural pixel-art generator. No external image assets — every sprite is
// drawn into an offscreen canvas at boot. Also hosts shared UI draw helpers.
//
// Public API used across the game:
//   await sprites.build()
//   sprites.TILE                                  -> 16
//   sprites.tile(name)                            -> HTMLCanvas (16x16)
//   sprites.makeActor({skin,hair,shirt,pants})    -> actor sheet (cached)
//   sprites.drawActor(ctx, actor, x, y, dir, col, scale)
//   sprites.walkCol(phase)                         -> frame column for walk
//   sprites.enemy(name)                            -> HTMLCanvas battler
//   sprites.portrait(name)                         -> HTMLCanvas (32x32)
//   sprites.icon(name)                             -> HTMLCanvas
//   sprites.text(ctx, str, x, y, color, opts)
//   sprites.textWidth(str, scale)
//   sprites.panel(ctx, x, y, w, h, opts)
//   sprites.bar(ctx, x, y, w, h, frac, col, bg)
// ============================================================================

const TILE = 16;

function nc(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return c;
}

// Tiny seeded RNG for deterministic texture.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shade a hex color by amount (-1..1).
function shade(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  const f = amt < 0 ? 0 : 255;
  const t = Math.abs(amt);
  r = Math.round(r + (f - r) * t);
  g = Math.round(g + (f - g) * t);
  b = Math.round(b + (f - b) * t);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// 32x32 character face used for dialogue portraits. Parameterized by skin/hair
// colors + feature opts (cloth, beard, bald, hood, eye, bg) so a portrait can be
// generated to MATCH a given NPC's overworld colors.
function faceDraw(skin, hair, opts = {}) {
  return (g) => {
    g.fillStyle = opts.bg || "#1a2138";
    g.fillRect(0, 0, 32, 32);
    g.fillStyle = opts.cloth || "#3d7dca";
    g.fillRect(6, 27, 20, 5);
    g.fillStyle = skin;
    g.fillRect(9, 8, 14, 16);
    g.fillStyle = hair;
    g.fillRect(7, 4, 18, 7);
    g.fillRect(7, 4, 3, 12);
    g.fillRect(22, 4, 3, 12);
    if (opts.bald) {
      g.fillStyle = skin;
      g.fillRect(10, 5, 12, 5);
    }
    g.fillStyle = opts.eye || "#1a1a1a";
    g.fillRect(12, 15, 2, 2);
    g.fillRect(19, 15, 2, 2);
    g.fillStyle = shade(skin, -0.3);
    g.fillRect(13, 20, 6, 1);
    if (opts.beard) {
      g.fillStyle = hair;
      g.fillRect(9, 21, 14, 4);
      g.fillRect(11, 24, 10, 2);
    }
    if (opts.hood) {
      g.fillStyle = opts.hood;
      g.fillRect(5, 2, 22, 9);
      g.fillRect(5, 2, 4, 22);
      g.fillRect(23, 2, 4, 22);
    }
  };
}

// Non-color feature opts per portrait name, so `portraitFor` can rebuild any
// character's face with their own skin/hair/shirt colors. Names not listed here
// (e.g. narrator, ghost) have no color-matched variant.
const FACE_TYPES = {
  hero: {},
  elder: { beard: true, bald: true },
  shopkeeper: {},
  guard: {},
  villager_f: {},
  villager_m: {},
  child: {},
  warden: { hood: "#1d1638", eye: "#7ee0ff", bg: "#0d0a1a" },
  king: { beard: true },
};

class Sprites {
  constructor() {
    this.TILE = TILE;
    this.tiles = {};
    this.enemies = {};
    this.portraits = {};
    this.icons = {};
    this._actorCache = {};
    // bitmap font metrics
    this.GW = 5;
    this.GH = 7;
    this.charW = 6; // advance (glyph + 1px spacing)
    this.lineH = 8;
    this._glyphs = null; // char -> [[x,y],...] set pixels
    this._glyphCache = {}; // (color+char) -> canvas|null
  }

  async build() {
    this._buildFont();
    this._buildTiles();
    this._buildEnemies();
    this._buildPortraits();
    this._buildIcons();
  }

  // ---------------------------------------------------------------- TEXT ----
  // Crisp pixel text rendered from a 5x7 bitmap font (no antialiasing blur).
  _buildFont() {
    this._glyphs = {};
    for (const ch in FONT) {
      const rows = FONT[ch].split("/");
      const pts = [];
      for (let y = 0; y < rows.length; y++) {
        const r = rows[y];
        for (let x = 0; x < r.length; x++) {
          if (r[x] === "#") pts.push([x, y]);
        }
      }
      this._glyphs[ch] = pts;
    }
  }

  _glyphCanvas(ch, color) {
    const key = color + ch;
    if (key in this._glyphCache) return this._glyphCache[key];
    const pts = this._glyphs[ch];
    if (!pts || !pts.length) {
      this._glyphCache[key] = null;
      return null;
    }
    const c = nc(this.GW, this.GH);
    const g = c.getContext("2d");
    g.fillStyle = color;
    for (const [x, y] of pts) g.fillRect(x, y, 1, 1);
    this._glyphCache[key] = c;
    return c;
  }

  text(ctx, str, x, y, color = "#fff", opts = {}) {
    str = String(str);
    const scale = opts.scale || 1;
    const adv = this.charW * scale;
    const gw = Math.max(1, Math.round(this.GW * scale));
    const gh = Math.max(1, Math.round(this.GH * scale));
    const baseX = Math.round(x);
    const baseY = Math.round(y);
    const draw = (colr, ox, oy) => {
      let cx = baseX + ox;
      for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch !== " ") {
          const gc = this._glyphCanvas(ch, colr);
          if (gc) ctx.drawImage(gc, Math.round(cx), baseY + oy, gw, gh);
        }
        cx += adv;
      }
    };
    if (opts.shadow !== false) {
      const s = Math.max(1, Math.round(scale));
      draw(opts.shadowColor || "rgba(0,0,0,0.65)", s, s);
    }
    draw(color, 0, 0);
  }

  textWidth(str, scale = 1) {
    return String(str).length * this.charW * scale;
  }

  // Word-wrap a string to a pixel width. Returns array of lines.
  wrap(str, maxW, scale = 1) {
    const words = str.split(/\s+/);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (this.textWidth(test, scale) > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // --------------------------------------------------------------- PANEL ----
  panel(ctx, x, y, w, h, opts = {}) {
    const fill = opts.fill || "#10162b";
    const border = opts.border || "#cdd6f4";
    const inner = opts.inner || "#2a3556";
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    // inner highlight
    ctx.fillStyle = inner;
    ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillRect(x + 1, y + 1, 1, h - 2);
  }

  bar(ctx, x, y, w, h, frac, col = "#5be37e", bg = "#26122a") {
    frac = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = "#000";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, Math.round(w * frac), h);
    ctx.fillStyle = shade(col, 0.35);
    ctx.fillRect(x, y, Math.round(w * frac), 1);
  }

  // --------------------------------------------------------------- TILES ----
  _buildTiles() {
    const T = (name, fn) => {
      const c = nc(TILE, TILE);
      fn(c.getContext("2d"), mulberry32(hashStr(name)));
      this.tiles[name] = c;
    };
    const fillBase = (g, col) => {
      g.fillStyle = col;
      g.fillRect(0, 0, TILE, TILE);
    };
    const speckle = (g, rng, col, n) => {
      g.fillStyle = col;
      for (let i = 0; i < n; i++) {
        g.fillRect((rng() * TILE) | 0, (rng() * TILE) | 0, 1, 1);
      }
    };

    T("grass", (g, r) => {
      fillBase(g, "#3f8a3a");
      speckle(g, r, "#4fa346", 26);
      speckle(g, r, "#357a31", 18);
    });
    T("grass2", (g, r) => {
      fillBase(g, "#3a8035");
      speckle(g, r, "#4fa346", 14);
      g.fillStyle = "#2f6e2c";
      for (let i = 0; i < 4; i++) {
        const x = (r() * 14) | 0;
        const y = (r() * 14) | 0;
        g.fillRect(x, y, 1, 2);
      }
    });
    T("flower", (g, r) => {
      this._stamp(g, this.tiles.grass);
      const cols = ["#f2d24b", "#e86a8c", "#d8e0ff"];
      for (let i = 0; i < 3; i++) {
        const x = 2 + ((r() * 11) | 0);
        const y = 2 + ((r() * 11) | 0);
        g.fillStyle = cols[(r() * cols.length) | 0];
        g.fillRect(x, y, 2, 2);
      }
    });
    T("path", (g, r) => {
      fillBase(g, "#b79b6e");
      speckle(g, r, "#c9ad7e", 24);
      speckle(g, r, "#9c805a", 18);
    });
    T("dirt", (g, r) => {
      fillBase(g, "#7d5a3a");
      speckle(g, r, "#8c6644", 22);
      speckle(g, r, "#6a4a2e", 16);
    });
    T("sand", (g, r) => {
      fillBase(g, "#d8c48a");
      speckle(g, r, "#e6d29a", 20);
      speckle(g, r, "#c4ad74", 14);
    });
    T("water", (g, r) => {
      fillBase(g, "#2f6bd0");
      g.fillStyle = "#3f81e6";
      for (let i = 0; i < 5; i++) {
        const y = 2 + ((r() * 12) | 0);
        g.fillRect(1 + ((r() * 6) | 0), y, 4, 1);
      }
      g.fillStyle = "#245bb8";
      for (let i = 0; i < 4; i++) g.fillRect((r() * 14) | 0, (r() * 14) | 0, 2, 1);
    });
    T("water2", (g, r) => {
      this._stamp(g, this.tiles.water);
      g.fillStyle = "#bcd6ff";
      g.fillRect(3, 6, 3, 1);
      g.fillRect(9, 10, 3, 1);
    });
    T("tree", (g, r) => {
      this._stamp(g, this.tiles.grass);
      // trunk
      g.fillStyle = "#5a3a22";
      g.fillRect(7, 11, 2, 4);
      // canopy
      g.fillStyle = "#27632a";
      g.fillRect(2, 1, 12, 11);
      g.fillStyle = "#2f7a34";
      g.fillRect(3, 2, 10, 8);
      speckle(g, r, "#3f9440", 18);
      g.fillStyle = "#1d4a20";
      speckle(g, r, "#1d4a20", 10);
    });
    T("bush", (g, r) => {
      this._stamp(g, this.tiles.grass);
      g.fillStyle = "#2c6e2f";
      g.fillRect(2, 6, 12, 8);
      g.fillStyle = "#3a8c3d";
      g.fillRect(3, 7, 10, 5);
      speckle(g, r, "#46a049", 10);
      g.fillStyle = "#e86a8c";
      g.fillRect(5, 9, 1, 1);
      g.fillRect(9, 8, 1, 1);
    });
    T("rock", (g, r) => {
      this._stamp(g, this.tiles.grass);
      g.fillStyle = "#7d8390";
      g.fillRect(3, 6, 10, 8);
      g.fillStyle = "#9aa1ad";
      g.fillRect(4, 6, 7, 4);
      g.fillStyle = "#5d636e";
      g.fillRect(3, 12, 10, 2);
    });
    T("wall_stone", (g, r) => {
      // Chiseled masonry: staggered blocks with mortar, bevel light/shadow.
      fillBase(g, "#525868");
      // mortar courses
      g.fillStyle = "#363b49";
      g.fillRect(0, 5, TILE, 1);
      g.fillRect(0, 11, TILE, 1);
      // staggered vertical joints
      g.fillRect(5, 0, 1, 5);
      g.fillRect(11, 6, 1, 5);
      g.fillRect(2, 12, 1, 4);
      g.fillRect(9, 12, 1, 4);
      // top-of-block highlights
      g.fillStyle = "#666d80";
      g.fillRect(0, 0, 5, 1);
      g.fillRect(6, 0, TILE - 6, 1);
      g.fillRect(0, 6, 11, 1);
      g.fillRect(12, 6, TILE - 12, 1);
      g.fillRect(0, 12, 9, 1);
      g.fillRect(10, 12, TILE - 10, 1);
      // bottom-of-block shadow
      g.fillStyle = "#3d4252";
      g.fillRect(0, 4, 5, 1);
      g.fillRect(6, 4, TILE - 6, 1);
      g.fillRect(0, 10, 11, 1);
      g.fillRect(0, 15, TILE, 1);
      // stone grain
      speckle(g, r, "#5c6376", 10);
      speckle(g, r, "#454b5b", 8);
    });
    T("floor_stone", (g, r) => {
      // Four beveled flagstones with grout and faint grit.
      fillBase(g, "#363b4d");
      const flag = (x, y, w, h) => {
        g.fillStyle = "#424860";
        g.fillRect(x, y, w, h);
        g.fillStyle = "#4d5572"; // lit top/left bevel
        g.fillRect(x, y, w, 1);
        g.fillRect(x, y, 1, h);
        g.fillStyle = "#2c3142"; // shaded bottom/right bevel
        g.fillRect(x, y + h - 1, w, 1);
        g.fillRect(x + w - 1, y, 1, h);
      };
      flag(0, 0, 7, 7);
      flag(8, 0, 7, 7);
      flag(0, 8, 7, 7);
      flag(8, 8, 7, 7);
      speckle(g, r, "#2b2f3f", 10);
      speckle(g, r, "#525a74", 6);
    });
    T("floor_wood", (g, r) => {
      fillBase(g, "#7a5230");
      g.fillStyle = "#8a5e38";
      for (let y = 0; y < TILE; y += 4) g.fillRect(0, y, TILE, 3);
      g.fillStyle = "#5e3d22";
      for (let y = 3; y < TILE; y += 4) g.fillRect(0, y, TILE, 1);
    });
    T("rug", (g, r) => {
      fillBase(g, "#8a2f3a");
      g.fillStyle = "#b23c4a";
      g.fillRect(2, 2, 12, 12);
      g.fillStyle = "#e0c060";
      g.fillRect(4, 4, 8, 8);
      g.fillStyle = "#8a2f3a";
      g.fillRect(6, 6, 4, 4);
    });
    T("roof", (g, r) => {
      fillBase(g, "#b5483f");
      g.fillStyle = "#c85a4f";
      for (let y = 0; y < TILE; y += 5) g.fillRect(0, y, TILE, 3);
      g.fillStyle = "#963a33";
      for (let y = 4; y < TILE; y += 5) g.fillRect(0, y, TILE, 1);
    });
    T("roof_dark", (g, r) => {
      fillBase(g, "#4a3358");
      g.fillStyle = "#5d4170";
      for (let y = 0; y < TILE; y += 5) g.fillRect(0, y, TILE, 3);
    });
    T("wall_brick", (g, r) => {
      fillBase(g, "#9a6a4a");
      g.fillStyle = "#7d533a";
      g.fillRect(0, 5, TILE, 1);
      g.fillRect(0, 11, TILE, 1);
      g.fillRect(5, 0, 1, 5);
      g.fillRect(10, 6, 1, 5);
    });
    T("door", (g, r) => {
      this._stamp(g, this.tiles.wall_brick);
      // stone frame recess
      g.fillStyle = "#3a2416";
      g.fillRect(3, 1, 10, 15);
      // planked wooden door
      g.fillStyle = "#6a4524";
      g.fillRect(4, 2, 8, 13);
      g.fillStyle = "#7a4f28"; // lit planks
      g.fillRect(4, 2, 3, 13);
      g.fillStyle = "#4a2f18"; // plank seams
      g.fillRect(7, 2, 1, 13);
      g.fillRect(10, 2, 1, 13);
      g.fillStyle = "#3a2414"; // shadow under the lintel
      g.fillRect(4, 2, 8, 1);
      g.fillStyle = "#3a3340"; // iron hinges
      g.fillRect(4, 4, 2, 1);
      g.fillRect(4, 12, 2, 1);
      g.fillStyle = "#e0c060"; // brass knob
      g.fillRect(10, 8, 1, 2);
    });
    T("door_dungeon", (g, r) => {
      this._stamp(g, this.tiles.wall_stone);
      // arched stone frame
      g.fillStyle = "#2a2336";
      g.fillRect(2, 1, 12, 15);
      // dark recessed door
      g.fillStyle = "#14111c";
      g.fillRect(3, 3, 10, 13);
      g.fillStyle = "#221d2e";
      g.fillRect(4, 4, 8, 11);
      // central plank seam
      g.fillStyle = "#15121c";
      g.fillRect(8, 4, 1, 11);
      // iron bands + studs
      g.fillStyle = "#3a4150";
      g.fillRect(3, 6, 10, 1);
      g.fillRect(3, 11, 10, 1);
      g.fillStyle = "#566077";
      g.fillRect(4, 6, 1, 1);
      g.fillRect(11, 6, 1, 1);
      g.fillRect(4, 11, 1, 1);
      g.fillRect(11, 11, 1, 1);
      // ring handle
      g.fillStyle = "#6b7080";
      g.fillRect(9, 9, 2, 1);
    });

    // ---- Underground / cave tiles ------------------------------------------
    T("cave_wall", (g, r) => {
      // Rough, dark natural rock wall.
      fillBase(g, "#33303f");
      g.fillStyle = "#2a2735";
      for (let i = 0; i < 7; i++) {
        const x = (r() * 13) | 0;
        const y = (r() * 13) | 0;
        g.fillRect(x, y, 2 + ((r() * 2) | 0), 2 + ((r() * 2) | 0));
      }
      g.fillStyle = "#454152"; // catch-light along the top
      g.fillRect(0, 0, TILE, 1);
      speckle(g, r, "#4a4658", 14);
      speckle(g, r, "#26232f", 12);
      // a meandering crack
      g.fillStyle = "#1c1a24";
      g.fillRect(5, 2, 1, 2);
      g.fillRect(6, 4, 1, 2);
      g.fillRect(7, 6, 1, 3);
      g.fillRect(8, 9, 1, 2);
    });
    T("floor_crack", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      // a branching fracture across the flagstones
      g.fillStyle = "#21242f";
      g.fillRect(3, 2, 1, 4);
      g.fillRect(4, 5, 1, 3);
      g.fillRect(5, 7, 3, 1);
      g.fillRect(8, 8, 1, 3);
      g.fillRect(9, 10, 3, 1);
      g.fillRect(7, 11, 1, 3);
      g.fillStyle = "#161922";
      g.fillRect(5, 7, 3, 1);
      g.fillStyle = "#4a5168"; // lifted lip on one side
      g.fillRect(4, 4, 1, 1);
      g.fillRect(8, 9, 1, 1);
    });
    T("rubble", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      const cols = ["#5c6377", "#6c7488", "#474d5d"];
      for (let i = 0; i < 8; i++) {
        const x = 1 + ((r() * 12) | 0);
        const y = 3 + ((r() * 10) | 0);
        const s = 2 + ((r() * 2) | 0);
        g.fillStyle = cols[(r() * cols.length) | 0];
        g.fillRect(x, y, s, s);
        g.fillStyle = "#2a2e3c"; // little drop-shadow under each chunk
        g.fillRect(x, y + s, s, 1);
      }
    });
    T("moss_stone", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      g.fillStyle = "#3f6e3a";
      for (let i = 0; i < 10; i++) {
        const x = (r() * 15) | 0;
        const y = (r() * 15) | 0;
        g.fillRect(x, y, 2, 1);
      }
      speckle(g, r, "#4f8a44", 14);
      speckle(g, r, "#2f5a2c", 8);
    });
    T("stalagmite", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      // rising ground cone
      g.fillStyle = "#5a606f";
      g.fillRect(6, 4, 4, 11);
      g.fillRect(5, 8, 6, 7);
      g.fillRect(4, 12, 8, 3);
      g.fillStyle = "#787f90"; // lit edge
      g.fillRect(6, 5, 2, 9);
      g.fillStyle = "#9aa1b0"; // tip
      g.fillRect(7, 4, 1, 2);
      g.fillStyle = "#3a3f4d"; // shaded side
      g.fillRect(9, 8, 2, 7);
      // small stalactites hanging from above
      g.fillStyle = "#4a4f5d";
      g.fillRect(2, 0, 2, 4);
      g.fillRect(12, 0, 2, 3);
      g.fillStyle = "#5d636e";
      g.fillRect(2, 0, 1, 2);
    });
    T("chasm", (g, r) => {
      // a bottomless pit ringed by broken stone
      fillBase(g, "#1b1d26");
      g.fillStyle = "#3a3f52";
      g.fillRect(0, 0, TILE, 2);
      g.fillRect(0, 0, 2, TILE);
      g.fillStyle = "#2a2e3c";
      g.fillRect(2, 2, 12, 1);
      g.fillRect(2, 2, 1, 11);
      g.fillStyle = "#000";
      g.fillRect(3, 3, 10, 11);
      g.fillStyle = "#0a0b10"; // faint depth fade near the rim
      g.fillRect(3, 3, 10, 3);
      g.fillRect(3, 3, 2, 10);
    });
    T("cave_water", (g, r) => {
      fillBase(g, "#163a4a");
      g.fillStyle = "#1f5066";
      for (let i = 0; i < 5; i++) {
        const y = 2 + ((r() * 12) | 0);
        g.fillRect(1 + ((r() * 6) | 0), y, 4, 1);
      }
      speckle(g, r, "#2d6f86", 8);
      g.fillStyle = "#7fd8e6"; // glints
      g.fillRect(4, 6, 3, 1);
      g.fillRect(9, 11, 2, 1);
      g.fillStyle = "#0e2630"; // dark shoreline
      g.fillRect(0, 0, TILE, 1);
      g.fillRect(0, TILE - 1, TILE, 1);
    });
    T("lava", (g, r) => {
      fillBase(g, "#7a1d08");
      g.fillStyle = "#c43a10";
      for (let i = 0; i < 6; i++) {
        const x = (r() * 13) | 0;
        const y = (r() * 13) | 0;
        g.fillRect(x, y, 3, 2);
      }
      g.fillStyle = "#ff7a2a";
      for (let i = 0; i < 5; i++) {
        const x = (r() * 14) | 0;
        const y = (r() * 14) | 0;
        g.fillRect(x, y, 2, 1);
      }
      g.fillStyle = "#ffd24a"; // bright molten cracks
      g.fillRect(2, 5, 5, 1);
      g.fillRect(8, 10, 5, 1);
      g.fillStyle = "#fff3c0";
      g.fillRect(4, 5, 1, 1);
      g.fillRect(10, 10, 1, 1);
      g.fillStyle = "#3a1206"; // dark crust flecks
      speckle(g, r, "#3a1206", 8);
    });
    T("brazier", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      // pedestal
      g.fillStyle = "#2c2230";
      g.fillRect(7, 11, 2, 4);
      g.fillStyle = "#4a4250";
      g.fillRect(5, 14, 6, 2);
      // metal bowl
      g.fillStyle = "#3a3340";
      g.fillRect(4, 9, 8, 3);
      g.fillStyle = "#55505e";
      g.fillRect(4, 9, 8, 1);
      // warm glow
      g.fillStyle = "rgba(255,170,60,0.20)";
      g.fillRect(2, 1, 12, 9);
      // layered flame
      g.fillStyle = "#b3380f";
      g.fillRect(5, 4, 6, 5);
      g.fillStyle = "#ff8a2a";
      g.fillRect(6, 3, 4, 5);
      g.fillStyle = "#ffd24a";
      g.fillRect(7, 2, 2, 5);
      g.fillStyle = "#fff3c0";
      g.fillRect(7, 3, 1, 2);
    });
    T("bones", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      // skull
      g.fillStyle = "#d8d2bc";
      g.fillRect(4, 6, 5, 5);
      g.fillRect(5, 11, 3, 1);
      g.fillStyle = "#2b2f3f"; // eye sockets
      g.fillRect(5, 8, 1, 2);
      g.fillRect(7, 8, 1, 2);
      // scattered long bones
      g.fillStyle = "#cfc8b0";
      g.fillRect(9, 4, 5, 1);
      g.fillRect(9, 12, 5, 1);
      g.fillStyle = "#e6e0cc"; // knobbed ends
      g.fillRect(9, 3, 1, 2);
      g.fillRect(13, 3, 1, 2);
      g.fillRect(9, 12, 1, 2);
      g.fillRect(13, 12, 1, 2);
    });
    T("crystal", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      // aura
      g.fillStyle = "rgba(126,224,255,0.16)";
      g.fillRect(2, 2, 12, 13);
      // central shard
      g.fillStyle = "#2a6aa8";
      g.fillRect(6, 3, 4, 11);
      g.fillRect(5, 7, 6, 7);
      g.fillStyle = "#4f9fd6";
      g.fillRect(6, 5, 2, 9);
      g.fillStyle = "#9fe4ff";
      g.fillRect(7, 3, 1, 6);
      // side shards
      g.fillStyle = "#2a6aa8";
      g.fillRect(3, 9, 2, 5);
      g.fillRect(11, 8, 2, 6);
      g.fillStyle = "#7ee0ff";
      g.fillRect(3, 9, 1, 3);
      g.fillRect(11, 8, 1, 3);
      g.fillStyle = "#fff"; // sparkle
      g.fillRect(7, 5, 1, 1);
    });
    T("cobweb", (g, r) => {
      this._stamp(g, this.tiles.wall_stone);
      g.fillStyle = "#c9cdd8";
      // top-left corner web
      g.fillRect(0, 0, 6, 1);
      g.fillRect(0, 0, 1, 6);
      for (let i = 1; i <= 5; i++) g.fillRect(i, i, 1, 1);
      g.fillRect(0, 5, 5, 1);
      g.fillRect(5, 0, 1, 5);
      g.fillRect(0, 3, 4, 1);
      g.fillRect(3, 0, 1, 4);
      // smaller bottom-right web
      g.fillRect(TILE - 1, TILE - 5, 1, 5);
      g.fillRect(TILE - 5, TILE - 1, 5, 1);
      for (let i = 1; i <= 4; i++) g.fillRect(TILE - 1 - i, TILE - 1 - i, 1, 1);
    });
    // sign/chest/chest_open are OBJECT tiles drawn over the map's floor by the
    // overworld, so they have a TRANSPARENT background (no baked-in ground).
    T("sign", (g, r) => {
      // wooden signpost: a stake driven into the ground with a grained plank
      // board mounted on it + faint carved "text" scratches (transparent bg)
      g.fillStyle = "#5a3a22"; // post stake below the board
      g.fillRect(7, 8, 2, 7);
      g.fillStyle = "#6b4a2c"; // lit edge of the post
      g.fillRect(7, 8, 1, 7);
      // plank board
      g.fillStyle = "#8a5e38";
      g.fillRect(2, 2, 12, 7);
      g.fillStyle = "#a06a3e"; // top-edge highlight
      g.fillRect(2, 2, 12, 1);
      g.fillStyle = "#9a6536"; // wood-grain streak
      g.fillRect(2, 5, 12, 1);
      g.fillStyle = "#5e3d22"; // bottom + right-edge shading
      g.fillRect(2, 8, 12, 1);
      g.fillRect(13, 2, 1, 7);
      g.fillStyle = "#6a4524"; // carved text scratches
      g.fillRect(4, 4, 7, 1);
      g.fillRect(4, 6, 5, 1);
    });
    T("chest", (g, r) => {
      // treasure chest: domed lid, iron bands, gold latch (transparent bg)
      g.fillStyle = "#5a3416"; // dark silhouette/base
      g.fillRect(2, 5, 12, 10);
      g.fillStyle = "#8a5a26"; // body
      g.fillRect(3, 9, 10, 5);
      g.fillStyle = "#7a4a1e"; // lower body shadow
      g.fillRect(3, 12, 10, 2);
      g.fillStyle = "#9a6a2e"; // domed lid
      g.fillRect(3, 6, 10, 3);
      g.fillStyle = "#ad7a38"; // lid highlight
      g.fillRect(4, 6, 8, 1);
      g.fillStyle = "#3a2410"; // lid/body seam
      g.fillRect(3, 9, 10, 1);
      g.fillStyle = "#3a3340"; // iron bands
      g.fillRect(5, 6, 1, 8);
      g.fillRect(10, 6, 1, 8);
      g.fillStyle = "#e0c060"; // gold latch plate
      g.fillRect(7, 8, 2, 4);
      g.fillStyle = "#fff3c0";
      g.fillRect(7, 8, 1, 1);
      g.fillStyle = "#a07a20";
      g.fillRect(7, 11, 2, 1);
    });
    T("chest_open", (g, r) => {
      // opened chest: raised lid tilted back + dark empty interior
      g.fillStyle = "#5a3416"; // raised lid silhouette
      g.fillRect(3, 3, 10, 4);
      g.fillStyle = "#9a6a2e";
      g.fillRect(3, 3, 10, 2);
      g.fillStyle = "#ad7a38"; // lid highlight
      g.fillRect(4, 3, 8, 1);
      g.fillStyle = "#e0c060"; // gold rim glint
      g.fillRect(7, 6, 2, 1);
      g.fillStyle = "#5a3416"; // body silhouette
      g.fillRect(2, 8, 12, 7);
      g.fillStyle = "#8a5a26"; // body
      g.fillRect(3, 9, 10, 5);
      g.fillStyle = "#241608"; // dark empty interior
      g.fillRect(4, 8, 8, 3);
      g.fillStyle = "#3a3340"; // iron bands
      g.fillRect(5, 11, 1, 3);
      g.fillRect(10, 11, 1, 3);
    });
    T("stairs", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      // a stairwell descending into darkness
      g.fillStyle = "#14161e";
      g.fillRect(1, 1, 14, 14);
      for (let i = 0; i < 5; i++) {
        const y = 2 + i * 3;
        const inset = i;
        g.fillStyle = shade("#4a5168", -0.12 * i);
        g.fillRect(1 + inset, y, 14 - inset * 2, 2);
        g.fillStyle = shade("#6b7390", -0.12 * i); // tread lip
        g.fillRect(1 + inset, y, 14 - inset * 2, 1);
      }
    });
    T("pillar", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      // fluted column shaft
      g.fillStyle = "#5c6377";
      g.fillRect(3, 0, 10, TILE);
      g.fillStyle = "#7a8298"; // lit side
      g.fillRect(4, 0, 3, TILE);
      g.fillStyle = "#8a92a8"; // highlight flute
      g.fillRect(5, 0, 1, TILE);
      g.fillStyle = "#41475a"; // shaded side
      g.fillRect(10, 0, 3, TILE);
      g.fillStyle = "#363b4a";
      g.fillRect(12, 0, 1, TILE);
      // capital + base
      g.fillStyle = "#878fa3";
      g.fillRect(2, 0, 12, 2);
      g.fillRect(2, 13, 12, 3);
      g.fillStyle = "#9aa2b8";
      g.fillRect(2, 0, 12, 1);
      g.fillStyle = "#41475a";
      g.fillRect(2, 12, 12, 1);
    });
    T("torch", (g, r) => {
      this._stamp(g, this.tiles.wall_stone);
      // iron bracket
      g.fillStyle = "#2a2230";
      g.fillRect(7, 8, 2, 6);
      g.fillStyle = "#4a4250";
      g.fillRect(6, 12, 4, 2);
      // glow halo
      g.fillStyle = "rgba(255,180,74,0.18)";
      g.fillRect(3, 1, 10, 10);
      // layered flame
      g.fillStyle = "#b3380f";
      g.fillRect(6, 3, 4, 6);
      g.fillStyle = "#ff8a2a";
      g.fillRect(6, 4, 4, 4);
      g.fillStyle = "#ffd24a";
      g.fillRect(7, 3, 2, 4);
      g.fillStyle = "#fff3c0";
      g.fillRect(7, 4, 1, 2);
    });
    T("fence", (g, r) => {
      this._stamp(g, this.tiles.grass);
      g.fillStyle = "#8a5e38";
      g.fillRect(2, 4, 2, 10);
      g.fillRect(11, 4, 2, 10);
      g.fillRect(0, 6, TILE, 2);
      g.fillRect(0, 10, TILE, 2);
    });
    T("bridge", (g, r) => {
      this._stamp(g, this.tiles.water);
      g.fillStyle = "#8a5e38";
      g.fillRect(0, 2, TILE, 12);
      g.fillStyle = "#6a4524";
      for (let x = 0; x < TILE; x += 4) g.fillRect(x, 2, 1, 12);
      g.fillStyle = "#a06a3e";
      g.fillRect(0, 2, TILE, 1);
      g.fillRect(0, 13, TILE, 1);
    });
    T("void", (g) => {
      g.fillStyle = "#06070d";
      g.fillRect(0, 0, TILE, TILE);
    });
    T("shrine", (g, r) => {
      this._stamp(g, this.tiles.floor_stone);
      g.fillStyle = "#d8d2c0";
      g.fillRect(3, 2, 10, 12);
      g.fillStyle = "#b6b09e";
      g.fillRect(3, 2, 10, 2);
      g.fillStyle = "#ffd86a";
      g.fillRect(6, 5, 4, 4);
      g.fillStyle = "#fff0b0";
      g.fillRect(7, 6, 2, 2);
    });
    T("grave", (g, r) => {
      this._stamp(g, this.tiles.dirt);
      g.fillStyle = "#8a8f9c";
      g.fillRect(5, 3, 6, 10);
      g.fillStyle = "#6a6f7c";
      g.fillRect(6, 5, 1, 4);
      g.fillRect(5, 6, 6, 1);
    });

    // ---- Sun temple / shrine tiles (pale, gilded — sacred, not grey) -------
    T("sun_floor", (g, r) => {
      // Four polished sunstone slabs: warm cream bevels + faint gold inlay.
      fillBase(g, "#d9caa6");
      const flag = (x, y, w, h) => {
        g.fillStyle = "#ece0bf";
        g.fillRect(x, y, w, h);
        g.fillStyle = "#f7eed4"; // lit top/left bevel
        g.fillRect(x, y, w, 1);
        g.fillRect(x, y, 1, h);
        g.fillStyle = "#c9b88e"; // shaded bottom/right bevel
        g.fillRect(x, y + h - 1, w, 1);
        g.fillRect(x + w - 1, y, 1, h);
      };
      flag(0, 0, 7, 7);
      flag(8, 0, 7, 7);
      flag(0, 8, 7, 7);
      flag(8, 8, 7, 7);
      // subtle gold veining/inlay running through the seams
      g.fillStyle = "#d8b454";
      g.fillRect(7, 1, 1, 5);
      g.fillRect(2, 7, 5, 1);
      g.fillRect(9, 10, 5, 1);
      speckle(g, r, "#f7eed4", 6);
      speckle(g, r, "#c4b184", 6);
    });
    T("sun_wall", (g, r) => {
      // Sacred temple masonry: pale stone with a gilded accent band + studs.
      fillBase(g, "#cdbd96");
      // mortar courses
      g.fillStyle = "#b0a079";
      g.fillRect(0, 5, TILE, 1);
      g.fillRect(0, 11, TILE, 1);
      // staggered vertical joints
      g.fillRect(5, 0, 1, 5);
      g.fillRect(11, 6, 1, 5);
      g.fillRect(2, 12, 1, 4);
      g.fillRect(9, 12, 1, 4);
      // top-of-block highlights
      g.fillStyle = "#e6dab8";
      g.fillRect(0, 0, 5, 1);
      g.fillRect(6, 0, TILE - 6, 1);
      g.fillRect(0, 6, 11, 1);
      g.fillRect(12, 6, TILE - 12, 1);
      g.fillRect(0, 12, 9, 1);
      g.fillRect(10, 12, TILE - 10, 1);
      // bottom-of-block shadow
      g.fillStyle = "#bba985";
      g.fillRect(0, 4, TILE, 1);
      g.fillRect(0, 10, 11, 1);
      g.fillRect(0, 15, TILE, 1);
      // gilded trim band across the middle course
      g.fillStyle = "#d8b454";
      g.fillRect(0, 7, TILE, 2);
      g.fillStyle = "#f0d680"; // bright top edge of the gold
      g.fillRect(0, 7, TILE, 1);
      g.fillStyle = "#a8842e"; // gold studs
      g.fillRect(3, 7, 1, 2);
      g.fillRect(8, 7, 1, 2);
      g.fillRect(13, 7, 1, 2);
      // pale stone grain
      speckle(g, r, "#d8c8a0", 8);
      speckle(g, r, "#b6a47e", 6);
    });

    // ---- Furniture / interior props (all solid; placed on wood floor) ------
    T("table", (g) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#5e3d22";
      g.fillRect(2, 12, 2, 3);
      g.fillRect(12, 12, 2, 3);
      g.fillStyle = "#8a5e38";
      g.fillRect(1, 4, 14, 8);
      g.fillStyle = "#a06a3e";
      g.fillRect(1, 4, 14, 2);
      g.fillStyle = "#6a4524";
      g.fillRect(1, 10, 14, 1);
    });
    T("bed", (g) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#6a4524";
      g.fillRect(2, 1, 12, 14);
      g.fillStyle = "#8a5e38";
      g.fillRect(3, 2, 10, 12);
      g.fillStyle = "#cdd6f4";
      g.fillRect(3, 2, 10, 4); // pillow area
      g.fillStyle = "#fff";
      g.fillRect(4, 3, 8, 2);
      g.fillStyle = "#b23c4a";
      g.fillRect(3, 7, 10, 7); // blanket
      g.fillStyle = "#c85a66";
      g.fillRect(3, 7, 10, 1);
    });
    T("bookshelf", (g, r) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#5e3d22";
      g.fillRect(1, 0, 14, 16);
      g.fillStyle = "#3a2414";
      g.fillRect(1, 5, 14, 1);
      g.fillRect(1, 10, 14, 1);
      g.fillRect(1, 15, 14, 1);
      const books = ["#b23c4a", "#3d7dca", "#2f8a5a", "#caa24f", "#7a4ab0"];
      for (let shelf = 0; shelf < 3; shelf++) {
        let bx = 2;
        while (bx < 13) {
          const bw = 1 + ((r() * 2) | 0);
          g.fillStyle = books[(r() * books.length) | 0];
          g.fillRect(bx, shelf * 5 + 1, bw, 4);
          bx += bw + 1;
        }
      }
    });
    T("counter", (g) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#6a4524";
      g.fillRect(0, 3, TILE, 11);
      g.fillStyle = "#8a5e38";
      g.fillRect(0, 3, TILE, 3);
      g.fillStyle = "#a06a3e";
      g.fillRect(0, 3, TILE, 1);
      g.fillStyle = "#5a3a22";
      g.fillRect(0, 8, TILE, 1);
    });
    T("barrel", (g) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#6a4524"; // shaded body sides
      g.fillRect(3, 3, 10, 12);
      g.fillStyle = "#8a5e38"; // staves
      g.fillRect(4, 3, 8, 12);
      g.fillStyle = "#a06a3e"; // lit central stave
      g.fillRect(6, 3, 3, 12);
      g.fillStyle = "#5a3a22"; // stave seams
      g.fillRect(5, 3, 1, 12);
      g.fillRect(9, 3, 1, 12);
      g.fillStyle = "#6b6577"; // iron hoop (lit, top)
      g.fillRect(3, 4, 10, 1);
      g.fillStyle = "#4a4250"; // iron hoop (shaded, bottom)
      g.fillRect(3, 13, 10, 1);
      g.fillStyle = "#9a6a3a"; // wooden lid
      g.fillRect(4, 2, 8, 2);
      g.fillStyle = "#b07a44";
      g.fillRect(5, 2, 6, 1);
    });
    T("crate", (g) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#9a6a3a"; // wood face
      g.fillRect(2, 2, 12, 12);
      g.fillStyle = "#ad7c46"; // top/left lit edges
      g.fillRect(2, 2, 12, 1);
      g.fillRect(2, 2, 1, 12);
      g.fillStyle = "#6a4524"; // bottom/right frame edges
      g.fillRect(2, 13, 12, 1);
      g.fillRect(13, 2, 1, 12);
      g.fillStyle = "#7a4f28"; // top + bottom planks
      g.fillRect(3, 4, 10, 1);
      g.fillRect(3, 11, 10, 1);
      // diagonal cross-braces
      for (let i = 0; i < 7; i++) {
        g.fillRect(4 + i, 4 + i, 1, 1);
        g.fillRect(11 - i, 4 + i, 1, 1);
      }
    });
    T("pot", (g) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#8a4a2e"; // body shade
      g.fillRect(4, 6, 8, 9);
      g.fillStyle = "#a85a3a"; // rounded body
      g.fillRect(5, 5, 6, 10);
      g.fillStyle = "#c47a52"; // lit highlight
      g.fillRect(5, 6, 2, 8);
      g.fillStyle = "#7a3f26"; // narrowed base
      g.fillRect(5, 14, 6, 1);
      g.fillStyle = "#8a4a2e"; // flared rim
      g.fillRect(3, 4, 10, 2);
      g.fillStyle = "#b06848"; // rim highlight
      g.fillRect(4, 4, 8, 1);
      g.fillStyle = "#3a1f12"; // dark mouth
      g.fillRect(5, 5, 6, 1);
    });
    T("plant", (g) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#a85a3a";
      g.fillRect(5, 11, 6, 4);
      g.fillStyle = "#2c6e2f";
      g.fillRect(3, 3, 10, 8);
      g.fillStyle = "#3a8c3d";
      g.fillRect(5, 2, 6, 6);
      g.fillStyle = "#46a049";
      g.fillRect(6, 4, 2, 2);
      g.fillRect(9, 6, 2, 2);
    });
    T("window", (g) => {
      this._stamp(g, this.tiles.wall_brick);
      g.fillStyle = "#23304f";
      g.fillRect(3, 3, 10, 9);
      g.fillStyle = "#5a86d8";
      g.fillRect(4, 4, 8, 7);
      g.fillStyle = "#bcd6ff";
      g.fillRect(4, 4, 3, 3);
      g.fillStyle = "#6a4524";
      g.fillRect(3, 7, 10, 1);
      g.fillRect(7, 3, 1, 9);
      g.fillRect(2, 2, 12, 1);
    });
    T("lamp", (g) => {
      this._stamp(g, this.tiles.floor_wood);
      g.fillStyle = "#5a3a22";
      g.fillRect(7, 8, 2, 7);
      g.fillStyle = "#3a2414";
      g.fillRect(5, 14, 6, 1);
      g.fillStyle = "#ffd86a";
      g.fillRect(5, 3, 6, 6);
      g.fillStyle = "#fff3c0";
      g.fillRect(6, 4, 3, 3);
      g.fillStyle = "#caa24f";
      g.fillRect(5, 2, 6, 1);
    });

    // ---- ACT II: mountain (Karsthal Pass) tiles ----------------------------
    T("snow", (g, r) => {
      fillBase(g, "#dfe7f2");
      speckle(g, r, "#f2f6ff", 22); // bright drifted flecks
      speckle(g, r, "#c2cfe0", 16); // cool dimples
      g.fillStyle = "#b6c4d8"; // faint shadow pockets
      g.fillRect(3, 11, 3, 1);
      g.fillRect(10, 6, 3, 1);
    });
    T("ice", (g, r) => {
      fillBase(g, "#bcd6ec");
      speckle(g, r, "#a6c4de", 10);
      g.fillStyle = "#e6f2ff"; // pale blue sheen streaks
      g.fillRect(2, 4, 6, 1);
      g.fillRect(8, 9, 5, 1);
      g.fillStyle = "#8fb3d6"; // hairline cracks
      g.fillRect(5, 5, 4, 1);
      g.fillRect(9, 9, 1, 4);
      g.fillStyle = "#fff";
      g.fillRect(3, 4, 2, 1);
    });
    T("snowdrift", (g, r) => {
      this._stamp(g, this.tiles.snow);
      // piled snow over a buried rock
      g.fillStyle = "#8a93a6";
      g.fillRect(4, 9, 8, 5);
      g.fillStyle = "#aeb8c8";
      g.fillRect(5, 9, 5, 2);
      g.fillStyle = "#f2f6ff"; // snow cap
      g.fillRect(3, 5, 11, 4);
      g.fillRect(5, 3, 7, 2);
      g.fillStyle = "#d2dcec";
      g.fillRect(3, 8, 11, 1);
    });
    T("pine", (g, r) => {
      this._stamp(g, this.tiles.snow);
      g.fillStyle = "#5a3a22"; // trunk
      g.fillRect(7, 12, 2, 3);
      g.fillStyle = "#1f5a37"; // dark conifer tiers
      g.fillRect(4, 9, 8, 4);
      g.fillRect(5, 5, 6, 4);
      g.fillRect(6, 2, 4, 3);
      g.fillStyle = "#2f7a48";
      g.fillRect(5, 9, 5, 2);
      g.fillRect(6, 5, 3, 2);
      g.fillStyle = "#f2f6ff"; // snow dusting on the boughs
      g.fillRect(4, 9, 4, 1);
      g.fillRect(6, 5, 3, 1);
      g.fillRect(7, 2, 2, 1);
    });

    // ---- ACT II: swamp (Sunken Mire) tiles ---------------------------------
    T("bog", (g, r) => {
      fillBase(g, "#4a5236");
      speckle(g, r, "#5a6440", 20);
      speckle(g, r, "#3a4228", 16);
      g.fillStyle = "#6b7a4a"; // sickly algae patches
      g.fillRect(3, 5, 3, 2);
      g.fillRect(10, 10, 3, 1);
    });
    T("mud", (g, r) => {
      fillBase(g, "#5a4630");
      speckle(g, r, "#6a543a", 18);
      speckle(g, r, "#463524", 16);
      g.fillStyle = "#4a3a28"; // wet puddle dips
      g.fillRect(4, 8, 4, 2);
      g.fillStyle = "#7a6a4a";
      g.fillRect(4, 8, 4, 1);
    });
    T("bog_water", (g, r) => {
      fillBase(g, "#384a30");
      g.fillStyle = "#46603c"; // murky green ripples
      for (let i = 0; i < 5; i++) {
        const y = 2 + ((r() * 12) | 0);
        g.fillRect(1 + ((r() * 6) | 0), y, 4, 1);
      }
      speckle(g, r, "#2c3a26", 10);
      g.fillStyle = "#6a7a44"; // scum film glints
      g.fillRect(4, 6, 3, 1);
      g.fillRect(9, 11, 2, 1);
      g.fillStyle = "#26301e"; // dark depths
      g.fillRect(0, 0, TILE, 1);
      g.fillRect(0, TILE - 1, TILE, 1);
    });
    T("reeds", (g, r) => {
      this._stamp(g, this.tiles.bog_water);
      g.fillStyle = "#5a6e3a"; // cattail stalks
      g.fillRect(3, 2, 1, 13);
      g.fillRect(7, 1, 1, 14);
      g.fillRect(11, 3, 1, 12);
      g.fillStyle = "#7a8a4a";
      g.fillRect(8, 1, 1, 6);
      g.fillStyle = "#6a4a2a"; // seed heads
      g.fillRect(7, 3, 2, 3);
      g.fillRect(11, 5, 2, 3);
      g.fillRect(3, 4, 1, 2);
    });

    // ---- ACT II: ruins/coast (Drowned Ruins) tiles -------------------------
    T("ruin_floor", (g, r) => {
      // cracked, weathered flagstones with creeping damp
      fillBase(g, "#3a4048");
      const flag = (x, y, w, h) => {
        g.fillStyle = "#474e58";
        g.fillRect(x, y, w, h);
        g.fillStyle = "#545d69";
        g.fillRect(x, y, w, 1);
        g.fillStyle = "#2e333b";
        g.fillRect(x, y + h - 1, w, 1);
        g.fillRect(x + w - 1, y, 1, h);
      };
      flag(0, 0, 7, 7);
      flag(8, 0, 7, 7);
      flag(0, 8, 7, 7);
      flag(8, 8, 7, 7);
      g.fillStyle = "#23272e"; // a fracture
      g.fillRect(6, 3, 1, 4);
      g.fillRect(7, 9, 2, 1);
      speckle(g, r, "#3f5a3a", 8); // damp moss
    });
    T("ruin_wall", (g, r) => {
      // broken masonry: missing chunks + cracks
      fillBase(g, "#4a4f5a");
      g.fillStyle = "#363b45";
      g.fillRect(0, 5, TILE, 1);
      g.fillRect(0, 11, TILE, 1);
      g.fillRect(6, 0, 1, 5);
      g.fillRect(10, 6, 1, 5);
      g.fillStyle = "#5a606c"; // block highlights
      g.fillRect(0, 0, TILE, 1);
      g.fillRect(0, 6, 10, 1);
      g.fillStyle = "#2a2e36"; // knocked-out gaps
      g.fillRect(11, 1, 4, 3);
      g.fillRect(1, 12, 4, 3);
      g.fillStyle = "#1f2228"; // crack
      g.fillRect(4, 6, 1, 5);
      speckle(g, r, "#3f5a3a", 6); // moss
    });
    T("coral", (g, r) => {
      this._stamp(g, this.tiles.sand);
      g.fillStyle = "#6a7d86"; // coastal rock base
      g.fillRect(3, 7, 10, 7);
      g.fillStyle = "#869aa4";
      g.fillRect(4, 7, 6, 3);
      g.fillStyle = "#4f5e66";
      g.fillRect(3, 12, 10, 2);
      g.fillStyle = "#d85a7a"; // pink coral branches
      g.fillRect(5, 3, 2, 5);
      g.fillRect(9, 5, 2, 4);
      g.fillStyle = "#f08aa4";
      g.fillRect(5, 3, 1, 3);
      g.fillStyle = "#e0a040"; // orange polyps
      g.fillRect(7, 6, 1, 1);
      g.fillRect(10, 8, 1, 1);
    });

    // ---- ACT II: volcanic (Emberforge Caldera) tiles -----------------------
    T("ash", (g, r) => {
      fillBase(g, "#4a4248");
      speckle(g, r, "#5a525a", 20);
      speckle(g, r, "#383238", 16);
      g.fillStyle = "#2c2830"; // cool cinder flecks
      g.fillRect(4, 10, 2, 1);
      g.fillRect(11, 5, 2, 1);
      g.fillStyle = "#6a5a40"; // faint warm dust
      g.fillRect(7, 8, 2, 1);
    });
    T("ember_rock", (g, r) => {
      fillBase(g, "#2e2730");
      g.fillStyle = "#3d3440"; // craggy obsidian chunks
      g.fillRect(2, 3, 11, 10);
      g.fillStyle = "#4a4150";
      g.fillRect(3, 3, 6, 3);
      g.fillStyle = "#1c1820";
      g.fillRect(2, 11, 11, 2);
      speckle(g, r, "#46404e", 8);
      // faint glowing seam
      g.fillStyle = "#a83216";
      g.fillRect(4, 6, 6, 1);
      g.fillRect(9, 7, 1, 4);
      g.fillStyle = "#ff7a2a";
      g.fillRect(5, 6, 4, 1);
      g.fillStyle = "#ffd24a";
      g.fillRect(6, 6, 1, 1);
    });
  }

  _stamp(g, src) {
    g.drawImage(src, 0, 0);
  }

  tile(name) {
    return this.tiles[name] || this.tiles.void;
  }

  // --------------------------------------------------------------- ACTOR ----
  // Top-down humanoid sheet: rows = [down,left,right,up], cols = 4 frames.
  makeActor(colors) {
    const key = `${colors.skin}|${colors.hair}|${colors.shirt}|${colors.pants}`;
    if (this._actorCache[key]) return this._actorCache[key];
    const fw = 16;
    const fh = 16;
    const cols = 4;
    const rows = 4;
    const sheet = nc(fw * cols, fh * rows);
    const g = sheet.getContext("2d");
    const dirs = ["down", "left", "right", "up"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this._drawActorFrame(g, c * fw, r * fh, dirs[r], c, colors);
      }
    }
    const actor = { canvas: sheet, fw, fh, cols, rows };
    this._actorCache[key] = actor;
    return actor;
  }

  // frame: 0 idle, 1 step-left, 2 step-right, 3 (reserved/idle alt)
  _drawActorFrame(g, ox, oy, dir, frame, col) {
    const skin = col.skin || "#e8b98c";
    const hair = col.hair || "#5a3a22";
    const shirt = col.shirt || "#3d7dca";
    const pants = col.pants || "#2a2f45";
    const sh = shade(shirt, -0.25);
    const eye = "#1a1a1a";
    const px = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(ox + x, oy + y, w, h);
    };
    // leg + arm swing offsets
    let lLeg = 0;
    let rLeg = 0;
    if (frame === 1) {
      lLeg = -1;
      rLeg = 1;
    } else if (frame === 2) {
      lLeg = 1;
      rLeg = -1;
    }

    // shadow
    px(4, 15, 8, 1, "rgba(0,0,0,0.28)");
    // legs
    px(6, 12 + Math.max(0, lLeg), 2, 3 - Math.abs(lLeg), pants);
    px(8, 12 + Math.max(0, rLeg), 2, 3 - Math.abs(rLeg), pants);
    // torso
    px(5, 7, 6, 6, shirt);
    px(5, 7, 6, 1, shade(shirt, 0.25));
    px(5, 11, 6, 1, sh);

    if (dir === "down" || dir === "up") {
      // both arms at the sides
      px(4, 8, 1, 4, skin);
      px(11, 8, 1, 4, skin);
    } else {
      // side view: a single near arm low on the torso (never over the face)
      px(dir === "left" ? 6 : 8, 9, 2, 3, skin);
    }

    // head (skin base)
    px(5, 2, 6, 6, skin);

    // hair + face per direction (hair always behind/around the face)
    if (dir === "down") {
      px(4, 1, 8, 3, hair); // top
      px(4, 1, 1, 4, hair); // temples
      px(11, 1, 1, 4, hair);
      px(6, 5, 1, 1, eye);
      px(9, 5, 1, 1, eye);
    } else if (dir === "up") {
      // back of the head: hair covers everything, no face
      px(4, 1, 8, 6, hair);
      px(4, 1, 1, 6, hair);
      px(11, 1, 1, 6, hair);
    } else if (dir === "left") {
      // faces left: front = left side, back = right side
      px(4, 1, 8, 2, hair); // top band
      px(9, 1, 3, 6, hair); // back of head (right) behind the face
      px(5, 2, 1, 1, hair); // small front fringe (above the eye)
      px(6, 5, 1, 2, eye); // eye near the front
    } else if (dir === "right") {
      // faces right: front = right side, back = left side
      px(4, 1, 8, 2, hair);
      px(4, 1, 3, 6, hair); // back of head (left) behind the face
      px(10, 2, 1, 1, hair);
      px(9, 5, 1, 2, eye);
    }
  }

  drawActor(ctx, actor, x, y, dir, col, scale = 1) {
    const rowMap = { down: 0, left: 1, right: 2, up: 3 };
    const r = rowMap[dir] ?? 0;
    ctx.drawImage(
      actor.canvas,
      col * actor.fw,
      r * actor.fh,
      actor.fw,
      actor.fh,
      Math.round(x),
      Math.round(y),
      actor.fw * scale,
      actor.fh * scale,
    );
  }

  // Walk cycle column from a phase (0..1). Sequence: idle,left,idle,right.
  walkCol(phase) {
    const seq = [0, 1, 0, 2];
    return seq[Math.floor(phase * seq.length) % seq.length];
  }

  // -------------------------------------------------------------- ENEMIES ---
  _buildEnemies() {
    const E = (name, w, h, fn) => {
      const c = nc(w, h);
      fn(c.getContext("2d"), mulberry32(hashStr(name)));
      this.enemies[name] = c;
    };

    const slime = (col) => (g) => {
      const base = col;
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(6, 30, 28, 4);
      g.fillStyle = base;
      g.fillRect(6, 14, 28, 18);
      g.fillRect(9, 10, 22, 6);
      g.fillStyle = shade(base, 0.3);
      g.fillRect(10, 12, 18, 5);
      g.fillStyle = shade(base, -0.3);
      g.fillRect(6, 28, 28, 4);
      g.fillStyle = "#fff";
      g.fillRect(14, 18, 4, 4);
      g.fillRect(24, 18, 4, 4);
      g.fillStyle = "#111";
      g.fillRect(16, 20, 2, 2);
      g.fillRect(26, 20, 2, 2);
    };
    E("slime", 40, 36, slime("#4fb36a"));
    E("slime_blue", 40, 36, slime("#4f8fd6"));
    E("king_slime", 56, 50, (g) => {
      const s = slime("#caa24f");
      g.save();
      g.scale(56 / 40, 50 / 36);
      s(g);
      g.restore();
      g.fillStyle = "#ffd86a";
      g.fillRect(20, 2, 16, 6);
      g.fillRect(22, 0, 3, 4);
      g.fillRect(27, 0, 3, 4);
      g.fillRect(32, 0, 3, 4);
    });

    // Detailed quadruped wolf, facing LEFT (toward the player's side).
    const beast = (col) => (g) => {
      const lit = shade(col, 0.22);
      const dk = shade(col, -0.3);
      const dk2 = shade(col, -0.5);

      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(4, 33, 38, 4);

      // tail (right side), curling up
      g.fillStyle = col;
      g.fillRect(33, 16, 7, 4);
      g.fillRect(37, 9, 4, 9);
      g.fillStyle = dk;
      g.fillRect(39, 9, 2, 9);
      g.fillStyle = lit;
      g.fillRect(37, 9, 2, 3);

      // legs (four), back pair first (further), then front
      g.fillStyle = dk;
      g.fillRect(27, 29, 4, 7);
      g.fillRect(13, 29, 4, 7);
      g.fillStyle = col;
      g.fillRect(31, 29, 4, 7); // back near leg
      g.fillRect(9, 29, 4, 7); // front near leg
      g.fillStyle = dk2;
      g.fillRect(9, 35, 4, 1);
      g.fillRect(31, 35, 4, 1); // paws

      // body
      g.fillStyle = col;
      g.fillRect(8, 16, 28, 14);
      g.fillStyle = lit;
      g.fillRect(9, 16, 26, 3); // back highlight
      g.fillStyle = dk;
      g.fillRect(8, 27, 28, 3); // belly shadow
      // shoulder/haunch fur tufts
      g.fillStyle = dk2;
      g.fillRect(16, 15, 1, 3);
      g.fillRect(23, 14, 1, 4);
      g.fillRect(30, 15, 1, 3);

      // head (left), with snout pointing left
      g.fillStyle = col;
      g.fillRect(4, 11, 13, 15);
      g.fillRect(0, 18, 6, 6); // snout
      g.fillStyle = lit;
      g.fillRect(4, 11, 13, 2);
      g.fillStyle = dk;
      g.fillRect(0, 22, 7, 2); // jaw shadow
      g.fillRect(4, 24, 13, 2);

      // ears
      g.fillStyle = col;
      g.fillRect(5, 6, 4, 6);
      g.fillRect(12, 6, 4, 6);
      g.fillStyle = dk;
      g.fillRect(5, 6, 1, 6);
      g.fillRect(12, 6, 1, 6);
      g.fillStyle = shade(col, 0.1);
      g.fillRect(6, 8, 2, 3);
      g.fillRect(13, 8, 2, 3);

      // nose, eye, fangs
      g.fillStyle = "#111";
      g.fillRect(0, 19, 2, 2); // nose
      g.fillStyle = "#ffd23a";
      g.fillRect(7, 15, 3, 2); // eye
      g.fillStyle = "#111";
      g.fillRect(8, 15, 1, 2); // pupil
      g.fillStyle = dk;
      g.fillRect(5, 14, 11, 1); // brow
      g.fillStyle = "#fff";
      g.fillRect(1, 23, 1, 2);
      g.fillRect(4, 23, 1, 2); // fangs
    };
    E("wolf", 44, 38, beast("#6b6f7a"));
    E("dire_wolf", 50, 44, (g) => {
      g.save();
      g.scale(50 / 44, 44 / 38);
      beast("#3c4150")(g);
      g.restore();
      // bigger, meaner: back spikes + red eye
      g.fillStyle = "#191c26";
      g.fillRect(18, 10, 2, 5);
      g.fillRect(25, 8, 2, 6);
      g.fillRect(32, 10, 2, 5);
      g.fillStyle = "#ff5a4a";
      g.fillRect(8, 17, 3, 2);
      g.fillStyle = "#111";
      g.fillRect(9, 17, 1, 2);
    });

    // Bounty boss "Scarred Wolf": a grizzled charcoal great wolf, more detailed
    // and menacing than dire_wolf — lighter underbelly, raised hackles, a clawed
    // scar over one eye, bared fangs and a baleful glowing eye. Faces LEFT.
    E("scarred_wolf", 46, 38, (g, r) => {
      beast("#4a4d57")(g);
      const dk = shade("#4a4d57", -0.35);
      const lit = shade("#4a4d57", 0.26);
      // lighter underbelly
      g.fillStyle = "#9aa0ac";
      g.fillRect(10, 26, 22, 3);
      g.fillStyle = shade("#9aa0ac", 0.2);
      g.fillRect(10, 26, 22, 1);
      // raised hackles: spiked fur tufts along neck and spine
      g.fillStyle = dk;
      g.fillRect(12, 11, 2, 5);
      g.fillRect(17, 9, 2, 6);
      g.fillRect(22, 8, 2, 7);
      g.fillRect(27, 10, 2, 6);
      g.fillRect(32, 12, 2, 5);
      g.fillStyle = lit; // catch-light on the tufts
      g.fillRect(17, 9, 1, 3);
      g.fillRect(22, 8, 1, 3);
      // grizzled fur flecks across the flank
      g.fillStyle = "#5c606c";
      for (let i = 0; i < 16; i++) {
        g.fillRect(9 + ((r() * 26) | 0), 17 + ((r() * 10) | 0), 1, 1);
      }
      // baleful glowing eye (override the base amber)
      g.fillStyle = "#ff7a2a";
      g.fillRect(7, 15, 3, 2);
      g.fillStyle = "#ffd24a";
      g.fillRect(7, 15, 1, 1);
      g.fillStyle = "#111";
      g.fillRect(9, 15, 1, 2);
      // clawed scar raked over the brow/eye — three pale parallel slashes
      g.fillStyle = "#d8d2c0";
      g.fillRect(5, 12, 1, 5);
      g.fillRect(7, 11, 1, 4);
      g.fillRect(9, 11, 1, 3);
      g.fillStyle = "#8a4a4a"; // raw red along one slash
      g.fillRect(7, 13, 1, 2);
      // bared white fangs at the snout
      g.fillStyle = "#fff";
      g.fillRect(1, 22, 1, 3);
      g.fillRect(3, 23, 1, 3);
      g.fillRect(5, 22, 1, 3);
      g.fillStyle = "#1a1410"; // dark gum line behind the fangs
      g.fillRect(1, 21, 6, 1);
    });

    const bat = (col) => (g) => {
      const dk = shade(col, -0.25);
      const lit = shade(col, 0.22);
      g.fillStyle = "rgba(0,0,0,0.2)";
      g.fillRect(10, 30, 20, 3);
      // outstretched membranous wings with finger struts
      g.fillStyle = dk;
      g.fillRect(2, 9, 14, 5);
      g.fillRect(24, 9, 14, 5);
      g.fillStyle = col;
      g.fillRect(4, 11, 12, 5);
      g.fillRect(24, 11, 12, 5);
      g.fillStyle = dk; // struts + scalloped tips
      g.fillRect(7, 11, 1, 5);
      g.fillRect(11, 11, 1, 5);
      g.fillRect(28, 11, 1, 5);
      g.fillRect(32, 11, 1, 5);
      g.fillRect(2, 9, 1, 5);
      g.fillRect(37, 9, 1, 5);
      // body
      g.fillStyle = col;
      g.fillRect(16, 12, 8, 11);
      g.fillStyle = lit;
      g.fillRect(17, 13, 3, 8); // belly catch-light
      g.fillStyle = dk;
      g.fillRect(16, 21, 8, 2); // underbelly shadow
      // pointed ears
      g.fillStyle = col;
      g.fillRect(16, 8, 2, 4);
      g.fillRect(22, 8, 2, 4);
      g.fillStyle = dk;
      g.fillRect(16, 8, 1, 3);
      g.fillRect(23, 8, 1, 3);
      // eyes + fangs
      g.fillStyle = "#ff5a6a";
      g.fillRect(17, 15, 2, 2);
      g.fillRect(21, 15, 2, 2);
      g.fillStyle = "#fff";
      g.fillRect(17, 20, 1, 2);
      g.fillRect(22, 20, 1, 2);
    };
    E("bat", 40, 34, bat("#5b3f6e"));
    E("cave_bat", 40, 34, bat("#3a2b4a"));

    // Forest wasp: the Greenwood's flying menace — striped yellow/black abdomen,
    // translucent wings, a barbed stinger and big compound eyes. Reads as a
    // bright daytime insect (not a cave creature). Faces LEFT.
    E("forest_wasp", 38, 34, (g, r) => {
      const yellow = "#f2c21e";
      const yellowDk = "#caa01a";
      const dark = "#1f1810";
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.fillRect(10, 31, 20, 3);
      // translucent wings spread above the body
      g.globalAlpha = 0.5;
      g.fillStyle = "#dcefff";
      g.fillRect(15, 2, 16, 7);
      g.fillRect(18, 6, 16, 6);
      g.globalAlpha = 0.85;
      g.fillStyle = "#aacbe6"; // wing veins/edges
      g.fillRect(15, 2, 16, 1);
      g.fillRect(18, 11, 16, 1);
      g.globalAlpha = 1;
      // striped abdomen tapering to the right, ending in a stinger
      g.fillStyle = yellow;
      g.fillRect(18, 16, 16, 8);
      g.fillStyle = dark; // black bands
      g.fillRect(21, 16, 2, 8);
      g.fillRect(25, 16, 2, 8);
      g.fillRect(29, 16, 2, 8);
      g.fillStyle = yellowDk; // underside shadow
      g.fillRect(18, 22, 16, 2);
      g.fillStyle = "#fff7c0"; // top sheen
      g.fillRect(18, 16, 14, 1);
      // barbed stinger off the tail
      g.fillStyle = dark;
      g.fillRect(34, 19, 4, 2);
      g.fillRect(37, 19, 1, 1);
      // fuzzy thorax linking head and abdomen
      g.fillStyle = "#3a2c14";
      g.fillRect(11, 15, 9, 9);
      g.fillStyle = "#5a4420";
      g.fillRect(12, 15, 7, 2);
      g.fillStyle = yellow; // a thoracic stripe
      g.fillRect(12, 19, 7, 2);
      // thin legs dangling beneath
      g.fillStyle = dark;
      g.fillRect(13, 24, 1, 4);
      g.fillRect(16, 24, 1, 5);
      g.fillRect(19, 24, 1, 4);
      // head with large compound eyes, on the left
      g.fillStyle = "#3a2c14";
      g.fillRect(4, 14, 9, 9);
      g.fillStyle = "#7a1f24"; // dark-red compound eyes
      g.fillRect(4, 15, 4, 6);
      g.fillRect(9, 15, 3, 6);
      g.fillStyle = "#c44a4a"; // faceted glints
      g.fillRect(5, 16, 1, 1);
      g.fillRect(10, 16, 1, 1);
      g.fillStyle = "#ffd86a"; // mandibles
      g.fillRect(3, 20, 2, 2);
      // antennae sweeping forward
      g.fillStyle = dark;
      g.fillRect(3, 12, 1, 2);
      g.fillRect(1, 10, 2, 1);
      g.fillRect(6, 11, 1, 2);
      g.fillRect(5, 9, 2, 1);
    });

    const humanoid = (skin, cloth, opts = {}) => (g) => {
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(8, 40, 24, 4);
      // legs
      g.fillStyle = shade(cloth, -0.3);
      g.fillRect(12, 32, 6, 10);
      g.fillRect(22, 32, 6, 10);
      // body
      g.fillStyle = cloth;
      g.fillRect(10, 18, 20, 16);
      g.fillStyle = shade(cloth, 0.2);
      g.fillRect(10, 18, 20, 2);
      // arms
      g.fillStyle = skin;
      g.fillRect(7, 20, 4, 10);
      g.fillRect(29, 20, 4, 10);
      // head
      g.fillStyle = skin;
      g.fillRect(13, 6, 14, 12);
      // eyes
      g.fillStyle = opts.eye || "#1a1a1a";
      g.fillRect(16, 11, 2, 2);
      g.fillRect(22, 11, 2, 2);
      if (opts.weapon) {
        g.fillStyle = "#cfd6e6";
        g.fillRect(33, 8, 2, 22);
        g.fillStyle = "#8a5e38";
        g.fillRect(31, 26, 6, 3);
      }
      if (opts.hat) {
        g.fillStyle = opts.hat;
        g.fillRect(11, 2, 18, 5);
        g.fillRect(13, 0, 14, 3);
      }
    };
    E("goblin", 40, 44, humanoid("#73a34f", "#6a4a2e", { eye: "#ff3a3a", weapon: true }));
    E("goblin_chief", 44, 46, humanoid("#5f8c44", "#7a2f3a", { eye: "#ffd23a", weapon: true, hat: "#caa24f" }));
    E("bandit", 40, 44, humanoid("#d8a878", "#3a3f52", { eye: "#fff", weapon: true, hat: "#22252f" }));

    const skeleton = (g) => {
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(8, 40, 24, 4);
      g.fillStyle = "#e6e2d2";
      g.fillRect(13, 6, 14, 12); // skull
      g.fillRect(12, 20, 16, 4); // ribs top
      g.fillRect(13, 25, 14, 3);
      g.fillRect(14, 29, 12, 3);
      g.fillRect(15, 32, 4, 10); // legs
      g.fillRect(21, 32, 4, 10);
      g.fillRect(7, 20, 4, 12); // arms
      g.fillRect(29, 20, 4, 12);
      g.fillStyle = "#11151f";
      g.fillRect(16, 10, 3, 3);
      g.fillRect(21, 10, 3, 3);
      g.fillStyle = "#9fd4ff";
      g.fillRect(17, 11, 1, 1);
      g.fillRect(22, 11, 1, 1);
      // sword
      g.fillStyle = "#b9c2d6";
      g.fillRect(33, 6, 2, 24);
    };
    E("skeleton", 40, 44, skeleton);

    const ghost = (col) => (g) => {
      g.globalAlpha = 0.92;
      g.fillStyle = col;
      g.fillRect(10, 8, 20, 22);
      g.fillRect(8, 12, 24, 16);
      // wavy bottom
      for (let i = 0; i < 4; i++) {
        g.fillRect(8 + i * 6, 28, 4, 4 + (i % 2) * 2);
      }
      g.fillStyle = shade(col, 0.25);
      g.fillRect(10, 8, 20, 3);
      g.globalAlpha = 1;
      g.fillStyle = "#11151f";
      g.fillRect(15, 16, 3, 4);
      g.fillRect(22, 16, 3, 4);
    };
    E("wraith", 40, 38, ghost("#9aa8d8"));
    E("specter", 40, 38, ghost("#b48ad8"));

    const golem = (col, rng, opt = {}) => (g) => {
      const lit = shade(col, 0.22);
      const lit2 = shade(col, 0.4);
      const dk = shade(col, -0.3);
      const dk2 = shade(col, -0.5);
      const glow = opt.glow || "#ff7a3a";
      const glowDim = opt.glowDim || "#a83a16";

      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(6, 45, 38, 3);

      // ---- rocky body built from chunky boulders for a craggy silhouette ----
      g.fillStyle = col;
      g.fillRect(9, 17, 30, 25); // torso
      g.fillRect(11, 14, 26, 4); // upper chest
      g.fillStyle = lit;
      g.fillRect(9, 17, 30, 3); // top light
      g.fillRect(10, 20, 4, 18); // left edge light
      g.fillStyle = dk;
      g.fillRect(33, 20, 6, 20); // right shade
      g.fillRect(9, 37, 30, 5); // lower shade

      // boulder shoulders
      g.fillStyle = col;
      g.fillRect(4, 15, 12, 12);
      g.fillRect(32, 15, 12, 12);
      g.fillStyle = lit2;
      g.fillRect(5, 16, 5, 4);
      g.fillRect(33, 16, 5, 4);
      g.fillStyle = dk;
      g.fillRect(4, 23, 12, 4);
      g.fillRect(32, 23, 12, 4);

      // arms + blocky fists
      g.fillStyle = col;
      g.fillRect(2, 26, 9, 14);
      g.fillRect(37, 26, 9, 14);
      g.fillStyle = dk;
      g.fillRect(2, 36, 9, 4);
      g.fillRect(37, 36, 9, 4);
      g.fillStyle = lit;
      g.fillRect(2, 26, 3, 10);
      g.fillRect(37, 26, 3, 10);
      // knuckle lines
      g.fillStyle = dk2;
      g.fillRect(4, 39, 5, 1);
      g.fillRect(39, 39, 5, 1);

      // head (set into shoulders) with brow ridge
      g.fillStyle = col;
      g.fillRect(15, 5, 18, 13);
      g.fillStyle = lit;
      g.fillRect(15, 5, 18, 2);
      g.fillStyle = dk;
      g.fillRect(15, 15, 18, 3);
      g.fillStyle = dk2;
      g.fillRect(15, 10, 18, 2); // brow shadow

      // glowing eyes (recessed) + inner core glow
      g.fillStyle = glowDim;
      g.fillRect(17, 11, 6, 4);
      g.fillRect(25, 11, 6, 4);
      g.fillStyle = glow;
      g.fillRect(18, 12, 4, 2);
      g.fillRect(26, 12, 4, 2);
      g.fillStyle = "#fff";
      g.fillRect(19, 12, 1, 1);
      g.fillRect(27, 12, 1, 1);
      // chest core
      g.fillStyle = glowDim;
      g.fillRect(21, 26, 6, 6);
      g.fillStyle = glow;
      g.fillRect(22, 27, 4, 4);
      g.fillStyle = "#fff3c0";
      g.fillRect(23, 28, 2, 2);

      // cracks (glow seeps through on crystal variant)
      const crackCol = opt.crackGlow || dk2;
      g.fillStyle = crackCol;
      g.fillRect(13, 20, 1, 6);
      g.fillRect(13, 25, 4, 1);
      g.fillRect(30, 32, 1, 7);
      g.fillRect(27, 32, 4, 1);
      g.fillRect(20, 33, 1, 6);

      // moss / mineral speckle for texture
      const spk = opt.speckle || shade(col, 0.12);
      g.fillStyle = spk;
      for (let i = 0; i < 26; i++) {
        const sx = 6 + ((rng() * 36) | 0);
        const sy = 6 + ((rng() * 34) | 0);
        g.fillRect(sx, sy, 1, 1);
      }
    };
    E("golem", 48, 48, (g, r) => golem("#7d8390", r, { speckle: "#6f8a5a" })(g));
    E("crystal_golem", 50, 50, (g, r) =>
      golem("#5f7ad0", r, { glow: "#7ee0ff", glowDim: "#2a6aa8", crackGlow: "#9fe4ff", speckle: "#9fb4ff" })(g),
    );

    // Forest gate boss: a bark-scaled brute of living wood, thorn antlers, a
    // fanged maw and moss creeping over its trunk. Distinct silhouette from the
    // stone golem so the woods feel like they grew their own guardian.
    E("thornjaw", 54, 54, (g, rng) => {
      const bark = "#5e4428";
      const barkLit = shade(bark, 0.24);
      const barkDk = shade(bark, -0.3);
      const barkDk2 = shade(bark, -0.55);
      const moss = "#5f8c44";
      const mossLit = "#7faa56";
      const mossDk = "#3f5f2c";
      const thorn = "#2f2414";
      const eye = "#ffe27a";
      const eyeDim = "#c8881f";
      const fang = "#efe9d2";

      // ground shadow
      g.fillStyle = "rgba(0,0,0,0.32)";
      g.fillRect(8, 50, 38, 3);

      // antlers — thorned branches forking up from the skull
      g.fillStyle = thorn;
      g.fillRect(17, 1, 2, 6);
      g.fillRect(13, 2, 4, 2);
      g.fillRect(12, 0, 2, 3);
      g.fillRect(19, 3, 3, 2);
      g.fillRect(35, 1, 2, 6);
      g.fillRect(37, 2, 4, 2);
      g.fillRect(40, 0, 2, 3);
      g.fillRect(32, 3, 3, 2);
      g.fillStyle = mossDk;
      g.fillRect(12, 0, 1, 1);
      g.fillRect(41, 0, 1, 1);

      // root-stump legs
      g.fillStyle = bark;
      g.fillRect(15, 42, 9, 10);
      g.fillRect(30, 42, 9, 10);
      g.fillStyle = barkDk;
      g.fillRect(15, 49, 9, 3);
      g.fillRect(30, 49, 9, 3);

      // trunk torso
      g.fillStyle = bark;
      g.fillRect(11, 18, 32, 26);
      g.fillStyle = barkLit;
      g.fillRect(11, 18, 32, 3);
      g.fillRect(12, 21, 3, 20);
      g.fillStyle = barkDk;
      g.fillRect(38, 20, 5, 22);
      g.fillRect(11, 40, 32, 4);
      // bark striations
      g.fillStyle = barkDk2;
      g.fillRect(18, 21, 1, 20);
      g.fillRect(24, 20, 1, 22);
      g.fillRect(30, 21, 1, 20);
      g.fillRect(35, 22, 1, 16);

      // mossy growth over shoulders/back
      g.fillStyle = moss;
      g.fillRect(11, 16, 14, 6);
      g.fillRect(29, 16, 14, 6);
      g.fillStyle = mossLit;
      g.fillRect(12, 16, 8, 2);
      g.fillRect(30, 16, 8, 2);
      g.fillStyle = mossDk;
      g.fillRect(11, 21, 14, 1);
      g.fillRect(29, 21, 14, 1);

      // knotted shoulders
      g.fillStyle = bark;
      g.fillRect(4, 16, 11, 12);
      g.fillRect(39, 16, 11, 12);
      g.fillStyle = barkLit;
      g.fillRect(5, 17, 4, 3);
      g.fillRect(40, 17, 4, 3);
      g.fillStyle = barkDk;
      g.fillRect(4, 24, 11, 4);
      g.fillRect(39, 24, 11, 4);

      // vine arms ending in splayed root-claws, barbed with thorns
      g.fillStyle = bark;
      g.fillRect(3, 26, 8, 16);
      g.fillRect(43, 26, 8, 16);
      g.fillStyle = barkDk;
      g.fillRect(3, 38, 8, 4);
      g.fillRect(43, 38, 8, 4);
      g.fillStyle = barkDk2;
      g.fillRect(2, 42, 2, 4);
      g.fillRect(6, 42, 2, 5);
      g.fillRect(10, 42, 2, 4);
      g.fillRect(42, 42, 2, 4);
      g.fillRect(46, 42, 2, 5);
      g.fillRect(50, 42, 2, 4);
      g.fillStyle = thorn;
      g.fillRect(1, 28, 2, 2);
      g.fillRect(1, 34, 2, 2);
      g.fillRect(51, 28, 2, 2);
      g.fillRect(51, 34, 2, 2);

      // head set into the shoulders, heavy brow
      g.fillStyle = bark;
      g.fillRect(17, 4, 20, 16);
      g.fillStyle = barkLit;
      g.fillRect(17, 4, 20, 2);
      g.fillStyle = barkDk;
      g.fillRect(17, 17, 20, 3);
      g.fillStyle = barkDk2;
      g.fillRect(17, 8, 20, 2);

      // glowing amber eyes, recessed
      g.fillStyle = eyeDim;
      g.fillRect(20, 9, 6, 3);
      g.fillRect(28, 9, 6, 3);
      g.fillStyle = eye;
      g.fillRect(21, 10, 4, 2);
      g.fillRect(29, 10, 4, 2);
      g.fillStyle = "#fff7d0";
      g.fillRect(22, 10, 1, 1);
      g.fillRect(30, 10, 1, 1);

      // gaping fanged maw
      g.fillStyle = barkDk2;
      g.fillRect(19, 14, 16, 5);
      g.fillStyle = "#160f06";
      g.fillRect(20, 15, 14, 3);
      g.fillStyle = fang;
      for (let i = 0; i < 5; i++) {
        const fxp = 21 + i * 3;
        g.fillRect(fxp, 14, 2, 2);
        g.fillRect(fxp, 16, 1, 1);
      }
      for (let i = 0; i < 4; i++) {
        const fxp = 22 + i * 3;
        g.fillRect(fxp, 18, 2, 1);
        g.fillRect(fxp, 17, 1, 1);
      }

      // moss speckle texture
      g.fillStyle = mossDk;
      for (let i = 0; i < 22; i++) {
        const sx = 8 + ((rng() * 38) | 0);
        const sy = 16 + ((rng() * 28) | 0);
        g.fillRect(sx, sy, 1, 1);
      }
    });

    // Bosses
    E("warden", 52, 56, (g) => {
      // tall robed figure with staff & glowing core
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(10, 50, 32, 5);
      g.fillStyle = "#2c2150";
      g.fillRect(12, 16, 28, 38); // robe
      g.fillStyle = "#3a2c66";
      g.fillRect(14, 16, 24, 4);
      g.fillStyle = "#1d1638";
      for (let i = 0; i < 4; i++) g.fillRect(14 + i * 7, 50, 3, 4);
      // hood
      g.fillStyle = "#1d1638";
      g.fillRect(16, 4, 20, 16);
      g.fillStyle = "#0b0820";
      g.fillRect(19, 9, 14, 9);
      // glowing eyes + core
      g.fillStyle = "#7ee0ff";
      g.fillRect(22, 12, 3, 3);
      g.fillRect(28, 12, 3, 3);
      g.fillStyle = "#ffd86a";
      g.fillRect(24, 30, 6, 6);
      g.fillStyle = "#fff3c0";
      g.fillRect(26, 32, 2, 2);
      // staff
      g.fillStyle = "#8a5e38";
      g.fillRect(40, 8, 2, 46);
      g.fillStyle = "#7ee0ff";
      g.fillRect(38, 4, 6, 6);
    });
    E("shadowlord", 64, 64, (g) => {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(10, 58, 44, 5);
      // huge dark armored body
      g.fillStyle = "#15101f";
      g.fillRect(14, 18, 36, 42);
      g.fillStyle = "#241a36";
      g.fillRect(16, 18, 32, 6);
      // shoulders / spikes
      g.fillStyle = "#2c2150";
      g.fillRect(8, 18, 10, 12);
      g.fillRect(46, 18, 10, 12);
      g.fillStyle = "#0b0820";
      g.fillRect(6, 14, 4, 8);
      g.fillRect(54, 14, 4, 8);
      // helm
      g.fillStyle = "#1d1430";
      g.fillRect(22, 4, 20, 16);
      g.fillStyle = "#ff3a5a";
      g.fillRect(26, 10, 4, 3);
      g.fillRect(34, 10, 4, 3);
      // core
      g.fillStyle = "#ff3a5a";
      g.fillRect(28, 34, 8, 8);
      g.fillStyle = "#ffd0d8";
      g.fillRect(30, 36, 3, 3);
      // arms
      g.fillStyle = "#15101f";
      g.fillRect(6, 26, 10, 24);
      g.fillRect(48, 26, 10, 24);
    });
    E("sunshade", 60, 60, (g) => {
      // alternate final boss (corrupted sun)
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(10, 54, 40, 5);
      g.fillStyle = "#caa24f";
      g.fillRect(14, 14, 32, 40);
      g.fillStyle = "#e0c060";
      g.fillRect(16, 14, 28, 6);
      g.fillStyle = "#7a5a16";
      g.fillRect(14, 46, 32, 8);
      // rays
      g.fillStyle = "#ffd86a";
      for (let i = 0; i < 6; i++) g.fillRect(8 + i * 8, 6, 3, 8);
      g.fillStyle = "#1a1206";
      g.fillRect(22, 26, 5, 4);
      g.fillRect(33, 26, 5, 4);
      g.fillStyle = "#ff3a3a";
      g.fillRect(26, 36, 8, 4);
    });
    E("mushroom", 40, 40, (g) => {
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(10, 36, 20, 3);
      g.fillStyle = "#f0e6d2";
      g.fillRect(14, 22, 12, 14);
      g.fillStyle = "#c0443a";
      g.fillRect(8, 10, 24, 14);
      g.fillRect(11, 6, 18, 6);
      g.fillStyle = "#fff";
      g.fillRect(12, 13, 4, 4);
      g.fillRect(22, 11, 5, 5);
      g.fillRect(17, 18, 3, 3);
      g.fillStyle = "#1a1a1a";
      g.fillRect(16, 27, 2, 2);
      g.fillRect(22, 27, 2, 2);
    });

    // ====================== ACT II — signature regulars ====================

    // Frost wolf: the wolf build in icy hues with frost-spiked back and breath.
    E("frost_wolf", 46, 40, (g, r) => {
      beast("#8fb0cc")(g);
      g.fillStyle = "#e6f2ff"; // frost spikes along the spine
      g.fillRect(16, 12, 2, 5);
      g.fillRect(22, 10, 2, 6);
      g.fillRect(28, 12, 2, 5);
      g.fillStyle = "#bcd6ec";
      g.fillRect(16, 15, 2, 2);
      g.fillRect(28, 15, 2, 2);
      g.fillStyle = "#9fe4ff"; // cold glowing eye
      g.fillRect(7, 15, 3, 2);
      g.fillStyle = "#fff";
      g.fillRect(8, 15, 1, 1);
      g.globalAlpha = 0.6; // frosty breath
      g.fillStyle = "#dff0ff";
      g.fillRect(-2, 19, 4, 2);
      g.globalAlpha = 1;
    });

    // Ice wisp: a hovering crystalline shard wreathed in cold mist.
    E("ice_wisp", 40, 40, (g, r) => {
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(13, 33, 14, 3);
      g.globalAlpha = 0.25; // mist halo
      g.fillStyle = "#bfe6ff";
      g.fillRect(8, 8, 24, 22);
      g.globalAlpha = 1;
      // diamond shard core
      g.fillStyle = "#3f86c8";
      g.fillRect(17, 6, 6, 24);
      g.fillRect(13, 14, 14, 8);
      g.fillStyle = "#7ec8f0";
      g.fillRect(18, 8, 3, 18);
      g.fillStyle = "#dff4ff"; // bright facet
      g.fillRect(18, 9, 1, 9);
      // orbiting ice motes
      g.fillStyle = "#bfe6ff";
      g.fillRect(7, 14, 2, 2);
      g.fillRect(31, 18, 2, 2);
      g.fillRect(20, 31, 2, 2);
      // chill glow eyes
      g.fillStyle = "#eaffff";
      g.fillRect(17, 15, 2, 2);
      g.fillRect(21, 15, 2, 2);
    });

    // Bog toad: squat amphibian with a wide gulping maw and bulbous eyes.
    E("bog_toad", 46, 38, (g, r) => {
      const base = "#5f7a3a";
      const lit = shade(base, 0.25);
      const dk = shade(base, -0.32);
      g.fillStyle = "rgba(0,0,0,0.28)";
      g.fillRect(6, 33, 34, 4);
      // splayed legs
      g.fillStyle = dk;
      g.fillRect(3, 26, 8, 8);
      g.fillRect(35, 26, 8, 8);
      g.fillStyle = base;
      g.fillRect(3, 31, 9, 3);
      g.fillRect(34, 31, 9, 3);
      // squat body
      g.fillStyle = base;
      g.fillRect(9, 16, 28, 16);
      g.fillStyle = lit;
      g.fillRect(10, 16, 26, 3);
      g.fillStyle = dk;
      g.fillRect(9, 29, 28, 3);
      // warty speckle
      g.fillStyle = dk;
      for (let i = 0; i < 18; i++) {
        g.fillRect(10 + ((r() * 26) | 0), 18 + ((r() * 12) | 0), 1, 1);
      }
      // pale throat
      g.fillStyle = "#b6c47a";
      g.fillRect(15, 26, 16, 5);
      // wide maw
      g.fillStyle = "#241a14";
      g.fillRect(12, 22, 22, 4);
      g.fillStyle = "#d8607a"; // tongue
      g.fillRect(19, 23, 7, 2);
      // bulbous eyes on top
      g.fillStyle = base;
      g.fillRect(11, 9, 9, 8);
      g.fillRect(26, 9, 9, 8);
      g.fillStyle = "#f0d23a";
      g.fillRect(13, 11, 5, 5);
      g.fillRect(28, 11, 5, 5);
      g.fillStyle = "#111";
      g.fillRect(15, 13, 2, 3);
      g.fillRect(30, 13, 2, 3);
    });

    // Leech: a glistening segmented blood-worm rearing up to strike.
    E("leech", 38, 38, (g, r) => {
      const base = "#7a2230";
      const lit = shade(base, 0.3);
      const dk = shade(base, -0.35);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(8, 34, 22, 3);
      // curling body segments rising to a raised head
      const seg = [
        [12, 28], [11, 24], [12, 20], [15, 16], [19, 13], [22, 9],
      ];
      for (let i = 0; i < seg.length; i++) {
        const [x, y] = seg[i];
        g.fillStyle = base;
        g.fillRect(x, y, 9, 6);
        g.fillStyle = lit;
        g.fillRect(x + 1, y, 7, 1);
        g.fillStyle = dk;
        g.fillRect(x, y + 5, 9, 1);
      }
      // slimy sheen
      g.fillStyle = "#c0506a";
      g.fillRect(14, 25, 2, 1);
      g.fillRect(17, 17, 2, 1);
      // sucker head with ring of teeth
      g.fillStyle = base;
      g.fillRect(22, 6, 11, 9);
      g.fillStyle = "#1c0a10";
      g.fillRect(25, 8, 6, 5);
      g.fillStyle = "#efe3d2";
      for (let i = 0; i < 4; i++) g.fillRect(25 + i * 2, 8, 1, 1);
      for (let i = 0; i < 4; i++) g.fillRect(25 + i * 2, 12, 1, 1);
    });

    // Drowned: a waterlogged corpse in tattered cloth, seaweed and hollow eyes.
    E("drowned", 40, 46, (g, r) => {
      humanoid("#6f8a86", "#2f4a44", { eye: "#8ff0e0" })(g);
      // hollow glowing eyes (override)
      g.fillStyle = "#0a1a18";
      g.fillRect(16, 11, 3, 3);
      g.fillRect(22, 11, 3, 3);
      g.fillStyle = "#8ff0e0";
      g.fillRect(17, 12, 1, 1);
      g.fillRect(23, 12, 1, 1);
      // dripping seaweed strands
      g.fillStyle = "#3f6e4a";
      g.fillRect(13, 6, 1, 9);
      g.fillRect(26, 6, 1, 8);
      g.fillRect(11, 20, 1, 7);
      g.fillStyle = "#588a5a";
      g.fillRect(13, 6, 1, 4);
      // barnacle crust + water drips
      g.fillStyle = "#b8c4b0";
      g.fillRect(28, 22, 2, 2);
      g.fillRect(12, 26, 2, 2);
      g.globalAlpha = 0.7;
      g.fillStyle = "#9fd8d0";
      g.fillRect(20, 42, 1, 3);
      g.globalAlpha = 1;
      // gash mouth
      g.fillStyle = "#1a2a28";
      g.fillRect(17, 15, 6, 1);
    });

    // Siren: a pale luring sea-creature with long hair and a fish tail.
    E("siren", 40, 46, (g, r) => {
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(10, 42, 22, 3);
      // sinuous fish tail
      g.fillStyle = "#2f8a8a";
      g.fillRect(14, 30, 12, 12);
      g.fillStyle = "#3fb0a8";
      g.fillRect(15, 30, 4, 11);
      g.fillStyle = "#1f6a6a";
      g.fillRect(10, 40, 8, 4); // tail fin
      g.fillRect(22, 40, 8, 4);
      g.fillStyle = "#5fd0c0";
      g.fillRect(10, 41, 8, 1);
      g.fillRect(22, 41, 8, 1);
      // torso
      g.fillStyle = "#cfe0d8";
      g.fillRect(15, 16, 10, 16);
      g.fillStyle = "#b0c8c0";
      g.fillRect(15, 28, 10, 3);
      // flowing teal hair framing the face
      g.fillStyle = "#2f8a8a";
      g.fillRect(11, 5, 5, 22);
      g.fillRect(24, 5, 5, 22);
      g.fillStyle = "#3fb0a8";
      g.fillRect(11, 6, 2, 16);
      // head
      g.fillStyle = "#dfeee8";
      g.fillRect(15, 6, 10, 11);
      // alluring glowing eyes + faint smile
      g.fillStyle = "#7ee0ff";
      g.fillRect(17, 10, 2, 2);
      g.fillRect(21, 10, 2, 2);
      g.fillStyle = "#7a3a4a";
      g.fillRect(18, 14, 4, 1);
    });

    // Magma hound: the beast build as cooled rock veined with lava and flame.
    E("magma_hound", 46, 40, (g, r) => {
      beast("#3a2630")(g);
      // glowing lava cracks across the body
      g.fillStyle = "#ff7a2a";
      g.fillRect(12, 20, 10, 1);
      g.fillRect(20, 22, 8, 1);
      g.fillRect(15, 18, 1, 6);
      g.fillRect(26, 19, 1, 7);
      g.fillStyle = "#ffd24a";
      g.fillRect(14, 20, 4, 1);
      g.fillRect(22, 22, 3, 1);
      // ember eye + mane of fire
      g.fillStyle = "#ff5a1a";
      g.fillRect(7, 15, 3, 2);
      g.fillStyle = "#ffd24a";
      g.fillRect(8, 15, 1, 1);
      g.fillStyle = "#ff7a2a"; // flame tufts off the neck
      g.fillRect(15, 11, 2, 4);
      g.fillRect(20, 9, 2, 5);
      g.fillRect(25, 11, 2, 4);
      g.fillStyle = "#ffd24a";
      g.fillRect(20, 9, 1, 3);
    });

    // Ash wraith: the ghost build in smoke-grey ash with ember eyes and cinders.
    E("ash_wraith", 40, 40, (g, r) => {
      ghost("#6a6168")(g);
      g.fillStyle = "#ff6a2a"; // ember eyes (override)
      g.fillRect(15, 16, 3, 4);
      g.fillRect(22, 16, 3, 4);
      g.fillStyle = "#ffd24a";
      g.fillRect(16, 16, 1, 1);
      g.fillRect(23, 16, 1, 1);
      // glowing cinder core
      g.fillStyle = "#a83216";
      g.fillRect(17, 23, 6, 4);
      g.fillStyle = "#ff7a2a";
      g.fillRect(18, 24, 4, 2);
      // drifting cinders
      g.fillStyle = "#ff8a3a";
      for (let i = 0; i < 6; i++) {
        g.fillRect(8 + ((r() * 24) | 0), 6 + ((r() * 22) | 0), 1, 1);
      }
    });

    // ========================= ACT II — bosses =============================

    // Rimewyrm: a coiled frost serpent of icy scales, frost spikes, cold eyes.
    E("rimewyrm", 60, 58, (g, rng) => {
      const scale = "#5aa8d8";
      const lit = shade(scale, 0.28);
      const dk = shade(scale, -0.32);
      const dk2 = shade(scale, -0.5);
      const belly = "#cfeaf6";
      const frost = "#eaffff";

      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(8, 52, 44, 4);

      // coiled body loops (drawn back-to-front)
      const coil = (x, y, w, h) => {
        g.fillStyle = scale;
        g.fillRect(x, y, w, h);
        g.fillStyle = lit;
        g.fillRect(x, y, w, 2);
        g.fillStyle = dk;
        g.fillRect(x, y + h - 2, w, 2);
        g.fillStyle = belly; // soft underbelly band
        g.fillRect(x + 2, y + h - 4, w - 4, 2);
      };
      coil(10, 34, 40, 12); // lower coil
      coil(6, 24, 30, 12); // mid coil
      coil(18, 16, 28, 11); // upper coil

      // frost spikes ridging the coils
      g.fillStyle = frost;
      for (const sx of [14, 22, 30, 38, 44]) {
        g.fillRect(sx, 32, 2, 4);
      }
      for (const sx of [10, 18, 26, 32]) {
        g.fillRect(sx, 22, 2, 3);
      }
      g.fillStyle = "#bce2f0";
      g.fillRect(14, 33, 1, 2);
      g.fillRect(30, 33, 1, 2);

      // scale speckle
      g.fillStyle = dk;
      for (let i = 0; i < 24; i++) {
        g.fillRect(10 + ((rng() * 40) | 0), 18 + ((rng() * 26) | 0), 1, 1);
      }

      // raised serpent head (upper-right), maw open
      g.fillStyle = scale;
      g.fillRect(34, 4, 20, 16);
      g.fillStyle = lit;
      g.fillRect(34, 4, 20, 3);
      g.fillStyle = dk;
      g.fillRect(34, 17, 20, 3);
      // snout + lower jaw
      g.fillStyle = scale;
      g.fillRect(50, 9, 8, 5);
      g.fillStyle = dk2; // open mouth
      g.fillRect(50, 14, 9, 3);
      g.fillStyle = frost; // ice fangs
      g.fillRect(51, 14, 1, 3);
      g.fillRect(54, 14, 1, 3);
      g.fillRect(57, 14, 1, 2);
      // frost horn crest
      g.fillStyle = frost;
      g.fillRect(36, 0, 2, 6);
      g.fillRect(41, 1, 2, 5);
      g.fillStyle = "#bce2f0";
      g.fillRect(36, 0, 1, 4);
      // cold glowing eye
      g.fillStyle = "#eaffff";
      g.fillRect(45, 8, 4, 3);
      g.fillStyle = "#7ec8f0";
      g.fillRect(46, 9, 2, 1);
      g.fillStyle = "#fff";
      g.fillRect(46, 8, 1, 1);
    });

    // Mirelord: a hulking bog horror with a gaping toad maw and dripping slime.
    E("mirelord", 58, 58, (g, rng) => {
      const flesh = "#56713e";
      const lit = shade(flesh, 0.26);
      const dk = shade(flesh, -0.34);
      const dk2 = shade(flesh, -0.55);
      const slime = "#86a64a";
      const sick = "#b6d23a";

      g.fillStyle = "rgba(0,0,0,0.32)";
      g.fillRect(8, 53, 44, 4);

      // squat splayed legs
      g.fillStyle = dk;
      g.fillRect(7, 42, 12, 12);
      g.fillRect(39, 42, 12, 12);
      g.fillStyle = flesh;
      g.fillRect(7, 48, 13, 6);
      g.fillRect(38, 48, 13, 6);
      g.fillStyle = dk2; // webbed toes
      g.fillRect(7, 53, 13, 1);
      g.fillRect(38, 53, 13, 1);

      // bloated body
      g.fillStyle = flesh;
      g.fillRect(11, 22, 36, 26);
      g.fillStyle = lit;
      g.fillRect(12, 22, 34, 3);
      g.fillStyle = dk;
      g.fillRect(11, 43, 36, 5);
      // pale slimy belly
      g.fillStyle = "#c2cf86";
      g.fillRect(20, 34, 18, 12);

      // warty speckle
      g.fillStyle = dk2;
      for (let i = 0; i < 30; i++) {
        g.fillRect(12 + ((rng() * 33) | 0), 24 + ((rng() * 22) | 0), 1, 1);
      }

      // hunched shoulders + stubby arms
      g.fillStyle = flesh;
      g.fillRect(4, 24, 12, 14);
      g.fillRect(42, 24, 12, 14);
      g.fillStyle = dk;
      g.fillRect(4, 34, 12, 4);
      g.fillRect(42, 34, 12, 4);

      // broad head fused to body, huge gulping maw
      g.fillStyle = flesh;
      g.fillRect(15, 8, 28, 16);
      g.fillStyle = lit;
      g.fillRect(15, 8, 28, 3);
      g.fillStyle = "#1a1206"; // cavernous maw
      g.fillRect(17, 17, 24, 6);
      g.fillStyle = "#c44a5a"; // gullet
      g.fillRect(24, 19, 10, 3);
      g.fillStyle = "#e8e0c0"; // jagged fangs
      for (let i = 0; i < 6; i++) g.fillRect(18 + i * 4, 17, 2, 2);
      // bulging sickly eyes
      g.fillStyle = flesh;
      g.fillRect(15, 3, 9, 8);
      g.fillRect(34, 3, 9, 8);
      g.fillStyle = sick;
      g.fillRect(17, 5, 5, 5);
      g.fillRect(36, 5, 5, 5);
      g.fillStyle = "#111";
      g.fillRect(19, 7, 2, 3);
      g.fillRect(38, 7, 2, 3);
      g.fillStyle = "#dff07a"; // glow rim
      g.fillRect(17, 5, 5, 1);
      g.fillRect(36, 5, 5, 1);

      // dripping slime gobs
      g.fillStyle = slime;
      g.fillRect(13, 47, 2, 5);
      g.fillRect(30, 48, 2, 6);
      g.fillRect(44, 46, 2, 4);
      g.fillStyle = sick;
      g.fillRect(30, 52, 2, 2);
    });

    // Tidewrought: a drowned stone colossus, barnacled and seaweed-draped.
    E("tidewrought", 60, 62, (g, rng) => {
      const stone = "#5d6e72";
      const lit = shade(stone, 0.24);
      const dk = shade(stone, -0.32);
      const dk2 = shade(stone, -0.52);
      const weed = "#3f6e4a";
      const barn = "#c0c4b0";
      const eye = "#7ee0ff";

      g.fillStyle = "rgba(0,0,0,0.34)";
      g.fillRect(8, 56, 46, 4);

      // heavy stone legs
      g.fillStyle = stone;
      g.fillRect(15, 44, 11, 14);
      g.fillRect(34, 44, 11, 14);
      g.fillStyle = dk;
      g.fillRect(15, 54, 11, 4);
      g.fillRect(34, 54, 11, 4);

      // barnacled colossus torso
      g.fillStyle = stone;
      g.fillRect(12, 18, 36, 28);
      g.fillStyle = lit;
      g.fillRect(12, 18, 36, 3);
      g.fillRect(13, 21, 4, 22);
      g.fillStyle = dk;
      g.fillRect(43, 20, 5, 24);
      g.fillRect(12, 42, 36, 4);
      // water-worn cracks
      g.fillStyle = dk2;
      g.fillRect(24, 20, 1, 22);
      g.fillRect(33, 22, 1, 20);
      g.fillRect(18, 30, 10, 1);

      // massive shoulders + arms
      g.fillStyle = stone;
      g.fillRect(3, 16, 13, 14);
      g.fillRect(44, 16, 13, 14);
      g.fillStyle = lit;
      g.fillRect(4, 17, 5, 3);
      g.fillRect(45, 17, 5, 3);
      g.fillStyle = stone;
      g.fillRect(2, 28, 10, 18);
      g.fillRect(48, 28, 10, 18);
      g.fillStyle = dk;
      g.fillRect(2, 42, 10, 4);
      g.fillRect(48, 42, 10, 4);

      // head sunk between shoulders, hollow glowing sockets
      g.fillStyle = stone;
      g.fillRect(20, 5, 20, 15);
      g.fillStyle = lit;
      g.fillRect(20, 5, 20, 2);
      g.fillStyle = dk;
      g.fillRect(20, 16, 20, 4);
      g.fillStyle = "#0c1614"; // recessed sockets
      g.fillRect(23, 10, 6, 4);
      g.fillRect(31, 10, 6, 4);
      g.fillStyle = eye;
      g.fillRect(24, 11, 3, 2);
      g.fillRect(32, 11, 3, 2);
      g.fillStyle = "#dff8ff";
      g.fillRect(24, 11, 1, 1);
      g.fillRect(32, 11, 1, 1);

      // seaweed drapes
      g.fillStyle = weed;
      g.fillRect(14, 18, 2, 14);
      g.fillRect(30, 20, 2, 16);
      g.fillRect(45, 18, 2, 12);
      g.fillStyle = "#588a5a";
      g.fillRect(30, 20, 1, 9);
      // barnacle clusters
      g.fillStyle = barn;
      g.fillRect(38, 26, 3, 3);
      g.fillRect(18, 36, 3, 3);
      g.fillRect(50, 32, 2, 2);
      g.fillStyle = dk2;
      g.fillRect(39, 27, 1, 1);
      g.fillRect(19, 37, 1, 1);
    });

    // Magmaroth: the Act II final boss — a cinder tyrant of cracked obsidian
    // with molten seams and a blazing core. The largest, most imposing sprite.
    E("magmaroth", 64, 64, (g, rng) => {
      const rock = "#2c2530";
      const lit = shade(rock, 0.3);
      const dk = shade(rock, -0.4);
      const seam = "#ff7a2a";
      const seamHot = "#ffd24a";
      const seamDim = "#a83216";
      const core = "#ffe27a";

      g.fillStyle = "rgba(0,0,0,0.38)";
      g.fillRect(6, 58, 52, 5);

      // colossal cloven legs
      g.fillStyle = rock;
      g.fillRect(16, 46, 12, 16);
      g.fillRect(36, 46, 12, 16);
      g.fillStyle = dk;
      g.fillRect(16, 58, 12, 4);
      g.fillRect(36, 58, 12, 4);
      g.fillStyle = seamDim; // molten ankles
      g.fillRect(18, 54, 8, 1);
      g.fillRect(38, 54, 8, 1);

      // hulking obsidian torso
      g.fillStyle = rock;
      g.fillRect(11, 18, 42, 30);
      g.fillStyle = lit;
      g.fillRect(11, 18, 42, 3);
      g.fillRect(12, 21, 4, 24);
      g.fillStyle = dk;
      g.fillRect(48, 20, 5, 26);
      g.fillRect(11, 43, 42, 5);

      // jagged shoulder crags + spikes
      g.fillStyle = rock;
      g.fillRect(2, 14, 16, 16);
      g.fillRect(46, 14, 16, 16);
      g.fillStyle = lit;
      g.fillRect(3, 15, 6, 3);
      g.fillRect(47, 15, 6, 3);
      g.fillStyle = dk;
      g.fillRect(0, 8, 4, 8); // spikes
      g.fillRect(8, 4, 4, 9);
      g.fillRect(52, 4, 4, 9);
      g.fillRect(60, 8, 4, 8);
      g.fillStyle = rock;
      g.fillRect(8, 4, 3, 9);
      g.fillRect(53, 4, 3, 9);

      // massive arms + fists
      g.fillStyle = rock;
      g.fillRect(1, 28, 11, 22);
      g.fillRect(52, 28, 11, 22);
      g.fillStyle = dk;
      g.fillRect(1, 44, 11, 6);
      g.fillRect(52, 44, 11, 6);
      g.fillStyle = lit;
      g.fillRect(1, 28, 3, 14);
      g.fillRect(52, 28, 3, 14);

      // molten seams webbing the body
      g.fillStyle = seamDim;
      g.fillRect(20, 20, 1, 22);
      g.fillRect(33, 22, 1, 20);
      g.fillRect(16, 30, 22, 1);
      g.fillRect(4, 34, 8, 1);
      g.fillRect(52, 34, 8, 1);
      g.fillStyle = seam;
      g.fillRect(20, 20, 1, 12);
      g.fillRect(16, 30, 14, 1);
      g.fillRect(4, 34, 8, 1);
      g.fillStyle = seamHot;
      g.fillRect(22, 30, 5, 1);

      // blazing chest core (layered glow)
      g.fillStyle = seamDim;
      g.fillRect(26, 28, 12, 12);
      g.fillStyle = seam;
      g.fillRect(28, 30, 8, 8);
      g.fillStyle = seamHot;
      g.fillRect(29, 31, 5, 5);
      g.fillStyle = "#fff3c0";
      g.fillRect(30, 32, 2, 2);

      // brutal horned head sunk into the shoulders
      g.fillStyle = rock;
      g.fillRect(22, 4, 20, 16);
      g.fillStyle = lit;
      g.fillRect(22, 4, 20, 2);
      g.fillStyle = dk;
      g.fillRect(22, 16, 20, 4);
      // curved horns
      g.fillStyle = rock;
      g.fillRect(18, 0, 4, 8);
      g.fillRect(42, 0, 4, 8);
      g.fillRect(15, 4, 3, 4);
      g.fillRect(46, 4, 3, 4);
      // blazing eyes + grinning molten maw
      g.fillStyle = seamDim;
      g.fillRect(25, 9, 6, 4);
      g.fillRect(33, 9, 6, 4);
      g.fillStyle = core;
      g.fillRect(26, 10, 4, 2);
      g.fillRect(34, 10, 4, 2);
      g.fillStyle = "#fff";
      g.fillRect(27, 10, 1, 1);
      g.fillRect(35, 10, 1, 1);
      g.fillStyle = "#1a0c06"; // maw
      g.fillRect(26, 15, 12, 3);
      g.fillStyle = seamHot; // glowing teeth-gaps
      for (let i = 0; i < 5; i++) g.fillRect(27 + i * 2, 15, 1, 3);

      // cinder speckle drifting off the body
      g.fillStyle = "#ff8a3a";
      for (let i = 0; i < 14; i++) {
        g.fillRect(8 + ((rng() * 48) | 0), 6 + ((rng() * 44) | 0), 1, 1);
      }
    });
  }

  enemy(name) {
    return this.enemies[name] || this.enemies.slime;
  }

  // ------------------------------------------------------------ PORTRAITS ---
  _buildPortraits() {
    const P = (name, fn) => {
      const c = nc(32, 32);
      fn(c.getContext("2d"));
      this.portraits[name] = c;
    };
    const face = faceDraw;
    P("hero", face("#e8b98c", "#5a3a22", { cloth: "#3d7dca" }));
    P("elder", face("#dcb594", "#d8d8d8", { beard: true, bald: true, cloth: "#6a5a8a" }));
    P("shopkeeper", face("#caa07a", "#3a2a18", { cloth: "#2f8a5a", eye: "#1a1a1a" }));
    P("guard", face("#d8a878", "#2a2a2a", { cloth: "#5a6173" }));
    P("villager_f", face("#e6c0a0", "#7a4a2a", { cloth: "#b23c8a" }));
    P("villager_m", face("#d2a072", "#4a3018", { cloth: "#7a6a3a" }));
    P("child", face("#f0c8a8", "#caa24f", { cloth: "#d8a040" }));
    P("warden", face("#9aa8c8", "#2c2150", { hood: "#1d1638", eye: "#7ee0ff", bg: "#0d0a1a" }));
    P("ghost", face("#cfe0ff", "#cfe0ff", { eye: "#3a4a6a", bg: "#101826" }));
    P("king", face("#dcb594", "#cfcfcf", { beard: true, cloth: "#7a2f8a", eye: "#1a1a1a" }));
    P("narrator", (g) => {
      g.fillStyle = "#0d0a1a";
      g.fillRect(0, 0, 32, 32);
      g.fillStyle = "#ffd86a";
      g.fillRect(12, 10, 8, 8);
      g.fillStyle = "#fff3c0";
      g.fillRect(14, 12, 3, 3);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.fillRect(16 + Math.cos(a) * 9, 14 + Math.sin(a) * 9, 2, 2);
      }
    });
  }

  portrait(name) {
    return this.portraits[name] || this.portraits.hero;
  }

  // A portrait that MATCHES a character's colors: rebuilds the face for `name`
  // using {skin, hair, shirt}. Cached per name+colors. Falls back to the static
  // portrait when no colors are given or the name has no color-matched variant.
  portraitFor(name, colors) {
    const typeOpts = FACE_TYPES[name];
    if (!colors || !typeOpts) return this.portrait(name);
    const skin = colors.skin || "#e8b98c";
    const hair = colors.hair || "#5a3a22";
    const cloth = colors.shirt || "#3d7dca";
    const key = `${name}|${skin}|${hair}|${cloth}`;
    if (!this._dynPortraits) this._dynPortraits = {};
    if (this._dynPortraits[key]) return this._dynPortraits[key];
    const c = nc(32, 32);
    faceDraw(skin, hair, { ...typeOpts, cloth })(c.getContext("2d"));
    this._dynPortraits[key] = c;
    return c;
  }

  // ---------------------------------------------------------------- ICONS ---
  _buildIcons() {
    const I = (name, fn) => {
      const c = nc(12, 12);
      fn(c.getContext("2d"));
      this.icons[name] = c;
    };
    I("potion", (g) => {
      g.fillStyle = "#cfd6e6";
      g.fillRect(5, 1, 2, 2);
      g.fillStyle = "#d23a4a";
      g.fillRect(3, 4, 6, 7);
      g.fillStyle = "#ff7a8a";
      g.fillRect(4, 5, 2, 4);
      g.fillStyle = "#9aa1ad";
      g.fillRect(4, 3, 4, 1);
    });
    I("ether", (g) => {
      g.fillStyle = "#cfd6e6";
      g.fillRect(5, 1, 2, 2);
      g.fillStyle = "#3a6ad2";
      g.fillRect(3, 4, 6, 7);
      g.fillStyle = "#7aa0ff";
      g.fillRect(4, 5, 2, 4);
    });
    I("elixir", (g) => {
      g.fillStyle = "#cfd6e6";
      g.fillRect(5, 1, 2, 2);
      g.fillStyle = "#d2a83a";
      g.fillRect(3, 4, 6, 7);
      g.fillStyle = "#ffe27a";
      g.fillRect(4, 5, 2, 4);
    });
    I("sword", (g) => {
      g.fillStyle = "#cfd6e6";
      g.fillRect(6, 1, 2, 7);
      g.fillStyle = "#fff";
      g.fillRect(6, 1, 1, 7);
      g.fillStyle = "#caa24f";
      g.fillRect(4, 8, 6, 1);
      g.fillStyle = "#8a5e38";
      g.fillRect(6, 9, 2, 2);
    });
    I("shield", (g) => {
      g.fillStyle = "#8a5e38";
      g.fillRect(3, 2, 6, 7);
      g.fillRect(4, 9, 4, 1);
      g.fillStyle = "#caa24f";
      g.fillRect(4, 3, 4, 4);
      g.fillStyle = "#fff";
      g.fillRect(5, 4, 1, 2);
    });
    I("boot", (g) => {
      g.fillStyle = "#7a4a2a";
      g.fillRect(4, 2, 3, 6);
      g.fillRect(4, 8, 6, 2);
      g.fillStyle = "#a06a3e";
      g.fillRect(5, 3, 1, 4);
    });
    I("star", (g) => {
      g.fillStyle = "#ffd86a";
      g.fillRect(5, 1, 2, 10);
      g.fillRect(1, 5, 10, 2);
      g.fillRect(3, 3, 6, 6);
      g.fillStyle = "#fff3c0";
      g.fillRect(5, 4, 2, 2);
    });
    I("key", (g) => {
      g.fillStyle = "#e0c060";
      g.fillRect(3, 2, 4, 4);
      g.fillStyle = "#1a2138";
      g.fillRect(4, 3, 2, 2);
      g.fillStyle = "#e0c060";
      g.fillRect(5, 6, 2, 5);
      g.fillRect(7, 8, 2, 1);
      g.fillRect(7, 10, 2, 1);
    });
    I("coin", (g) => {
      g.fillStyle = "#e0c060";
      g.fillRect(3, 2, 6, 8);
      g.fillStyle = "#fff3c0";
      g.fillRect(4, 3, 2, 6);
      g.fillStyle = "#a07a20";
      g.fillRect(7, 3, 1, 6);
    });
    I("heart", (g) => {
      g.fillStyle = "#e0405a";
      g.fillRect(2, 3, 3, 3);
      g.fillRect(7, 3, 3, 3);
      g.fillRect(2, 4, 8, 3);
      g.fillRect(4, 7, 4, 2);
      g.fillRect(5, 9, 2, 1);
    });
    I("skull", (g) => {
      g.fillStyle = "#e6e2d2";
      g.fillRect(3, 2, 6, 6);
      g.fillRect(4, 8, 4, 2);
      g.fillStyle = "#11151f";
      g.fillRect(4, 4, 2, 2);
      g.fillRect(7, 4, 2, 2);
    });
    I("scroll", (g) => {
      g.fillStyle = "#e0d2a0";
      g.fillRect(3, 2, 6, 8);
      g.fillStyle = "#8a5e38";
      g.fillRect(3, 2, 6, 1);
      g.fillRect(3, 9, 6, 1);
      g.fillStyle = "#9a7a4a";
      g.fillRect(4, 4, 4, 1);
      g.fillRect(4, 6, 4, 1);
    });
  }

  icon(name) {
    return this.icons[name];
  }
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 5x7 bitmap font. Each glyph is 7 rows of up to 5 columns ('#' = on).
const FONT = {
  A: ".###./#...#/#...#/#####/#...#/#...#/#...#",
  B: "####./#...#/#...#/####./#...#/#...#/####.",
  C: ".###./#...#/#..../#..../#..../#...#/.###.",
  D: "###../#..#./#...#/#...#/#...#/#..#./###..",
  E: "#####/#..../#..../####./#..../#..../#####",
  F: "#####/#..../#..../####./#..../#..../#....",
  G: ".###./#...#/#..../#.###/#...#/#...#/.###.",
  H: "#...#/#...#/#...#/#####/#...#/#...#/#...#",
  I: ".###./..#../..#../..#../..#../..#../.###.",
  J: "..###/...#./...#./...#./#..#./#..#./.##..",
  K: "#...#/#..#./#.#../##.../#.#../#..#./#...#",
  L: "#..../#..../#..../#..../#..../#..../#####",
  M: "#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#",
  N: "#...#/##..#/#.#.#/#.#.#/#..##/#...#/#...#",
  O: ".###./#...#/#...#/#...#/#...#/#...#/.###.",
  P: "####./#...#/#...#/####./#..../#..../#....",
  Q: ".###./#...#/#...#/#...#/#.#.#/#..#./.##.#",
  R: "####./#...#/#...#/####./#.#../#..#./#...#",
  S: ".####/#..../#..../.###./....#/....#/####.",
  T: "#####/..#../..#../..#../..#../..#../..#..",
  U: "#...#/#...#/#...#/#...#/#...#/#...#/.###.",
  V: "#...#/#...#/#...#/#...#/#...#/.#.#./..#..",
  W: "#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#",
  X: "#...#/#...#/.#.#./..#../.#.#./#...#/#...#",
  Y: "#...#/#...#/.#.#./..#../..#../..#../..#..",
  Z: "#####/....#/...#./..#../.#.../#..../#####",
  a: "...../...../.###./....#/.####/#...#/.####",
  b: "#..../#..../####./#...#/#...#/#...#/####.",
  c: "...../...../.###./#..../#..../#...#/.###.",
  d: "....#/....#/.####/#...#/#...#/#...#/.####",
  e: "...../...../.###./#...#/#####/#..../.###.",
  f: "..##./.#.../.#.../###../.#.../.#.../.#...",
  g: "...../.####/#...#/#...#/.####/....#/.###.",
  h: "#..../#..../####./#...#/#...#/#...#/#...#",
  i: "..#../...../.##../..#../..#../..#../.###.",
  j: "...#./...../..##./...#./...#./#..#./.##..",
  k: "#..../#..../#..#./#.#../##.../#.#../#..#.",
  l: ".##../..#../..#../..#../..#../..#../.###.",
  m: "...../...../##.#./#.#.#/#.#.#/#...#/#...#",
  n: "...../...../####./#...#/#...#/#...#/#...#",
  o: "...../...../.###./#...#/#...#/#...#/.###.",
  p: "...../####./#...#/#...#/####./#..../#....",
  q: "...../.####/#...#/#...#/.####/....#/....#",
  r: "...../...../#.##./##..#/#..../#..../#....",
  s: "...../...../.####/#..../.###./....#/####.",
  t: ".#.../.#.../###../.#.../.#.../.#..#/..##.",
  u: "...../...../#...#/#...#/#...#/#..##/.##.#",
  v: "...../...../#...#/#...#/#...#/.#.#./..#..",
  w: "...../...../#...#/#...#/#.#.#/#.#.#/.#.#.",
  x: "...../...../#...#/.#.#./..#../.#.#./#...#",
  y: "...../#...#/#...#/#...#/.####/....#/.###.",
  z: "...../...../#####/...#./..#../.#.../#####",
  0: ".###./#...#/#..##/#.#.#/##..#/#...#/.###.",
  1: "..#../.##../..#../..#../..#../..#../.###.",
  2: ".###./#...#/....#/...#./..#../.#.../#####",
  3: "#####/...#./..#../...#./....#/#...#/.###.",
  4: "...#./..##./.#.#./#..#./#####/...#./...#.",
  5: "#####/#..../####./....#/....#/#...#/.###.",
  6: ".###./#..../#..../####./#...#/#...#/.###.",
  7: "#####/....#/...#./..#../.#.../.#.../.#...",
  8: ".###./#...#/#...#/.###./#...#/#...#/.###.",
  9: ".###./#...#/#...#/.####/....#/....#/.###.",
  " ": "...../...../...../...../...../...../.....",
  ".": "...../...../...../...../...../.##../.##..",
  ",": "...../...../...../...../.##../.##../.#...",
  ":": "...../.##../.##../...../.##../.##../.....",
  ";": "...../.##../.##../...../.##../.#.../.....",
  "!": "..#../..#../..#../..#../..#../...../..#..",
  "?": ".###./#...#/....#/..##./..#../...../..#..",
  "'": "..#../..#../.#.../...../...../...../.....",
  '"': ".#.#./.#.#./...../...../...../...../.....",
  "-": "...../...../...../#####/...../...../.....",
  "+": "...../..#../..#../#####/..#../..#../.....",
  "=": "...../...../#####/...../#####/...../.....",
  "/": "....#/...#./..#../..#../.#.../#..../#....",
  "\\": "#..../#..../.#.../..#../..#../...#./....#",
  "(": "..##./.#.../.#.../.#.../.#.../.#.../..##.",
  ")": ".##../...#./...#./...#./...#./...#./.##..",
  "[": ".###./.#.../.#.../.#.../.#.../.#.../.###.",
  "]": ".###./...#./...#./...#./...#./...#./.###.",
  "<": "...#./..#../.#.../#..../.#.../..#../...#.",
  ">": ".#.../..#../...#./....#/...#./..#../.#...",
  "%": "##.../##..#/...#./..#../.#.../#..##/...##",
  "*": "...../..#../#.#.#/.###./#.#.#/..#../.....",
  "&": ".##../#..#./#.#../.#.../#.#.#/#..#./.##.#",
  "#": ".#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.",
  "@": ".###./#...#/#.###/#.#.#/#.###/#..../.###.",
  _: "...../...../...../...../...../...../#####",
  "|": "..#../..#../..#../..#../..#../..#../..#..",
  "$": "..#../.####/#.#../.###./..#.#/####./..#..",
};

export const sprites = new Sprites();
