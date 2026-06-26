// Render a real PNG of the procedural sprites + bitmap font using a minimal
// raster-canvas shim, upscaled like the browser, so the visual fixes (crisp
// text, side-view hair/arms) can be inspected. Run: node game/snapshot.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

// ---- color parsing ----
function parseColor(s) {
  if (Array.isArray(s)) return s;
  if (typeof s !== "string") return [255, 255, 255, 255];
  if (s[0] === "#") {
    let h = s.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x.trim()));
    return [p[0] | 0, p[1] | 0, p[2] | 0, p[3] == null ? 255 : Math.round(p[3] * 255)];
  }
  return [255, 255, 255, 255];
}

class RC {
  constructor(w, h) {
    this._w = 0;
    this._h = 0;
    this.data = new Uint8ClampedArray(4);
    this.width = w || 1;
    this.height = h || 1;
  }
  get width() {
    return this._w;
  }
  set width(v) {
    this._w = v | 0;
    this._alloc();
  }
  get height() {
    return this._h;
  }
  set height(v) {
    this._h = v | 0;
    this._alloc();
  }
  _alloc() {
    if (this._w > 0 && this._h > 0) this.data = new Uint8ClampedArray(this._w * this._h * 4);
  }
  getContext() {
    return new RCtx(this);
  }
}

class RCtx {
  constructor(cv) {
    this.cv = cv;
    this._fill = [255, 255, 255, 255];
    this.globalAlpha = 1;
    this.imageSmoothingEnabled = false;
    this.globalCompositeOperation = "source-over";
    this.tx = 0;
    this.ty = 0;
    this.sx = 1;
    this.sy = 1;
    this._stack = [];
  }
  set fillStyle(v) {
    this._fill = parseColor(v);
  }
  get fillStyle() {
    return this._fill;
  }
  set strokeStyle(v) {}
  save() {
    this._stack.push([this.globalAlpha, this.tx, this.ty, this.sx, this.sy, this._fill]);
  }
  restore() {
    const s = this._stack.pop();
    if (s) [this.globalAlpha, this.tx, this.ty, this.sx, this.sy, this._fill] = s;
  }
  translate(x, y) {
    this.tx += x * this.sx;
    this.ty += y * this.sy;
  }
  scale(x, y) {
    this.sx *= x;
    this.sy *= y;
  }
  createLinearGradient() {
    return { addColorStop() {} };
  }
  createRadialGradient() {
    return { addColorStop() {} };
  }
  beginPath() {}
  arc() {}
  fill() {}
  stroke() {}
  fillText() {}
  strokeRect() {}
  clearRect() {}
  _px(x, y, rgba, a) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.cv.width || y >= this.cv.height) return;
    const i = (y * this.cv.width + x) * 4;
    const d = this.cv.data;
    const al = (rgba[3] / 255) * a;
    d[i] = d[i] * (1 - al) + rgba[0] * al;
    d[i + 1] = d[i + 1] * (1 - al) + rgba[1] * al;
    d[i + 2] = d[i + 2] * (1 - al) + rgba[2] * al;
    d[i + 3] = Math.max(d[i + 3], Math.round(al * 255));
  }
  fillRect(x, y, w, h) {
    const X = this.tx + x * this.sx;
    const Y = this.ty + y * this.sy;
    const W = w * this.sx;
    const H = h * this.sy;
    for (let yy = 0; yy < H; yy++)
      for (let xx = 0; xx < W; xx++) this._px(X + xx, Y + yy, this._fill, this.globalAlpha);
  }
  drawImage(img, ...a) {
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh;
    if (a.length === 2) {
      [dx, dy] = a; dw = sw; dh = sh;
    } else if (a.length === 4) {
      [dx, dy, dw, dh] = a;
    } else {
      [sx, sy, sw, sh, dx, dy, dw, dh] = a;
    }
    const DX = this.tx + dx * this.sx;
    const DY = this.ty + dy * this.sy;
    const DW = dw * this.sx;
    const DH = dh * this.sy;
    const src = img.data;
    for (let yy = 0; yy < DH; yy++) {
      const v = Math.floor((yy / DH) * sh) + sy;
      for (let xx = 0; xx < DW; xx++) {
        const u = Math.floor((xx / DW) * sw) + sx;
        if (u < 0 || v < 0 || u >= img.width || v >= img.height) continue;
        const si = (v * img.width + u) * 4;
        const al = src[si + 3];
        if (al === 0) continue;
        this._px(DX + xx, DY + yy, [src[si], src[si + 1], src[si + 2], al], this.globalAlpha);
      }
    }
  }
}

global.document = { createElement: () => new RC(1, 1), getElementById: () => new RC(320, 180) };
global.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
Object.defineProperty(global, "navigator", { value: { getGamepads: () => [] }, configurable: true });
const _ls = new Map();
global.localStorage = {
  getItem: (k) => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => _ls.set(k, v),
  removeItem: (k) => _ls.delete(k),
};

const { sprites } = await import("./src/sprites.js");
const { content } = await import("./src/data.js");
await sprites.build();

// ---- render an interior map + furniture strip ----
const OVERLAY = new Set(["sign", "chest", "chest_open"]);
function baseFloorOf(map) {
  const v = Object.values(map.legend || {});
  if (v.includes("floor_wood")) return "floor_wood";
  if (v.includes("floor_stone")) return "floor_stone";
  if (v.includes("sand")) return "sand";
  if (v.includes("dirt")) return "dirt";
  return "grass";
}
function renderMap(ctx, map, ox, oy) {
  const rows = map.rows;
  const base = baseFloorOf(map);
  for (let ty = 0; ty < rows.length; ty++) {
    for (let tx = 0; tx < rows[ty].length; tx++) {
      const name = map.legend[rows[ty][tx]] || "void";
      if (OVERLAY.has(name)) ctx.drawImage(sprites.tile(base), ox + tx * 16, oy + ty * 16);
      ctx.drawImage(sprites.tile(name), ox + tx * 16, oy + ty * 16);
    }
  }
  // draw NPCs
  for (const npc of map.npcs || []) {
    const a = sprites.makeActor(npc.sprite || { skin: "#e8b98c", hair: "#5a3a22", shirt: "#3d7dca", pants: "#2a2f45" });
    sprites.drawActor(ctx, a, ox + npc.tx * 16, oy + npc.ty * 16, npc.dir || "down", 0, 1);
  }
  // player on spawn
  if (map.spawn) {
    const pa = sprites.makeActor({ skin: "#e8b98c", hair: "#5a3a22", shirt: "#3d7dca", pants: "#2a2f45" });
    sprites.drawActor(ctx, pa, ox + map.spawn.tx * 16, oy + map.spawn.ty * 16, map.spawn.dir || "up", 0, 1);
  }
}

const store = content.maps.general_store;
const inn = content.maps.inn;
const elder = content.maps.elder_house;
const mw = 16 * 16;
const mh = 12 * 16;
const W = mw * 2 + 24, H = mh * 2 + 52;
const cv = new RC(W, H);
const ctx = cv.getContext("2d");
ctx.fillStyle = "#10162b";
ctx.fillRect(0, 0, W, H);

sprites.text(ctx, "general_store", 8, 4, "#ffe9a8");
renderMap(ctx, store, 8, 16);
sprites.text(ctx, "inn", mw + 16, 4, "#ffe9a8");
renderMap(ctx, inn, mw + 16, 16);
sprites.text(ctx, "elder_house", 8, mh + 28, "#ffe9a8");
renderMap(ctx, elder, 8, mh + 40);

// ---- upscale 3x (nearest) like the browser ----
const SCALE = 3;
const OW = W * SCALE, OH = H * SCALE;
const out = new Uint8ClampedArray(OW * OH * 4);
for (let y = 0; y < OH; y++) {
  const sy = Math.floor(y / SCALE);
  for (let x = 0; x < OW; x++) {
    const sx = Math.floor(x / SCALE);
    const si = (sy * W + sx) * 4;
    const di = (y * OW + x) * 4;
    out[di] = cv.data[si];
    out[di + 1] = cv.data[si + 1];
    out[di + 2] = cv.data[si + 2];
    out[di + 3] = 255;
  }
}

writeFileSync("game/preview.png", encodePNG(OW, OH, out));
console.log(`wrote game/preview.png (${OW}x${OH})`);

// ---- render the Settings screen to verify layout (no overlap) ----
const { input } = await import("./src/input.js");
const { audio } = await import("./src/audio.js");
const { states } = await import("./src/registry.js");
await import("./src/states/settings.js");

const scv = new RC(320, 180);
const sctx = scv.getContext("2d");
sctx.fillStyle = "#0b0f1a";
sctx.fillRect(0, 0, 320, 180);
const Gstub = {
  ctx: sctx, W: 320, H: 180, sprites, input, audio, content,
  player: { map: "town" },
  toast() {},
};
const L = {};
states.settings.enter(Gstub, {}, L);
states.settings.render(Gstub, L);

const out2 = upscale(scv, 3);
writeFileSync("game/preview_settings.png", encodePNG(320 * 3, 180 * 3, out2));
console.log("wrote game/preview_settings.png (960x540)");

// ---- render the Title "How to Play" overlay ----
await import("./src/states/title.js");
const hcv = new RC(320, 180);
const hctx = hcv.getContext("2d");
const Gh = {
  ctx: hctx, W: 320, H: 180, sprites, input, audio, content,
  save: { has: () => true },
  time: 0,
};
const HL = {};
states.title.enter(Gh, {}, HL);
HL.howto = true;
HL.howScroll = 0;
states.title.render(Gh, HL);
writeFileSync("game/preview_howto.png", encodePNG(320 * 3, 180 * 3, upscale(hcv, 3)));
console.log("wrote game/preview_howto.png (960x540)");

// title menu (with a save present -> 5 items)
const tcv = new RC(320, 180);
const tctx = tcv.getContext("2d");
const Gt = { ctx: tctx, W: 320, H: 180, sprites, audio, input, content, save: { has: () => true }, time: 0.3 };
const TL = {};
states.title.enter(Gt, {}, TL);
TL.howto = false;
states.title.render(Gt, TL);
writeFileSync("game/preview_title.png", encodePNG(320 * 3, 180 * 3, upscale(tcv, 3)));
console.log("wrote game/preview_title.png (960x540)");

// ---- render battle scenes (env background + golem detail + effects) ----
await import("./src/states/battle.js");
const { newPlayer, computeStats } = await import("./src/stats.js");
const { createStory } = await import("./src/story.js");

function battleScene(env, enemyIds, fx) {
  const cv = new RC(320, 180);
  const c = cv.getContext("2d");
  const player = newPlayer("Hero");
  const G = {
    ctx: c, W: 320, H: 180, sprites, audio, input, content,
    player, story: createStory(),
    stats: () => computeStats(player, content),
    time: 0.5,
    push() {}, pop() {}, toast() {},
  };
  const L = {};
  states.battle.enter(G, { enemyIds, env }, L);
  L.phase = "menu";
  L.intro = null;
  // stage an effect + projectile on the first enemy
  if (fx) {
    const e = L.enemies[0];
    const tx = e.x, ty = e.y - 16;
    L.effects.push({ type: fx, x: tx, y: ty, color: "#ff7a3a", t: 0.12, dur: 0.36 });
    L.projectiles.push({ x0: 86, y0: 80, x1: tx, y1: ty, color: "#ff7a3a", anim: fx, t: 0.18, dur: 0.45 });
    for (let i = 0; i < 10; i++)
      L.particles.push({ x: tx + (Math.random() - 0.5) * 12, y: ty, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 60, life: 0.5, color: "#ffd23a", size: 2 });
  }
  states.battle.render(G, L);
  return cv;
}

const sc1 = battleScene("cave", ["golem", "crystal_golem"], null);
const sc2 = battleScene("forest", ["wolf"], "fire");
// stack the two scenes vertically
const BW = 320, BH = 180;
const bcv = new RC(BW, BH * 2 + 4);
const bctx = bcv.getContext("2d");
bctx.fillStyle = "#000";
bctx.fillRect(0, 0, BW, BH * 2 + 4);
bctx.drawImage(sc1, 0, 0);
bctx.drawImage(sc2, 0, BH + 4);
writeFileSync("game/preview_battle.png", encodePNG(BW * 2, (BH * 2 + 4) * 2, upscale(bcv, 2)));
console.log("wrote game/preview_battle.png");

// ---- isolated golem detail (scaled up) ----
const gcv = new RC(140, 70);
const gctx = gcv.getContext("2d");
gctx.fillStyle = "#1a2030";
gctx.fillRect(0, 0, 140, 70);
function blit(ctx, name, dx, dy) {
  const im = sprites.enemy(name);
  ctx.drawImage(im, 0, 0, im.width, im.height, dx, dy, im.width, im.height);
}
blit(gctx, "golem", 8, 12);
blit(gctx, "crystal_golem", 86, 12);
writeFileSync("game/preview_golem.png", encodePNG(140 * 6, 70 * 6, upscale(gcv, 6)));
console.log("wrote game/preview_golem.png");

// beasts (should face LEFT)
const wcv = new RC(120, 50);
const wctx = wcv.getContext("2d");
wctx.fillStyle = "#1a2030";
wctx.fillRect(0, 0, 120, 50);
blit(wctx, "wolf", 6, 8);
blit(wctx, "dire_wolf", 62, 4);
writeFileSync("game/preview_wolf.png", encodePNG(120 * 6, 50 * 6, upscale(wcv, 6)));
console.log("wrote game/preview_wolf.png");

// ---- render the power-up selection screen (emblem detail) ----
await import("./src/states/powerup.js");
function powerScreen(ids) {
  const cv = new RC(320, 180);
  const c = cv.getContext("2d");
  const player = newPlayer("Hero");
  const G = {
    ctx: c, W: 320, H: 180, sprites, audio, input, content, player,
    stats: (p) => computeStats(p || player, content),
    pop() {}, toast() {},
  };
  const L = {};
  states.powerup.enter(G, {}, L);
  L.options = ids.map((id) => content.powerups[id]);
  L.before = computeStats(player, content);
  L.after = L.options.map((o) => computeStats({ ...player, powerups: [o.id] }, content));
  L.sel = 1;
  L.t = 0.4;
  states.powerup.render(G, L);
  return cv;
}
const ps1 = powerScreen(["titan_heart", "sun_pendant", "vampire_fang"]);
const ps2 = powerScreen(["power_band", "haste_rune", "lucky_clover"]);
const pcv = new RC(320, 364);
const pctx = pcv.getContext("2d");
pctx.drawImage(ps1, 0, 0);
pctx.drawImage(ps2, 0, 184);
writeFileSync("game/preview_powerup.png", encodePNG(320 * 2, 364 * 2, upscale(pcv, 2)));
console.log("wrote game/preview_powerup.png");

// ---- render the Game Over screen ----
await import("./src/states/gameover.js");
const ocv = new RC(320, 180);
const octx = ocv.getContext("2d");
const Ggo = {
  ctx: octx, W: 320, H: 180, sprites, audio, input, content,
  player: { level: 6, map: "forest_deep" },
  save: { has: () => true },
  continueGame() {}, clearTo() {},
};
const OL = {};
states.gameover.enter(Ggo, {}, OL);
OL.t = 1.6;
states.gameover.render(Ggo, OL);
writeFileSync("game/preview_gameover.png", encodePNG(320 * 3, 180 * 3, upscale(ocv, 3)));
console.log("wrote game/preview_gameover.png");

// ---- render the full town map (road network check) ----
const townMap = content.maps.town;
const tww = townMap.rows[0].length * 16;
const twh = townMap.rows.length * 16;
const twcv = new RC(tww, twh);
const twctx = twcv.getContext("2d");
twctx.fillStyle = "#06070d";
twctx.fillRect(0, 0, tww, twh);
renderMap(twctx, townMap, 0, 0);
writeFileSync("game/preview_town.png", encodePNG(tww * 2, twh * 2, upscale(twcv, 2)));
console.log("wrote game/preview_town.png");

const fd = content.maps.forest_deep;
const fdw = fd.rows[0].length * 16;
const fdh = fd.rows.length * 16;
const fdcv = new RC(fdw, fdh);
const fdctx = fdcv.getContext("2d");
fdctx.fillStyle = "#06070d";
fdctx.fillRect(0, 0, fdw, fdh);
renderMap(fdctx, fd, 0, 0);
writeFileSync("game/preview_forestdeep.png", encodePNG(fdw * 2, fdh * 2, upscale(fdcv, 2)));
console.log("wrote game/preview_forestdeep.png");

function upscale(cvIn, s) {
  const ow = cvIn.width * s, oh = cvIn.height * s;
  const o = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    const sy = Math.floor(y / s);
    for (let x = 0; x < ow; x++) {
      const sx = Math.floor(x / s);
      const si = (sy * cvIn.width + sx) * 4;
      const di = (y * ow + x) * 4;
      o[di] = cvIn.data[si]; o[di + 1] = cvIn.data[si + 1];
      o[di + 2] = cvIn.data[si + 2]; o[di + 3] = 255;
    }
  }
  return o;
}

// ---- minimal PNG encoder ----
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter none
    rgba.subarray(y * w * 4, (y + 1) * w * 4).forEach((v, i) => {
      raw[y * (w * 4 + 1) + 1 + i] = v;
    });
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}
var _crcTable = null;
function crc32(buf) {
  if (!_crcTable) {
    _crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      _crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = _crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}
