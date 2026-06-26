// Player creation, derived stats (with power-ups applied), and leveling.

export function newPlayer(name = "Hero") {
  return {
    name,
    level: 1,
    xp: 0,
    base: {
      maxHp: 36,
      maxMp: 12,
      atk: 9,
      def: 6,
      mag: 6,
      spd: 7,
      luck: 4,
    },
    hp: 36,
    mp: 12,
    gold: 20,
    inventory: [
      { id: "potion", qty: 3 },
      { id: "ether", qty: 1 },
    ],
    skills: ["guard_break"], // "strike" is the basic Attack, not a listed skill
    powerups: [], // array of powerup ids (permanent)
    // overworld position
    map: "town",
    x: 160,
    y: 140,
    dir: "down",
    // pending power-up picks awarded but not yet chosen
    pendingPicks: 0,
    appearance: { skin: "#e8b98c", hair: "#5a3a22", shirt: "#3d7dca", pants: "#2a2f45" },
  };
}

// Scale an enemy definition to the hero's level so fights stay meaningful as
// the hero grows (without negating progression — your skills/power-ups still
// tip the odds). Enemies never get weaker than their authored stats.
export function scaleEnemy(def, playerLevel) {
  const gap = Math.min(8, Math.max(0, (playerLevel || 1) - (def.level || 1)));
  if (gap === 0) return { ...def, hp: def.maxHp };
  const boss = !!def.boss;
  const sAtk = boss ? 0.07 : 0.085;
  const sHp = boss ? 0.1 : 0.14;
  const e = { ...def };
  e.maxHp = Math.round(def.maxHp * (1 + sHp * gap));
  e.hp = e.maxHp;
  e.atk = Math.round(def.atk * (1 + sAtk * gap));
  e.def = Math.round(def.def * (1 + 0.05 * gap));
  e.mag = Math.round(def.mag * (1 + sAtk * gap));
  e.spd = def.spd + Math.floor(gap * 0.3);
  e.xp = Math.round((def.xp || 0) * (1 + 0.06 * gap));
  e.gold = Math.round((def.gold || 0) * (1 + 0.05 * gap));
  return e;
}

// XP required to reach the NEXT level from the given level.
export function xpForNext(level) {
  return Math.floor(20 * Math.pow(level, 1.55)) + 10;
}

// Effective combat stats: base + level growth + power-up modifiers.
// Returns a flat object plus a `special` set (lifesteal, thorns, etc.)
export function computeStats(p, content) {
  const lvl = p.level - 1;
  const s = {
    maxHp: p.base.maxHp + lvl * 8,
    maxMp: p.base.maxMp + lvl * 4,
    atk: p.base.atk + lvl * 2,
    def: p.base.def + lvl * 1.5,
    mag: p.base.mag + lvl * 2,
    spd: p.base.spd + lvl * 1,
    luck: p.base.luck + lvl * 0.5,
    critChance: 0.06,
    critMult: 1.6,
    lifesteal: 0,
    thorns: 0,
    dodge: 0,
    extraTurnChance: 0,
    elementBonus: {},
    special: {},
  };
  const pu = content && content.powerups ? content.powerups : {};
  for (const id of p.powerups) {
    const def = pu[id];
    if (!def) continue;
    if (def.mods) {
      for (const k in def.mods) {
        if (typeof def.mods[k] === "number") s[k] = (s[k] || 0) + def.mods[k];
      }
    }
    if (def.special) s.special[def.special] = (s.special[def.special] || 0) + (def.amount || 1);
  }
  // Map a few named specials onto numeric fields for convenience.
  if (s.special.lifesteal) s.lifesteal += 0.18 * s.special.lifesteal;
  if (s.special.thorns) s.thorns += 0.25 * s.special.thorns;
  if (s.special.evasion) s.dodge += 0.12 * s.special.evasion;
  if (s.special.haste) s.extraTurnChance += 0.18 * s.special.haste;
  if (s.special.crit) {
    s.critChance += 0.12 * s.special.crit;
    s.critMult += 0.2 * s.special.crit;
  }
  // Cap stacking specials so multiple copies can't snowball into an auto-win
  // (e.g. lifesteal that out-heals all damage). Excess copies are wasted.
  s.lifesteal = Math.min(s.lifesteal, 0.35);
  s.thorns = Math.min(s.thorns, 0.6);
  s.dodge = Math.min(s.dodge, 0.33);
  s.extraTurnChance = Math.min(s.extraTurnChance, 0.4);
  s.critChance = Math.min(s.critChance, 0.6);
  s.critMult = Math.min(s.critMult, 2.6);
  // Round display stats.
  for (const k of ["maxHp", "maxMp", "atk", "def", "mag", "spd", "luck"]) {
    s[k] = Math.round(s[k]);
  }
  return s;
}

// Award XP, returns number of levels gained (and grants pending picks).
export function gainXp(p, amount) {
  p.xp += amount;
  let gained = 0;
  while (p.xp >= xpForNext(p.level)) {
    p.xp -= xpForNext(p.level);
    p.level += 1;
    gained += 1;
    p.pendingPicks += 1;
  }
  return gained;
}

// Skills a player knows that are usable from the skill list.
export function knownSkills(p, content) {
  return p.skills.map((id) => content.skills[id]).filter(Boolean);
}

export function addItem(p, id, qty = 1) {
  const slot = p.inventory.find((i) => i.id === id);
  if (slot) slot.qty += qty;
  else p.inventory.push({ id, qty });
}

export function removeItem(p, id, qty = 1) {
  const slot = p.inventory.find((i) => i.id === id);
  if (!slot) return false;
  slot.qty -= qty;
  if (slot.qty <= 0) p.inventory.splice(p.inventory.indexOf(slot), 1);
  return true;
}

export function hasItem(p, id) {
  const slot = p.inventory.find((i) => i.id === id);
  return slot ? slot.qty : 0;
}
