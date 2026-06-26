// ============================================================================
// Headless battle simulator — an automated playtester. Uses the REAL game data
// (enemies/skills/powerups) + computeStats + scaleEnemy, mirrors battle.js's
// damage/status/crit/element/boss mechanics, and drives a "competent player" AI.
// Reports win rate, avg turns, avg HP% remaining per scenario.
//   node game/sim.mjs
// ============================================================================
import { content } from "./src/data.js";
import { computeStats, scaleEnemy } from "./src/stats.js";

const rng = () => Math.random();
const chance = (p) => rng() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = Math.round;

// ---- combatant construction (mirrors battle.js) ----------------------------
function mkPlayer(level, powerupIds, items, style = "skilled") {
  const p = {
    level,
    base: { maxHp: 36, maxMp: 12, atk: 9, def: 6, mag: 6, spd: 7, luck: 4 },
    powerups: powerupIds.slice(),
    skills: ["guard_break"],
  };
  // grant skills from chosen power-ups (mirror powerup.js)
  for (const id of powerupIds) {
    const d = content.powerups[id];
    if (d && d.grantsSkill && !p.skills.includes(d.grantsSkill)) p.skills.push(d.grantsSkill);
  }
  const s = computeStats(p, content);
  return {
    isPlayer: true,
    style,
    stat: s,
    hp: s.maxHp,
    mp: s.maxMp,
    maxHp: s.maxHp,
    maxMp: s.maxMp,
    statuses: [],
    buffs: [],
    defending: false,
    alive: true,
    skills: p.skills.map((id) => content.skills[id]).filter(Boolean),
    items: { ...items },
  };
}

function mkEnemy(id, level) {
  const def = scaleEnemy(content.enemies[id], level);
  return {
    isPlayer: false,
    id,
    name: def.name,
    stat: { atk: def.atk, def: def.def, mag: def.mag, spd: def.spd, luck: def.luck || 2 },
    hp: def.maxHp,
    maxHp: def.maxHp,
    mp: 999,
    weak: def.weak || [],
    resist: def.resist || [],
    skills: (def.skills || ["strike"]).map((s) => content.skills[s]).filter(Boolean),
    ai: def.ai || "aggressive",
    boss: !!def.boss,
    mech: { t: 0, enraged: false, phase: 0, charging: null },
    shield: 0,
    statuses: [],
    buffs: [],
    defending: false,
    alive: true,
  };
}

function eff(c, key) {
  let v = c.stat[key] || 0;
  for (const b of c.buffs) if (b.stat === key) v += b.amount;
  if (key === "atk" && c.statuses.some((s) => s.name === "atkdown")) v *= 0.7;
  if (key === "def" && c.statuses.some((s) => s.name === "defdown")) v *= 0.6;
  return Math.max(0, round(v));
}

// ---- damage (mirrors battle.js applyAction) --------------------------------
function dealSkill(actor, sk, target, alliesOfActor) {
  // heal / buff
  if (sk.type === "heal") {
    const amt = round(eff(actor, "mag") * sk.power);
    actor.hp = Math.min(actor.maxHp, actor.hp + amt);
    return;
  }
  if (sk.type === "buff") {
    if (sk.buff) actor.buffs.push({ ...sk.buff });
    return;
  }
  const t = target;
  if (!t || !t.alive) return;
  let dmg;
  const power = sk.power || 1;
  if (sk.type === "phys") dmg = eff(actor, "atk") * power - eff(t, "def") / 2;
  else dmg = eff(actor, "mag") * power - eff(t, "def") / 4;
  dmg = Math.max(1, dmg);
  const el = sk.element || "none";
  if (el !== "none" && (t.weak || []).includes(el)) dmg *= 1.5;
  if (el !== "none" && (t.resist || []).includes(el)) dmg *= 0.5;
  let crit = false;
  if (sk.type === "phys" && actor.isPlayer && chance(actor.stat.critChance || 0.06)) {
    dmg *= actor.stat.critMult || 1.6;
    crit = true;
  }
  if (!actor.isPlayer && t.isPlayer && (t.stat.dodge || 0) > 0 && chance(t.stat.dodge)) return;
  if (t.defending) dmg *= 0.5;
  dmg = round(dmg);
  applyDamage(t, dmg);
  // status
  if (sk.status && t.alive && chance(sk.status.chance)) addStatus(t, sk.status);
  // lifesteal / drain / thorns
  if (actor.isPlayer && sk.type === "phys" && (actor.stat.lifesteal || 0) > 0) {
    actor.hp = Math.min(actor.maxHp, actor.hp + round(dmg * actor.stat.lifesteal));
  }
  if (sk.id === "drain") actor.hp = Math.min(actor.maxHp, actor.hp + round(dmg * 0.6));
  if (!actor.isPlayer && t.isPlayer && sk.type === "phys" && (t.stat.thorns || 0) > 0) {
    applyDamage(actor, Math.max(1, round(dmg * t.stat.thorns)));
  }
  return crit;
}

function applyDamage(c, dmg) {
  if (c.shield > 0 && dmg > 0) {
    const soak = Math.min(c.shield, dmg);
    c.shield -= soak;
    dmg -= soak;
    if (dmg <= 0) return;
  }
  c.hp -= dmg;
  if (c.hp <= 0) {
    c.hp = 0;
    c.alive = false;
  }
}
function addStatus(c, st) {
  const ex = c.statuses.find((s) => s.name === st.name);
  if (ex) ex.dur = Math.max(ex.dur, st.dur);
  else c.statuses.push({ name: st.name, dur: st.dur, power: st.power || 3 });
}

// ---- turn start: dots + decay (mirrors battle.js nextActor) ----------------
function turnStart(c) {
  c.defending = false;
  let dot = 0;
  for (const s of c.statuses) if (s.name === "poison" || s.name === "burn") dot += s.power || 3;
  if (dot > 0) applyDamage(c, dot);
  const stunned = c.statuses.some((s) => s.name === "stun");
  c.statuses.forEach((s) => (s.dur -= 1));
  c.statuses = c.statuses.filter((s) => s.dur > 0);
  c.buffs.forEach((b) => (b.dur -= 1));
  c.buffs = c.buffs.filter((b) => b.dur > 0);
  return stunned;
}

// ---- AIs -------------------------------------------------------------------
const tmp = (name, el, power, anim, type = "mag", status = null) => {
  const s = { id: "_" + name, name, mp: 0, type, power, target: "one", element: el, anim };
  if (status) s.status = status;
  return s;
};

function bossAct(B, p, enemies, addSummon) {
  const M = B.mech;
  M.t++;
  if (M.charging) {
    const ch = M.charging;
    M.charging = null;
    dealSkill(B, ch.skill, p, enemies);
    return;
  }
  const hp = B.hp / B.maxHp;
  if (B.id === "warden") {
    if (!M.enraged && hp <= 0.5) { M.enraged = true; B.buffs.push({ stat: "atk", amount: 8, dur: 99 }); B.hp = Math.min(B.maxHp, B.hp + round(B.maxHp * 0.04)); return; }
    if (M.t % 6 === 0 && B.shield <= 0) { B.shield = round(B.maxHp * 0.1); B.buffs.push({ stat: "def", amount: 6, dur: 3 }); return; }
    if (chance(0.32)) { M.charging = { skill: tmp("Radiant Judgment", "holy", 2.8, "holy"), name: "RJ" }; return; }
    dealSkill(B, pick([sk("holy_smite"), sk("ice_lance"), content.skills.strike]), p, enemies);
    return;
  }
  if (B.id === "shadowlord") {
    if (M.phase < 1 && hp <= 0.66) { M.phase = 1; if (addSummon("wraith")) return; }
    if (M.phase < 2 && hp <= 0.33) { M.phase = 2; B.buffs.push({ stat: "atk", amount: 8, dur: 99 }); B.buffs.push({ stat: "spd", amount: 5, dur: 99 }); addSummon("specter"); return; }
    if (chance(0.28)) { M.charging = { skill: tmp("Doomsday", "dark", 2.4, "dark"), name: "DD" }; return; }
    const o = [sk("shadow_bolt"), sk("doom"), sk("drain")];
    if (chance(0.25)) o.push(sk("inferno"));
    dealSkill(B, pick(o), p, enemies);
    return;
  }
  if (B.id === "sunshade") {
    if (!M.enraged && hp <= 0.4) { M.enraged = true; B.buffs.push({ stat: "atk", amount: 6, dur: 99 }); B.buffs.push({ stat: "mag", amount: 8, dur: 99 }); M.charging = { skill: tmp("Supernova", "fire", 2.8, "fire"), name: "SN" }; return; }
    if (chance(0.34)) { M.charging = { skill: tmp("Solar Flare", "fire", 2.2, "fire"), name: "SF" }; return; }
    dealSkill(B, pick([sk("inferno"), sk("firebolt"), sk("quake")]), p, enemies);
    return;
  }
  if (B.id === "rimewyrm") {
    if (!M.enraged && hp <= 0.35) { M.enraged = true; B.buffs.push({ stat: "mag", amount: 6, dur: 99 }); B.buffs.push({ stat: "spd", amount: 3, dur: 99 }); M.charging = { skill: tmp("Glacial Breath", "ice", 2.4, "ice", "mag", { name: "stun", chance: 0.2, dur: 1 }), name: "GB" }; return; }
    if (M.t % 7 === 0 && B.shield <= 0) { B.shield = round(B.maxHp * 0.06); B.buffs.push({ stat: "def", amount: 5, dur: 3 }); return; }
    if (chance(0.26)) { M.charging = { skill: tmp("Glacial Breath", "ice", 2.3, "ice", "mag", { name: "stun", chance: 0.1, dur: 1 }), name: "GB" }; return; }
    dealSkill(B, pick([sk("frost_breath"), sk("ice_lance"), sk("rime_fang")]), p, enemies);
    return;
  }
  if (B.id === "mirelord") {
    if (M.phase < 1 && hp <= 0.6) { M.phase = 1; if (addSummon("bog_toad")) return; }
    if (M.phase < 2 && hp <= 0.3) { M.phase = 2; B.buffs.push({ stat: "mag", amount: 7, dur: 99 }); addSummon("leech"); return; }
    if (chance(0.46)) { M.charging = { skill: tmp("Engulf", "dark", 3.3, "dark", "mag", { name: "poison", chance: 0.9, dur: 4, power: 6 }), name: "EN" }; return; }
    dealSkill(B, pick([sk("miasma"), sk("venom_spit"), sk("bramble_lash"), sk("shadow_bolt")]), p, enemies);
    return;
  }
  if (B.id === "tidewrought") {
    if (!M.enraged && hp <= 0.35) { M.enraged = true; B.buffs.push({ stat: "atk", amount: 8, dur: 99 }); B.buffs.push({ stat: "spd", amount: 4, dur: 99 }); M.charging = { skill: tmp("Tidal Crush", "none", 3.4, "quake", "phys", { name: "stun", chance: 0.4, dur: 1 }), name: "TC" }; return; }
    if (M.t % 5 === 0 && B.shield <= 0) { B.shield = round(B.maxHp * 0.12); B.buffs.push({ stat: "def", amount: 5, dur: 3 }); return; }
    if (chance(0.34)) { M.charging = { skill: tmp("Tidal Crush", "none", 2.7, "quake", "phys", { name: "stun", chance: 0.3, dur: 1 }), name: "TC" }; return; }
    dealSkill(B, pick([sk("tide_crush"), sk("drown"), sk("ice_lance")]), p, enemies);
    return;
  }
  if (B.id === "magmaroth") {
    if (M.phase < 1 && hp <= 0.66) { M.phase = 1; if (addSummon("magma_hound")) return; }
    if (!M.enraged && hp <= 0.4) { M.enraged = true; B.buffs.push({ stat: "atk", amount: 8, dur: 99 }); B.buffs.push({ stat: "mag", amount: 10, dur: 99 }); B.buffs.push({ stat: "spd", amount: 4, dur: 99 }); M.charging = { skill: tmp("Supernova", "fire", 4.3, "fire", "mag", { name: "burn", chance: 0.7, dur: 3, power: 6 }), name: "SN" }; return; }
    if (M.phase < 2 && hp <= 0.5) { M.phase = 2; if (addSummon("ash_wraith")) return; }
    if (chance(0.36)) { M.charging = { skill: tmp("Eruption", "fire", 2.4, "fire", "mag", { name: "burn", chance: 0.6, dur: 3, power: 5 }), name: "ER" }; return; }
    dealSkill(B, pick([sk("magma_wave"), sk("inferno"), sk("eruption"), sk("ember_maul")]), p, enemies);
    return;
  }
}
const sk = (id) => content.skills[id];
const pick = (a) => a.filter(Boolean)[(rng() * a.filter(Boolean).length) | 0];

function enemyTurn(e, p, enemies, addSummon) {
  if (e.boss && ["warden", "shadowlord", "sunshade", "rimewyrm", "mirelord", "tidewrought", "magmaroth"].includes(e.id)) return bossAct(e, p, enemies, addSummon);
  // generic
  const off = e.skills.filter((s) => ["phys", "mag", "debuff"].includes(s.type));
  const heals = e.skills.filter((s) => s.type === "heal");
  let s;
  const low = enemies.filter((x) => x.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (heals.length && low && low.hp / low.maxHp < 0.4 && chance(0.5)) {
    const h = pick(heals);
    low.hp = Math.min(low.maxHp, low.hp + round(eff(e, "mag") * h.power));
    return;
  }
  if (off.length && chance(0.75)) s = pick(off);
  else s = content.skills.strike;
  dealSkill(e, s, p, enemies);
}

// Competent player: heal when low, Defend boss telegraphs, exploit weakness,
// conserve MP, focus the weakest enemy (clears summons fast).
function playerTurn(p, enemies) {
  const living = enemies.filter((e) => e.alive);
  const target = living.slice().sort((a, b) => a.hp - b.hp)[0];
  const hpFrac = p.hp / p.maxHp;
  const bossCharging = living.some((e) => e.boss && e.mech.charging);

  // Reckless / button-masher: never defends, heals only when nearly dead,
  // just basic-attacks. Used to measure how much skill matters.
  if (p.style === "reckless") {
    if (hpFrac < 0.2) {
      if ((p.items.potion || 0) > 0) { p.items.potion--; p.hp = Math.min(p.maxHp, p.hp + 60); return; }
      if ((p.items.hi_potion || 0) > 0) { p.items.hi_potion--; p.hp = Math.min(p.maxHp, p.hp + 180); return; }
    }
    dealSkill(p, content.skills.strike, target, [p]);
    return;
  }

  // Defend an incoming telegraphed nuke — a competent player always braces for
  // an announced charge, regardless of current HP (the nuke can be lethal).
  if (bossCharging) {
    p.defending = true;
    return;
  }
  // Emergency heal.
  if (hpFrac < 0.38) {
    if ((p.items.hi_potion || 0) > 0) { p.items.hi_potion--; p.hp = Math.min(p.maxHp, p.hp + 180); return; }
    if ((p.items.potion || 0) > 0) { p.items.potion--; p.hp = Math.min(p.maxHp, p.hp + 60); return; }
    const heal = p.skills.find((s) => s.type === "heal" && p.mp >= s.mp);
    if (heal) { p.mp -= heal.mp; p.hp = Math.min(p.maxHp, p.hp + round(eff(p, "mag") * heal.power)); return; }
  }
  // Choose best damaging action.
  const basic = eff(p, "atk") - eff(target, "def") / 2;
  let best = { sk: content.skills.strike, val: basic };
  for (const s of p.skills) {
    if (s.mp > p.mp) continue;
    if (!["phys", "mag"].includes(s.type)) continue;
    let v = (s.type === "phys" ? eff(p, "atk") : eff(p, "mag")) * s.power - eff(target, "def") / (s.type === "phys" ? 2 : 4);
    const el = s.element || "none";
    if (el !== "none" && target.weak.includes(el)) v *= 1.5;
    if (el !== "none" && target.resist.includes(el)) v *= 0.5;
    // conserve MP: only worth it if clearly better, or boss fight, or low MP cost
    const keepMp = p.skills.some((x) => x.type === "heal");
    const mpOk = !keepMp || p.mp - s.mp >= 6;
    if (mpOk && v > best.val * 1.12) best = { sk: s, val: v };
  }
  if (best.sk.mp) p.mp = Math.max(0, p.mp - best.sk.mp);
  dealSkill(p, best.sk, target, [p]);
}

// ---- one battle ------------------------------------------------------------
function runBattle(p, enemyIds, enemyLevel) {
  let enemies = enemyIds.map((id) => mkEnemy(id, enemyLevel));
  const addSummon = (id) => {
    if (enemies.filter((e) => e.alive).length >= 4) return false;
    enemies.push(mkEnemy(id, enemyLevel));
    return true;
  };
  let turns = 0;
  const MAX = 80;
  while (p.alive && enemies.some((e) => e.alive) && turns < MAX) {
    turns++;
    // order by spd each round
    const order = [p, ...enemies].filter((c) => c.alive).sort((a, b) => eff(b, "spd") - eff(a, "spd"));
    for (const c of order) {
      if (!c.alive || !p.alive || !enemies.some((e) => e.alive)) continue;
      const stunned = turnStart(c);
      if (!c.alive) continue;
      if (stunned) continue;
      if (c.isPlayer) {
        playerTurn(p, enemies);
        // haste extra turn
        if ((p.stat.extraTurnChance || 0) > 0 && chance(p.stat.extraTurnChance) && enemies.some((e) => e.alive)) playerTurn(p, enemies);
      } else {
        enemyTurn(c, p, enemies, addSummon);
      }
    }
  }
  return { win: p.alive && !enemies.some((e) => e.alive), turns, hpFrac: Math.max(0, p.hp / p.maxHp) };
}

// ---- scenarios -------------------------------------------------------------
function trial(n, makeP, enemyIds, enemyLevel) {
  let wins = 0, turns = 0, hp = 0;
  for (let i = 0; i < n; i++) {
    const p = makeP();
    const r = runBattle(p, enemyIds, enemyLevel);
    if (r.win) { wins++; turns += r.turns; hp += r.hpFrac; }
  }
  const wr = wins / n;
  return { wr, turns: wins ? turns / wins : 0, hp: wins ? hp / wins : 0 };
}

function weightedGroups(map) {
  const g = content.maps[map].encounters.groups;
  return g;
}
function trashRun(label, level, powerups, items, mapId, n = 300) {
  const groups = weightedGroups(mapId);
  let totalW = 0;
  for (const gr of groups) totalW += gr.weight || 1;
  let wins = 0, turns = 0, hp = 0;
  for (let i = 0; i < n; i++) {
    let r = rng() * totalW, grp = groups[0];
    for (const gr of groups) { r -= gr.weight || 1; if (r <= 0) { grp = gr; break; } }
    const p = mkPlayer(level, powerups, items);
    const res = runBattle(p, grp.enemies, level);
    if (res.win) { wins++; turns += res.turns; hp += res.hpFrac; }
  }
  report(label, wins / n, wins ? turns / wins : 0, wins ? hp / wins : 0);
}
function bossRun(label, boss, level, powerups, items, n = 300, style = "skilled") {
  const res = trial(n, () => mkPlayer(level, powerups, items, style), [boss], level);
  report(label, res.wr, res.turns, res.hp);
}
function report(label, wr, turns, hp) {
  const pct = (x) => (x * 100).toFixed(0) + "%";
  console.log(
    `${label.padEnd(34)} win ${pct(wr).padStart(4)}   avgTurns ${turns.toFixed(1).padStart(5)}   hpLeft ${pct(hp).padStart(4)}`,
  );
}

// builds representing natural progression
const BUILD = {
  early: ["vigor_charm"],
  mid: ["vigor_charm", "power_band", "guard_brooch", "swift_boots"],
  late: ["vigor_charm", "power_band", "guard_brooch", "swift_boots", "titan_heart", "lucky_clover", "mage_ring", "sun_pendant"],
  lateAgg: ["power_band", "berserker_idol", "vampire_fang", "crit_lens", "haste_rune", "swift_boots", "titan_heart", "sun_pendant", "spiked_mail", "fire_charm"],
};

console.log("==== SUNSTONE BALANCE SIM ====\n-- trash encounters --");
trashRun("Forest @ L2 (1 pu)", 2, BUILD.early, { potion: 3 }, "forest");
trashRun("Forest @ L4 (2 pu)", 4, ["vigor_charm", "power_band"], { potion: 4 }, "forest");
trashRun("Blackwood @ L5 (4 pu)", 5, BUILD.mid, { potion: 4, hi_potion: 1 }, "forest_deep");
trashRun("Blackwood @ L7 (5 pu)", 7, [...BUILD.mid, "lucky_clover"], { potion: 5, hi_potion: 2 }, "forest_deep");
trashRun("Dungeon @ L9 (7 pu)", 9, [...BUILD.late.slice(0, 7)], { potion: 5, hi_potion: 3 }, "dungeon");
trashRun("Dungeon @ L11 (9 pu)", 11, BUILD.lateAgg.slice(0, 9), { potion: 6, hi_potion: 4 }, "dungeon");

console.log("\n-- bosses --");
bossRun("Warden @ L8 (7 pu)", "warden", 8, BUILD.late.slice(0, 7), { potion: 6, hi_potion: 2 });
bossRun("Warden @ L9 (under-geared)", "warden", 9, BUILD.mid, { potion: 4 });
bossRun("Shadowlord @ L12 (balanced)", "shadowlord", 12, BUILD.late, { potion: 8, hi_potion: 4 });
bossRun("Shadowlord @ L13 (aggro)", "shadowlord", 13, BUILD.lateAgg, { potion: 8, hi_potion: 5 });
bossRun("Sunshade @ L12 (balanced)", "sunshade", 12, BUILD.late, { potion: 8, hi_potion: 4 });
bossRun("Sunshade @ L13 (aggro)", "sunshade", 13, BUILD.lateAgg, { potion: 8, hi_potion: 5 });

console.log("\n-- skill matters? (reckless = never defend, mash attack) --");
bossRun("Warden  skilled  L8", "warden", 8, BUILD.late.slice(0, 7), { potion: 6, hi_potion: 2 });
bossRun("Warden  reckless L8", "warden", 8, BUILD.late.slice(0, 7), { potion: 6, hi_potion: 2 }, 300, "reckless");
bossRun("Shadowlord skilled  L12", "shadowlord", 12, BUILD.late, { potion: 8, hi_potion: 4 });
bossRun("Shadowlord reckless L12", "shadowlord", 12, BUILD.late, { potion: 8, hi_potion: 4 }, 300, "reckless");
bossRun("Sunshade skilled  L12", "sunshade", 12, BUILD.late, { potion: 8, hi_potion: 4 });
bossRun("Sunshade reckless L12", "sunshade", 12, BUILD.late, { potion: 8, hi_potion: 4 }, 300, "reckless");

console.log("\n-- power-up impact (Warden L8, balanced gear vs none) --");
bossRun("Warden  no power-ups", "warden", 8, [], { potion: 6, hi_potion: 2 });
bossRun("Warden  4 power-ups", "warden", 8, BUILD.mid, { potion: 6, hi_potion: 2 });
bossRun("Warden  8 power-ups", "warden", 8, BUILD.late, { potion: 6, hi_potion: 2 });

// Act II: post-finale progression, higher levels + deeper power-up pools.
BUILD.act2 = [...BUILD.late, "haste_rune", "crit_lens", "spiked_mail"];
BUILD.act2Agg = [...BUILD.lateAgg, "archmage_tome", "shadow_cloak"];

console.log("\n-- ACT II trash --");
trashRun("Karsthal @ L13", 13, BUILD.late, { potion: 6, hi_potion: 4 }, "karsthal");
trashRun("Sunken Mire @ L15", 15, BUILD.act2, { potion: 6, hi_potion: 4 }, "sunken_mire");
trashRun("Drowned Ruins @ L16", 16, BUILD.act2, { hi_potion: 5 }, "drowned_ruins");
trashRun("Emberforge @ L18", 18, BUILD.act2Agg, { hi_potion: 6 }, "emberforge");

console.log("\n-- ACT II bosses (skilled) --");
bossRun("Rimewyrm @ L14", "rimewyrm", 14, BUILD.late, { potion: 8, hi_potion: 4 });
bossRun("Mirelord @ L15", "mirelord", 15, BUILD.act2, { hi_potion: 5 });
bossRun("Tidewrought @ L16", "tidewrought", 16, BUILD.act2, { hi_potion: 6 });
bossRun("Magmaroth @ L18", "magmaroth", 18, BUILD.act2Agg, { hi_potion: 6 });

console.log("\n-- ACT II bosses (reckless = never defend) --");
bossRun("Rimewyrm  reckless L14", "rimewyrm", 14, BUILD.late, { potion: 8, hi_potion: 4 }, 300, "reckless");
bossRun("Mirelord  reckless L15", "mirelord", 15, BUILD.act2, { hi_potion: 5 }, 300, "reckless");
bossRun("Tidewrought reckless L16", "tidewrought", 16, BUILD.act2, { hi_potion: 6 }, 300, "reckless");
bossRun("Magmaroth reckless L18", "magmaroth", 18, BUILD.act2Agg, { hi_potion: 6 }, 300, "reckless");
