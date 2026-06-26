// ============================================================================
// Sunstone — a pixel RPG. Engine bootstrap + state manager + game context (G).
// ============================================================================
import { input } from "./input.js";
import { sprites } from "./sprites.js";
import { audio } from "./audio.js";
import { save } from "./save.js";
import { createStory } from "./story.js";
import { content } from "./data.js";
import { newPlayer, computeStats } from "./stats.js";
import { states, registerState } from "./registry.js";

export { registerState };

// Import states for their side-effect registration.
import "./states/title.js";
import "./states/overworld.js";
import "./states/dialogue.js";
import "./states/battle.js";
import "./states/powerup.js";
import "./states/menu.js";
import "./states/shop.js";
import "./states/inventory.js";
import "./states/settings.js";
import "./states/gameover.js";
import "./states/saveslots.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width;
const H = canvas.height;

// ---- The shared game context handed to every state. ------------------------
const G = {
  ctx,
  canvas,
  W,
  H,
  input,
  sprites,
  audio,
  save,
  content,
  data: content, // alias
  story: null, // created on new/continue game
  player: null,
  time: 0,
  dt: 0,
  // overlay toast messages
  _toasts: [],

  // ---- State-stack control ----
  stack: [],
  push(name, params = {}) {
    const s = states[name];
    if (!s) throw new Error("Unknown state: " + name);
    const inst = { def: s, local: {} };
    this.stack.push(inst);
    if (s.enter) s.enter(this, params, inst.local);
    return inst;
  },
  replace(name, params = {}) {
    this.pop(null, true);
    return this.push(name, params);
  },
  pop(result = null, silent = false) {
    const inst = this.stack.pop();
    if (inst && inst.def.exit) inst.def.exit(this, inst.local);
    const below = this.stack[this.stack.length - 1];
    if (!silent && below && below.def.resume) {
      below.def.resume(this, result, below.local);
    }
    return inst;
  },
  clearTo(name, params = {}) {
    while (this.stack.length) this.pop(null, true);
    return this.push(name, params);
  },
  top() {
    return this.stack[this.stack.length - 1];
  },

  // ---- Convenience helpers used widely by content/states ----
  stats(p = this.player) {
    return computeStats(p, this.content);
  },
  startBattle(enemyIds, opts = {}) {
    this.push("battle", { enemyIds: [].concat(enemyIds), ...opts });
  },
  openDialogue(treeId, opts = {}) {
    this.push("dialogue", { treeId, ...opts });
  },
  newGame(name = "Hero", slot) {
    if (slot) this.save.setActiveSlot(slot);
    this.player = newPlayer(name);
    this.story = createStory();
    this.replace("overworld", { fresh: true });
  },
  continueGame(slot) {
    if (slot) this.save.setActiveSlot(slot);
    const data = this.save.load();
    if (!data) return false;
    this.player = data.player;
    this.story = createStory(data.story);
    this.replace("overworld", { fromSave: true });
    return true;
  },
  saveGame(opts = {}) {
    if (!this.player) return;
    const map = this.content.maps[this.player.map];
    const meta = {
      name: this.player.name,
      level: this.player.level,
      gold: this.player.gold,
      map: this.player.map,
      locationName: (map && map.name) || this.player.map,
      ts: Date.now(),
    };
    this.save.save({ player: this.player, story: this.story.serialize(), meta });
    if (opts.silent) return;
    this.toast(opts.label || "Game saved", opts.ttl || 2.2);
  },
  toast(msg, ttl = 2.2) {
    this._toasts.push({ msg, ttl, t: 0 });
  },
};

// ---- Toast rendering (drawn on top of everything). -------------------------
function updateToasts(dt) {
  for (const t of G._toasts) {
    t.t += dt;
    t.ttl -= dt;
  }
  G._toasts = G._toasts.filter((t) => t.ttl > 0);
}
function renderToasts() {
  let y = 8;
  for (const t of G._toasts) {
    const a = Math.min(1, t.ttl) * Math.min(1, t.t * 4);
    const w = t.msg.length * 6 + 12;
    const x = (W - w) / 2;
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(x, y, w, 14);
    ctx.globalAlpha = a;
    sprites.text(ctx, t.msg, x + 6, y + 4, "#ffe9a8");
    ctx.globalAlpha = 1;
    y += 17;
  }
}

// ---- Render the stack: from the topmost opaque state upward. ----------------
function renderStack() {
  let base = G.stack.length - 1;
  while (base > 0 && G.stack[base].def.overlay) base--;
  for (let i = base; i < G.stack.length; i++) {
    const inst = G.stack[i];
    if (inst.def.render) inst.def.render(G, inst.local);
  }
}

// ---- Main loop. ------------------------------------------------------------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1; // clamp after tab switch
  G.dt = dt;
  G.time += dt;

  input.update();

  const top = G.top();
  if (top && top.def.update) top.def.update(G, dt, top.local);

  ctx.clearRect(0, 0, W, H);
  renderStack();
  updateToasts(dt);
  renderToasts();

  requestAnimationFrame(frame);
}

// ---- Boot. -----------------------------------------------------------------
async function boot() {
  await sprites.build();
  save.migrateLegacy();
  G.push("title");
  requestAnimationFrame(frame);
  // Resume audio context on first interaction (browser autoplay policy).
  const unlock = () => {
    audio.resume();
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("pointerdown", unlock);
  };
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);
}
boot();

export { G };
