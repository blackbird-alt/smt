// ============================================================================
// Sunstone — Settings (overlay).
//
// Audio toggles (Music / SFX) and rebindable Controls, plus Reset to Defaults.
// Up/Down move the cursor; Left/Right or Confirm toggle audio rows; Confirm on
// a control row enters "press a key" capture mode; Cancel/Menu closes.
// Conforms to game/CONTRACT.md. Audio + bindings persist via audio.js / input.js.
// ============================================================================

import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";

registerState({
  name: "settings",
  overlay: true,

  enter(G, params, L) {
    L.sel = 0;
    L.capturing = null; // action currently being rebound, or null
    L.cancelCapture = null;
    L.items = buildItems(G);
    G.audio.sfx("confirm");
  },

  exit(G, L) {
    if (L.cancelCapture) {
      L.cancelCapture();
      L.cancelCapture = null;
      L.capturing = null;
    }
  },

  update(G, dt, L) {
    const I = G.input;

    // While capturing a key, swallow all navigation; the one-shot listener
    // registered with input.captureNext resolves asynchronously.
    if (L.capturing) return;

    if (I.justPressed("cancel") || I.justPressed("menu")) {
      G.audio.sfx("cancel");
      G.pop();
      return;
    }

    const n = L.items.length;
    if (I.justPressed("up")) {
      L.sel = (L.sel - 1 + n) % n;
      G.audio.sfx("cursor");
    } else if (I.justPressed("down")) {
      L.sel = (L.sel + 1) % n;
      G.audio.sfx("cursor");
    }

    const item = L.items[L.sel];
    const toggled = I.justPressed("left") || I.justPressed("right");

    if (item.kind === "music" && (toggled || I.justPressed("confirm"))) {
      toggleMusic(G);
    } else if (item.kind === "sfx" && (toggled || I.justPressed("confirm"))) {
      toggleSfx(G);
    } else if (item.kind === "bind" && I.justPressed("confirm")) {
      startCapture(G, L, item.action);
    } else if (item.kind === "reset" && I.justPressed("confirm")) {
      G.input.resetBindings();
      G.audio.sfx("confirm");
      if (G.toast) G.toast("Controls reset to defaults.");
    }
  },

  render(G, L) {
    const ctx = G.ctx;
    ctx.fillStyle = "rgba(6,4,16,0.9)";
    ctx.fillRect(0, 0, G.W, G.H);

    const x = 8;
    const y = 4;
    const w = G.W - 16;
    const h = G.H - 8;
    sprites.panel(ctx, x, y, w, h, { border: "#ffd86a" });

    const cx = x + 8;
    sprites.text(ctx, "Settings", cx, y + 4, "#ffe9a8");

    const I = G.input;
    const rowX = cx;
    const rowW = w - 16;

    // ---- Audio section ----
    sprites.text(ctx, "AUDIO", rowX, y + 15, "#cdb4ff");
    drawToggle(ctx, L, 0, rowX, y + 25, rowW, "Music", G.audio.isMusicEnabled());
    drawToggle(ctx, L, 1, rowX, y + 35, rowW, "Sound FX", G.audio.isSfxEnabled());

    // ---- Controls section ----
    sprites.text(ctx, "CONTROLS", rowX, y + 47, "#cdb4ff");
    const bindTop = y + 57;
    const bindStep = 9;
    let nBinds = 0;
    L.items.forEach((item, idx) => {
      if (item.kind !== "bind") return;
      const i = idx - 2; // bind rows start at item index 2
      const ry = bindTop + i * bindStep;
      nBinds = i + 1;
      const sel = idx === L.sel;
      drawRowBg(ctx, sel, rowX - 2, ry - 1, rowW + 4);
      const label = I.actionLabel(item.action);
      sprites.text(ctx, (sel ? ">" : " ") + label, rowX, ry, sel ? "#ffe9a8" : "#cfd6e6");
      let keyTxt;
      if (L.capturing === item.action) keyTxt = "Press a key (Esc/X)";
      else keyTxt = codeLabel(I.getKeysFor(item.action)[0]);
      const col = L.capturing === item.action ? "#ffd86a" : sel ? "#ffe9a8" : "#b9b4d6";
      sprites.text(ctx, keyTxt, rowX + rowW - sprites.textWidth(keyTxt), ry, col);
    });

    // ---- Reset (placed right after the last binding, not bottom-anchored) ----
    const resetIdx = L.items.length - 1;
    const resetY = bindTop + nBinds * bindStep + 3;
    const rsel = L.sel === resetIdx;
    drawRowBg(ctx, rsel, rowX - 2, resetY - 1, rowW + 4);
    sprites.text(ctx, (rsel ? ">" : " ") + "Reset to Defaults", rowX, resetY, rsel ? "#ffe9a8" : "#cfd6e6");

    const hint = "Up/Down Select   </>/Z Change   X Close";
    sprites.text(ctx, hint, (G.W - sprites.textWidth(hint)) / 2, y + h - 9, "#8f8ab8");
  },
});

// ------------------------------------------------------------------ items ----

function buildItems(G) {
  const items = [{ kind: "music" }, { kind: "sfx" }];
  for (const action of G.input.REBINDABLE) items.push({ kind: "bind", action });
  items.push({ kind: "reset" });
  return items;
}

// ---------------------------------------------------------------- actions ----

function toggleMusic(G) {
  const on = !G.audio.isMusicEnabled();
  G.audio.setMusicEnabled(on);
  if (on) {
    G.audio.resume();
    const track = currentTrack(G);
    if (track) G.audio.playMusic(track);
  }
  G.audio.sfx("cursor");
}

function toggleSfx(G) {
  const on = !G.audio.isSfxEnabled();
  G.audio.setSfxEnabled(on);
  if (on) G.audio.sfx("cursor"); // audible confirmation that sfx are back
}

function currentTrack(G) {
  const map = G.player && G.content && G.content.maps[G.player.map];
  return (map && map.music) || "title";
}

function startCapture(G, L, action) {
  G.audio.sfx("confirm");
  L.capturing = action;
  L.cancelCapture = G.input.captureNext((code) => {
    L.capturing = null;
    L.cancelCapture = null;
    // Escape (null) or X cancels; any other key becomes the new primary.
    if (!code || code === "KeyX") {
      G.audio.sfx("cancel");
      return;
    }
    G.input.rebind(action, code);
    G.audio.sfx("confirm");
  });
}

// ----------------------------------------------------------------- render ----

function drawRowBg(ctx, sel, x, y, w) {
  if (!sel) return;
  ctx.fillStyle = "#243056";
  ctx.fillRect(x, y, w, 9);
}

function drawToggle(ctx, L, idx, x, y, w, label, on) {
  const sel = L.sel === idx;
  drawRowBg(ctx, sel, x - 2, y - 1, w + 4);
  sprites.text(ctx, (sel ? ">" : " ") + label, x, y, sel ? "#ffe9a8" : "#cfd6e6");
  const val = on ? "On" : "Off";
  const col = on ? "#9be3a0" : "#a05a5a";
  sprites.text(ctx, val, x + w - sprites.textWidth(val), y, col);
}

function codeLabel(code) {
  if (!code) return "--";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Arrow")) return code.slice(5);
  if (code.startsWith("Digit")) return code.slice(5);
  const map = {
    Escape: "Esc",
    Enter: "Enter",
    Space: "Space",
    Backspace: "Bksp",
    ShiftLeft: "LShift",
    ShiftRight: "RShift",
    ControlLeft: "LCtrl",
    ControlRight: "RCtrl",
    AltLeft: "LAlt",
    AltRight: "RAlt",
    Tab: "Tab",
  };
  return map[code] || code;
}
