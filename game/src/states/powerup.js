// ============================================================================
// Sunstone — Power-up selection (overlay).
//
// Shown after a level-up (drained from player.pendingPicks by overworld.js /
// dialogue.js). Offers 3 distinct rarity-weighted power-ups as cards with a
// live stat-delta preview, and applies the chosen one. Conforms to CONTRACT.
// ============================================================================

import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";

const RARITY = {
  common: { color: "#a9e0b0", weight: 6, label: "COMMON" },
  rare: { color: "#5aa0ff", weight: 3, label: "RARE" },
  epic: { color: "#ffcf5a", weight: 1, label: "EPIC" },
};

// Stats shown in the delta preview, in display order.
const STAT_KEYS = ["maxHp", "maxMp", "atk", "def", "mag", "spd", "luck"];
const STAT_LABEL = {
  maxHp: "HP", maxMp: "MP", atk: "ATK", def: "DEF", mag: "MAG", spd: "SPD", luck: "LCK",
};

function weightedPick(pool) {
  let total = 0;
  for (const p of pool) total += RARITY[p.rarity] ? RARITY[p.rarity].weight : 1;
  let r = Math.random() * total;
  for (const p of pool) {
    r -= RARITY[p.rarity] ? RARITY[p.rarity].weight : 1;
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

// How many copies of the same `special` effect we'll ever offer. Past this the
// effect is capped in computeStats anyway, so further copies would be wasted.
const SPECIAL_MAX = 2;

// Choose 3 distinct options. Prefer power-ups the player doesn't own; `special`
// ones may stack but only up to SPECIAL_MAX copies of that effect.
function rollOptions(G) {
  const all = Object.values(G.content.powerups);
  const owned = new Set(G.player.powerups);
  // Count owned copies per special effect (vampire_fang -> lifesteal, etc.).
  const specialCount = {};
  for (const id of G.player.powerups) {
    const d = G.content.powerups[id];
    if (d && d.special) specialCount[d.special] = (specialCount[d.special] || 0) + 1;
  }
  // Gate rarity by level so powerful gear comes from progression (i.e. having
  // beaten tougher foes), not from an early common kill: Rare unlocks at Lv3,
  // Epic at Lv7.
  const lvl = G.player.level || 1;
  const allowedRarity = (r) =>
    r === "epic" ? lvl >= 7 : r === "rare" ? lvl >= 3 : true;
  const offerable = (p) =>
    allowedRarity(p.rarity) &&
    (p.special ? (specialCount[p.special] || 0) < SPECIAL_MAX : !owned.has(p.id));
  const fresh = all.filter(offerable);
  let pool =
    fresh.length >= 3
      ? fresh.slice()
      : all.filter((p) => allowedRarity(p.rarity) && (!owned.has(p.id) || p.special));

  const out = [];
  while (out.length < 3 && pool.length) {
    const pick = weightedPick(pool);
    out.push(pick);
    pool = pool.filter((p) => p.id !== pick.id);
    // If the preferred pool runs dry, top up from the full list.
    if (!pool.length && out.length < 3) {
      pool = all.filter((p) => !out.some((o) => o.id === p.id));
    }
  }
  return out;
}

// Effective stats if `id` were added to the player (non-mutating).
function previewStats(G, id) {
  const clone = { ...G.player, powerups: [...G.player.powerups, id] };
  return G.stats(clone);
}

registerState({
  name: "powerup",
  overlay: true,

  enter(G, params, local) {
    local.options = rollOptions(G);
    local.sel = 0;
    local.before = G.stats();
    local.after = local.options.map((o) => previewStats(G, o.id));
    local.t = 0;
    G.audio.sfx("levelup");
  },

  update(G, dt, local) {
    local.t += dt;
    const n = local.options.length;
    if (!n) {
      G.pop();
      return;
    }
    if (G.input.justPressed("left")) {
      local.sel = (local.sel - 1 + n) % n;
      G.audio.sfx("cursor");
    } else if (G.input.justPressed("right")) {
      local.sel = (local.sel + 1) % n;
      G.audio.sfx("cursor");
    }
    if (G.input.justPressed("confirm")) {
      const def = local.options[local.sel];
      G.player.powerups.push(def.id);
      if (def.grantsSkill && !G.player.skills.includes(def.grantsSkill)) {
        G.player.skills.push(def.grantsSkill);
      }
      G.player.pendingPicks = Math.max(0, G.player.pendingPicks - 1);
      G.audio.sfx("powerup");
      G.toast(`Gained ${def.name}!`);
      G.pop();
    }
  },

  render(G, local) {
    const ctx = G.ctx;
    // Dim the world beneath.
    ctx.fillStyle = "rgba(6,4,16,0.82)";
    ctx.fillRect(0, 0, G.W, G.H);

    const title = "LEVEL UP!  Choose a power";
    sprites.text(ctx, title, (G.W - sprites.textWidth(title)) / 2, 12, "#ffe9a8");
    if (G.player.pendingPicks > 1) {
      const more = `(${G.player.pendingPicks} picks remaining)`;
      sprites.text(ctx, more, (G.W - sprites.textWidth(more)) / 2, 24, "#9a95c2");
    }

    const cardW = 98;
    const cardH = 116;
    const gap = 6;
    const totalW = local.options.length * cardW + (local.options.length - 1) * gap;
    const startX = (G.W - totalW) / 2;
    const y = 36;

    for (let i = 0; i < local.options.length; i++) {
      const def = local.options[i];
      const x = startX + i * (cardW + gap);
      const sel = i === local.sel;
      drawCard(G, local, def, x, y, cardW, cardH, sel, local.after[i]);
    }

    const hint = "Left/Right: Browse    Z: Choose";
    sprites.text(ctx, hint, (G.W - sprites.textWidth(hint)) / 2, G.H - 11, "#8f8ab8");
  },
});

function drawCard(G, local, def, x, y, w, h, sel, after) {
  const ctx = G.ctx;
  const rarity = RARITY[def.rarity] || RARITY.common;

  const lift = sel ? 3 : 0;
  const yy = y - lift;
  sprites.panel(ctx, x, yy, w, h, {
    fill: sel ? "#1d1640" : "#120c26",
    border: sel ? rarity.color : "#4a4470",
  });

  // Detailed emblem centered near the top.
  drawEmblem(ctx, Math.round(x + w / 2 - 14), yy + 7, def, rarity.color);

  // Name (wrapped) + rarity tag.
  const nameLines = sprites.wrap(def.name, w - 10);
  let ty = yy + 36;
  for (const ln of nameLines) {
    sprites.text(ctx, ln, x + (w - sprites.textWidth(ln)) / 2, ty, "#ffffff");
    ty += 9;
  }
  const tag = rarity.label;
  sprites.text(ctx, tag, x + (w - sprites.textWidth(tag)) / 2, ty + 1, rarity.color);
  ty += 12;

  // Stat deltas vs current stats.
  const deltas = [];
  for (const k of STAT_KEYS) {
    const d = after[k] - local.before[k];
    if (d) deltas.push(`+${d} ${STAT_LABEL[k]}`);
  }
  if (def.special) {
    const s = def.special;
    deltas.push(s.charAt(0).toUpperCase() + s.slice(1));
  }
  if (def.grantsSkill) {
    const sk = G.content.skills[def.grantsSkill];
    deltas.push(`Skill: ${sk ? sk.name : def.grantsSkill}`);
  }
  for (const dline of deltas) {
    sprites.text(ctx, dline, x + 6, ty, "#9be3a0");
    ty += 8;
  }

  // Description at the bottom.
  const descLines = sprites.wrap(def.desc, w - 10);
  let dy = yy + h - 4 - descLines.length * 8;
  for (const ln of descLines) {
    sprites.text(ctx, ln, x + 5, dy, "#b9b4d6");
    dy += 8;
  }

  if (sel) {
    const blink = 0.5 + 0.5 * Math.sin(local.t * 8);
    ctx.globalAlpha = blink;
    sprites.text(ctx, "v", x + w / 2 - 3, yy - 9, rarity.color);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- emblems ----
function shd(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  const f = amt < 0 ? 0 : 255;
  const t = Math.abs(amt);
  r = Math.round(r + (f - r) * t);
  g = Math.round(g + (f - g) * t);
  b = Math.round(b + (f - b) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
    .toString(16)
    .padStart(2, "0")}`;
}

// id -> [symbol, base color]
const EMBLEM = {
  vigor_charm: ["heart", "#d8404a"],
  titan_heart: ["heart", "#5aa0ff"],
  power_band: ["sword", "#cfd6e6"],
  berserker_idol: ["skull", "#d8404a"],
  guard_brooch: ["shield", "#ffd24a"],
  spiked_mail: ["shield", "#cfd6e6"],
  mage_ring: ["ring", "#5aa0ff"],
  archmage_tome: ["tome", "#5aa0ff"],
  fire_charm: ["flame", "#ff7a3a"],
  sun_pendant: ["sun", "#ffd24a"],
  swift_boots: ["boot", "#9a6a3a"],
  haste_rune: ["rune", "#5be37e"],
  shadow_cloak: ["cloak", "#b06aff"],
  lucky_clover: ["clover", "#5be37e"],
  crit_lens: ["lens", "#ffd24a"],
  vampire_fang: ["fang", "#d8404a"],
};

function drawEmblem(ctx, ox, oy, def, rcol) {
  const P = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, oy + y, w, h);
  };
  // backing plate + rarity frame
  P(0, 0, 28, 28, "#0b0a18");
  P(0, 0, 28, 1, shd(rcol, -0.2));
  P(0, 27, 28, 1, shd(rcol, -0.45));
  P(0, 0, 1, 28, shd(rcol, -0.2));
  P(27, 0, 1, 28, shd(rcol, -0.45));
  ctx.globalAlpha = 0.16;
  P(4, 4, 20, 20, rcol);
  ctx.globalAlpha = 1;

  const entry = EMBLEM[def.id] || [null, rcol];
  const sym = entry[0];
  const m = entry[1];
  const lt = shd(m, 0.4);
  const dk = shd(m, -0.35);

  switch (sym) {
    case "heart":
      P(6, 6, 7, 7, m); P(15, 6, 7, 7, m); P(4, 9, 20, 7, m);
      P(7, 16, 14, 4, m); P(10, 20, 8, 3, m); P(13, 23, 2, 2, m);
      P(6, 7, 4, 4, lt); P(5, 10, 3, 3, lt);
      P(17, 9, 6, 7, dk); P(9, 19, 9, 3, dk);
      break;
    case "sword":
      P(13, 1, 2, 2, lt); P(12, 2, 4, 16, m); P(13, 2, 2, 14, lt); P(11, 4, 1, 12, dk);
      P(8, 17, 12, 2, "#a8791a"); P(8, 17, 12, 1, "#ffd24a");
      P(13, 19, 2, 6, "#5a3a22"); P(11, 24, 6, 2, "#ffd24a");
      break;
    case "shield":
      P(7, 3, 14, 4, m); P(5, 5, 18, 10, m); P(7, 15, 14, 6, m); P(10, 21, 8, 3, m); P(12, 24, 3, 2, m);
      P(7, 4, 3, 16, lt); P(18, 6, 4, 14, dk);
      P(12, 8, 3, 9, "#fff7e0"); P(10, 11, 8, 3, "#fff7e0");
      if (def.id === "spiked_mail") {
        P(3, 5, 2, 4, "#cfd6e6"); P(23, 5, 2, 4, "#cfd6e6");
        P(13, 0, 2, 3, "#cfd6e6"); P(8, 2, 2, 3, "#9aa1ad"); P(18, 2, 2, 3, "#9aa1ad");
      }
      break;
    case "ring":
      P(8, 10, 12, 3, "#ffd24a"); P(8, 16, 12, 3, "#ffd24a");
      P(7, 11, 3, 6, "#ffd24a"); P(18, 11, 3, 6, "#ffd24a");
      P(8, 16, 12, 1, "#a8791a"); P(8, 11, 12, 1, "#fff0b0");
      P(10, 3, 8, 7, m); P(11, 4, 3, 3, lt); P(14, 7, 3, 2, dk);
      break;
    case "tome":
      P(6, 4, 16, 20, m); P(6, 4, 2, 20, dk); P(6, 4, 16, 2, lt);
      P(9, 6, 12, 16, "#e6e2d2");
      P(11, 9, 8, 1, "#b9b4d6"); P(11, 12, 8, 1, "#b9b4d6"); P(11, 15, 8, 1, "#b9b4d6"); P(11, 18, 6, 1, "#b9b4d6");
      P(13, 2, 2, 4, "#ffd24a");
      break;
    case "flame":
      P(13, 2, 3, 5, m); P(10, 6, 8, 8, m); P(8, 12, 12, 9, m); P(10, 21, 8, 3, m);
      P(12, 10, 4, 10, "#ffd23a"); P(13, 14, 2, 5, "#fff3c0");
      P(9, 8, 2, 4, lt);
      break;
    case "sun":
      P(9, 9, 10, 10, m); P(10, 10, 5, 5, lt); P(17, 16, 2, 2, dk);
      P(13, 3, 2, 4, m); P(13, 21, 2, 4, m); P(3, 13, 4, 2, m); P(21, 13, 4, 2, m);
      P(6, 6, 2, 2, m); P(20, 6, 2, 2, m); P(6, 20, 2, 2, m); P(20, 20, 2, 2, m);
      P(13, 0, 2, 3, "#a8791a");
      break;
    case "boot":
      P(3, 8, 6, 2, "#ffffff"); P(4, 11, 5, 2, "#e8edf7"); P(2, 9, 2, 4, "#cfd6e6");
      P(9, 9, 8, 11, m); P(9, 18, 12, 4, m); P(9, 10, 3, 9, lt); P(9, 21, 12, 2, dk);
      break;
    case "rune":
      P(7, 4, 14, 20, "#6c7488"); P(8, 5, 3, 18, "#878fa3"); P(18, 5, 3, 18, "#4a4f60");
      ctx.globalAlpha = 0.4; P(9, 7, 10, 14, m); ctx.globalAlpha = 1;
      P(11, 7, 6, 2, m); P(13, 7, 2, 13, m); P(10, 12, 8, 2, m); P(11, 18, 6, 2, m);
      break;
    case "cloak":
      P(9, 4, 10, 6, m); P(6, 9, 16, 13, m); P(10, 10, 8, 11, dk);
      P(6, 9, 2, 13, lt); P(20, 9, 2, 13, dk);
      P(12, 9, 4, 2, "#ffd24a");
      P(7, 21, 3, 3, m); P(12, 22, 3, 2, m); P(17, 21, 3, 3, m);
      break;
    case "clover":
      P(7, 7, 6, 6, m); P(15, 7, 6, 6, m); P(7, 15, 6, 6, m); P(15, 15, 6, 6, m);
      P(11, 11, 6, 6, shd(m, -0.2));
      P(8, 8, 2, 2, lt); P(16, 8, 2, 2, lt);
      P(13, 20, 2, 5, shd(m, -0.4));
      break;
    case "lens":
      P(6, 6, 16, 16, "#ffd24a"); P(8, 8, 12, 12, "#1a1426");
      P(11, 11, 6, 6, m); P(13, 13, 2, 2, "#111"); P(12, 11, 2, 2, lt);
      P(13, 3, 2, 4, "#ffd24a"); P(13, 21, 2, 4, "#ffd24a"); P(3, 13, 4, 2, "#ffd24a"); P(21, 13, 4, 2, "#ffd24a");
      break;
    case "skull":
      P(8, 5, 12, 10, "#e6e2d2"); P(9, 15, 10, 4, "#e6e2d2"); P(11, 19, 6, 3, "#e6e2d2");
      P(10, 8, 3, 4, "#1a1426"); P(15, 8, 3, 4, "#1a1426");
      P(10, 8, 2, 2, m); P(15, 8, 2, 2, m); // glowing eyes
      P(13, 12, 2, 3, "#9aa1ad");
      P(11, 19, 1, 3, "#1a1426"); P(14, 19, 1, 3, "#1a1426"); P(16, 19, 1, 3, "#1a1426");
      // horns
      P(6, 2, 3, 4, dk); P(19, 2, 3, 4, dk);
      break;
    case "fang":
      P(8, 4, 12, 3, shd(m, -0.2));
      P(9, 5, 10, 8, "#e6e2d2"); P(11, 13, 6, 5, "#e6e2d2"); P(13, 18, 2, 4, "#cfd6e6");
      P(10, 6, 3, 4, "#ffffff");
      P(13, 22, 2, 3, m); P(12, 24, 1, 2, m);
      break;
    default: {
      const ic = sprites.icon(def.icon);
      if (ic) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(ic, ox + 2, oy + 2, 24, 24);
      }
    }
  }
}
