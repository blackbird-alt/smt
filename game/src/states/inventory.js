// ============================================================================
// Sunstone — Inventory screen (overlay).
//
// A focused item screen layered over the overworld. Two sections, switched
// with Left/Right: Consumables and Key Items. Up/Down move the cursor (with
// scrolling), Z uses the selected consumable in the field, X / C close.
// Conforms to game/CONTRACT.md.
// ============================================================================

import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";
import { computeStats, removeItem } from "../stats.js";

const SECTIONS = ["Consumables", "Key Items"];

registerState({
  name: "inventory",
  overlay: true,

  enter(G, params, L) {
    L.section = 0; // 0 = consumables, 1 = key items
    L.idx = 0;
    G.audio.sfx("confirm");
  },

  update(G, dt, L) {
    const I = G.input;

    if (I.justPressed("cancel") || I.justPressed("menu")) {
      G.audio.sfx("cancel");
      G.pop();
      return;
    }

    if (I.justPressed("left") || I.justPressed("right")) {
      L.section = (L.section + (I.justPressed("left") ? SECTIONS.length - 1 : 1)) % SECTIONS.length;
      L.idx = 0;
      G.audio.sfx("cursor");
    }

    const list = sectionList(G, L.section);
    if (list.length) {
      if (I.justPressed("up")) {
        L.idx = (L.idx + list.length - 1) % list.length;
        G.audio.sfx("cursor");
      } else if (I.justPressed("down")) {
        L.idx = (L.idx + 1) % list.length;
        G.audio.sfx("cursor");
      }
    }

    if (I.justPressed("confirm") && list.length) {
      const entry = list[L.idx];
      if (L.section === 0) {
        useFieldItem(G, entry.def);
        const after = sectionList(G, L.section);
        if (L.idx >= after.length) L.idx = Math.max(0, after.length - 1);
      } else {
        // Key items are inspectable only.
        G.audio.sfx("error");
        G.toast("Key items can't be used.");
      }
    }
  },

  render(G, L) {
    const ctx = G.ctx;
    ctx.fillStyle = "rgba(6,4,16,0.82)";
    ctx.fillRect(0, 0, G.W, G.H);

    const x = 16;
    const y = 14;
    const w = G.W - 32;
    const h = G.H - 28;
    sprites.panel(ctx, x, y, w, h, { border: "#ffd86a" });

    // --- header: title + gold ---
    sprites.text(ctx, "INVENTORY", x + 8, y + 6, "#ffe9a8");
    const gtxt = `${G.player.gold}g`;
    const gx = x + w - sprites.textWidth(gtxt) - 10;
    ctx.drawImage(sprites.icon("coin"), gx - 14, y + 4);
    sprites.text(ctx, gtxt, gx, y + 6, "#ffe27a");

    // --- section tabs ---
    let tx = x + 8;
    const ty = y + 18;
    SECTIONS.forEach((label, i) => {
      const sel = i === L.section;
      const tw = sprites.textWidth(label) + 10;
      sprites.panel(ctx, tx, ty, tw, 13, {
        fill: sel ? "#2a1f54" : "#120c26",
        border: sel ? "#ffd86a" : "#4a4470",
      });
      sprites.text(ctx, label, tx + 5, ty + 3, sel ? "#ffe9a8" : "#9a95c2");
      tx += tw + 4;
    });

    // --- list area ---
    const list = sectionList(G, L.section);
    const listX = x + 6;
    const listY = y + 36;
    const rowH = 12;
    const hintY = y + h - 9;

    // Selected item description, wrapped. The box auto-sizes to the text (up to
    // 6 lines) so long key-item lore (e.g. Dawnbreaker) reads in full without
    // clipping, while short consumable blurbs leave more room for the list.
    const cur = list[L.idx];
    const note =
      cur && L.section === 0 && !cur.def.usableInField ? " (cannot use here)" : "";
    const descLines = cur ? sprites.wrap((cur.def.desc || "") + note, w - 16) : [];
    const descRows = Math.max(1, Math.min(descLines.length, 6));
    const descBottom = hintY - 3;
    const descTop = descBottom - descRows * 9;
    const maxRows = Math.max(1, Math.floor((descTop - 4 - listY) / rowH));

    if (!list.length) {
      const empty = L.section === 0 ? "No consumables." : "No key items.";
      const msg = G.player.inventory.length ? empty : "Your pack is empty.";
      sprites.text(ctx, msg, listX + 4, listY + 4, "#7c779e");
    }

    const start = clamp(L.idx - 3, 0, Math.max(0, list.length - maxRows));
    for (let i = 0; i < Math.min(maxRows, list.length); i++) {
      const idx = start + i;
      const e = list[idx];
      const yy = listY + i * rowH;
      const sel = idx === L.idx;
      if (sel) {
        ctx.fillStyle = "#243056";
        ctx.fillRect(x + 4, yy - 1, w - 8, rowH - 1);
        sprites.text(ctx, ">", x + 6, yy, "#ffd86a");
      }
      const icon = sprites.icon(e.def.icon);
      if (icon) ctx.drawImage(icon, x + 14, yy - 1);
      sprites.text(ctx, fit(e.def.name, w - 80), x + 28, yy, sel ? "#fff" : "#cfd6e6");
      const qty = `x${e.qty}`;
      sprites.text(ctx, qty, x + w - sprites.textWidth(qty) - 10, yy, "#b9b4d6");
    }

    // scroll hint markers
    if (start > 0) sprites.text(ctx, "^", x + w - 12, listY - 9, "#8f97ad");
    if (start + maxRows < list.length) sprites.text(ctx, "v", x + w - 12, listY + maxRows * rowH - 2, "#8f97ad");

    // --- description panel (auto-sized) ---
    ctx.fillStyle = "#0c0820";
    ctx.fillRect(x + 4, descTop - 3, w - 8, descBottom - descTop + 4);
    for (let i = 0; i < descRows; i++) {
      sprites.text(ctx, descLines[i] || "", x + 8, descTop + i * 9, i === 0 ? "#cfd6e6" : "#9a95c2");
    }

    const hint = L.section === 0 ? "Z use  </> tab  X exit" : "</> tab  X exit";
    sprites.text(ctx, hint, x + w - sprites.textWidth(hint) - 8, hintY, "#5b6478");
  },
});

// --------------------------------------------------------------- helpers ----

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Truncate a string with a trailing ".." so long names never overflow a width.
function fit(str, maxW) {
  if (!str) return "";
  if (sprites.textWidth(str) <= maxW) return str;
  let s = str;
  while (s.length > 1 && sprites.textWidth(s + "..") > maxW) s = s.slice(0, -1);
  return s + "..";
}

// Inventory entries for a section: { slot, def, qty }. Section 0 = consumables,
// section 1 = key items.
function sectionList(G, section) {
  const wantKey = section === 1;
  return G.player.inventory
    .map((slot) => ({ slot, def: G.content.items[slot.id], qty: slot.qty }))
    .filter((e) => e.def && (e.def.type === "key") === wantKey);
}

// Apply a consumable's field effect to the player, then consume one.
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

  if (use.hp && p.hp < st.maxHp) {
    p.hp = Math.min(st.maxHp, p.hp + use.hp);
    did = true;
  }
  if (use.mp && p.mp < st.maxMp) {
    p.mp = Math.min(st.maxMp, p.mp + use.mp);
    did = true;
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
