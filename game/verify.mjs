// Data-level verification of movement/interaction reachability. Mirrors the
// overworld engine's solidity + entry-position logic against ALL content, so we
// can prove (without a browser) that you can move after every transition and
// that every NPC/sign/chest is reachable. Run: node game/verify.mjs
import { content } from "./src/data.js";

const DEFAULT_SOLID = new Set([
  "tree", "water", "water2", "rock", "wall_stone", "wall_brick",
  "pillar", "fence", "roof", "roof_dark", "void",
]);
const issues = [];
const warn = [];

function solidName(name) {
  const d = content.tileDefs[name];
  if (d && typeof d.solid === "boolean") return d.solid;
  return DEFAULT_SOLID.has(name);
}

function buildMap(map) {
  const rows = map.rows || [];
  const h = rows.length;
  const w = h ? rows[0].length : 0;
  const grid = [];
  for (let ty = 0; ty < h; ty++) {
    const line = [];
    for (let tx = 0; tx < w; tx++) {
      const ch = rows[ty][tx];
      line.push((map.legend && map.legend[ch]) || "void");
    }
    grid.push(line);
  }
  const solid = grid.map((row) => row.map((n) => solidName(n)));
  for (const tr of map.triggers || []) {
    if (tr.type === "transition") {
      const tw = tr.w || 1;
      const th = tr.h || 1;
      for (let dy = 0; dy < th; dy++)
        for (let dx = 0; dx < tw; dx++) {
          const x = tr.tx + dx;
          const y = tr.ty + dy;
          if (y >= 0 && y < h && x >= 0 && x < w) solid[y][x] = false;
        }
    }
  }
  return { w, h, grid, solid };
}

function inb(m, x, y) {
  return x >= 0 && x < m.w && y >= 0 && y < m.h;
}
function solidAt(m, x, y) {
  if (!inb(m, x, y)) return true;
  return m.solid[y][x];
}
function freeNeighbors(m, x, y) {
  let n = 0;
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]])
    if (!solidAt(m, x + dx, y + dy)) n++;
  return n;
}

function entryPosition(destId, fromId, fallbackDir) {
  const dest = content.maps[destId];
  if (!dest) return null;
  const ret = (dest.triggers || []).find(
    (t) => t.type === "transition" && t.to === fromId,
  );
  if (ret) return { tx: ret.tx, ty: ret.ty, dir: fallbackDir, via: "return-door" };
  if (dest.spawn) return { tx: dest.spawn.tx, ty: dest.spawn.ty, via: "spawn" };
  return null;
}

// BFS over walkable tiles from a set of seed tiles. Returns a reachable[][] grid.
function reachable(m, seeds) {
  const seen = Array.from({ length: m.h }, () => new Array(m.w).fill(false));
  const q = [];
  for (const [sx, sy] of seeds) {
    if (inb(m, sx, sy) && !m.solid[sy][sx] && !seen[sy][sx]) {
      seen[sy][sx] = true;
      q.push([sx, sy]);
    }
  }
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (inb(m, nx, ny) && !m.solid[ny][nx] && !seen[ny][nx]) {
        seen[ny][nx] = true;
        q.push([nx, ny]);
      }
    }
  }
  return seen;
}
function reachableNeighbor(reach, m, x, y) {
  if (inb(m, x, y) && !m.solid[y][x] && reach[y][x]) return true;
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]])
    if (inb(m, x + dx, y + dy) && reach[y + dy][x + dx]) return true;
  return false;
}

const built = {};
for (const id in content.maps) built[id] = buildMap(content.maps[id]);

// Seed reachability from each map's spawn + all of its transition tiles.
const reach = {};
for (const id in content.maps) {
  const m = built[id];
  const seeds = [];
  if (content.maps[id].spawn) seeds.push([content.maps[id].spawn.tx, content.maps[id].spawn.ty]);
  for (const tr of content.maps[id].triggers || [])
    if (tr.type === "transition") seeds.push([tr.tx, tr.ty]);
  reach[id] = reachable(m, seeds);
}

for (const id in content.maps) {
  const map = content.maps[id];
  const m = built[id];

  // spawn
  if (map.spawn) {
    if (solidAt(m, map.spawn.tx, map.spawn.ty))
      issues.push(`${id}: spawn (${map.spawn.tx},${map.spawn.ty}) is SOLID`);
    else if (freeNeighbors(m, map.spawn.tx, map.spawn.ty) === 0)
      issues.push(`${id}: spawn is boxed in (cannot move)`);
  }

  // NPCs
  for (const npc of map.npcs || []) {
    if (solidAt(m, npc.tx, npc.ty))
      issues.push(`${id}: NPC ${npc.id} at (${npc.tx},${npc.ty}) is on a SOLID tile`);
    if (!reachableNeighbor(reach[id], m, npc.tx, npc.ty))
      issues.push(`${id}: NPC ${npc.id} is unreachable (cannot be talked to)`);
  }

  // triggers
  for (const tr of map.triggers || []) {
    if (!inb(m, tr.tx, tr.ty))
      issues.push(`${id}: trigger ${tr.type} at (${tr.tx},${tr.ty}) OUT OF BOUNDS`);

    if (tr.type === "transition") {
      // Gated transitions stay physically walkable, so reachability is
      // unchanged; only validate that a referenced blocked dialogue exists.
      if (tr.blocked && !content.dialogues[tr.blocked])
        issues.push(`${id}: transition references missing blocked dialogue '${tr.blocked}'`);
      if (!content.maps[tr.to]) {
        issues.push(`${id}: transition -> missing map '${tr.to}'`);
        continue;
      }
      const ep = entryPosition(tr.to, id, tr.dir);
      if (!ep) {
        warn.push(`${id} -> ${tr.to}: no return door or spawn (will fallback)`);
        continue;
      }
      const dm = built[tr.to];
      if (solidAt(dm, ep.tx, ep.ty))
        issues.push(
          `${id} -> ${tr.to}: ENTRY (${ep.tx},${ep.ty}) via ${ep.via} is SOLID (player would be stuck)`,
        );
      else if (freeNeighbors(dm, ep.tx, ep.ty) === 0)
        issues.push(`${id} -> ${tr.to}: entry boxed in (cannot move after entering)`);
    }

    if (tr.type === "sign" || tr.type === "chest") {
      // interactable only if a walkable, reachable tile is adjacent
      if (!reachableNeighbor(reach[id], m, tr.tx, tr.ty))
        issues.push(`${id}: ${tr.type} at (${tr.tx},${tr.ty}) is NOT reachable`);
      if (tr.type === "sign" && tr.dialogue && !content.dialogues[tr.dialogue])
        issues.push(`${id}: sign references missing dialogue '${tr.dialogue}'`);
    }

    if (tr.type === "event" && tr.dialogue && !content.dialogues[tr.dialogue])
      issues.push(`${id}: event references missing dialogue '${tr.dialogue}'`);
  }
}

console.log("==== REACHABILITY VERIFY ====");
console.log(`maps: ${Object.keys(content.maps).length}`);
if (warn.length) {
  console.log(`\n${warn.length} warning(s):`);
  warn.forEach((w) => console.log("  ~", w));
}
if (issues.length === 0) {
  console.log("\nOK — all spawns, transitions, NPCs and sign/chest triggers are reachable.");
  process.exit(0);
} else {
  console.log(`\n${issues.length} ISSUE(S):`);
  issues.forEach((i) => console.log("  X", i));
  process.exit(1);
}
