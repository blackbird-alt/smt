// Render the ACTUAL in-game maps (real procedural tiles + NPCs + spawn) to PNGs.
// Reuses the raster-canvas shim approach from snapshot.mjs. Run from repo root:
//   node game/_mapshot.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

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
  constructor(w, h) { this._w = 0; this._h = 0; this.data = new Uint8ClampedArray(4); this.width = w || 1; this.height = h || 1; }
  get width() { return this._w; } set width(v) { this._w = v | 0; this._alloc(); }
  get height() { return this._h; } set height(v) { this._h = v | 0; this._alloc(); }
  _alloc() { if (this._w > 0 && this._h > 0) this.data = new Uint8ClampedArray(this._w * this._h * 4); }
  getContext() { return new RCtx(this); }
}
class RCtx {
  constructor(cv) { this.cv = cv; this._fill = [255, 255, 255, 255]; this.globalAlpha = 1; this.imageSmoothingEnabled = false; this.globalCompositeOperation = "source-over"; this.tx = 0; this.ty = 0; this.sx = 1; this.sy = 1; this._stack = []; }
  set fillStyle(v) { this._fill = parseColor(v); } get fillStyle() { return this._fill; }
  set strokeStyle(v) {}
  save() { this._stack.push([this.globalAlpha, this.tx, this.ty, this.sx, this.sy, this._fill]); }
  restore() { const s = this._stack.pop(); if (s) [this.globalAlpha, this.tx, this.ty, this.sx, this.sy, this._fill] = s; }
  translate(x, y) { this.tx += x * this.sx; this.ty += y * this.sy; }
  scale(x, y) { this.sx *= x; this.sy *= y; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  beginPath() {} arc() {} fill() {} stroke() {} fillText() {} strokeRect() {} clearRect() {}
  _px(x, y, rgba, a) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.cv.width || y >= this.cv.height) return;
    const i = (y * this.cv.width + x) * 4; const d = this.cv.data; const al = (rgba[3] / 255) * a;
    d[i] = d[i] * (1 - al) + rgba[0] * al; d[i + 1] = d[i + 1] * (1 - al) + rgba[1] * al;
    d[i + 2] = d[i + 2] * (1 - al) + rgba[2] * al; d[i + 3] = Math.max(d[i + 3], Math.round(al * 255));
  }
  fillRect(x, y, w, h) {
    const X = this.tx + x * this.sx, Y = this.ty + y * this.sy, W = w * this.sx, H = h * this.sy;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) this._px(X + xx, Y + yy, this._fill, this.globalAlpha);
  }
  drawImage(img, ...a) {
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh;
    if (a.length === 2) { [dx, dy] = a; dw = sw; dh = sh; }
    else if (a.length === 4) { [dx, dy, dw, dh] = a; }
    else { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    const DX = this.tx + dx * this.sx, DY = this.ty + dy * this.sy, DW = dw * this.sx, DH = dh * this.sy, src = img.data;
    for (let yy = 0; yy < DH; yy++) {
      const v = Math.floor((yy / DH) * sh) + sy;
      for (let xx = 0; xx < DW; xx++) {
        const u = Math.floor((xx / DW) * sw) + sx;
        if (u < 0 || v < 0 || u >= img.width || v >= img.height) continue;
        const si = (v * img.width + u) * 4; const al = src[si + 3]; if (al === 0) continue;
        this._px(DX + xx, DY + yy, [src[si], src[si + 1], src[si + 2], al], this.globalAlpha);
      }
    }
  }
}
global.document = { createElement: () => new RC(1, 1), getElementById: () => new RC(320, 180) };
global.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
Object.defineProperty(global, "navigator", { value: { getGamepads: () => [] }, configurable: true });
const _ls = new Map();
global.localStorage = { getItem: (k) => (_ls.has(k) ? _ls.get(k) : null), setItem: (k, v) => _ls.set(k, v), removeItem: (k) => _ls.delete(k) };

const { sprites } = await import("./src/sprites.js");
const { content } = await import("./src/data.js");
await sprites.build();

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
  const rows = map.rows, base = baseFloorOf(map);
  for (let ty = 0; ty < rows.length; ty++)
    for (let tx = 0; tx < rows[ty].length; tx++) {
      const name = map.legend[rows[ty][tx]] || "void";
      if (OVERLAY.has(name)) ctx.drawImage(sprites.tile(base), ox + tx * 16, oy + ty * 16);
      ctx.drawImage(sprites.tile(name), ox + tx * 16, oy + ty * 16);
    }
  for (const npc of map.npcs || []) {
    const a = sprites.makeActor(npc.sprite || { skin: "#e8b98c", hair: "#5a3a22", shirt: "#3d7dca", pants: "#2a2f45" });
    sprites.drawActor(ctx, a, ox + npc.tx * 16, oy + npc.ty * 16, npc.dir || "down", 0, 1);
  }
  if (map.spawn) {
    const pa = sprites.makeActor({ skin: "#e8b98c", hair: "#5a3a22", shirt: "#3d7dca", pants: "#2a2f45" });
    sprites.drawActor(ctx, pa, ox + map.spawn.tx * 16, oy + map.spawn.ty * 16, map.spawn.dir || "up", 0, 1);
  }
}
function upscale(cvIn, s) {
  const ow = cvIn.width * s, oh = cvIn.height * s, o = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) { const sy = Math.floor(y / s);
    for (let x = 0; x < ow; x++) { const sx = Math.floor(x / s); const si = (sy * cvIn.width + sx) * 4, di = (y * ow + x) * 4;
      o[di] = cvIn.data[si]; o[di + 1] = cvIn.data[si + 1]; o[di + 2] = cvIn.data[si + 2]; o[di + 3] = 255; } }
  return o;
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0;
    rgba.subarray(y * w * 4, (y + 1) * w * 4).forEach((v, i) => { raw[y * (w * 4 + 1) + 1 + i] = v; }); }
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii"), len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}
var _crcTable = null;
function crc32(buf) {
  if (!_crcTable) { _crcTable = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; _crcTable[n] = c >>> 0; } }
  let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = _crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return c ^ 0xffffffff;
}

const OUT = "game/maps";
mkdirSync(OUT, { recursive: true });
const SCALE = 3;
for (const id in content.maps) {
  const map = content.maps[id];
  const w = map.rows[0].length * 16, h = map.rows.length * 16;
  const cv = new RC(w, h); const ctx = cv.getContext("2d");
  ctx.fillStyle = "#06070d"; ctx.fillRect(0, 0, w, h);
  renderMap(ctx, map, 0, 0);
  writeFileSync(`${OUT}/${id}.png`, encodePNG(w * SCALE, h * SCALE, upscale(cv, SCALE)));
  console.log(`wrote ${OUT}/${id}.png (${w * SCALE}x${h * SCALE}) — ${map.name}`);
}
console.log("done:", Object.keys(content.maps).length, "maps");
