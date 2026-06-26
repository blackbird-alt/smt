// ============================================================================
// Sunstone — Overworld state.
//
// Free pixel-movement exploration map: tile rendering, AABB collision, a
// camera that follows the player, animated NPCs, triggers (transitions, signs,
// chests, events, forced + random encounters) and a small HUD. Conforms to
// game/CONTRACT.md so it integrates with the independently-written data.js,
// dialogue.js, battle.js, powerup.js, menu.js, shop.js and gameover.js.
// ============================================================================

import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";
import { addItem, hasItem } from "../stats.js";

const TILE = sprites.TILE; // 16

// Player feet hitbox (relative to the 16x16 sprite top-left at player.x/y).
const HB_OX = 3;
const HB_OY = 7;
const HB_W = 10;
const HB_H = 8;

// Movement speeds (pixels / second).
const WALK_SPEED = 58;
const RUN_MULT = 1.7;
const NPC_SPEED = 22;
// How far a wandering NPC may roam from its home tile before it ambles back.
const WANDER_RADIUS = 3;

// Random-encounter pacing: a few "safe" qualifying steps before rolls begin.
const ENCOUNTER_GRACE = 6;
// Extra safe steps right after a battle so fights don't chain back-to-back.
const POST_BATTLE_GRACE = 8;

const DIR_DELTA = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE = { down: "up", up: "down", left: "right", right: "left" };

// Tiles considered solid when content.tileDefs does not list them. data.js is
// authoritative; this is only a robustness fallback matching the contract.
const DEFAULT_SOLID = new Set([
  "tree", "water", "water2", "rock", "wall_stone", "wall_brick",
  "pillar", "fence", "roof", "roof_dark", "void",
]);

// ----------------------------------------------------------------- helpers ---

function mapOf(G, local) {
  return G.content.maps[local.currentMapId];
}

// Object tiles drawn ON TOP of the ground (transparent sprites): signs, chests
// and crystals need a floor rendered behind them.
const OVERLAY_TILES = new Set(["sign", "chest", "chest_open", "crystal"]);

// Walkable ground tiles eligible to be drawn beneath an overlay tile, so the
// overlay's backdrop matches its local environment (a sign on a path shows
// path; a crystal on cave stone shows stone) rather than one map-wide floor.
const GROUND_TILES = new Set([
  "grass", "grass2", "path", "dirt", "sand", "floor_stone", "floor_crack",
  "rubble", "moss_stone", "floor_wood", "rug", "bridge", "snow", "ice", "bog",
  "mud", "ruin_floor", "ash",
]);

// For each overlay cell, the ground tile to draw beneath it = the most common
// ground tile among its 8 neighbors, falling back to the map's base floor.
function computeUnderlay(grid, baseFloor) {
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const out = [];
  for (let y = 0; y < h; y++) {
    const row = new Array(w).fill(null);
    for (let x = 0; x < w; x++) {
      if (!OVERLAY_TILES.has(grid[y][x])) continue;
      const counts = {};
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
          const n = grid[ny][nx];
          if (GROUND_TILES.has(n)) counts[n] = (counts[n] || 0) + 1;
        }
      }
      let best = baseFloor;
      let bestC = 0;
      for (const k in counts) {
        if (counts[k] > bestC) {
          bestC = counts[k];
          best = k;
        }
      }
      row[x] = best;
    }
    out.push(row);
  }
  return out;
}

// The ground tile drawn beneath object tiles, chosen from the map's palette.
function pickBaseFloor(map) {
  const vals = Object.values(map.legend || {});
  if (vals.includes("floor_wood")) return "floor_wood";
  if (vals.includes("floor_stone")) return "floor_stone";
  if (vals.includes("sand")) return "sand";
  if (vals.includes("dirt")) return "dirt";
  return "grass";
}

function tileSolidByName(G, name) {
  const defs = G.content.tileDefs || {};
  const d = defs[name];
  if (d && typeof d.solid === "boolean") return d.solid;
  return DEFAULT_SOLID.has(name);
}

// Evaluate a CONTRACT condition string (or array of strings = AND).
function evalCond(G, cond) {
  if (!cond) return true;
  if (Array.isArray(cond)) return cond.every((c) => evalCond(G, c));
  const story = G.story;
  const player = G.player;

  if (cond.startsWith("!flag:")) {
    return !story.get(cond.slice(6));
  }
  if (cond.startsWith("flag:")) {
    const body = cond.slice(5);
    const eq = body.indexOf("=");
    if (eq === -1) return !!story.get(body);
    const name = body.slice(0, eq);
    return story.is(name, parseCondValue(body.slice(eq + 1)));
  }
  if (cond.startsWith("quest:")) {
    const body = cond.slice(6);
    const eq = body.indexOf("=");
    if (eq === -1) return story.hasQuest(body);
    return story.questStatus(body.slice(0, eq)) === body.slice(eq + 1);
  }
  if (cond.startsWith("item:")) {
    return hasItem(player, cond.slice(5)) > 0;
  }
  if (cond.startsWith("level:")) {
    const m = cond.slice(6).match(/(>=|<=|>|<|=)?\s*(\d+)/);
    if (!m) return false;
    const op = m[1] || ">=";
    const n = parseInt(m[2], 10);
    switch (op) {
      case ">": return player.level > n;
      case "<": return player.level < n;
      case "<=": return player.level <= n;
      case "=": return player.level === n;
      default: return player.level >= n;
    }
  }
  return false;
}

function parseCondValue(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  return v;
}

function npcVisible(G, def) {
  if (def.requires && !evalCond(G, def.requires)) return false;
  if (def.hideWhen && evalCond(G, def.hideWhen)) return false;
  return true;
}

// ------------------------------------------------------------ map building ---

// Rebuild all per-map runtime data for `mapId` WITHOUT moving the player.
function buildMap(G, local, mapId) {
  const map = G.content.maps[mapId];
  local.currentMapId = mapId;

  // Parse legend + rows into a tile-name grid.
  const rows = map.rows || [];
  const h = rows.length;
  const w = h ? rows[0].length : 0;
  const grid = [];
  for (let ty = 0; ty < h; ty++) {
    const row = rows[ty];
    const line = [];
    for (let tx = 0; tx < w; tx++) {
      const ch = row[tx];
      line.push((map.legend && map.legend[ch]) || "void");
    }
    grid.push(line);
  }

  local.w = w;
  local.h = h;
  local.grid = grid;
  local.baseFloor = pickBaseFloor(map);
  local.underlay = computeUnderlay(grid, local.baseFloor);
  local.pixW = w * TILE;
  local.pixH = h * TILE;
  local.triggers = (map.triggers || []).slice();
  local.encounters = map.encounters || null;

  // Already-looted chests render as chest_open from the start.
  for (const tr of local.triggers) {
    if (tr.type === "chest" && tr.flag && G.story.get(tr.flag)) {
      setTile(local, tr.tx, tr.ty, "chest_open");
    }
  }

  // Build the solidity grid. Tiles covered by a transition trigger become
  // walkable so the player can step onto doors/stairs to fire them.
  const solid = [];
  for (let ty = 0; ty < h; ty++) {
    const line = [];
    for (let tx = 0; tx < w; tx++) line.push(tileSolidByName(G, grid[ty][tx]));
    solid.push(line);
  }
  for (const tr of local.triggers) {
    if (tr.type !== "transition") continue;
    forEachTriggerCell(tr, (tx, ty) => {
      if (ty >= 0 && ty < h && tx >= 0 && tx < w) solid[ty][tx] = false;
    });
  }
  local.solid = solid;

  // Runtime NPC instances. homeTx/homeTy anchor wandering so NPCs roam their
  // own patch instead of drifting; strollLeft keeps them walking a few tiles in
  // one direction (a natural stroll) before re-rolling, rather than jittering.
  local.npcs = (map.npcs || []).map((def) => ({
    def,
    tx: def.tx,
    ty: def.ty,
    px: def.tx * TILE,
    py: def.ty * TILE,
    homeTx: def.tx,
    homeTy: def.ty,
    dir: def.dir || "down",
    moving: false,
    ttx: def.tx,
    tty: def.ty,
    phase: 0,
    rest: 0.4 + Math.random() * 1.6,
    strollLeft: 0,
    pathIdx: 0,
  }));

  local.playerActor = sprites.makeActor(G.player.appearance);

  G.audio.playMusic(map.music);
}

// Update player.map (+ optional position/dir) then rebuild the map. When
// tx/ty/dir are omitted the player's current position is preserved (used to
// re-sync after a dialogue "goto" teleport).
function loadMap(G, local, mapId, tx, ty, dir) {
  G.player.map = mapId;
  if (typeof tx === "number" && typeof ty === "number") {
    G.player.x = tx * TILE;
    G.player.y = ty * TILE;
  }
  if (dir) G.player.dir = dir;
  buildMap(G, local, mapId);
  const ft = feetTile(G.player);
  local.lastTileX = ft.x;
  local.lastTileY = ft.y;
  local.encounterAccum = 0;

  // Save only when arriving at a designated respawn point (a checkpoint map),
  // not on every door. This save is what you return to if you fall.
  const m = G.content.maps[mapId];
  if (m && m.checkpoint) G.saveGame({ label: "Checkpoint reached", ttl: 1.6 });
}

// Where to drop the player when entering `destId` coming from `fromId`. We aim
// for the destination's return door (the transition pointing back to fromId),
// which is geographically correct even for maps with several exits. The trigger
// tile is non-solid, and lastTile is set to it so it won't immediately re-fire.
function entryPosition(G, destId, fromId, fallbackDir) {
  const dest = G.content.maps[destId];
  if (!dest) return null;
  const ret = (dest.triggers || []).find(
    (t) => t.type === "transition" && t.to === fromId,
  );
  if (ret) return { tx: ret.tx, ty: ret.ty, dir: fallbackDir };
  if (dest.spawn)
    return { tx: dest.spawn.tx, ty: dest.spawn.ty, dir: dest.spawn.dir || fallbackDir };
  return null;
}

function setTile(local, tx, ty, name) {
  if (ty < 0 || ty >= local.h || tx < 0 || tx >= local.w) return;
  local.grid[ty][tx] = name;
}

function forEachTriggerCell(tr, fn) {
  const w = tr.w || 1;
  const h = tr.h || 1;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) fn(tr.tx + dx, tr.ty + dy);
  }
}

function triggerContains(tr, tx, ty) {
  const w = tr.w || 1;
  const h = tr.h || 1;
  return tx >= tr.tx && tx < tr.tx + w && ty >= tr.ty && ty < tr.ty + h;
}

// ---------------------------------------------------------------- geometry ---

function feetTile(player) {
  const fx = player.x + 8;
  const fy = player.y + HB_OY + HB_H / 2;
  return { x: Math.floor(fx / TILE), y: Math.floor(fy / TILE) };
}

function solidAt(local, tx, ty) {
  if (ty < 0 || ty >= local.h || tx < 0 || tx >= local.w) return true;
  return local.solid[ty][tx];
}

// Does the feet hitbox (placed at sprite top-left x,y) overlap any solid tile?
function boxHitsSolid(local, x, y) {
  const x0 = x + HB_OX;
  const y0 = y + HB_OY;
  const x1 = x0 + HB_W - 1;
  const y1 = y0 + HB_H - 1;
  const tx0 = Math.floor(x0 / TILE);
  const tx1 = Math.floor(x1 / TILE);
  const ty0 = Math.floor(y0 / TILE);
  const ty1 = Math.floor(y1 / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (solidAt(local, tx, ty)) return true;
    }
  }
  return false;
}

// Player feet box (at sprite top-left x,y) overlaps a solid tile OR an NPC body.
function playerBlocked(G, local, x, y) {
  if (boxHitsSolid(local, x, y)) return true;
  const px0 = x + HB_OX;
  const py0 = y + HB_OY;
  const px1 = px0 + HB_W;
  const py1 = py0 + HB_H;
  for (const npc of local.npcs) {
    if (!npcVisible(G, npc.def)) continue;
    const nx0 = npc.px + 3;
    const ny0 = npc.py + 5;
    const nx1 = nx0 + 10;
    const ny1 = ny0 + 10;
    if (px0 < nx1 && px1 > nx0 && py0 < ny1 && py1 > ny0) return true;
  }
  return false;
}

function npcAtTile(G, local, tx, ty) {
  for (const npc of local.npcs) {
    if (!npcVisible(G, npc.def)) continue;
    const nx = Math.round(npc.px / TILE);
    const ny = Math.round(npc.py / TILE);
    if (nx === tx && ny === ty) return npc;
  }
  return null;
}

// ----------------------------------------------------------------- updates ---

function updatePlayer(G, dt, local) {
  const player = G.player;
  const input = G.input;
  const ax = input.axis();
  let dx = ax.x;
  let dy = ax.y;
  const moving = dx !== 0 || dy !== 0;

  if (moving) {
    const running = input.isDown("run");
    const speed = WALK_SPEED * (running ? RUN_MULT : 1);
    // Normalize so diagonals are not faster.
    const len = Math.hypot(dx, dy) || 1;
    const step = (speed * dt) / len;
    const mvx = dx * step;
    const mvy = dy * step;

    // Axis-separated collision resolution (solid tiles + NPC bodies).
    if (mvx !== 0 && !playerBlocked(G, local, player.x + mvx, player.y)) {
      player.x += mvx;
    }
    if (mvy !== 0 && !playerBlocked(G, local, player.x, player.y + mvy)) {
      player.y += mvy;
    }

    // Keep the player inside the map bounds.
    player.x = Math.max(0, Math.min(player.x, local.pixW - TILE));
    player.y = Math.max(0, Math.min(player.y, local.pixH - TILE));

    // Facing follows the dominant axis.
    if (Math.abs(dx) >= Math.abs(dy)) player.dir = dx < 0 ? "left" : "right";
    else player.dir = dy < 0 ? "up" : "down";

    local.animTime += dt * (running ? 1.9 : 1.25);
  } else {
    local.animTime = 0;
  }
  local.playerMoving = moving;

  // Fire step-based triggers / encounters when the feet tile changes.
  const ft = feetTile(player);
  if (ft.x !== local.lastTileX || ft.y !== local.lastTileY) {
    local.lastTileX = ft.x;
    local.lastTileY = ft.y;
    G.audio.sfx("step");
    onEnterTile(G, local, ft.x, ft.y);
  }
}

// Returns true if a state was pushed / the map changed (caller should bail).
function onEnterTile(G, local, tx, ty) {
  // Step triggers: transitions, auto-events and forced encounters.
  for (const tr of local.triggers) {
    if (!triggerContains(tr, tx, ty)) continue;

    if (tr.type === "transition") {
      // Gated transition: if requires fails, block the way (optionally opening a
      // dialogue, e.g. a boss gate) instead of loading the destination.
      if (tr.requires && !evalCond(G, tr.requires)) {
        G.audio.sfx("error");
        if (tr.blocked) G.openDialogue(tr.blocked);
        else G.toast("The way is blocked.");
        return true;
      }
      G.audio.sfx("door");
      const ep = entryPosition(G, tr.to, local.currentMapId, tr.dir);
      if (ep) loadMap(G, local, tr.to, ep.tx, ep.ty, ep.dir);
      else loadMap(G, local, tr.to);
      // (Saving happens only at checkpoint maps, handled inside loadMap.)
      return true;
    }
    if (tr.type === "event") {
      if (tr.requires && !evalCond(G, tr.requires)) continue;
      if (tr.once && G.story.get(tr.once)) continue;
      if (tr.once) G.story.set(tr.once);
      G.openDialogue(tr.dialogue);
      return true;
    }
    if (tr.type === "encounter") {
      if (tr.requires && !evalCond(G, tr.requires)) continue;
      if (tr.once && G.story.get(tr.once)) continue;
      if (tr.once) G.story.set(tr.once);
      G.audio.sfx("encounter");
      G.startBattle(tr.enemies, { music: tr.music || "battle", boss: tr.boss });
      return true;
    }
  }

  // Random encounters on qualifying tiles.
  const enc = local.encounters;
  if (enc && enc.tiles && enc.tiles.includes(local.grid[ty][tx])) {
    local.encounterAccum = (local.encounterAccum || 0) + 1;
    if (local.encounterAccum > ENCOUNTER_GRACE && Math.random() < (enc.rate || 0)) {
      local.encounterAccum = 0;
      const group = pickGroup(enc.groups || []);
      if (group) {
        G.audio.sfx("encounter");
        G.startBattle(group.enemies, { music: "battle" });
        return true;
      }
    }
  }
  return false;
}

function pickGroup(groups) {
  if (!groups.length) return null;
  let total = 0;
  for (const g of groups) total += g.weight || 1;
  let r = Math.random() * total;
  for (const g of groups) {
    r -= g.weight || 1;
    if (r <= 0) return g;
  }
  return groups[groups.length - 1];
}

function updateNpcs(G, dt, local) {
  for (const npc of local.npcs) {
    if (!npcVisible(G, npc.def)) continue;
    const move = npc.def.move || "static";
    if (move === "static") {
      npc.moving = false;
      continue;
    }

    if (npc.moving) {
      const targetX = npc.ttx * TILE;
      const targetY = npc.tty * TILE;
      npc.px = approach(npc.px, targetX, NPC_SPEED * dt);
      npc.py = approach(npc.py, targetY, NPC_SPEED * dt);
      npc.phase += dt * 1.4;
      if (npc.px === targetX && npc.py === targetY) {
        npc.tx = npc.ttx;
        npc.ty = npc.tty;
        npc.moving = false;
        npc.rest = 0.5 + Math.random() * 1.8;
      }
    } else {
      npc.phase = 0;
      npc.rest -= dt;
      if (npc.rest <= 0) decideNpcMove(G, local, npc, move);
    }
  }
}

function decideNpcMove(G, local, npc, move) {
  let dir = null;
  if (move === "patrol" && npc.def.path && npc.def.path.length) {
    const pt = npc.def.path[npc.pathIdx % npc.def.path.length];
    if (npc.tx === pt.tx && npc.ty === pt.ty) {
      npc.pathIdx = (npc.pathIdx + 1) % npc.def.path.length;
    }
    const goal = npc.def.path[npc.pathIdx % npc.def.path.length];
    if (goal.tx !== npc.tx) dir = goal.tx < npc.tx ? "left" : "right";
    else if (goal.ty !== npc.ty) dir = goal.ty < npc.ty ? "up" : "down";
  } else {
    // Wander: amble a few tiles one way, pause, then pick a fresh random
    // direction — a natural roam rather than a tight loop. Stay anchored near
    // home so NPCs keep to their own patch.
    const dx = npc.tx - npc.homeTx;
    const dy = npc.ty - npc.homeTy;
    const strayed = Math.abs(dx) > WANDER_RADIUS || Math.abs(dy) > WANDER_RADIUS;

    if (strayed) {
      // Drifted too far: head back toward home along the longer axis.
      if (Math.abs(dx) >= Math.abs(dy)) dir = dx > 0 ? "left" : "right";
      else dir = dy > 0 ? "up" : "down";
      npc.strollLeft = 1;
    } else if (npc.strollLeft > 0) {
      // Continue the current stroll in the same direction.
      dir = npc.dir;
      npc.strollLeft -= 1;
    } else if (Math.random() < 0.4) {
      // Pause for a varied beat before choosing a new heading.
      npc.rest = 0.5 + Math.random() * 2.2;
      return;
    } else {
      // Start a new stroll of 1-3 tiles in a random direction.
      dir = ["down", "up", "left", "right"][(Math.random() * 4) | 0];
      npc.strollLeft = (Math.random() * 3) | 0; // 0..2 more tiles after this one
    }
  }

  if (!dir) {
    npc.rest = 0.8;
    return;
  }
  const d = DIR_DELTA[dir];
  const ntx = npc.tx + d.x;
  const nty = npc.ty + d.y;
  npc.dir = dir;
  if (!solidAt(local, ntx, nty) && !npcAtTile(G, local, ntx, nty) &&
      !(local.lastTileX === ntx && local.lastTileY === nty)) {
    npc.ttx = ntx;
    npc.tty = nty;
    npc.moving = true;
  } else {
    // Blocked: drop the current stroll and pause before re-rolling a heading.
    npc.strollLeft = 0;
    npc.rest = 0.6 + Math.random();
  }
}

function approach(cur, target, maxStep) {
  if (cur < target) return Math.min(cur + maxStep, target);
  if (cur > target) return Math.max(cur - maxStep, target);
  return cur;
}

// ------------------------------------------------------------- interaction ---

function interact(G, local) {
  const player = G.player;
  const ft = feetTile(player);
  const d = DIR_DELTA[player.dir];
  const fx = ft.x + d.x;
  const fy = ft.y + d.y;

  // NPC in front: prefer the exact front tile, but accept any visible NPC whose
  // body is close to the point just ahead of the player (forgiving reach).
  let npc = npcAtTile(G, local, fx, fy);
  if (!npc) npc = nearestNpcInFront(G, local);
  if (npc) {
    npc.dir = OPPOSITE[player.dir] || npc.dir;
    npc.moving = false;
    G.audio.sfx("confirm");
    if (npc.def.shop) G.push("shop", { shopId: npc.def.shop });
    else if (npc.def.dialogue)
      G.openDialogue(npc.def.dialogue, {
        portraitColors: npc.def.sprite,
        npcPortrait: npc.def.portrait,
      });
    return true;
  }

  // Sign / chest: check the tile in front AND the tile the player stands on
  // (signs/chests are non-solid, so the player may be standing on them).
  const cells = [
    { x: fx, y: fy },
    { x: ft.x, y: ft.y },
  ];
  for (const tr of local.triggers) {
    if (tr.type !== "sign" && tr.type !== "chest") continue;
    if (!cells.some((c) => triggerContains(tr, c.x, c.y))) continue;
    if (tr.type === "sign") {
      G.audio.sfx("confirm");
      if (tr.dialogue) G.openDialogue(tr.dialogue);
      else if (tr.text) G.toast(tr.text, 3.2);
      return true;
    }
    openChest(G, local, tr);
    return true;
  }
  return false;
}

// Non-destructive: what (if anything) would `confirm` interact with right now?
// Returns world-space anchor {wx, wy} above the target, or null.
function peekInteract(G, local) {
  const player = G.player;
  const ft = feetTile(player);
  const d = DIR_DELTA[player.dir];
  const fx = ft.x + d.x;
  const fy = ft.y + d.y;

  let npc = npcAtTile(G, local, fx, fy);
  if (!npc) npc = nearestNpcInFront(G, local);
  if (npc) return { wx: npc.px + 8, wy: npc.py - 2 };

  const cells = [
    { x: fx, y: fy },
    { x: ft.x, y: ft.y },
  ];
  for (const tr of local.triggers) {
    if (tr.type !== "sign" && tr.type !== "chest") continue;
    if (tr.type === "chest" && tr.flag && G.story.get(tr.flag)) continue; // already looted
    if (!cells.some((c) => triggerContains(tr, c.x, c.y))) continue;
    return { wx: tr.tx * TILE + 8, wy: tr.ty * TILE - 2 };
  }
  return null;
}

// Closest visible NPC whose center lies within ~14px of the point just ahead of
// the player and roughly in the facing direction.
function nearestNpcInFront(G, local) {
  const player = G.player;
  const d = DIR_DELTA[player.dir];
  const ahx = player.x + 8 + d.x * 12;
  const ahy = player.y + 11 + d.y * 12;
  let best = null;
  let bestD = 15 * 15;
  for (const npc of local.npcs) {
    if (!npcVisible(G, npc.def)) continue;
    if (!npc.def.dialogue && !npc.def.shop) continue;
    const cx = npc.px + 8;
    const cy = npc.py + 8;
    const dd = (cx - ahx) * (cx - ahx) + (cy - ahy) * (cy - ahy);
    if (dd < bestD) {
      bestD = dd;
      best = npc;
    }
  }
  return best;
}

function openChest(G, local, tr) {
  if (tr.flag && G.story.get(tr.flag)) {
    G.audio.sfx("error");
    G.toast("Empty.");
    return;
  }
  const parts = [];
  if (tr.item) {
    const qty = tr.qty || 1;
    addItem(G.player, tr.item, qty);
    const def = G.content.items && G.content.items[tr.item];
    parts.push(`+${qty} ${def ? def.name : tr.item}`);
  }
  if (tr.gold) {
    G.player.gold += tr.gold;
    parts.push(`+${tr.gold} Gold`);
  }
  if (tr.flag) G.story.set(tr.flag);
  setTile(local, tr.tx, tr.ty, "chest_open");
  G.audio.sfx(tr.gold ? "coin" : "open");
  G.toast(parts.length ? parts.join("   ") : "Opened the chest.");
}

// ------------------------------------------------------------------ camera ---

function cameraFor(G, local) {
  const cx = G.player.x + 8 - G.W / 2;
  const cy = G.player.y + 8 - G.H / 2;
  // Maps smaller than the viewport are centered (negative offset) rather than
  // pinned to the top-left; larger maps scroll and clamp to their bounds.
  const axis = (center, pix, view) =>
    pix <= view
      ? -Math.round((view - pix) / 2)
      : Math.round(Math.max(0, Math.min(center, pix - view)));
  return {
    x: axis(cx, local.pixW, G.W),
    y: axis(cy, local.pixH, G.H),
  };
}

// ----------------------------------------------------------------- render ----

function renderWorld(G, local) {
  const ctx = G.ctx;
  const cam = cameraFor(G, local);

  ctx.fillStyle = "#06070d";
  ctx.fillRect(0, 0, G.W, G.H);

  // Visible tile range only.
  const tx0 = Math.floor(cam.x / TILE);
  const ty0 = Math.floor(cam.y / TILE);
  const tx1 = Math.min(local.w - 1, Math.floor((cam.x + G.W) / TILE));
  const ty1 = Math.min(local.h - 1, Math.floor((cam.y + G.H) / TILE));
  for (let ty = Math.max(0, ty0); ty <= ty1; ty++) {
    for (let tx = Math.max(0, tx0); tx <= tx1; tx++) {
      const name = local.grid[ty][tx];
      const dx = tx * TILE - cam.x;
      const dy = ty * TILE - cam.y;
      // Object tiles are transparent — draw the locally-matching ground beneath
      // them first (sign on a path -> path; crystal on stone -> stone).
      if (OVERLAY_TILES.has(name)) {
        const under = (local.underlay[ty] && local.underlay[ty][tx]) || local.baseFloor;
        ctx.drawImage(sprites.tile(under), dx, dy);
      }
      ctx.drawImage(sprites.tile(name), dx, dy);
    }
  }

  // Depth-sorted actors (NPCs + player) by feet Y.
  const drawables = [];
  for (const npc of local.npcs) {
    if (!npcVisible(G, npc.def)) continue;
    drawables.push({
      y: npc.py + 16,
      draw: () => {
        const actor = sprites.makeActor(npc.def.sprite || G.player.appearance);
        const col = npc.moving ? sprites.walkCol(npc.phase % 1) : 0;
        sprites.drawActor(ctx, actor, npc.px - cam.x, npc.py - cam.y, npc.dir, col, 1);
      },
    });
  }
  drawables.push({
    y: G.player.y + 16,
    draw: () => {
      const col = local.playerMoving ? sprites.walkCol(local.animTime % 1) : 0;
      sprites.drawActor(
        ctx, local.playerActor,
        G.player.x - cam.x, G.player.y - cam.y,
        G.player.dir, col, 1,
      );
    },
  });
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();

  drawVignette(ctx, G.W, G.H);
  drawInteractPrompt(G, local, cam);
  drawHud(G);
}

// A small bobbing "Z" bubble over the thing the player can interact with.
function drawInteractPrompt(G, local, cam) {
  const target = peekInteract(G, local);
  if (!target) return;
  const ctx = G.ctx;
  const bob = Math.round(Math.sin(G.time * 6) * 1.5);
  const x = Math.round(target.wx - cam.x);
  const y = Math.round(target.wy - cam.y) - 11 + bob;
  // bubble
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(x - 5, y - 1, 11, 11);
  ctx.fillStyle = "#ffd86a";
  ctx.fillRect(x - 5, y - 1, 11, 1);
  ctx.fillRect(x - 5, y + 9, 11, 1);
  ctx.fillRect(x - 5, y - 1, 1, 11);
  ctx.fillRect(x + 5, y - 1, 1, 11);
  // little tail pointing down
  ctx.fillStyle = "#ffd86a";
  ctx.fillRect(x - 1, y + 10, 3, 1);
  ctx.fillRect(x, y + 11, 1, 1);
  sprites.text(ctx, "Z", x - 2, y + 1, "#ffe9a8", { shadow: false });
}

let _vignette = null;
function drawVignette(ctx, w, h) {
  if (!_vignette) {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.32)");
    _vignette = g;
  }
  ctx.fillStyle = _vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawHud(G) {
  const ctx = G.ctx;
  const p = G.player;
  const st = G.stats();

  // Stat panel (top-left) — translucent so the world stays visible behind it.
  ctx.globalAlpha = 0.5;
  sprites.panel(ctx, 3, 3, 104, 38);
  ctx.globalAlpha = 1;
  sprites.text(ctx, `Lv ${p.level}`, 8, 7, "#ffe9a8");

  const coin = sprites.icon("coin");
  if (coin) ctx.drawImage(coin, 70, 5);
  sprites.text(ctx, `${p.gold}`, 84, 7, "#ffe27a");

  const heart = sprites.icon("heart");
  if (heart) ctx.drawImage(heart, 6, 16);
  sprites.bar(ctx, 20, 17, 80, 5, p.hp / Math.max(1, st.maxHp), "#5be37e");
  sprites.text(ctx, `${Math.max(0, Math.ceil(p.hp))}/${st.maxHp}`, 22, 16.5, "#dff7e2", { scale: 1 });

  const ether = sprites.icon("ether");
  if (ether) ctx.drawImage(ether, 6, 27);
  sprites.bar(ctx, 20, 28, 80, 5, p.mp / Math.max(1, st.maxMp), "#5aa0ff");
  sprites.text(ctx, `${Math.max(0, Math.ceil(p.mp))}/${st.maxMp}`, 22, 27.5, "#dbe7ff", { scale: 1 });

  // Active quest objective hint (bottom-left).
  const quest = G.story.activeQuests()[0];
  if (quest) {
    const obj = quest.objectives.find((o) => !o.done);
    const hint = `${quest.name}: ${obj ? obj.text : "Complete!"}`;
    const lines = sprites.wrap(hint, G.W - 16);
    const line = lines[0] + (lines.length > 1 ? "..." : "");
    const w = sprites.textWidth(line) + 10;
    const y = G.H - 13;
    ctx.globalAlpha = 0.82;
    sprites.panel(ctx, 3, y - 2, w, 12);
    ctx.globalAlpha = 1;
    sprites.text(ctx, line, 8, y + 1, "#cfe0ff");
  }
}

// ------------------------------------------------------------------ state ----

registerState({
  name: "overworld",
  overlay: false,

  enter(G, params, local) {
    const map = G.content.maps[G.player.map];
    local.animTime = 0;
    local.playerMoving = false;
    local.encounterAccum = 0;

    if (params && params.fresh && map && map.spawn) {
      // New game: drop the player on the map's canonical spawn point. The town
      // is a checkpoint, so loadMap creates the initial save (enables Continue).
      loadMap(G, local, G.player.map, map.spawn.tx, map.spawn.ty, map.spawn.dir);
    } else {
      // Continue / re-enter: keep the saved (or current) position.
      buildMap(G, local, G.player.map);
      const ft = feetTile(G.player);
      local.lastTileX = ft.x;
      local.lastTileY = ft.y;
    }
  },

  update(G, dt, local) {
    if (G.input.justPressed("menu")) {
      G.push("menu");
      return;
    }
    if (G.input.justPressed("inventory")) {
      G.push("inventory");
      return;
    }
    if (G.input.justPressed("confirm")) {
      if (interact(G, local)) return;
    }
    updatePlayer(G, dt, local);
    if (G.player.map !== local.currentMapId) return; // a transition fired
    updateNpcs(G, dt, local);
  },

  render(G, local) {
    renderWorld(G, local);
  },

  resume(G, result, local) {
    if (result && result.outcome === "lose") {
      G.push("gameover");
      return;
    }
    // After any battle, grant a stretch of safe steps before encounters resume.
    if (result && result.outcome) local.encounterAccum = -POST_BATTLE_GRACE;

    // A dialogue "goto" may have teleported us to another map.
    if (G.player.map !== local.currentMapId) {
      loadMap(G, local, G.player.map);
    }
    // Drain pending power-up picks one at a time (powerup.js pops back here).
    if (G.player.pendingPicks > 0) {
      G.push("powerup");
      return;
    }
  },
});
