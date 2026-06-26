// Headless smoke test: stub DOM/canvas, boot the game, force-drive every state
// while pumping frames, and report any runtime errors. Run: node game/smoke.mjs
let errors = [];
function rec(where, e) {
  errors.push(`[${where}] ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
}

// ---- canvas 2D context stub ----
function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy(
    {
      canvas: { width: 320, height: 180 },
      measureText: (s) => ({ width: (s ? s.length : 0) * 4 }),
      createLinearGradient: () => grad,
      createRadialGradient: () => grad,
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    },
    {
      get(t, p) {
        if (p in t) return t[p];
        // any unknown property: return a no-op function (covers methods) but
        // also serve as assignable property via set trap.
        if (!(p in t)) t[p] = () => {};
        return t[p];
      },
      set(t, p, v) {
        t[p] = v;
        return true;
      },
    },
  );
}
function makeCanvas() {
  return { width: 320, height: 180, style: {}, getContext: () => makeCtx(), addEventListener() {} };
}

const gameCanvas = makeCanvas();
global.document = {
  getElementById: () => gameCanvas,
  createElement: (t) => (t === "canvas" ? makeCanvas() : { style: {} }),
  documentElement: { setAttribute() {} },
  addEventListener() {},
};

let rafCb = null;
global.requestAnimationFrame = (cb) => {
  rafCb = cb;
  return 1;
};
let _t = 0;
global.performance = { now: () => (_t += 16.7) };
Object.defineProperty(global, "navigator", {
  value: { getGamepads: () => [] },
  configurable: true,
});
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};
global.window = {
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  // intentionally no AudioContext -> audio disables itself gracefully
};

// ---- import the game (boots on import) ----
const { G } = await import("./src/main.js");
const { input } = await import("./src/input.js");
await new Promise((r) => setTimeout(r, 80)); // let boot()/sprites.build finish

function press(...actions) {
  input._keyDown = {};
  for (const a of actions) input._keyDown[a] = true;
}
function release() {
  input._keyDown = {};
}
function step() {
  if (!rafCb) throw new Error("no rAF callback registered (loop died)");
  const cb = rafCb;
  rafCb = null;
  cb(performance.now());
}
function pump(n, driver) {
  for (let i = 0; i < n; i++) {
    if (driver) driver(i);
    else release();
    try {
      step();
    } catch (e) {
      rec("frame", e);
      release();
      // re-register loop if it died
      if (!rafCb) global.requestAnimationFrame(() => {});
      throw e;
    }
  }
}

function topName() {
  const t = G.top();
  return t ? t.def.name : "(none)";
}

// ---------------------------------------------------------------- run -------
try {
  console.log("booted; top =", topName());

  // Title -> New Game
  pump(3);
  press("confirm");
  step();
  release();
  pump(5);
  console.log("after newgame; top =", topName(), "map =", G.player && G.player.map);

  // Walk around the overworld in several directions (may trigger encounters)
  for (const dir of ["down", "right", "up", "left", "down", "right"]) {
    pump(20, () => press(dir));
    release();
    pump(2);
    // if a battle/dialogue triggered, mash confirm/cancel to resolve a bit
    if (topName() !== "overworld") {
      pump(40, (i) => (i % 2 ? press("confirm") : release()));
    }
  }
  console.log("after walking; top =", topName());
} catch (e) {
  rec("overworld-phase", e);
}

// Ensure we are back on overworld for isolated tests
function ensureOverworld() {
  let guard = 0;
  while (topName() !== "overworld" && guard++ < 20) {
    try {
      G.pop();
    } catch (e) {
      rec("pop", e);
      break;
    }
  }
}

// ---- Every dialogue tree ----
for (const treeId of Object.keys(G.content.dialogues)) {
  ensureOverworld();
  try {
    G.openDialogue(treeId);
    pump(60, (i) => {
      // advance typewriter + choices; alternate to also pick choices
      if (i % 3 === 0) press("confirm");
      else if (i % 7 === 0) press("down");
      else release();
    });
  } catch (e) {
    rec("dialogue:" + treeId, e);
  }
  // dialogues may have navigated to title (endings) — reboot path
  if (topName() === "title") {
    press("confirm");
    step();
    release();
    pump(5);
  }
}
console.log("dialogue trees tested:", Object.keys(G.content.dialogues).length);

// ---- Battle: a normal group and each boss ----
ensureOverworld();
const battles = [["slime", "bat"], ["warden"], ["shadowlord"], ["sunshade"]];
for (const grp of battles) {
  ensureOverworld();
  // heal up so we can run battles
  G.player.hp = 9999;
  G.player.mp = 9999;
  G.player.hp = G.stats().maxHp;
  G.player.mp = G.stats().maxMp;
  try {
    G.startBattle(grp);
    // drive ~600 frames issuing varied commands; should resolve win/lose
    pump(600, (i) => {
      const m = i % 6;
      if (m === 0) press("confirm");
      else if (m === 2) press("down");
      else if (m === 4) press("confirm");
      else release();
    });
  } catch (e) {
    rec("battle:" + grp.join("+"), e);
  }
}
console.log("battles tested:", battles.length, "top =", topName());

// ---- Powerup ----
ensureOverworld();
try {
  G.player.pendingPicks = 1;
  G.push("powerup");
  pump(20, (i) => (i % 4 === 0 ? press("right") : i % 5 === 0 ? press("confirm") : release()));
} catch (e) {
  rec("powerup", e);
}

// ---- Menu (all tabs) ----
ensureOverworld();
try {
  G.push("menu");
  pump(60, (i) => {
    const m = i % 8;
    if (m === 0) press("right");
    else if (m === 2) press("down");
    else if (m === 4) press("confirm");
    else release();
  });
  // close
  press("cancel");
  step();
  release();
} catch (e) {
  rec("menu", e);
}

// ---- Shop ----
ensureOverworld();
try {
  const shopId = Object.keys(G.content.shops)[0];
  G.player.gold = 9999;
  G.push("shop", { shopId });
  pump(40, (i) => {
    const m = i % 6;
    if (m === 0) press("confirm");
    else if (m === 2) press("down");
    else if (m === 4) press("right");
    else release();
  });
} catch (e) {
  rec("shop", e);
}

// ---- Inventory ----
ensureOverworld();
try {
  G.push("inventory");
  pump(40, (i) => {
    const m = i % 6;
    if (m === 0) press("right");
    else if (m === 2) press("down");
    else if (m === 4) press("confirm");
    else release();
  });
  press("cancel");
  step();
  release();
} catch (e) {
  rec("inventory", e);
}

// ---- Settings ----
ensureOverworld();
try {
  G.push("settings");
  pump(60, (i) => {
    const m = i % 6;
    if (m === 0) press("down");
    else if (m === 2) press("right");
    else if (m === 4) press("confirm");
    else release();
  });
  press("cancel");
  step();
  release();
} catch (e) {
  rec("settings", e);
}

// ---- Save / Continue round-trip ----
ensureOverworld();
try {
  G.player.gold = 777;
  G.player.level = 4;
  G.story.set("test_flag", true);
  G.saveGame();
  // discard live state, then continue from the save
  G.player = null;
  G.story = null;
  const ok = G.continueGame();
  pump(3);
  if (!ok) rec("save", "continueGame returned false");
  else if (G.player.gold !== 777) rec("save", "gold not restored: " + G.player.gold);
  else if (G.player.level !== 4) rec("save", "level not restored: " + G.player.level);
  else if (!G.story.is("test_flag")) rec("save", "story flag not restored");
  else console.log("save/continue round-trip OK (gold=777, level=4, flag restored)");
} catch (e) {
  rec("save", e);
}

// ---- Audio settings persistence ----
try {
  G.audio.setMusicEnabled(false);
  if (G.audio.isMusicEnabled()) rec("audio", "musicEnabled not false after toggle");
  G.audio.playMusic("town");
  if (G.audio._curTrack) rec("audio", "music played while disabled");
  const raw = JSON.parse(localStorage.getItem("sunstone-audio-v1") || "{}");
  if (raw.musicEnabled !== false) rec("audio", "musicEnabled not persisted to storage");
  else console.log("audio music toggle persists OFF correctly");
  G.audio.setMusicEnabled(true);
} catch (e) {
  rec("audio", e);
}

// ---- Game over ----
ensureOverworld();
try {
  G.push("gameover");
  pump(120, (i) => (i % 10 === 0 ? press("down") : release()));
} catch (e) {
  rec("gameover", e);
}

// ---------------------------------------------------------------- report ----
console.log("\n==== SMOKE RESULT ====");
if (errors.length === 0) {
  console.log("OK — no runtime errors across all states.");
  process.exit(0);
} else {
  console.log(`${errors.length} error(s):`);
  for (const e of errors.slice(0, 40)) console.log(" -", e);
  process.exit(1);
}
