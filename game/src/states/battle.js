// ============================================================================
// Turn-based battle state. Juicy combat: turn order by speed, skills/items,
// status effects, buffs, elemental weakness, crits, lifesteal/thorns/dodge,
// animations (lunge, flash, popups, particles, shake), enemy AI, rewards.
// ============================================================================
import { registerState } from "../registry.js";
import {
  computeStats,
  gainXp,
  knownSkills,
  addItem,
  removeItem,
  hasItem,
  scaleEnemy,
} from "../stats.js";

function rand(a, b) {
  return a + Math.random() * (b - a);
}
function chance(p) {
  return Math.random() < p;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
// easing for animation curves: decelerate, accelerate, hard snap.
function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}
function easeIn(t) {
  return t * t;
}
function easeSnap(t) {
  return t * t * t;
}

// ---- combatant construction ------------------------------------------------
function makePlayerCombatant(G) {
  const s = G.stats();
  return {
    side: "player",
    isPlayer: true,
    name: G.player.name,
    ref: G.player,
    stat: s,
    hp: clamp(G.player.hp, 1, s.maxHp),
    mp: clamp(G.player.mp, 0, s.maxMp),
    maxHp: s.maxHp,
    maxMp: s.maxMp,
    statuses: [],
    buffs: [],
    defending: false,
    alive: true,
    x: 0,
    y: 0,
    ox: 0,
    oy: 0,
    flash: 0,
    actor: G.sprites.makeActor(G.player.appearance),
  };
}

function makeEnemyCombatant(G, id, idx) {
  // Scale the enemy to the hero's level so fights stay meaningful as you grow.
  const def = scaleEnemy(G.content.enemies[id], G.player ? G.player.level : 1);
  const c = {
    side: "enemy",
    isPlayer: false,
    name: def.name,
    ref: def,
    id,
    stat: {
      atk: def.atk,
      def: def.def,
      mag: def.mag,
      spd: def.spd,
      luck: def.luck || 2,
    },
    hp: def.maxHp,
    mp: 999,
    maxHp: def.maxHp,
    maxMp: 999,
    weak: def.weak || [],
    resist: def.resist || [],
    skills: def.skills || ["strike"],
    ai: def.ai || "aggressive",
    boss: !!def.boss,
    mech: { t: 0, enraged: false, phase: 0, charging: null },
    shield: 0,
    statuses: [],
    buffs: [],
    defending: false,
    alive: true,
    x: 0,
    y: 0,
    ox: 0,
    oy: 0,
    flash: 0,
    sprite: def.sprite,
    xp: def.xp || 0,
    gold: def.gold || 0,
    loot: def.loot || [],
  };
  return c;
}

// effective stat including buffs & status
function eff(c, key) {
  let v = c.stat[key] || 0;
  for (const b of c.buffs) if (b.stat === key) v += b.amount;
  if (key === "atk" && c.statuses.some((s) => s.name === "atkdown")) v *= 0.7;
  if (key === "def" && c.statuses.some((s) => s.name === "defdown")) v *= 0.6;
  return Math.max(0, Math.round(v));
}

registerState({
  name: "battle",
  overlay: false,

  enter(G, params, L) {
    L.G = G;
    L.player = makePlayerCombatant(G);
    L.enemies = (params.enemyIds || ["slime"]).map((id, i) =>
      makeEnemyCombatant(G, id, i),
    );
    L.combatants = [L.player, ...L.enemies];
    L.boss = params.boss || L.enemies.some((e) => e.boss);
    L.intro = params.intro || (L.enemies[0].boss ? L.enemies[0].ref.intro : null);

    // layout
    L.player.x = 62;
    L.player.y = 104;
    const n = L.enemies.length;
    L.enemies.forEach((e, i) => {
      const cx = n === 1 ? 232 : 210 + (i % 2) * 44;
      const cy = 56 + Math.floor(i / 2) * 46 + (i % 2) * 16;
      e.x = cx;
      e.y = cy + (n === 1 ? 30 : 0);
    });

    L.particles = [];
    L.popups = [];
    L.effects = [];
    L.projectiles = [];
    L.env = params.env || biomeFor(G, G.player && G.player.map);
    L.shake = 0;
    L.log = "";
    L.logT = 0;
    L.phase = "intro";
    // Boss intros wait for the player to press Z (after a brief lockout so a
    // carried-over keypress can't skip them); plain intros auto-advance.
    L.timer = L.intro ? 0.55 : 0.7;
    L.menu = 0;
    L.sub = null;
    L.subIdx = 0;
    L.targetIdx = 0;
    L.pendingAction = null;
    L.round = 1;
    L.order = [];
    L.orderPos = 0;
    L.acting = null;
    L.anim = null;
    L.result = null;
    L.flashScreen = 0;
    L.hitstop = 0;

    G.audio.playMusic(params.music || (L.boss ? "boss" : "battle"));
    if (L.boss) G.audio.sfx("boss");
    else G.audio.sfx("encounter");
  },

  exit(G, L) {
    // persist player hp/mp
    G.player.hp = clamp(Math.round(L.player.hp), 0, L.player.maxHp);
    G.player.mp = clamp(Math.round(L.player.mp), 0, L.player.maxMp);
  },

  update(G, dt, L) {
    L.time = (L.time || 0) + dt;
    if (L.shake > 0) L.shake = Math.max(0, L.shake - dt * 60);
    if (L.flashScreen > 0) L.flashScreen = Math.max(0, L.flashScreen - dt * 3);
    if (L.hitstop > 0) L.hitstop = Math.max(0, L.hitstop - dt);
    L.logT += dt;
    // particles
    for (const p of L.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt;
      p.life -= dt;
    }
    L.particles = L.particles.filter((p) => p.life > 0);
    for (const p of L.popups) {
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.life -= dt;
    }
    L.popups = L.popups.filter((p) => p.life > 0);
    // visual effects + projectiles
    for (const fx of L.effects) fx.t += dt;
    L.effects = L.effects.filter((fx) => fx.t < fx.dur);
    for (const pr of L.projectiles) pr.t += dt;
    L.projectiles = L.projectiles.filter((pr) => pr.t < pr.dur);
    // flash decay; offsets freeze during hit-stop so the impact pose holds
    const frozen = (L.hitstop || 0) > 0;
    for (const c of L.combatants) {
      if (c.flash > 0) c.flash = Math.max(0, c.flash - dt * 4);
      if (!frozen) {
        c.ox += (0 - c.ox) * Math.min(1, dt * 12);
        c.oy += (0 - c.oy) * Math.min(1, dt * 12);
      }
    }

    switch (L.phase) {
      case "intro":
        L.timer -= dt;
        if (L.intro) {
          // Boss intro: hold until confirmed (lockout prevents instant skip).
          if (L.timer <= 0 && G.input.justPressed("confirm")) startRound(G, L);
        } else if (L.timer <= 0 || G.input.justPressed("confirm")) {
          startRound(G, L);
        }
        break;
      case "menu":
        updateMenu(G, L);
        break;
      case "anim":
        updateAnim(G, dt, L);
        break;
      case "msg":
        L.timer -= dt;
        if (L.timer <= 0) nextActor(G, L);
        break;
      case "win":
        L.timer -= dt;
        if (L.timer <= 0) L.phase = "summary";
        break;
      case "summary":
        if (G.input.justPressed("confirm")) {
          G.pop({ outcome: "win" });
        }
        break;
      case "lose":
        L.timer -= dt;
        if (L.timer <= 0 && G.input.justPressed("confirm")) {
          G.pop({ outcome: "lose" });
        }
        break;
      case "flee":
        L.timer -= dt;
        if (L.timer <= 0) G.pop({ outcome: "flee" });
        break;
    }
  },

  render(G, L) {
    renderBattle(G, L);
  },
});

// ---- round / turn flow -----------------------------------------------------
function startRound(G, L) {
  // tick start-of-round statuses handled per-actor; build order
  L.order = L.combatants
    .filter((c) => c.alive)
    .slice()
    .sort((a, b) => eff(b, "spd") - eff(a, "spd"));
  L.orderPos = -1;
  nextActor(G, L);
}

function nextActor(G, L) {
  if (checkEnd(G, L)) return;
  L.orderPos++;
  if (L.orderPos >= L.order.length) {
    L.round++;
    startRound(G, L);
    return;
  }
  const c = L.order[L.orderPos];
  if (!c.alive) return nextActor(G, L);

  // start-of-turn: clear defend, tick dots, tick buff/status durations
  c.defending = false;
  // damage over time
  let dot = 0;
  for (const s of c.statuses) {
    if (s.name === "poison" || s.name === "burn") dot += s.power || 3;
  }
  if (dot > 0) {
    applyDamage(G, L, c, dot, s_color(c), "dot");
    if (!c.alive) return nextActor(G, L);
  }
  // stun?
  const stunned = c.statuses.some((s) => s.name === "stun");
  // decay statuses & buffs
  c.statuses.forEach((s) => (s.dur -= 1));
  c.statuses = c.statuses.filter((s) => s.dur > 0);
  c.buffs.forEach((b) => (b.dur -= 1));
  c.buffs = c.buffs.filter((b) => b.dur > 0);

  if (stunned) {
    setLog(L, `${c.name} is stunned!`);
    L.phase = "msg";
    L.timer = 0.7;
    return;
  }

  if (c.isPlayer) {
    L.phase = "menu";
    L.menu = 0;
    L.sub = null;
  } else {
    enemyAct(G, L, c);
  }
}

function checkEnd(G, L) {
  if (!L.player.alive) {
    L.phase = "lose";
    L.timer = 1.2;
    setLog(L, `${L.player.name} has fallen...`);
    G.audio.stopMusic();
    G.audio.sfx("death");
    L.flashScreen = 1;
    return true;
  }
  if (L.enemies.every((e) => !e.alive)) {
    doVictory(G, L);
    return true;
  }
  return false;
}

// ---- player menu -----------------------------------------------------------
const CMDS = ["Attack", "Skill", "Item", "Defend", "Flee"];

function updateMenu(G, L) {
  const I = G.input;
  if (L.sub === null) {
    if (I.justPressed("up")) {
      L.menu = (L.menu + CMDS.length - 1) % CMDS.length;
      G.audio.sfx("cursor");
    }
    if (I.justPressed("down")) {
      L.menu = (L.menu + 1) % CMDS.length;
      G.audio.sfx("cursor");
    }
    if (I.justPressed("confirm")) {
      G.audio.sfx("confirm");
      chooseCommand(G, L);
    }
    return;
  }
  // submenu (skill/item/target)
  if (L.sub === "skill" || L.sub === "item") {
    const list = L.subList;
    if (I.justPressed("up")) {
      L.subIdx = (L.subIdx + list.length - 1) % list.length;
      G.audio.sfx("cursor");
    }
    if (I.justPressed("down")) {
      L.subIdx = (L.subIdx + 1) % list.length;
      G.audio.sfx("cursor");
    }
    if (I.justPressed("cancel")) {
      L.sub = null;
      G.audio.sfx("cancel");
    }
    if (I.justPressed("confirm")) {
      const entry = list[L.subIdx];
      if (!entry || entry.disabled) {
        G.audio.sfx("error");
        return;
      }
      G.audio.sfx("confirm");
      if (L.sub === "skill") {
        L.pendingAction = { kind: "skill", skill: entry.skill };
      } else {
        L.pendingAction = { kind: "item", item: entry.item };
      }
      // need target?
      const tgt = L.sub === "skill" ? entry.skill.target : "self";
      if (tgt === "one") {
        enterTarget(G, L);
      } else {
        resolvePlayerAction(G, L);
      }
    }
    return;
  }
  if (L.sub === "target") {
    const living = L.enemies.filter((e) => e.alive);
    if (I.justPressed("up") || I.justPressed("left")) {
      L.targetIdx = (L.targetIdx + living.length - 1) % living.length;
      G.audio.sfx("cursor");
    }
    if (I.justPressed("down") || I.justPressed("right")) {
      L.targetIdx = (L.targetIdx + 1) % living.length;
      G.audio.sfx("cursor");
    }
    if (I.justPressed("cancel")) {
      L.sub = L.pendingAction.kind === "skill" ? "skill" : null;
      if (L.pendingAction.kind === "attack") L.sub = null;
      G.audio.sfx("cancel");
    }
    if (I.justPressed("confirm")) {
      G.audio.sfx("confirm");
      L.pendingAction.target = living[L.targetIdx];
      resolvePlayerAction(G, L);
    }
  }
}

function chooseCommand(G, L) {
  const cmd = CMDS[L.menu];
  if (cmd === "Attack") {
    L.pendingAction = { kind: "attack" };
    enterTarget(G, L);
  } else if (cmd === "Defend") {
    L.player.defending = true;
    setLog(L, `${L.player.name} braces for impact.`);
    L.phase = "msg";
    L.timer = 0.6;
  } else if (cmd === "Flee") {
    tryFlee(G, L);
  } else if (cmd === "Skill") {
    const list = knownSkills(G.player, G.content)
      .filter((sk) => sk.id !== "strike") // basic attack is the Attack command
      .map((sk) => ({
        skill: sk,
        disabled: L.player.mp < sk.mp,
      }));
    if (!list.length) {
      G.audio.sfx("error");
      return;
    }
    L.sub = "skill";
    L.subList = list;
    L.subIdx = 0;
  } else if (cmd === "Item") {
    const list = G.player.inventory
      .map((slot) => ({ item: G.content.items[slot.id], qty: slot.qty }))
      .filter((e) => e.item && e.item.usableInBattle);
    if (!list.length) {
      G.audio.sfx("error");
      return;
    }
    L.sub = "item";
    L.subList = list;
    L.subIdx = 0;
  }
}

function enterTarget(G, L) {
  L.sub = "target";
  const living = L.enemies.filter((e) => e.alive);
  L.targetIdx = clamp(L.targetIdx, 0, living.length - 1);
}

function tryFlee(G, L) {
  const avg =
    L.enemies.filter((e) => e.alive).reduce((s, e) => s + eff(e, "spd"), 0) /
    Math.max(1, L.enemies.filter((e) => e.alive).length);
  let p = clamp(0.45 + (eff(L.player, "spd") - avg) * 0.04, 0.15, 0.95);
  if (L.boss) p = 0.0;
  if (chance(p)) {
    G.audio.sfx("flee");
    setLog(L, "Got away safely!");
    L.phase = "flee";
    L.timer = 0.8;
  } else {
    G.audio.sfx("error");
    setLog(L, "Couldn't escape!");
    L.phase = "msg";
    L.timer = 0.7;
  }
}

// ---- resolve player action -> start animation ------------------------------
function resolvePlayerAction(G, L) {
  L.sub = null;
  const a = L.pendingAction;
  if (a.kind === "item") {
    startAnim(G, L, {
      actor: L.player,
      type: "item",
      item: a.item,
    });
    return;
  }
  let skill;
  if (a.kind === "attack") skill = G.content.skills.strike;
  else skill = a.skill;
  if (skill.mp) L.player.mp = Math.max(0, L.player.mp - skill.mp);
  startAnim(G, L, {
    actor: L.player,
    type: "skill",
    skill,
    target: a.target,
  });
}

// ---- enemy AI --------------------------------------------------------------
function enemyAct(G, L, c) {
  if (c.boss && BOSS_AI[c.id]) {
    BOSS_AI[c.id](G, L, c);
    return;
  }
  genericEnemyAct(G, L, c);
}

function genericEnemyAct(G, L, c) {
  const skillsAll = c.skills.map((id) => G.content.skills[id]).filter(Boolean);
  const offensive = skillsAll.filter((s) =>
    ["phys", "mag", "debuff"].includes(s.type),
  );
  const heals = skillsAll.filter((s) => s.type === "heal");
  const buffs = skillsAll.filter((s) => s.type === "buff");
  let skill = null;

  const lowAlly = L.enemies
    .filter((e) => e.alive)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];

  if (
    (c.ai === "caster" || c.ai === "support" || c.boss) &&
    heals.length &&
    lowAlly &&
    lowAlly.hp / lowAlly.maxHp < 0.4 &&
    chance(0.6)
  ) {
    skill = heals[(Math.random() * heals.length) | 0];
  } else if (c.ai === "defensive" && buffs.length && chance(0.4)) {
    skill = buffs[(Math.random() * buffs.length) | 0];
  } else if (c.boss && chance(0.5) && offensive.length) {
    // boss prefers its strongest/AoE
    skill =
      offensive.find((s) => s.target === "all") ||
      offensive[(Math.random() * offensive.length) | 0];
  } else if (c.ai === "caster" && offensive.length) {
    skill =
      offensive.filter((s) => s.type === "mag")[0] ||
      offensive[(Math.random() * offensive.length) | 0];
  } else if (offensive.length && chance(0.7)) {
    skill = offensive[(Math.random() * offensive.length) | 0];
  } else {
    skill = G.content.skills.strike;
  }

  let target = L.player;
  if (skill.type === "heal") target = lowAlly;
  else if (skill.type === "buff") target = c;
  startAnim(G, L, { actor: c, type: "skill", skill, target });
}

// ---- boss mechanics --------------------------------------------------------
function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}
function sk(G, id) {
  return G.content.skills[id];
}
function tempSkill(name, element, power, anim, type = "mag", status = null) {
  const s = { id: "_" + name, name, mp: 0, type, power, target: "one", element, anim };
  if (status) s.status = status;
  return s;
}
// Perform a non-attack special, then end the boss's turn.
function bossPause(L, msg, dur = 0.9) {
  setLog(L, msg);
  L.phase = "msg";
  L.timer = dur;
}
function resolveCharge(G, L, c) {
  const ch = c.mech.charging;
  c.mech.charging = null;
  startAnim(G, L, { actor: c, type: "skill", skill: ch.skill, target: L.player });
}
// Summon a new enemy mid-battle (caps the field at 4). Ends the turn on success.
function summonAdd(G, L, id, msg) {
  if (L.enemies.filter((e) => e.alive).length >= 4) return false;
  const idx = L.enemies.length;
  const e = makeEnemyCombatant(G, id, idx);
  e.x = clamp(204 + (idx % 2) * 46, 168, 300);
  e.y = clamp(46 + Math.floor(idx / 2) * 38 + (idx % 2) * 14, 40, 112);
  L.enemies.push(e);
  L.combatants.push(e);
  if (L.order) L.order.push(e);
  spawnImpact(L, "dark", e, "#b06aff");
  G.audio.sfx("magic");
  bossPause(L, msg, 1.0);
  return true;
}

const BOSS_AI = {
  // The Warden: defensive guardian — radiant shields, a telegraphed holy nuke,
  // and an enrage when wounded.
  warden(G, L, c) {
    const M = c.mech;
    M.t++;
    if (M.charging) return resolveCharge(G, L, c);
    const hp = c.hp / c.maxHp;
    if (!M.enraged && hp <= 0.5) {
      M.enraged = true;
      c.buffs.push({ stat: "atk", amount: 8, dur: 99 });
      heal(G, L, c, Math.round(c.maxHp * 0.04));
      spawnImpact(L, "buff", c, "#ffd86a");
      return bossPause(L, `${c.name}: "The light will NOT yield!"`);
    }
    if (M.t % 6 === 0 && c.shield <= 0) {
      c.shield = Math.round(c.maxHp * 0.1);
      c.buffs.push({ stat: "def", amount: 6, dur: 3 });
      spawnImpact(L, "holy", c, "#fff3c0");
      G.audio.sfx("powerup");
      return bossPause(L, `${c.name} raises a radiant shield!`);
    }
    if (chance(0.32)) {
      M.charging = { skill: tempSkill("Radiant Judgment", "holy", 2.8, "holy"), name: "Radiant Judgment" };
      spawnImpact(L, "holy", c, "#fff3c0");
      return bossPause(L, `${c.name} gathers blinding light... (brace!)`);
    }
    const opts = [sk(G, "holy_smite"), sk(G, "ice_lance"), G.content.skills.strike].filter(Boolean);
    startAnim(G, L, { actor: c, type: "skill", skill: pick(opts), target: L.player });
  },

  // The Shadowlord: escalating phases — summons adds, then enrages and summons
  // again, with a telegraphed Doomsday.
  shadowlord(G, L, c) {
    const M = c.mech;
    M.t++;
    if (M.charging) return resolveCharge(G, L, c);
    const hp = c.hp / c.maxHp;
    if (M.phase < 1 && hp <= 0.66) {
      M.phase = 1;
      if (summonAdd(G, L, "wraith", `${c.name} tears a rift - a Wraith claws through!`)) return;
    }
    if (M.phase < 2 && hp <= 0.33) {
      M.phase = 2;
      c.buffs.push({ stat: "atk", amount: 8, dur: 99 });
      c.buffs.push({ stat: "spd", amount: 5, dur: 99 });
      spawnImpact(L, "dark", c, "#b06aff");
      if (!summonAdd(G, L, "specter", `${c.name} unravels into fury - a Specter rises!`)) {
        bossPause(L, `${c.name} unravels into seething fury!`);
      }
      return;
    }
    if (chance(0.28)) {
      M.charging = { skill: tempSkill("Doomsday", "dark", 2.4, "dark"), name: "Doomsday" };
      spawnImpact(L, "dark", c, "#b06aff");
      return bossPause(L, `${c.name} pulls the dark inward... (brace!)`);
    }
    const opts = [sk(G, "shadow_bolt"), sk(G, "doom"), sk(G, "drain")].filter(Boolean);
    startAnim(G, L, { actor: c, type: "skill", skill: pick(opts), target: L.player });
  },

  // Sunshade: relentless fire pressure with telegraphed Solar Flare and a
  // Supernova enrage when low.
  sunshade(G, L, c) {
    const M = c.mech;
    M.t++;
    if (M.charging) return resolveCharge(G, L, c);
    const hp = c.hp / c.maxHp;
    if (!M.enraged && hp <= 0.4) {
      M.enraged = true;
      c.buffs.push({ stat: "atk", amount: 6, dur: 99 });
      c.buffs.push({ stat: "mag", amount: 8, dur: 99 });
      M.charging = { skill: tempSkill("Supernova", "fire", 2.8, "fire"), name: "Supernova" };
      spawnImpact(L, "fire", c, "#ff7a3a");
      return bossPause(L, `${c.name} swells - a SUPERNOVA builds! (brace!)`, 1.1);
    }
    if (chance(0.34)) {
      M.charging = { skill: tempSkill("Solar Flare", "fire", 2.2, "fire"), name: "Solar Flare" };
      spawnImpact(L, "fire", c, "#ffd23a");
      return bossPause(L, `${c.name} draws in searing heat... (brace!)`);
    }
    const opts = [sk(G, "inferno"), sk(G, "firebolt"), sk(G, "quake")].filter(Boolean);
    startAnim(G, L, { actor: c, type: "skill", skill: pick(opts), target: L.player });
  },

  // Rimewyrm: frost serpent — glacial armor shields, a telegraphed Glacial
  // Breath that can freeze, and an icy enrage that quickens its killing frost.
  rimewyrm(G, L, c) {
    const M = c.mech;
    M.t++;
    if (M.charging) return resolveCharge(G, L, c);
    const hp = c.hp / c.maxHp;
    if (!M.enraged && hp <= 0.35) {
      M.enraged = true;
      c.buffs.push({ stat: "mag", amount: 6, dur: 99 });
      c.buffs.push({ stat: "spd", amount: 3, dur: 99 });
      M.charging = {
        skill: tempSkill("Glacial Breath", "ice", 2.4, "ice", "mag", { name: "stun", chance: 0.2, dur: 1 }),
        name: "Glacial Breath",
      };
      spawnImpact(L, "ice", c, "#d6f3ff");
      return bossPause(L, `${c.name}: the air itself goes to glass! (brace!)`, 1.1);
    }
    if (M.t % 7 === 0 && c.shield <= 0) {
      c.shield = Math.round(c.maxHp * 0.06);
      c.buffs.push({ stat: "def", amount: 5, dur: 3 });
      spawnImpact(L, "ice", c, "#7ad0ff");
      G.audio.sfx("powerup");
      return bossPause(L, `${c.name} sheathes itself in glacial armor!`);
    }
    if (chance(0.26)) {
      M.charging = {
        skill: tempSkill("Glacial Breath", "ice", 2.3, "ice", "mag", { name: "stun", chance: 0.1, dur: 1 }),
        name: "Glacial Breath",
      };
      spawnImpact(L, "ice", c, "#d6f3ff");
      return bossPause(L, `${c.name} inhales a killing frost... (brace!)`);
    }
    const opts = [sk(G, "frost_breath"), sk(G, "ice_lance"), sk(G, "rime_fang")].filter(Boolean);
    startAnim(G, L, { actor: c, type: "skill", skill: pick(opts), target: L.player });
  },

  // Mirelord: swamp horror — summons bog adds at phase transitions, drenches the
  // field in poisonous miasma, and rears up for a telegraphed Engulf.
  mirelord(G, L, c) {
    const M = c.mech;
    M.t++;
    if (M.charging) return resolveCharge(G, L, c);
    const hp = c.hp / c.maxHp;
    if (M.phase < 1 && hp <= 0.6) {
      M.phase = 1;
      if (summonAdd(G, L, "bog_toad", `${c.name} heaves up a Bog Toad from the muck!`)) return;
    }
    if (M.phase < 2 && hp <= 0.3) {
      M.phase = 2;
      c.buffs.push({ stat: "mag", amount: 7, dur: 99 });
      spawnImpact(L, "dark", c, "#6fbf4a");
      if (!summonAdd(G, L, "leech", `${c.name} births a Blood Leech from its rot!`)) {
        bossPause(L, `${c.name} festers with seething rot!`);
      }
      return;
    }
    if (chance(0.46)) {
      M.charging = {
        skill: tempSkill("Engulf", "dark", 3.3, "dark", "mag", { name: "poison", chance: 0.9, dur: 4, power: 6 }),
        name: "Engulf",
      };
      spawnImpact(L, "dark", c, "#6fbf4a");
      return bossPause(L, `${c.name} rears to ENGULF you in rot... (brace!)`);
    }
    const opts = [sk(G, "miasma"), sk(G, "venom_spit"), sk(G, "bramble_lash"), sk(G, "shadow_bolt")].filter(Boolean);
    startAnim(G, L, { actor: c, type: "skill", skill: pick(opts), target: L.player });
  },

  // Tidewrought: drowned colossus — periodically soaks behind a water shield,
  // grinds with quake/ice pressure, and rears the sea up for a Tidal Crush.
  tidewrought(G, L, c) {
    const M = c.mech;
    M.t++;
    if (M.charging) return resolveCharge(G, L, c);
    const hp = c.hp / c.maxHp;
    if (!M.enraged && hp <= 0.35) {
      M.enraged = true;
      c.buffs.push({ stat: "atk", amount: 8, dur: 99 });
      c.buffs.push({ stat: "spd", amount: 4, dur: 99 });
      M.charging = {
        skill: tempSkill("Tidal Crush", "none", 3.4, "quake", "phys", { name: "stun", chance: 0.4, dur: 1 }),
        name: "Tidal Crush",
      };
      spawnImpact(L, "ice", c, "#9fe4ff");
      return bossPause(L, `${c.name} drags the whole sea upward! (brace!)`, 1.1);
    }
    if (M.t % 5 === 0 && c.shield <= 0) {
      c.shield = Math.round(c.maxHp * 0.12);
      c.buffs.push({ stat: "def", amount: 5, dur: 3 });
      spawnImpact(L, "ice", c, "#9fe4ff");
      G.audio.sfx("powerup");
      return bossPause(L, `${c.name} raises a churning wall of water!`);
    }
    if (chance(0.34)) {
      M.charging = {
        skill: tempSkill("Tidal Crush", "none", 2.7, "quake", "phys", { name: "stun", chance: 0.3, dur: 1 }),
        name: "Tidal Crush",
      };
      spawnImpact(L, "ice", c, "#9fe4ff");
      return bossPause(L, `${c.name} rears the sea up behind it... (brace!)`);
    }
    const opts = [sk(G, "tide_crush"), sk(G, "drown"), sk(G, "ice_lance")].filter(Boolean);
    startAnim(G, L, { actor: c, type: "skill", skill: pick(opts), target: L.player });
  },

  // Magmaroth (FINAL): cinder tyrant — summons ember adds, charges devastating
  // Eruptions, and erupts into a Supernova enrage that punishes the careless.
  magmaroth(G, L, c) {
    const M = c.mech;
    M.t++;
    if (M.charging) return resolveCharge(G, L, c);
    const hp = c.hp / c.maxHp;
    if (M.phase < 1 && hp <= 0.66) {
      M.phase = 1;
      if (summonAdd(G, L, "magma_hound", `${c.name} calls a Magma Hound from the lava!`)) return;
    }
    if (!M.enraged && hp <= 0.4) {
      M.enraged = true;
      c.buffs.push({ stat: "atk", amount: 8, dur: 99 });
      c.buffs.push({ stat: "mag", amount: 10, dur: 99 });
      c.buffs.push({ stat: "spd", amount: 4, dur: 99 });
      M.charging = {
        skill: tempSkill("Supernova", "fire", 4.3, "fire", "mag", { name: "burn", chance: 0.7, dur: 3, power: 6 }),
        name: "Supernova",
      };
      spawnImpact(L, "fire", c, "#ff7a3a");
      return bossPause(L, `${c.name}: the furnace-heart goes CRITICAL! (brace!)`, 1.2);
    }
    if (M.phase < 2 && hp <= 0.5) {
      M.phase = 2;
      if (summonAdd(G, L, "ash_wraith", `${c.name} breathes an Ash Wraith into being!`)) return;
    }
    if (chance(0.36)) {
      M.charging = {
        skill: tempSkill("Eruption", "fire", 2.4, "fire", "mag", { name: "burn", chance: 0.6, dur: 3, power: 5 }),
        name: "Eruption",
      };
      spawnImpact(L, "fire", c, "#ffd23a");
      return bossPause(L, `${c.name} the forge erupts beneath you... (brace!)`);
    }
    const opts = [sk(G, "magma_wave"), sk(G, "inferno"), sk(G, "eruption"), sk(G, "ember_maul")].filter(Boolean);
    startAnim(G, L, { actor: c, type: "skill", skill: pick(opts), target: L.player });
  },
};

// ---- animation timeline ----------------------------------------------------
function startAnim(G, L, action) {
  L.phase = "anim";
  L.acting = action.actor;
  L.hitstop = 0;
  L.anim = {
    ...action,
    t: 0,
    applied: false,
    dur: action.type === "item" ? 0.5 : 0.55,
  };
  const a = L.anim;
  if (a.type === "skill") {
    const sk = a.skill;
    a.melee = ["slash", "thrust", "bite", "claw"].includes(sk.anim);
    if (a.skill.id === "strike") setLog(L, `${action.actor.name} attacks!`);
    else setLog(L, `${action.actor.name} uses ${sk.name}!`);

    // Ranged / magic: launch a projectile that arrives at the impact moment.
    const damaging = ["phys", "mag", "debuff"].includes(sk.type);
    if (damaging && !a.melee && a.target) {
      const col = sk.anim === "thorn" ? "#6fbf4a" : elementColor(sk.element || "none");
      spawnProjectile(
        L,
        actorCenter(a.actor),
        targetCenter(a.target),
        col,
        sk.anim || "bolt",
        a.dur * 0.45,
      );
      // a charging glow that swells at the caster before the projectile leaves
      L.effects.push({
        type: "cast",
        x: actorCenter(a.actor).x,
        y: actorCenter(a.actor).y,
        color: col,
        t: 0,
        dur: a.dur * 0.5,
      });
    }
  } else {
    setLog(L, `${action.actor.name} uses ${action.item.name}!`);
  }
}

function actorCenter(c) {
  return { x: c.x + (c.isPlayer ? 24 : 0), y: c.y - (c.isPlayer ? 24 : 16) };
}
function targetCenter(c) {
  return { x: c.x + (c.isPlayer ? 24 : 0), y: c.y - (c.isPlayer ? 24 : 16) };
}

function updateAnim(G, dt, L) {
  const a = L.anim;
  // hit-stop: freeze the timeline briefly the moment the hit lands (auto-releases
  // when L.hitstop decays in update), so the impact reads with weight.
  if ((L.hitstop || 0) > 0) return;
  a.t += dt;
  const actor = a.actor;
  const p = clamp(a.t / a.dur, 0, 1);

  // MELEE: windup (coil back) -> hard forward strike to contact -> recoil home.
  if (a.type === "skill" && a.melee) {
    const dir = actor.isPlayer ? 1 : -1;
    let off;
    if (p < 0.3) off = -7 * easeOut(p / 0.3); // windup: pull back
    else if (p < 0.45) off = -7 + 27 * easeSnap((p - 0.3) / 0.15); // snap to contact
    else off = 20 * (1 - easeOut((p - 0.45) / 0.55)); // recoil / ease home
    actor.ox = off * dir;
  } else if (
    a.type === "skill" &&
    (a.skill.type === "mag" || a.skill.type === "heal" || a.skill.type === "buff")
  ) {
    // cast: settle/charge dip, then a release hop as the spell lets go
    actor.oy =
      p < 0.45 ? 2 * easeOut(p / 0.45) : -4 * Math.sin(((p - 0.45) / 0.55) * Math.PI);
  }

  if (!a.applied && a.t >= a.dur * 0.45) {
    a.applied = true;
    applyAction(G, L, a);
    // base hit-stop for any action that connected (damage path bumps it for crits)
    L.hitstop = Math.max(L.hitstop || 0, 0.06);
  }
  if (a.t >= a.dur) {
    // resolve deaths / haste extra turn / continue
    if (checkEnd(G, L)) return;
    // extra turn (haste) for player
    if (
      actor.isPlayer &&
      L.player.stat.extraTurnChance &&
      chance(L.player.stat.extraTurnChance)
    ) {
      setLog(L, "A burst of speed — another action!");
      L.phase = "menu";
      L.menu = 0;
      L.sub = null;
      return;
    }
    L.phase = "msg";
    L.timer = 0.45;
  }
}

// ---- apply effects ---------------------------------------------------------
function applyAction(G, L, a) {
  const actor = a.actor;
  if (a.type === "item") {
    const it = a.item;
    removeItem(G.player, it.id, 1);
    const u = it.use || {};
    if (u.hp) {
      heal(G, L, actor, u.hp);
    }
    if (u.mp) {
      actor.mp = Math.min(actor.maxMp, actor.mp + u.mp);
      popup(L, actor, `+${u.mp} MP`, "#7aa0ff");
    }
    if (u.cure) {
      actor.statuses = actor.statuses.filter(
        (s) => !["poison", "burn"].includes(s.name),
      );
      popup(L, actor, "Cured", "#9fffb0");
    }
    G.audio.sfx("heal");
    return;
  }

  const sk = a.skill;
  // determine targets
  let targets = [];
  const enemiesOf = actor.isPlayer ? L.enemies : [L.player];
  const alliesOf = actor.isPlayer ? [L.player] : L.enemies;
  if (sk.type === "heal") {
    targets = sk.target === "allies" ? alliesOf.filter((c) => c.alive) : [a.target || actor];
  } else if (sk.type === "buff") {
    targets = sk.target === "allies" ? alliesOf.filter((c) => c.alive) : [actor];
  } else {
    if (sk.target === "all") targets = enemiesOf.filter((c) => c.alive);
    else targets = [a.target && a.target.alive ? a.target : enemiesOf.find((c) => c.alive)];
  }
  targets = targets.filter(Boolean);

  // sfx per element/anim
  sfxFor(G, sk);

  for (const t of targets) {
    if (sk.type === "heal") {
      heal(G, L, t, Math.round(eff(actor, "mag") * sk.power));
      spawnImpact(L, "heal", t, "#7dff8a");
      continue;
    }
    if (sk.type === "buff") {
      if (sk.buff) {
        t.buffs.push({ ...sk.buff });
        popup(L, t, `${sk.buff.stat.toUpperCase()}+`, "#ffe27a");
      }
      spawnImpact(L, "buff", t, "#ffe27a");
      continue;
    }
    // damage
    let dmg;
    const power = sk.power || 1;
    if (sk.type === "phys") {
      dmg = eff(actor, "atk") * power - eff(t, "def") / 2;
    } else {
      dmg = eff(actor, "mag") * power - eff(t, "def") / 4;
    }
    dmg = Math.max(1, dmg);
    // element
    let crit = false;
    const el = sk.element || "none";
    if (el !== "none" && t.weak && t.weak.includes(el)) dmg *= 1.5;
    if (el !== "none" && t.resist && t.resist.includes(el)) dmg *= 0.5;
    // crit (phys only)
    if (sk.type === "phys" && actor.isPlayer && chance(actor.stat.critChance || 0.06)) {
      dmg *= actor.stat.critMult || 1.6;
      crit = true;
    }
    // dodge
    if (!actor.isPlayer && L.player === t && (L.player.stat.dodge || 0) > 0 && chance(L.player.stat.dodge)) {
      popup(L, t, "MISS", "#cfd6e6");
      continue;
    }
    if (t.defending) {
      dmg *= 0.5;
      popup(L, t, "Guard", "#9fd4ff");
    }
    dmg = Math.round(dmg);

    spawnImpact(L, sk.anim || (sk.type === "phys" ? "slash" : "impact"), t, elementColor(el), actor.isPlayer ? 1 : -1);
    applyDamage(G, L, t, dmg, elementColor(el), crit ? "crit" : "hit");

    // status infliction
    if (sk.status && t.alive && chance(sk.status.chance)) {
      addStatus(t, sk.status);
      popup(L, t, statusLabel(sk.status.name), "#d28aff");
    }
    // lifesteal (player phys)
    if (actor.isPlayer && sk.type === "phys" && (actor.stat.lifesteal || 0) > 0) {
      const ls = Math.round(dmg * actor.stat.lifesteal);
      if (ls > 0) heal(G, L, actor, ls);
    }
    // drain skill heals caster
    if (sk.id === "drain") heal(G, L, actor, Math.round(dmg * 0.6));
    // thorns (player reflects to physical attacker)
    if (
      !actor.isPlayer &&
      t.isPlayer &&
      sk.type === "phys" &&
      (t.stat.thorns || 0) > 0
    ) {
      const refl = Math.max(1, Math.round(dmg * t.stat.thorns));
      applyDamage(G, L, actor, refl, "#ff9f6a", "hit");
    }
  }
}

function applyDamage(G, L, c, dmg, color, kind) {
  // Barrier soak (boss shields) absorbs damage before HP.
  if (c.shield > 0 && dmg > 0) {
    const soak = Math.min(c.shield, dmg);
    c.shield -= soak;
    dmg -= soak;
    if (soak > 0) popup(L, c, `-${soak}`, "#9fe4ff");
    if (dmg <= 0) {
      c.flash = 1;
      return;
    }
  }
  c.hp -= dmg;
  c.flash = 1;
  // intensity scales knockback / squash / shake / particles with the hit size
  const crit = kind === "crit";
  const mag = clamp(dmg / 16, 0.45, 2.4);
  const kb = (crit ? 7 : 4) * mag;
  c.ox += c.isPlayer ? -kb : kb;
  c.oy += (crit ? 4 : 2.5) * mag; // brief downward squash from the blow
  L.shake = Math.max(L.shake, (crit ? 7 : 3) + mag * 3);
  L.hitstop = Math.max(L.hitstop || 0, crit ? 0.1 : 0.07);
  if (crit) L.flashScreen = Math.max(L.flashScreen, 0.5);
  popup(L, c, `${dmg}`, crit ? "#ffd23a" : color, crit);
  burst(L, c, color, Math.round((crit ? 16 : 9) + mag * 6));
  G.audio.sfx(crit ? "crit" : c.isPlayer ? "hit" : "enemyhit");
  if (c.hp <= 0) {
    // Phoenix Down safety net: if the hero would fall while carrying one, it is
    // auto-consumed to revive at half HP instead of triggering game over.
    if (c.isPlayer && hasItem(G.player, "phoenix_down") > 0) {
      removeItem(G.player, "phoenix_down", 1);
      c.hp = Math.max(1, Math.round(c.maxHp * 0.5));
      c.flash = 1;
      L.flashScreen = Math.max(L.flashScreen, 0.6);
      popup(L, c, "Phoenix Down!", "#ffb24a", true);
      burst(L, c, "#ffd23a", 20);
      G.audio.sfx("heal");
      setLog(L, `${c.name} is pulled back from the brink by a Phoenix Down!`);
    } else {
      c.hp = 0;
      c.alive = false;
      if (!c.isPlayer) {
        burst(L, c, "#ffffff", 22);
        G.audio.sfx("death");
      }
    }
  }
}

function heal(G, L, c, amt) {
  amt = Math.min(amt, c.maxHp - c.hp);
  if (amt <= 0) return;
  c.hp += amt;
  popup(L, c, `+${amt}`, "#7dff8a");
  burst(L, c, "#7dff8a", 8);
}

function addStatus(c, st) {
  const existing = c.statuses.find((s) => s.name === st.name);
  if (existing) existing.dur = Math.max(existing.dur, st.dur);
  else c.statuses.push({ name: st.name, dur: st.dur, power: st.power || 3 });
}

// ---- victory & rewards -----------------------------------------------------
function doVictory(G, L) {
  const xp = L.enemies.reduce((s, e) => s + (e.xp || 0), 0);
  const gold = L.enemies.reduce((s, e) => s + (e.gold || 0), 0);
  const loot = [];
  for (const e of L.enemies) {
    for (const d of e.loot || []) {
      if (chance(d.chance)) loot.push(d.id);
    }
  }
  G.player.gold += gold;
  for (const id of loot) {
    addItem(G.player, id, 1);
    const it = G.content.items[id];
    G.toast(`+1 ${it ? it.name : id}`);
  }
  // persist hp/mp before level scaling
  G.player.hp = Math.round(L.player.hp);
  G.player.mp = Math.round(L.player.mp);
  const levels = gainXp(G.player, xp);
  if (levels > 0) {
    const s = computeStats(G.player, G.content);
    G.player.hp = s.maxHp;
    G.player.mp = s.maxMp;
    L.player.hp = s.maxHp;
    L.player.mp = s.maxMp;
    G.audio.sfx("levelup");
  }
  L.rewards = { xp, gold, loot, levels };
  L.phase = "win";
  L.timer = 0.8;
  setLog(L, "Victory!");
  G.audio.stopMusic();
  G.audio.playMusic("victory");
}

// ---- fx helpers ------------------------------------------------------------
function popup(L, c, text, color, big) {
  L.popups.push({
    x: c.x + (c.isPlayer ? 8 : 0) + rand(-4, 4),
    y: c.y - 8,
    vy: -34,
    text,
    color,
    life: 1.0,
    big: !!big,
  });
}
function burst(L, c, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(20, 90);
    L.particles.push({
      x: c.x,
      y: c.y - 6,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 20,
      life: rand(0.3, 0.7),
      color,
      size: rand(1, 2.5) | 0 || 1,
    });
  }
}
function spawnProjectile(L, from, to, color, anim, dur) {
  L.projectiles.push({
    x0: from.x, y0: from.y, x1: to.x, y1: to.y,
    color, anim, t: 0, dur: Math.max(0.12, dur),
  });
}

// Impact effect at a combatant, typed by skill anim. Also adds themed particles.
// dir (+1 attacker-on-left, -1 on-right) orients melee sweeps toward the target.
function spawnImpact(L, anim, c, color, dir = 1) {
  const x = c.x + (c.isPlayer ? 24 : 0);
  const y = c.y - (c.isPlayer ? 24 : 16);
  const type =
    {
      slash: "slash", thrust: "thrust", bite: "bite", claw: "claw",
      fire: "fire", ice: "ice", bolt: "bolt", holy: "holy",
      dark: "dark", quake: "quake", heal: "heal", buff: "buff",
      thorn: "thorn",
    }[anim] || "impact";
  const dur = type === "bolt" ? 0.3 : ["slash", "thrust", "bite", "claw"].includes(type) ? 0.3 : 0.36;
  L.effects.push({ type, x, y, color, t: 0, dur, dir });
  // themed extra particles
  if (type === "fire") {
    for (let i = 0; i < 18; i++)
      L.particles.push({ x: x + rand(-7, 7), y: y + rand(-2, 8), vx: rand(-30, 30), vy: rand(-95, -25), life: rand(0.3, 0.7), color: i % 2 ? "#ff7a3a" : "#ffd23a", size: rand(1, 3) | 0 || 1 });
  } else if (type === "ice") {
    for (let i = 0; i < 16; i++)
      L.particles.push({ x, y, vx: rand(-90, 90), vy: rand(-90, 15), life: rand(0.3, 0.6), color: i % 2 ? "#7ad0ff" : "#d6f3ff", size: rand(1, 3) | 0 || 1 });
  } else if (type === "holy") {
    for (let i = 0; i < 16; i++)
      L.particles.push({ x: x + rand(-7, 7), y: y + rand(-12, 0), vx: rand(-14, 14), vy: rand(-65, -12), life: rand(0.3, 0.7), color: "#fff3c0", size: 2 });
  } else if (type === "dark") {
    for (let i = 0; i < 16; i++)
      L.particles.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-55, 55), vy: rand(-55, 30), life: rand(0.3, 0.6), color: i % 2 ? "#b06aff" : "#d28aff", size: 2 });
  } else if (type === "bolt") {
    for (let i = 0; i < 12; i++)
      L.particles.push({ x: x + rand(-6, 6), y: y + rand(-8, 8), vx: rand(-80, 80), vy: rand(-60, 40), life: rand(0.2, 0.45), color: i % 2 ? "#fff3a0" : "#ffe27a", size: 2 });
  } else if (type === "thorn") {
    for (let i = 0; i < 14; i++)
      L.particles.push({ x: x + rand(-6, 6), y: y + rand(-4, 6), vx: rand(-55, 55), vy: rand(-65, 12), life: rand(0.3, 0.6), color: i % 2 ? "#6fbf4a" : "#4a7a38", size: 2 });
  }
}

function setLog(L, s) {
  L.log = s;
  L.logT = 0;
}

// Pick a battle biome from the current map id.
function biomeFor(G, mapId) {
  const id = (mapId || "").toLowerCase();
  if (id.includes("forest") || id.includes("shrine") || id.includes("green") || id.includes("wood"))
    return "forest";
  if (id.includes("dungeon") || id.includes("cave") || id.includes("sanctum") || id.includes("crypt"))
    return "cave";
  if (id.includes("town") || id.includes("store") || id.includes("inn") || id.includes("house") || id.includes("hollow"))
    return "town";
  if (id.includes("karsthal") || id.includes("mountain") || id.includes("pass") || id.includes("snow"))
    return "mountain";
  // swamp before ruins so "sunken_mire" resolves to swamp, "drowned_ruins" to ruins.
  if (id.includes("mire") || id.includes("swamp") || id.includes("bog"))
    return "swamp";
  if (id.includes("ruins") || id.includes("drowned") || id.includes("sunken"))
    return "ruins";
  if (id.includes("ember") || id.includes("forge") || id.includes("caldera") || id.includes("magma"))
    return "volcanic";
  return "plains";
}
function s_color() {
  return "#b06aff";
}
function statusLabel(n) {
  return (
    {
      poison: "Poison",
      burn: "Burn",
      stun: "Stun",
      atkdown: "ATK-",
      defdown: "DEF-",
    }[n] || n
  );
}
function elementColor(el) {
  return (
    {
      fire: "#ff7a3a",
      ice: "#7ad0ff",
      bolt: "#ffe27a",
      holy: "#fff3c0",
      dark: "#b06aff",
      none: "#ff6a6a",
    }[el] || "#ff6a6a"
  );
}
function sfxFor(G, sk) {
  if (sk.type === "heal") return G.audio.sfx("heal");
  if (sk.type === "buff") return G.audio.sfx("powerup");
  if (sk.element === "fire") return G.audio.sfx("fire");
  if (["ice", "bolt", "holy", "dark"].includes(sk.element))
    return G.audio.sfx("magic");
}

// ---- environment background ------------------------------------------------
function pyramid(ctx, cx, by, w, h, color, dir = -1) {
  ctx.fillStyle = color;
  for (let i = 0; i < h; i++) {
    const ww = Math.max(1, Math.round(w * (1 - i / h)));
    ctx.fillRect(cx - ww, by + dir * i, ww * 2, 1);
  }
}
function dline(ctx, x0, y0, x1, y1, thick, color) {
  ctx.fillStyle = color;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const t2 = Math.max(1, thick);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    ctx.fillRect(Math.round(x - t2 / 2), Math.round(y - t2 / 2), t2, t2);
  }
}
// Stroke an arc (a0->a1 radians) around (x,y) as connected segments — used for
// crescent slashes and fang bites.
function arcStroke(ctx, x, y, r, a0, a1, thick, color) {
  const seg = 9;
  let px = x + Math.cos(a0) * r;
  let py = y + Math.sin(a0) * r;
  for (let i = 1; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg;
    const nx = x + Math.cos(a) * r;
    const ny = y + Math.sin(a) * r;
    dline(ctx, px, py, nx, ny, thick, color);
    px = nx;
    py = ny;
  }
}

function drawBattleBg(G, L, ctx) {
  const W = G.W;
  const H = G.H;
  const horizon = 118;
  const env = L.env || "plains";
  const P = {
    forest: { sky: "#2f6b73", skyB: "#173034", grd: "#274d24", grdB: "#15300f", sil: "#163026" },
    cave: { sky: "#221b33", skyB: "#0a0810", grd: "#2c2740", grdB: "#15111e", sil: "#0d0a16" },
    town: { sky: "#46315f", skyB: "#1d1430", grd: "#3c3654", grdB: "#201d30", sil: "#140f1f" },
    plains: { sky: "#2a4a78", skyB: "#162741", grd: "#3a5a34", grdB: "#22381f", sil: "#1d3946" },
    mountain: { sky: "#5b7aa8", skyB: "#2c3c5e", grd: "#5a6680", grdB: "#2e3650", sil: "#27324c" },
    swamp: { sky: "#3a4a3a", skyB: "#161f18", grd: "#293522", grdB: "#141d12", sil: "#101a12" },
    ruins: { sky: "#39506a", skyB: "#161f30", grd: "#2a3340", grdB: "#141a26", sil: "#10141f" },
    volcanic: { sky: "#3a1c20", skyB: "#160a0e", grd: "#33181a", grdB: "#170b0c", sil: "#0e0608" },
  }[env] || { sky: "#2a4a78", skyB: "#162741", grd: "#3a5a34", grdB: "#22381f", sil: "#1d3946" };

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, P.sky);
  sky.addColorStop(1, P.skyB);
  ctx.fillStyle = sky;
  ctx.fillRect(-4, -4, W + 8, horizon + 8);

  // distant celestial body
  ctx.fillStyle = env === "cave" ? "rgba(120,150,255,0.10)" : "rgba(255,240,200,0.20)";
  ctx.fillRect(W - 70, 16, 18, 18);

  // silhouettes per environment
  if (env === "forest" || env === "plains") {
    // layered hills
    ctx.fillStyle = P.sil;
    ctx.fillRect(-4, horizon - 16, W + 8, 20);
    for (let x = 4; x < W; x += 26) {
      // simple trees
      ctx.fillStyle = "#0e2718";
      ctx.fillRect(x + 10, horizon - 16, 2, 8);
      pyramid(ctx, x + 11, horizon - 12, 8, 12, "#12331f");
    }
  } else if (env === "cave") {
    // stalactites from ceiling + back pillars
    for (let x = 6; x < W; x += 22) {
      pyramid(ctx, x, -2, 5, 10, P.sil, 1);
    }
    ctx.fillStyle = P.sil;
    for (let i = 0; i < 4; i++) {
      const px = 30 + i * 80;
      ctx.fillRect(px, 40, 10, horizon - 40);
    }
  } else if (env === "town") {
    // building silhouettes with roofs
    let x = -2;
    let i = 0;
    while (x < W) {
      const bw = 28 + (i % 3) * 10;
      const bh = 34 + ((i * 13) % 28);
      ctx.fillStyle = P.sil;
      ctx.fillRect(x, horizon - bh, bw, bh);
      pyramid(ctx, x + bw / 2, horizon - bh, bw / 2, 8, P.sil);
      // windows
      ctx.fillStyle = "rgba(255,210,120,0.5)";
      for (let wy = horizon - bh + 8; wy < horizon - 6; wy += 9)
        for (let wx = x + 4; wx < x + bw - 4; wx += 9) ctx.fillRect(wx, wy, 3, 3);
      x += bw + 4;
      i++;
    }
  } else if (env === "mountain") {
    // layered snowy peaks: far range, then nearer jagged white-capped triangles
    ctx.fillStyle = P.sil;
    ctx.fillRect(-4, horizon - 14, W + 8, 18);
    for (let x = 0; x < W + 40; x += 64) {
      pyramid(ctx, x, horizon, 30, 54, P.sil);
      pyramid(ctx, x, horizon - 40, 11, 14, "#dfe9ff");
    }
    for (let x = 32; x < W + 40; x += 64) {
      pyramid(ctx, x, horizon, 22, 40, "#384668");
      pyramid(ctx, x, horizon - 28, 8, 10, "#eef4ff");
    }
  } else if (env === "swamp") {
    // dead leaning trees rising from a low fog band
    ctx.fillStyle = P.sil;
    ctx.fillRect(-4, horizon - 12, W + 8, 16);
    for (let i = 0; i < 7; i++) {
      const x = 14 + i * 46;
      const lean = (i % 2 ? 1 : -1) * 3;
      const top = horizon - 38 - (i % 3) * 6;
      dline(ctx, x, horizon - 8, x + lean, top, 2, "#0c150d");
      dline(ctx, x + lean, top + 10, x + lean + 8, top + 2, 1, "#0c150d");
      dline(ctx, x + lean, top + 16, x + lean - 7, top + 9, 1, "#0c150d");
    }
    ctx.fillStyle = "rgba(150,180,150,0.14)";
    ctx.fillRect(-4, horizon - 14, W + 8, 12);
  } else if (env === "ruins") {
    // broken columns of varying height over a dark water band
    ctx.fillStyle = "#0c1320";
    ctx.fillRect(-4, horizon - 8, W + 8, 12);
    for (let i = 0; i < 8; i++) {
      const x = 8 + i * 40;
      const ch = 20 + ((i * 17) % 30);
      ctx.fillStyle = P.sil;
      ctx.fillRect(x, horizon - ch, 9, ch);
      // jagged broken top
      ctx.fillRect(x - 1, horizon - ch, 2, 3);
      ctx.fillRect(x + 7, horizon - ch + 2, 3, 2);
    }
    ctx.fillStyle = "rgba(120,160,200,0.10)";
    ctx.fillRect(-4, horizon - 7, W + 8, 1);
  } else if (env === "volcanic") {
    // jagged dark rock ridge with a glowing lava seam + ember dots
    ctx.fillStyle = "#ff7a2a";
    ctx.fillRect(-4, horizon - 4, W + 8, 6);
    ctx.fillStyle = "rgba(255,200,80,0.5)";
    ctx.fillRect(-4, horizon - 6, W + 8, 2);
    ctx.fillStyle = P.sil;
    let rx = -4;
    let ri = 0;
    while (rx < W + 8) {
      const rw = 18 + (ri % 3) * 8;
      const rh = 22 + ((ri * 11) % 24);
      pyramid(ctx, rx + rw / 2, horizon - 4, rw / 2, rh, P.sil);
      rx += rw;
      ri++;
    }
    for (let i = 0; i < 18; i++) {
      const ex = (i * 53) % W;
      const ey = 30 + ((i * 37) % 70);
      ctx.fillStyle = i % 2 ? "#ffb050" : "#ff6a2a";
      ctx.fillRect(ex, ey, 1, 1);
    }
  }

  const g2 = ctx.createLinearGradient(0, horizon, 0, H);
  g2.addColorStop(0, P.grd);
  g2.addColorStop(1, P.grdB);
  ctx.fillStyle = g2;
  ctx.fillRect(-4, horizon, W + 8, H - horizon + 8);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(-4, horizon, W + 8, 1);

  if (L.boss) {
    ctx.fillStyle = "rgba(70,0,20,0.4)";
    ctx.fillRect(-4, -4, W + 8, H + 8);
  }
}

// ---- projectiles + skill effects ------------------------------------------
function drawProjectiles(ctx, L) {
  for (const pr of L.projectiles) {
    const u = clamp(pr.t / pr.dur, 0, 1);
    const arc = Math.sin(u * Math.PI) * 6;
    const x = pr.x0 + (pr.x1 - pr.x0) * u;
    const y = pr.y0 + (pr.y1 - pr.y0) * u - arc;
    for (let i = 1; i <= 4; i++) {
      const uu = clamp(u - i * 0.06, 0, 1);
      const tx = pr.x0 + (pr.x1 - pr.x0) * uu;
      const ty = pr.y0 + (pr.y1 - pr.y0) * uu - Math.sin(uu * Math.PI) * 6;
      ctx.globalAlpha = 0.45 - i * 0.09;
      ctx.fillStyle = pr.color;
      ctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = pr.color;
    ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }
}

function drawEffects(ctx, L) {
  for (const fx of L.effects) {
    const k = clamp(fx.t / fx.dur, 0, 1);
    const x = fx.x;
    const y = fx.y;
    const fade = 1 - k;
    ctx.globalAlpha = fade;
    switch (fx.type) {
      case "slash": {
        // wide diagonal crescent that sweeps across the target, with afterimages
        const dir = fx.dir || 1;
        const s = easeOut(clamp(k / 0.7, 0, 1));
        const R = 17;
        const span = 0.8;
        for (let tr = 0; tr < 3; tr++) {
          const st = clamp(s - tr * 0.12, 0, 1);
          let cen = -2.3 + (0.5 - -2.3) * st;
          if (dir < 0) cen = Math.PI - cen;
          ctx.globalAlpha = (1 - tr * 0.33) * fade;
          arcStroke(ctx, x, y, R, cen - span, cen + span, tr === 0 ? 2 : 1, tr === 0 ? "#ffffff" : fx.color);
          if (tr === 0) arcStroke(ctx, x, y, R + 3, cen - span, cen + span, 1, fx.color);
        }
        break;
      }
      case "thrust": {
        // quick forward stab line that shoots through, then an impact spark
        const dir = fx.dir || 1;
        const ext = easeSnap(clamp(k / 0.5, 0, 1));
        const x0 = x - dir * 18;
        const tipx = x0 + dir * 34 * ext;
        dline(ctx, x0, y, tipx, y, 2, fx.color);
        dline(ctx, x0, y - 1, tipx, y - 1, 1, "#ffffff");
        if (k > 0.4) {
          const sr = (k - 0.4) * 26;
          for (let a = 0; a < 4; a++) {
            const ang = (a / 4) * Math.PI * 2 + 0.3;
            dline(ctx, tipx, y, tipx + Math.cos(ang) * sr, y + Math.sin(ang) * sr, 1, "#ffffff");
          }
        }
        break;
      }
      case "bite": {
        // two fang arcs that snap shut, then a chomp flash
        const close = easeOut(clamp(k / 0.5, 0, 1));
        const gap = (1 - close) * 9 + 1;
        arcStroke(ctx, x, y - gap - 2, 11, Math.PI * 0.15, Math.PI * 0.85, 2, "#ffffff");
        arcStroke(ctx, x, y + gap + 2, 11, -Math.PI * 0.85, -Math.PI * 0.15, 2, fx.color);
        for (let i = -1; i <= 1; i++) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x + i * 6 - 1, y - gap, 2, 3);
          ctx.fillStyle = fx.color;
          ctx.fillRect(x + i * 6 - 1, y + gap - 2, 2, 3);
        }
        if (k > 0.5) {
          ctx.globalAlpha = fade * 0.8;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 8, y - 3, 16, 6);
        }
        break;
      }
      case "claw": {
        // three parallel rake streaks sweeping across with a bright leading edge
        const dir = fx.dir || 1;
        const off = -14 + easeOut(k) * 28;
        for (let i = -1; i <= 1; i++) {
          const yy = y + i * 6;
          dline(ctx, x + dir * (off - 13), yy - 3, x + dir * (off + 13), yy + 3, 1, fx.color);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(Math.round(x + dir * (off + 13)) - 1, Math.round(yy) - 2, 2, 5);
        }
        break;
      }
      case "fire": {
        const r = 4 + k * 14;
        ctx.fillStyle = "#ffd23a";
        ctx.globalAlpha = fade * 0.5;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.fillStyle = "#ff7a3a";
        ctx.globalAlpha = fade * 0.7;
        ctx.fillRect(x - r / 2, y - r, r, r * 2);
        break;
      }
      case "ice": {
        const r = 3 + k * 13;
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2;
          dline(ctx, x, y, x + Math.cos(ang) * r, y + Math.sin(ang) * r, 2, a % 2 ? "#7ad0ff" : "#d6f3ff");
        }
        break;
      }
      case "bolt": {
        if (Math.floor(fx.t * 40) % 2 === 0) {
          let py = -4;
          let px = x + (Math.random() - 0.5) * 6;
          while (py < y) {
            const ny = py + 6;
            const nx = x + (Math.random() - 0.5) * 14;
            dline(ctx, px, py, nx, ny, 2, "#fff3a0");
            px = nx;
            py = ny;
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 8, y - 4, 16, 8);
        }
        break;
      }
      case "holy": {
        ctx.fillStyle = "#fff3c0";
        ctx.globalAlpha = fade * 0.8;
        ctx.fillRect(x - 5, -4, 10, y + 8);
        const r = 4 + k * 16;
        ctx.globalAlpha = fade * 0.5;
        ctx.fillRect(x - r, y - 3, r * 2, 6);
        break;
      }
      case "dark": {
        const r = 16 * (1 - k) + 2;
        ctx.strokeStyle = "#b06aff";
        ctx.fillStyle = "#3a1060";
        ctx.globalAlpha = fade * 0.7;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = fade;
        ctx.fillStyle = "#d28aff";
        ctx.fillRect(x - 2, y - 2, 4, 4);
        break;
      }
      case "quake": {
        ctx.fillStyle = "#6a4a2e";
        for (let i = 0; i < 5; i++) {
          const lx = x - 20 + i * 10;
          dline(ctx, lx, 116, lx + 4, 116 + k * 8, 1, "#3a2414");
        }
        break;
      }
      case "thorn": {
        // barbed vines whip out from the hit, growing then fading
        const n = 6;
        for (let a = 0; a < n; a++) {
          const ang = (a / n) * Math.PI * 2 + k * 0.6;
          const len = 4 + k * 15;
          const ex = x + Math.cos(ang) * len;
          const ey = y + Math.sin(ang) * len;
          dline(ctx, x, y, ex, ey, 2, a % 2 ? "#4a7a38" : "#6fbf4a");
          ctx.fillStyle = "#2f2414"; // thorn barb at the tip
          ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2);
        }
        ctx.fillStyle = "#7faa56";
        ctx.fillRect(x - 2, y - 2, 4, 4);
        break;
      }
      case "cast": {
        // swelling charge core with sparks spiralling inward before the launch
        const r = 2 + easeIn(k) * 7;
        ctx.globalAlpha = fade * 0.5;
        ctx.fillStyle = fx.color;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = fade;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 2, y - 2, 4, 4);
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + k * 6;
          const rr = (1 - k) * 16 + 3;
          ctx.fillStyle = fx.color;
          ctx.fillRect(Math.round(x + Math.cos(ang) * rr) - 1, Math.round(y + Math.sin(ang) * rr) - 1, 2, 2);
        }
        break;
      }
      case "heal": {
        const ry = y - k * 18;
        ctx.fillStyle = "#7dff8a";
        for (let i = 0; i < 3; i++) {
          const hx = x - 8 + i * 8;
          ctx.fillRect(hx - 1, ry - 3, 3, 7);
          ctx.fillRect(hx - 3, ry - 1, 7, 3);
        }
        break;
      }
      case "buff": {
        const ry = y - k * 16;
        ctx.fillStyle = fx.color || "#ffe27a";
        for (let i = 0; i < 3; i++) {
          const bx = x - 8 + i * 8;
          dline(ctx, bx - 3, ry + 3, bx, ry - 2, 1, fx.color || "#ffe27a");
          dline(ctx, bx + 3, ry + 3, bx, ry - 2, 1, fx.color || "#ffe27a");
        }
        break;
      }
      default: {
        const r = 3 + k * 12;
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          dline(ctx, x, y, x + Math.cos(ang) * r, y + Math.sin(ang) * r, 1, fx.color);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ---- rendering -------------------------------------------------------------
function renderBattle(G, L) {
  const ctx = G.ctx;
  const sp = G.sprites;
  const sx = L.shake ? (Math.random() - 0.5) * L.shake : 0;
  const sy = L.shake ? (Math.random() - 0.5) * L.shake : 0;
  ctx.save();
  ctx.translate(sx, sy);

  // environment-aware background
  drawBattleBg(G, L, ctx);

  // enemies
  for (const e of L.enemies) {
    if (!e.alive && e.deadFade === undefined) e.deadFade = 1;
    const img = sp.enemy(e.sprite);
    const w = img.width;
    const h = img.height;
    const dx = Math.round(e.x - w / 2 + e.ox);
    const dy = Math.round(e.y - h + e.oy);
    ctx.save();
    if (!e.alive) {
      e.deadFade = Math.max(0, (e.deadFade ?? 1) - 0.04);
      ctx.globalAlpha = e.deadFade;
    }
    // bob idle
    const bob = e.alive ? Math.sin(L.time * 2 + e.x) * 1.5 : 0;
    ctx.drawImage(img, dx, dy + bob);
    if (e.flash > 0) {
      ctx.globalAlpha = e.flash * 0.8 * (e.alive ? 1 : e.deadFade);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(tintCanvas(sp, img), dx, dy + bob);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }

  // player battler (facing right, scale 3)
  {
    const a = L.player;
    const scale = 3;
    const dx = Math.round(a.x - 8 * scale + a.ox);
    const dy = Math.round(a.y - 16 * scale + a.oy);
    const col = sp.walkCol((L.time * 3) % 1) === 0 ? 0 : 0;
    sp.drawActor(ctx, a.actor, dx, dy, "right", 0, scale);
    if (a.flash > 0) {
      ctx.globalAlpha = a.flash * 0.7;
      ctx.fillStyle = "#fff";
      ctx.fillRect(dx + 12, dy + 6, 24, 40);
      ctx.globalAlpha = 1;
    }
    // "Defending" indicator: a bobbing shield by the hero while braced.
    if (a.defending) {
      const by = dy - 4 + Math.round(Math.sin(L.time * 5) * 1.5);
      const ic = sp.icon("shield");
      if (ic) ctx.drawImage(ic, dx + 18, by);
      sp.text(ctx, "Guard", dx + 4, by - 8, "#9fd4ff");
    }
  }

  // flying projectiles (under impact effects)
  drawProjectiles(ctx, L);

  // particles
  for (const p of L.particles) {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // skill impact effects (over combatants)
  drawEffects(ctx, L);

  // popups
  for (const p of L.popups) {
    ctx.globalAlpha = clamp(p.life * 1.5, 0, 1);
    sp.text(ctx, p.text, p.x - p.text.length * 3, p.y, p.color, {
      scale: p.big ? 1.4 : 1,
    });
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // ---- UI ----
  renderEnemyBars(G, L);
  renderPlayerBox(G, L);
  renderLog(G, L);

  if (L.phase === "menu") renderMenu(G, L);
  if (L.phase === "intro" && L.intro) renderIntro(G, L);
  if (L.phase === "win" || L.phase === "summary") {
    if (L.phase === "summary") renderSummary(G, L);
    else bannerText(G, "VICTORY!", "#ffd86a");
  }
  if (L.phase === "lose") {
    ctx.fillStyle = `rgba(80,0,0,${0.4 * L.flashScreen + 0.3})`;
    ctx.fillRect(0, 0, G.W, G.H);
    bannerText(G, "DEFEAT", "#ff6a6a");
    if (L.timer <= 0)
      G.sprites.text(G.ctx, "Press Z", G.W / 2 - 18, G.H - 20, "#cfd6e6");
  }
  if (L.flashScreen > 0 && L.phase !== "lose") {
    ctx.fillStyle = `rgba(255,255,255,${L.flashScreen * 0.4})`;
    ctx.fillRect(0, 0, G.W, G.H);
  }
}

let _tintCache = new WeakMap();
function tintCanvas(sp, img) {
  if (_tintCache.has(img)) return _tintCache.get(img);
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  _tintCache.set(img, c);
  return c;
}

function renderEnemyBars(G, L) {
  const ctx = G.ctx;
  const sp = G.sprites;
  for (const e of L.enemies) {
    if (!e.alive) continue;
    const w = 30;
    const x = clamp(e.x - w / 2, 2, G.W - w - 2);
    const y = clamp(e.y - 4, 4, G.H - 30);
    sp.bar(ctx, x, y, w, 3, e.hp / e.maxHp, "#e05a6a", "#3a1020");
    // barrier overlay (boss shields)
    if (e.shield > 0) {
      const frac = Math.min(1, e.shield / Math.max(1, e.maxHp));
      ctx.fillStyle = "#9fe4ff";
      ctx.fillRect(x, y - 2, Math.round(w * frac), 2);
    }
    // status icons
    let ix = x;
    for (const s of e.statuses) {
      ctx.fillStyle = statusColor(s.name);
      ctx.fillRect(ix, y - 4, 2, 2);
      ix += 3;
    }
    // target cursor
    if (L.phase === "menu" && L.sub === "target") {
      const living = L.enemies.filter((en) => en.alive);
      if (living[L.targetIdx] === e) {
        ctx.fillStyle = "#ffd86a";
        const ty = e.y - 4 + Math.sin(L.time * 8) * 2;
        sp.text(ctx, "v", e.x - 3, ty - 8, "#ffd86a");
      }
    }
  }
}

function statusColor(n) {
  return (
    { poison: "#7dff8a", burn: "#ff7a3a", stun: "#ffe27a", atkdown: "#ff9f6a", defdown: "#9fb0ff" }[
      n
    ] || "#fff"
  );
}

function renderPlayerBox(G, L) {
  const ctx = G.ctx;
  const sp = G.sprites;
  const x = 4;
  const y = G.H - 46;
  const w = 134;
  const h = 42;
  sp.panel(ctx, x, y, w, h);

  // Portrait in a framed inset.
  const por = sp.portrait("hero");
  ctx.fillStyle = "#0a0e1c";
  ctx.fillRect(x + 4, y + 5, 24, 24);
  ctx.drawImage(por, 0, 0, 32, 32, x + 4, y + 5, 24, 24);
  ctx.fillStyle = "#5a6488";
  ctx.fillRect(x + 4, y + 5, 24, 1);
  ctx.fillRect(x + 4, y + 28, 24, 1);
  ctx.fillRect(x + 4, y + 5, 1, 24);
  ctx.fillRect(x + 27, y + 5, 1, 24);

  const ix = x + 32;
  sp.text(ctx, G.player.name, ix, y + 5, "#fff");
  sp.text(ctx, `Lv${G.player.level}`, x + w - 26, y + 5, "#ffd86a");

  // HP
  sp.text(ctx, "HP", ix, y + 15, "#9aa1ad");
  sp.bar(ctx, ix + 16, y + 16, 46, 5, L.player.hp / L.player.maxHp, "#5be37e");
  sp.text(ctx, `${Math.ceil(L.player.hp)}/${L.player.maxHp}`, ix + 66, y + 14, "#dff7e2");
  // MP
  sp.text(ctx, "MP", ix, y + 24, "#9aa1ad");
  sp.bar(ctx, ix + 16, y + 25, 46, 4, L.player.mp / Math.max(1, L.player.maxMp), "#5aa0ff");
  sp.text(ctx, `${Math.ceil(L.player.mp)}/${L.player.maxMp}`, ix + 66, y + 23, "#dbe7ff");

  // Status row (its own line — no longer overlapping the level).
  if (L.player.statuses.length) {
    sp.text(ctx, "St", ix, y + 33, "#8f8ab8");
    let sx = ix + 16;
    for (const s of L.player.statuses) {
      ctx.fillStyle = statusColor(s.name);
      ctx.fillRect(sx, y + 33, 5, 5);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(sx, y + 33, 5, 1);
      sp.text(ctx, `${statusLabel(s.name)}`, sx + 7, y + 33, statusColor(s.name));
      sx += 7 + sp.textWidth(statusLabel(s.name)) + 6;
    }
  } else {
    sp.text(ctx, "Ready", ix, y + 33, "#5b7a5e");
  }
}

function renderLog(G, L) {
  if (!L.log) return;
  const ctx = G.ctx;
  const sp = G.sprites;
  const w = sp.textWidth(L.log) + 12;
  const x = (G.W - w) / 2;
  ctx.fillStyle = "rgba(8,10,20,0.8)";
  ctx.fillRect(x, 4, w, 12);
  sp.text(ctx, L.log, x + 6, 7, "#e9edff");
}

function renderMenu(G, L) {
  const ctx = G.ctx;
  const sp = G.sprites;
  if (L.sub === null) {
    const x = G.W - 84;
    const y = G.H - 70;
    sp.panel(ctx, x, y, 80, 66);
    CMDS.forEach((c, i) => {
      const yy = y + 4 + i * 12;
      if (i === L.menu) {
        ctx.fillStyle = "#2a3566";
        ctx.fillRect(x + 2, yy - 1, 76, 11);
        sp.text(ctx, ">", x + 4, yy, "#ffd86a");
      }
      sp.text(ctx, c, x + 12, yy, i === L.menu ? "#fff" : "#aab2c8");
    });
  } else if (L.sub === "skill" || L.sub === "item") {
    const list = L.subList;
    const x = 8;
    const y = G.H - 76;
    const w = 150;
    const h = 72;
    sp.panel(ctx, x, y, w, h);
    sp.text(ctx, L.sub === "skill" ? "Skills" : "Items", x + 6, y + 3, "#ffd86a");
    const max = 5;
    const start = clamp(L.subIdx - 2, 0, Math.max(0, list.length - max));
    for (let i = 0; i < Math.min(max, list.length); i++) {
      const idx = start + i;
      const e = list[idx];
      const yy = y + 14 + i * 11;
      if (idx === L.subIdx) {
        ctx.fillStyle = "#2a3566";
        ctx.fillRect(x + 2, yy - 1, w - 4, 10);
      }
      if (L.sub === "skill") {
        const col = e.disabled ? "#5a6172" : idx === L.subIdx ? "#fff" : "#cdd6f4";
        sp.text(ctx, e.skill.name, x + 8, yy, col);
        sp.text(ctx, `${e.skill.mp}MP`, x + w - 30, yy, e.disabled ? "#5a6172" : "#7aa0ff");
      } else {
        sp.text(ctx, e.item.name, x + 8, yy, idx === L.subIdx ? "#fff" : "#cdd6f4");
        sp.text(ctx, `x${e.qty}`, x + w - 24, yy, "#9aa1ad");
      }
    }
    // desc
    const sel = list[L.subIdx];
    const desc = L.sub === "skill" ? sel.skill.desc : sel.item.desc;
    if (desc) sp.text(ctx, desc, x + 6, y + h - 10, "#8f97ad");
  }
}

function renderIntro(G, L) {
  const ctx = G.ctx;
  const sp = G.sprites;
  const lines = sp.wrap(L.intro, 240);
  const h = lines.length * 10 + 12;
  sp.panel(ctx, 30, 60, 260, h, { border: "#ff6a8a" });
  lines.forEach((ln, i) =>
    sp.text(ctx, ln, 40, 68 + i * 10, "#ffd0da"),
  );
  // Blinking "Press Z" prompt so the player knows the intro waits for them.
  if ((L.timer || 0) <= 0 && (G.time * 2) % 1 < 0.6) {
    const hint = "Press Z";
    sp.text(ctx, hint, 30 + 260 - sp.textWidth(hint) - 8, 60 + h - 9, "#ff9ab0");
  }
}

function bannerText(G, txt, color) {
  const sp = G.sprites;
  sp.text(G.ctx, txt, (G.W - sp.textWidth(txt, 2)) / 2, 70, color, { scale: 2 });
}

function renderSummary(G, L) {
  const ctx = G.ctx;
  const sp = G.sprites;
  const r = L.rewards;
  const w = 180;
  const h = 90;
  const x = (G.W - w) / 2;
  const y = (G.H - h) / 2;
  sp.panel(ctx, x, y, w, h, { border: "#ffd86a" });
  sp.text(ctx, "VICTORY!", x + (w - sp.textWidth("VICTORY!", 1.5)) / 2, y + 6, "#ffd86a", {
    scale: 1.5,
  });
  let yy = y + 24;
  sp.text(ctx, `XP gained: ${r.xp}`, x + 12, yy, "#cdd6f4");
  yy += 11;
  sp.text(ctx, `Gold found: ${r.gold}`, x + 12, yy, "#ffe27a");
  yy += 11;
  if (r.levels > 0) {
    sp.text(ctx, `LEVEL UP!  Lv ${G.player.level}`, x + 12, yy, "#7dff8a");
    yy += 11;
  }
  if (r.loot.length) {
    const names = r.loot
      .map((id) => G.content.items[id]?.name || id)
      .slice(0, 3)
      .join(", ");
    sp.text(ctx, `Loot: ${names}`, x + 12, yy, "#9fffb0");
    yy += 11;
  }
  if ((G.time * 1.5) % 1 < 0.6)
    sp.text(ctx, "Press Z", x + (w - sp.textWidth("Press Z")) / 2, y + h - 12, "#8f97ad");
}
