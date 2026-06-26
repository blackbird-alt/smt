// ============================================================================
// Sunstone — Title screen.
//
// Animated, color-cycling "SUNSTONE" logo over a drifting starfield, with a
// keyboard/gamepad-navigated menu (New Game / Continue / How to Play / music
// toggle) and a controls overlay. Conforms to game/CONTRACT.md.
// ============================================================================

import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";

const STAR_ICONS = ["star", "star", "star", "coin"];

// Build the menu fresh each frame so "Continue" appears the instant a save
// exists and the music-toggle label reflects the live mute state.
function buildItems(G) {
  const items = [];
  // When any slot has a save, Continue (quick-resume newest) is the default.
  if (G.save.anyExists()) items.push({ key: "continue", label: "Continue" });
  items.push({ key: "new", label: "New Game" });
  items.push({ key: "howto", label: "How to Play" });
  items.push({ key: "settings", label: "Settings" });
  items.push({ key: "mute", label: `Music: ${G.audio.isMusicEnabled() ? "On" : "Off"}` });
  return items;
}

function spawnStars(G) {
  const stars = [];
  for (let i = 0; i < 22; i++) {
    stars.push({
      x: Math.random() * G.W,
      y: Math.random() * G.H,
      vx: -4 - Math.random() * 12,
      vy: (Math.random() - 0.5) * 4,
      icon: STAR_ICONS[(Math.random() * STAR_ICONS.length) | 0],
      tw: Math.random() * Math.PI * 2,
      sc: Math.random() < 0.25 ? 1 : 0,
    });
  }
  return stars;
}

registerState({
  name: "title",
  overlay: false,

  enter(G, params, local) {
    local.t = 0;
    local.sel = 0;
    local.howto = false;
    local.stars = spawnStars(G);
    G.audio.playMusic("title");
  },

  update(G, dt, local) {
    local.t += dt;

    // Drift the starfield, wrapping off the left edge back to the right.
    for (const s of local.stars) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.tw += dt * 3;
      if (s.x < -12) {
        s.x = G.W + 8;
        s.y = Math.random() * G.H;
      }
      if (s.y < -12) s.y = G.H + 8;
      if (s.y > G.H + 12) s.y = -8;
    }

    // Controls overlay: scroll with Up/Down, close with cancel/menu/confirm.
    if (local.howto) {
      const lay = howToLayout(G);
      const maxScroll = Math.max(0, lay.lines.length - lay.maxLines);
      if (G.input.justPressed("up")) {
        local.howScroll = Math.max(0, (local.howScroll || 0) - 1);
        G.audio.sfx("cursor");
      } else if (G.input.justPressed("down")) {
        local.howScroll = Math.min(maxScroll, (local.howScroll || 0) + 1);
        G.audio.sfx("cursor");
      } else if (
        G.input.justPressed("cancel") ||
        G.input.justPressed("menu") ||
        G.input.justPressed("confirm")
      ) {
        G.audio.sfx("cancel");
        local.howto = false;
      }
      return;
    }

    const items = buildItems(G);
    if (local.sel >= items.length) local.sel = items.length - 1;

    if (G.input.justPressed("up")) {
      local.sel = (local.sel - 1 + items.length) % items.length;
      G.audio.sfx("cursor");
    } else if (G.input.justPressed("down")) {
      local.sel = (local.sel + 1) % items.length;
      G.audio.sfx("cursor");
    }

    if (G.input.justPressed("confirm")) {
      const choice = items[local.sel];
      switch (choice.key) {
        case "new":
          // Open the save-slot manager (pick a slot to start or load).
          G.audio.sfx("confirm");
          G.replace("saveslots");
          break;
        case "continue": {
          const slot = G.save.mostRecentSlot();
          if (slot) {
            G.audio.sfx("confirm");
            G.continueGame(slot);
          } else {
            G.audio.sfx("error");
          }
          break;
        }
        case "howto":
          G.audio.sfx("confirm");
          local.howto = true;
          local.howScroll = 0;
          break;
        case "settings":
          G.audio.sfx("confirm");
          G.push("settings");
          break;
        case "mute": {
          const on = G.audio.setMusicEnabled(!G.audio.isMusicEnabled());
          if (on) {
            G.audio.resume();
            G.audio.playMusic("title");
          }
          G.audio.sfx("cursor");
          break;
        }
        default:
          break;
      }
    }
  },

  render(G, local) {
    const ctx = G.ctx;
    const { W, H, t } = { W: G.W, H: G.H, t: local.t };

    // Deep dusk-to-night gradient backdrop.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0a0a1e");
    grad.addColorStop(0.55, "#161033");
    grad.addColorStop(1, "#2a163f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Drifting decorative sprites / twinkling stars.
    for (const s of local.stars) {
      const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(s.tw));
      ctx.globalAlpha = a;
      const img = sprites.icon(s.icon);
      if (img) ctx.drawImage(img, Math.round(s.x), Math.round(s.y));
    }
    ctx.globalAlpha = 1;

    // Big color-cycling "SUNSTONE" logo (scaled pixel text), gently bobbing.
    const title = "SUNSTONE";
    const scale = 4;
    const tw = sprites.textWidth(title, scale);
    const tx = (W - tw) / 2;
    const ty = 34 + Math.sin(t * 1.5) * 2;
    const hue = (t * 45) % 360;
    // Glow/echo pass behind the main text.
    sprites.text(ctx, title, tx, ty + 2, `hsl(${hue}, 70%, 28%)`, {
      scale,
      shadow: false,
    });
    sprites.text(ctx, title, tx, ty, `hsl(${hue}, 85%, 62%)`, {
      scale,
      shadow: false,
    });

    // Subtitle.
    const sub = "~ Rekindle the dimmed light ~";
    sprites.text(ctx, sub, (W - sprites.textWidth(sub)) / 2, ty + 36, "#cdb4ff");

    if (local.howto) {
      drawHowTo(G, local);
    } else {
      drawMenu(G, local);
    }

    // Footer hint.
    const foot = "Arrows: Move   Z/Enter: Confirm   X: Back";
    sprites.text(ctx, foot, (W - sprites.textWidth(foot)) / 2, H - 11, "#6f6a99");
  },

  exit(G, local) {
    // Leave the title music alone here; the next state sets its own track.
  },
});

function drawMenu(G, local) {
  const ctx = G.ctx;
  const items = buildItems(G);
  const lineH = 13;
  // Anchor the block just above the footer so it never overlaps it.
  const startY = G.H - 18 - items.length * lineH;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const selected = i === local.sel;
    const label = it.label;
    const w = sprites.textWidth(label) + (selected ? 18 : 0);
    const x = (G.W - w) / 2 + (selected ? 12 : 0);
    const y = startY + i * lineH;
    const col = selected ? "#ffe9a8" : "#b9b4d6";
    if (selected) {
      const blink = 0.6 + 0.4 * Math.sin(local.t * 8);
      ctx.globalAlpha = blink;
      sprites.text(ctx, ">", x - 12, y, "#ffd86a");
      ctx.globalAlpha = 1;
    }
    sprites.text(ctx, label, x, y, col);
  }
}

// Raw How-To content. Section headers are tagged so we can tint them.
const HOWTO_RAW = [
  "#MOVEMENT",
  "Arrows or WASD - walk around the world.",
  "Hold Shift - run faster.",
  "",
  "#ACTIONS",
  "Z / Enter / Space - talk, confirm, advance text.",
  "X / Esc - cancel, close menus.",
  "C - open the pause menu (status, items, quests).",
  "I - open your inventory.",
  "",
  "#BATTLE",
  "Pick Attack, Skill, Item, Defend or Flee.",
  "Turn order follows Speed. Exploit elemental",
  "weaknesses and watch your MP.",
  "Defend halves the damage you take that turn -",
  "lean on it when a boss telegraphs a big",
  "wind-up attack.",
  "",
  "#STAYING ALIVE",
  "Carry a Phoenix Down: if you fall while one",
  "is in your pack it auto-revives you once.",
  "Stock potions before you delve.",
  "",
  "#PROGRESS",
  "Win fights for XP. Each level up lets you pick",
  "a power-up - these shape your whole build,",
  "from raw stats to traits like lifesteal,",
  "thorns, dodge and crits.",
  "",
  "#SAVING",
  "Three save slots keep separate runs. Save",
  "from the menu or at safe havens; choose a",
  "slot on the title screen to continue.",
  "",
  "#THE JOURNEY",
  "Your choices steer which ending you reach -",
  "and the story doesn't end at the first dawn.",
  "A second act opens after the first ending,",
  "carrying your hero onward.",
  "",
  "Rebind keys and toggle audio in Settings.",
];

// Shared geometry + wrapped lines for the How-To overlay.
function howToLayout(G) {
  const x = 30;
  const y = 44;
  const w = G.W - 60;
  const h = G.H - 70;
  const innerW = w - 20;
  // Wrap each raw line, preserving blanks and the leading '#' header tag.
  const lines = [];
  for (const raw of HOWTO_RAW) {
    if (raw === "") {
      lines.push("");
      continue;
    }
    const header = raw[0] === "#";
    const text = header ? raw.slice(1) : raw;
    const wrapped = sprites.wrap(text, innerW);
    wrapped.forEach((ln, i) => lines.push((header && i === 0 ? "#" : "") + ln));
  }
  const top = y + 20;
  const bottom = y + h - 12;
  const maxLines = Math.max(1, Math.floor((bottom - top) / 9));
  return { x, y, w, h, innerW, top, bottom, maxLines, lines };
}

function drawHowTo(G, local) {
  const ctx = G.ctx;
  const lay = howToLayout(G);
  const { x, y, w, h, top, maxLines, lines } = lay;
  sprites.panel(ctx, x, y, w, h);
  sprites.text(ctx, "HOW TO PLAY", x + 10, y + 7, "#ffe9a8");

  const scroll = Math.max(0, Math.min(local.howScroll || 0, Math.max(0, lines.length - maxLines)));
  let yy = top;
  for (let i = scroll; i < Math.min(lines.length, scroll + maxLines); i++) {
    let ln = lines[i];
    let col = "#cfd6e6";
    if (ln[0] === "#") {
      ln = ln.slice(1);
      col = "#ffd86a";
    }
    sprites.text(ctx, ln, x + 10, yy, col);
    yy += 9;
  }

  // Scroll indicators (right edge); the hint is left-aligned so they don't clash.
  if (scroll > 0) sprites.text(ctx, "^", x + w - 14, top, "#ffd86a");
  if (scroll + maxLines < lines.length)
    sprites.text(ctx, "v", x + w - 14, lay.bottom - 2, "#ffd86a");

  const hint = "Up/Down: Scroll   X: Back";
  sprites.text(ctx, hint, x + 10, y + h - 10, "#8f8ab8");
}
