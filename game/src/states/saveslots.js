// ============================================================================
// Sunstone — Save Slots screen.
//
// Reached from the title's "New Game" (and the slot-aware Continue flow). Shows
// the three save slots with each game's hero, level, location and last-played
// time. Pick an empty slot to start a new game there, or a filled slot to load
// or delete it. Conforms to game/CONTRACT.md.
// ============================================================================

import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";

const SLOT_ACTIONS = [
  { key: "load", label: "Continue" },
  { key: "delete", label: "Delete" },
  { key: "back", label: "Back" },
];

function ago(ts) {
  if (!ts) return "";
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${m | 0}m ago`;
  const h = m / 60;
  if (h < 24) return `${h | 0}h ago`;
  const d = h / 24;
  if (d < 30) return `${d | 0}d ago`;
  return new Date(ts).toLocaleDateString();
}

registerState({
  name: "saveslots",
  overlay: false,

  enter(G, params, L) {
    L.t = 0;
    L.slots = G.save.slots; // [1,2,3]
    // Default selection: the most recent save, else the first slot.
    const recent = G.save.mostRecentSlot();
    L.idx = recent ? L.slots.indexOf(recent) : 0;
    if (L.idx < 0) L.idx = 0;
    L.mode = "slots"; // "slots" | "actions" | "confirmDelete"
    L.actIdx = 0;
    refresh(G, L);
  },

  update(G, dt, L) {
    L.t += dt;
    const I = G.input;

    if (L.mode === "slots") {
      if (I.justPressed("up")) {
        L.idx = (L.idx - 1 + L.slots.length) % L.slots.length;
        G.audio.sfx("cursor");
      } else if (I.justPressed("down")) {
        L.idx = (L.idx + 1) % L.slots.length;
        G.audio.sfx("cursor");
      } else if (I.justPressed("confirm")) {
        const slot = L.slots[L.idx];
        if (G.save.has(slot)) {
          G.audio.sfx("confirm");
          L.mode = "actions";
          L.actIdx = 0;
        } else {
          // Empty slot -> start a fresh game here.
          G.audio.sfx("confirm");
          G.newGame("Hero", slot);
        }
      } else if (I.justPressed("cancel")) {
        G.audio.sfx("cancel");
        G.replace("title");
      }
      return;
    }

    if (L.mode === "actions") {
      const slot = L.slots[L.idx];
      if (I.justPressed("up")) {
        L.actIdx = (L.actIdx - 1 + SLOT_ACTIONS.length) % SLOT_ACTIONS.length;
        G.audio.sfx("cursor");
      } else if (I.justPressed("down")) {
        L.actIdx = (L.actIdx + 1) % SLOT_ACTIONS.length;
        G.audio.sfx("cursor");
      } else if (I.justPressed("confirm")) {
        const act = SLOT_ACTIONS[L.actIdx].key;
        if (act === "load") {
          G.audio.sfx("confirm");
          if (!G.continueGame(slot)) {
            G.toast("Save could not be loaded.");
            L.mode = "slots";
          }
        } else if (act === "delete") {
          G.audio.sfx("cursor");
          L.mode = "confirmDelete";
          L.delIdx = 1; // default to "No"
        } else {
          G.audio.sfx("cancel");
          L.mode = "slots";
        }
      } else if (I.justPressed("cancel")) {
        G.audio.sfx("cancel");
        L.mode = "slots";
      }
      return;
    }

    if (L.mode === "confirmDelete") {
      const slot = L.slots[L.idx];
      if (I.justPressed("left") || I.justPressed("right") || I.justPressed("up") || I.justPressed("down")) {
        L.delIdx = L.delIdx ? 0 : 1;
        G.audio.sfx("cursor");
      } else if (I.justPressed("confirm")) {
        if (L.delIdx === 0) {
          G.save.clear(slot);
          G.audio.sfx("cancel");
          refresh(G, L);
          G.toast(`Slot ${slot} deleted.`);
        } else {
          G.audio.sfx("cursor");
        }
        L.mode = "slots";
      } else if (I.justPressed("cancel")) {
        G.audio.sfx("cancel");
        L.mode = "slots";
      }
      return;
    }
  },

  render(G, L) {
    const ctx = G.ctx;
    const W = G.W;
    const H = G.H;

    // Backdrop (matches the title's dusk palette).
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0a0a1e");
    grad.addColorStop(0.55, "#161033");
    grad.addColorStop(1, "#2a163f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const heading = "SELECT A GAME";
    sprites.text(ctx, heading, (W - sprites.textWidth(heading, 2)) / 2, 12, "#ffe9a8", { scale: 2, shadow: false });

    const cardX = 26;
    const cardW = W - 52;
    const cardH = 38;
    const top = 38;
    const gap = 6;

    for (let i = 0; i < L.slots.length; i++) {
      const slot = L.slots[i];
      const info = L.info[i];
      const sel = i === L.idx;
      const y = top + i * (cardH + gap);
      sprites.panel(ctx, cardX, y, cardW, cardH, {
        fill: sel ? "#241a44" : "#140f2c",
        border: sel ? "#ffd86a" : "#3a2f5e",
        inner: sel ? "#33285c" : "#1d1740",
      });

      sprites.text(ctx, `SLOT ${slot}`, cardX + 8, y + 6, sel ? "#ffe9a8" : "#b9b4d6");

      if (info) {
        sprites.text(ctx, info.name, cardX + 64, y + 6, sel ? "#ffffff" : "#cdc7e6");
        sprites.text(ctx, `Lv ${info.level}`, cardX + 64, y + 18, "#9fd4a8");
        sprites.text(ctx, info.locationName, cardX + 104, y + 18, "#9bb4e6");
        const coin = sprites.icon("coin");
        if (coin) ctx.drawImage(coin, cardX + cardW - 64, y + 4);
        sprites.text(ctx, `${info.gold}`, cardX + cardW - 50, y + 6, "#ffe27a");
        const when = ago(info.ts);
        if (when) sprites.text(ctx, when, cardX + cardW - 8 - sprites.textWidth(when), y + 18, "#8f8ab8");
      } else {
        sprites.text(ctx, "- Empty -", cardX + 64, y + 6, "#7a749c");
        sprites.text(ctx, "New Game", cardX + 64, y + 18, sel ? "#9fd4a8" : "#6f6a99");
      }

      if (sel && L.mode === "slots") {
        const blink = 0.6 + 0.4 * Math.sin(L.t * 8);
        ctx.globalAlpha = blink;
        sprites.text(ctx, ">", cardX - 10, y + 12, "#ffd86a");
        ctx.globalAlpha = 1;
      }
    }

    if (L.mode === "actions") renderActions(G, L, cardX, cardW, top, cardH, gap);
    if (L.mode === "confirmDelete") renderConfirm(G, L);

    const hint =
      L.mode === "slots"
        ? "Up/Down: Select   Z: Choose   X: Back"
        : "Up/Down: Select   Z: Confirm   X: Back";
    sprites.text(ctx, hint, (W - sprites.textWidth(hint)) / 2, H - 11, "#6f6a99");
  },
});

function refresh(G, L) {
  L.info = L.slots.map((s) => G.save.info(s));
}

function renderActions(G, L, cardX, cardW, top, cardH, gap) {
  const ctx = G.ctx;
  const y = top + L.idx * (cardH + gap);
  const w = 92;
  const x = cardX + cardW - w - 4;
  const h = SLOT_ACTIONS.length * 12 + 8;
  const py = y + cardH - 2;
  sprites.panel(ctx, x, py, w, h, { fill: "#120c26", border: "#ffd86a" });
  for (let i = 0; i < SLOT_ACTIONS.length; i++) {
    const sel = i === L.actIdx;
    const yy = py + 5 + i * 12;
    if (sel) sprites.text(ctx, ">", x + 6, yy, "#ffd86a");
    sprites.text(ctx, SLOT_ACTIONS[i].label, x + 16, yy, sel ? "#ffe9a8" : "#b9b4d6");
  }
}

function renderConfirm(G, L) {
  const ctx = G.ctx;
  const W = G.W;
  const H = G.H;
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#05030c";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  const w = 180;
  const h = 56;
  const x = (W - w) / 2;
  const y = (H - h) / 2;
  sprites.panel(ctx, x, y, w, h, { fill: "#1a1030", border: "#ff8a8a" });
  const slot = L.slots[L.idx];
  const q = `Delete Slot ${slot}?`;
  sprites.text(ctx, q, (W - sprites.textWidth(q)) / 2, y + 10, "#ffd0d0");
  const opts = ["Delete", "Cancel"];
  for (let i = 0; i < opts.length; i++) {
    const sel = i === L.delIdx;
    const ox = x + 28 + i * 84;
    const oy = y + 32;
    if (sel) {
      sprites.panel(ctx, ox - 6, oy - 3, 64, 14, { fill: "#3a1218", border: "#ffd86a" });
    }
    sprites.text(ctx, opts[i], ox + 6, oy, sel ? "#ffe9a8" : "#b09098");
  }
}
