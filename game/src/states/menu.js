// ============================================================================
// Sunstone — Pause menu (overlay).
//
// Tabbed RPG menu over the overworld: Status, Items (field use), Quests, Save
// and Quit to Title. Left/Right switch tabs, Up/Down move within a list, Z acts
// and X / C close. Conforms to game/CONTRACT.md.
// ============================================================================

import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";
import { computeStats, xpForNext, removeItem } from "../stats.js";

const TABS = ["Status", "Items", "Quests", "Settings", "Quit"];

// Truncate a string with a trailing ".." so long names never overflow a width.
function fit(str, maxW) {
  if (!str) return "";
  if (sprites.textWidth(str) <= maxW) return str;
  let s = str;
  while (s.length > 1 && sprites.textWidth(s + "..") > maxW) s = s.slice(0, -1);
  return s + "..";
}

registerState({
  name: "menu",
  overlay: true,

  enter(G, params, local) {
    local.tab = 0;
    local.sel = 0;
    G.audio.sfx("confirm");
  },

  update(G, dt, local) {
    if (G.input.justPressed("cancel") || G.input.justPressed("menu")) {
      G.audio.sfx("cancel");
      G.pop();
      return;
    }

    if (G.input.justPressed("left")) {
      local.tab = (local.tab - 1 + TABS.length) % TABS.length;
      local.sel = 0;
      G.audio.sfx("cursor");
    } else if (G.input.justPressed("right")) {
      local.tab = (local.tab + 1) % TABS.length;
      local.sel = 0;
      G.audio.sfx("cursor");
    }

    const entries = entryCount(G, local.tab);
    if (entries > 0) {
      if (G.input.justPressed("up")) {
        local.sel = (local.sel - 1 + entries) % entries;
        G.audio.sfx("cursor");
      } else if (G.input.justPressed("down")) {
        local.sel = (local.sel + 1) % entries;
        G.audio.sfx("cursor");
      }
    }

    if (G.input.justPressed("confirm")) act(G, local);
  },

  render(G, local) {
    const ctx = G.ctx;
    ctx.fillStyle = "rgba(6,4,16,0.86)";
    ctx.fillRect(0, 0, G.W, G.H);

    drawTabs(G, local);
    const x = 6;
    const y = 24;
    const w = G.W - 12;
    const h = G.H - y - 16;
    sprites.panel(ctx, x, y, w, h);

    switch (TABS[local.tab]) {
      case "Status": drawStatus(G, x + 8, y + 8, w - 16); break;
      case "Items": drawItems(G, local, x + 8, y + 8, w - 16, h - 16); break;
      case "Quests": drawQuests(G, local, x + 8, y + 8, w - 16, h - 16); break;
      case "Settings": drawAction(G, x + 8, y + 8, "Audio toggles and control rebinding.", "Open Settings"); break;
      case "Quit": drawAction(G, x + 8, y + 8, "Return to the title screen.\nProgress saves at checkpoints (e.g. town).", "Quit to Title"); break;
      default: break;
    }

    const hint = "Left/Right: Tab   Up/Down: Select   Z: Use   X/C: Close";
    sprites.text(ctx, hint, (G.W - sprites.textWidth(hint)) / 2, G.H - 11, "#8f8ab8");
  },

  resume(G, result, local) {
    // Returns here after a power-up pick (none expected) — nothing to do.
  },
});

// ------------------------------------------------------------- list sizing ---

function fieldItems(G) {
  return G.player.inventory
    .map((slot) => ({ slot, def: G.content.items[slot.id] }))
    .filter((e) => e.def);
}

function questList(G) {
  const all = G.story.allQuests();
  const active = all.filter((q) => q.status !== "done");
  const done = all.filter((q) => q.status === "done");
  return [...active, ...done];
}

function entryCount(G, tab) {
  if (TABS[tab] === "Items") return fieldItems(G).length;
  if (TABS[tab] === "Quests") return questList(G).length;
  return 0;
}

// ---------------------------------------------------------------- actions ----

function act(G, local) {
  const tab = TABS[local.tab];
  if (tab === "Settings") {
    G.audio.sfx("confirm");
    G.push("settings");
    return;
  }
  if (tab === "Quit") {
    G.audio.sfx("confirm");
    G.clearTo("title");
    return;
  }
  if (tab === "Items") {
    const list = fieldItems(G);
    const entry = list[local.sel];
    if (!entry) return;
    useFieldItem(G, entry.def);
  }
}

function useFieldItem(G, def) {
  const p = G.player;
  if (!def.usableInField || !def.use) {
    G.audio.sfx("error");
    G.toast("Can't use that here.");
    return;
  }
  const st = computeStats(p, G.content);
  const use = def.use;
  let did = false;
  if (use.hp) {
    if (p.hp < st.maxHp) {
      p.hp = Math.min(st.maxHp, p.hp + use.hp);
      did = true;
    }
  }
  if (use.mp) {
    if (p.mp < st.maxMp) {
      p.mp = Math.min(st.maxMp, p.mp + use.mp);
      did = true;
    }
  }
  if (use.cure) did = true; // no lingering field ailments; consume anyway
  if (!did) {
    G.audio.sfx("error");
    G.toast("No effect right now.");
    return;
  }
  removeItem(p, def.id, 1);
  G.audio.sfx("heal");
  G.toast(`Used ${def.name}.`);
}

// ----------------------------------------------------------------- render ----

function drawTabs(G, local) {
  const ctx = G.ctx;
  let x = 6;
  const y = 6;
  for (let i = 0; i < TABS.length; i++) {
    const sel = i === local.tab;
    const label = TABS[i];
    const w = sprites.textWidth(label) + 10;
    sprites.panel(ctx, x, y, w, 14, {
      fill: sel ? "#2a1f54" : "#120c26",
      border: sel ? "#ffd86a" : "#4a4470",
    });
    sprites.text(ctx, label, x + 5, y + 4, sel ? "#ffe9a8" : "#9a95c2");
    x += w + 3;
  }
}

function drawStatus(G, x, y, w) {
  const ctx = G.ctx;
  const p = G.player;
  const st = computeStats(p, G.content);

  sprites.text(ctx, p.name, x, y, "#ffe9a8");
  sprites.text(ctx, `Lv ${p.level}`, x + w - 40, y, "#ffe9a8");

  // XP progress to next level.
  const need = xpForNext(p.level);
  sprites.text(ctx, "XP", x, y + 11, "#cfd6e6");
  sprites.bar(ctx, x + 22, y + 12, w - 60, 5, p.xp / Math.max(1, need), "#caa24f");
  sprites.text(ctx, `${p.xp}/${need}`, x + w - 34, y + 11, "#cfd6e6");

  // HP / MP.
  sprites.text(ctx, "HP", x, y + 21, "#cfd6e6");
  sprites.bar(ctx, x + 22, y + 22, w - 60, 5, p.hp / Math.max(1, st.maxHp), "#5be37e");
  sprites.text(ctx, `${Math.ceil(p.hp)}/${st.maxHp}`, x + w - 44, y + 21, "#dff7e2");
  sprites.text(ctx, "MP", x, y + 30, "#cfd6e6");
  sprites.bar(ctx, x + 22, y + 31, w - 60, 5, p.mp / Math.max(1, st.maxMp), "#5aa0ff");
  sprites.text(ctx, `${Math.ceil(p.mp)}/${st.maxMp}`, x + w - 44, y + 30, "#dbe7ff");

  // Core combat stats (incl. crit chance) in two columns.
  const statRows = [
    `ATK ${st.atk}`, `DEF ${st.def}`,
    `MAG ${st.mag}`, `SPD ${st.spd}`,
    `LCK ${st.luck}`, `CRIT ${Math.round(st.critChance * 100)}%`,
  ];
  let sy = y + 42;
  const colX = x + Math.floor(w / 2);
  statRows.forEach((txt, i) => {
    const tx = i % 2 === 0 ? x : colX;
    const ty = sy + Math.floor(i / 2) * 10;
    sprites.text(ctx, txt, tx, ty, "#cfd6e6");
  });
  sy += Math.ceil(statRows.length / 2) * 10 + 2;

  // Derived combat traits — only those a power-up actually grants. Wraps so a
  // fully-built hero's list never runs off the panel.
  const traits = [];
  if (st.lifesteal) traits.push(`Lifesteal ${Math.round(st.lifesteal * 100)}%`);
  if (st.thorns) traits.push(`Thorns ${Math.round(st.thorns * 100)}%`);
  if (st.dodge) traits.push(`Dodge ${Math.round(st.dodge * 100)}%`);
  if (st.extraTurnChance) traits.push(`Extra Turn ${Math.round(st.extraTurnChance * 100)}%`);
  if (traits.length) {
    sprites.text(ctx, "Traits:", x, sy, "#cdb4ff");
    const tlines = sprites.wrap(traits.join("   "), w - 44);
    let tx = x + 44;
    const shown = Math.min(tlines.length, 2);
    for (let i = 0; i < shown; i++) {
      sprites.text(ctx, tlines[i], tx, sy + i * 9, "#bfe8c4");
      tx = x; // continuation lines use the full width
    }
    sy += shown * 9 + 2;
  }

  sprites.text(ctx, `Gold: ${p.gold}`, x, sy, "#ffe27a");
  sy += 12;

  // Owned power-ups with icons, wrapped across up to two rows (then "+N").
  sprites.text(ctx, "Powers:", x, sy, "#cdb4ff");
  if (!p.powerups.length) {
    sprites.text(ctx, "none yet", x + 50, sy, "#7c779e");
  } else {
    const startX = x + 50;
    const maxX = x + w - 28; // leave room for a "+N" overflow tag
    let px = startX;
    let py = sy - 1;
    let i = 0;
    for (; i < p.powerups.length; i++) {
      const def = G.content.powerups[p.powerups[i]];
      const icon = def && sprites.icon(def.icon);
      if (!icon) continue;
      if (px > maxX) {
        if (py > sy - 1) break; // already filled the second row
        px = startX;
        py += 12;
      }
      ctx.drawImage(icon, px, py);
      px += 14;
    }
    if (i < p.powerups.length) {
      sprites.text(ctx, `+${p.powerups.length - i}`, px, py + 2, "#cdb4ff");
    }
  }
}

function drawItems(G, local, x, y, w, h) {
  const ctx = G.ctx;
  const list = fieldItems(G);
  if (!list.length) {
    sprites.text(ctx, "Your pack is empty.", x, y, "#7c779e");
    return;
  }
  const lh = 12;
  const maxRows = Math.floor((h - 20) / lh);
  const start = Math.max(0, Math.min(local.sel - Math.floor(maxRows / 2), list.length - maxRows));
  for (let i = start; i < Math.min(list.length, start + maxRows); i++) {
    const { slot, def } = list[i];
    const sel = i === local.sel;
    const yy = y + (i - start) * lh;
    if (sel) sprites.text(ctx, ">", x, yy, "#ffd86a");
    const icon = sprites.icon(def.icon);
    if (icon) ctx.drawImage(icon, x + 10, yy - 1);
    sprites.text(ctx, def.name, x + 24, yy, sel ? "#ffe9a8" : "#cfd6e6");
    sprites.text(ctx, `x${slot.qty}`, x + w - 26, yy, "#b9b4d6");
  }

  // Selected item description + usability note.
  const cur = list[local.sel];
  if (cur) {
    const dy = y + h - 18;
    ctx.fillStyle = "#0c0820";
    ctx.fillRect(x - 2, dy - 2, w + 4, 18);
    const note = cur.def.usableInField ? "" : " (cannot use here)";
    const lines = sprites.wrap(cur.def.desc + note, w);
    sprites.text(ctx, lines[0] || "", x, dy, "#9a95c2");
    if (lines[1]) sprites.text(ctx, lines[1], x, dy + 9, "#9a95c2");
  }
}

function drawQuests(G, local, x, y, w, h) {
  const ctx = G.ctx;
  const quests = questList(G);
  if (!quests.length) {
    sprites.text(ctx, "No quests yet. Talk to the townsfolk.", x, y, "#7c779e");
    return;
  }

  // Summary header.
  const active = quests.filter((q) => q.status !== "done").length;
  const done = quests.length - active;
  sprites.text(ctx, `Quest Log`, x, y, "#ffe9a8");
  const sum = `Active ${active}   Done ${done}`;
  sprites.text(ctx, sum, x + w - sprites.textWidth(sum), y, "#9a95c2");

  const top = y + 12;
  const bottom = y + h - 2;
  // Scroll so the selected quest stays in view: start a little above it.
  const sel = Math.min(local.sel, quests.length - 1);
  const start = Math.max(0, Math.min(sel - 1, quests.length - 1));

  let yy = top;
  if (start > 0) {
    sprites.text(ctx, "^ more ^", x + w - sprites.textWidth("^ more ^"), yy, "#7c779e");
    yy += 9;
  }
  let lastHeader = null;
  for (let i = start; i < quests.length; i++) {
    if (yy > bottom - 8) {
      sprites.text(ctx, "v more v", x + w - sprites.textWidth("v more v"), bottom - 6, "#7c779e");
      break;
    }
    const q = quests[i];
    const isDone = q.status === "done";
    const header = isDone ? "COMPLETED" : "ACTIVE";
    if (header !== lastHeader) {
      sprites.text(ctx, header, x, yy, isDone ? "#7fae84" : "#cdb4ff");
      yy += 9;
      lastHeader = header;
    }
    const selected = i === sel;
    if (selected) {
      ctx.fillStyle = "#241a44";
      ctx.fillRect(x - 2, yy - 1, w + 2, 9);
      sprites.text(ctx, ">", x, yy, "#ffd86a");
    }
    const namePrefix = isDone ? "* " : "- ";
    sprites.text(ctx, namePrefix + fit(q.name, w - 14), x + 8, yy, isDone ? "#9be3a0" : "#ffe9a8");
    yy += 10;

    // Show objectives for the selected quest (keeps the log compact).
    if (selected) {
      for (const o of q.objectives) {
        if (yy > bottom - 8) break;
        const mark = o.done ? "[x]" : "[ ]";
        const lines = sprites.wrap(`${mark} ${o.text}`, w - 16);
        for (const ln of lines) {
          sprites.text(ctx, ln, x + 14, yy, o.done ? "#7fae84" : "#cfd6e6");
          yy += 9;
        }
      }
      if (q.desc) {
        const dl = sprites.wrap(q.desc, w - 16);
        sprites.text(ctx, dl[0] || "", x + 14, yy, "#8f8ab8");
        yy += 9;
      }
      yy += 2;
    }
  }
}

function drawAction(G, x, y, desc, btn) {
  const ctx = G.ctx;
  const lines = desc.split("\n");
  let yy = y;
  for (const ln of lines) {
    sprites.text(ctx, ln, x, yy, "#cfd6e6");
    yy += 10;
  }
  const bw = sprites.textWidth(btn) + 16;
  const by = yy + 8;
  sprites.panel(ctx, x, by, bw, 16, { fill: "#2a1f54", border: "#ffd86a" });
  sprites.text(ctx, btn, x + 8, by + 5, "#ffe9a8");
  sprites.text(ctx, "Press Z", x, by + 22, "#8f8ab8");
}
