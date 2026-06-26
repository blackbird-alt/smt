// Shop state: Buy / Sell tabs. Overlay over overworld.
import { registerState } from "../registry.js";
import { addItem, removeItem } from "../stats.js";

registerState({
  name: "shop",
  overlay: true,

  enter(G, params, L) {
    L.shop = G.content.shops[params.shopId] || { name: "Shop", items: [] };
    L.tab = 0; // 0 buy, 1 sell
    L.idx = 0;
    L.msg = "";
    L.msgT = 0;
    G.audio.sfx("confirm");
  },

  update(G, dt, L) {
    const I = G.input;
    L.msgT += dt;
    if (L.msgT > 2) L.msg = "";

    if (I.justPressed("cancel") || I.justPressed("menu")) {
      G.audio.sfx("cancel");
      G.pop();
      return;
    }
    if (I.justPressed("left") || I.justPressed("right")) {
      L.tab = 1 - L.tab;
      L.idx = 0;
      G.audio.sfx("cursor");
    }
    const list = currentList(G, L);
    if (I.justPressed("up")) {
      L.idx = (L.idx + list.length - 1) % Math.max(1, list.length);
      G.audio.sfx("cursor");
    }
    if (I.justPressed("down")) {
      L.idx = (L.idx + 1) % Math.max(1, list.length);
      G.audio.sfx("cursor");
    }
    if (I.justPressed("confirm") && list.length) {
      const entry = list[L.idx];
      if (L.tab === 0) {
        // buy
        if (G.player.gold >= entry.price) {
          G.player.gold -= entry.price;
          addItem(G.player, entry.id, 1);
          G.audio.sfx("coin");
          L.msg = `Bought ${entry.name}.`;
        } else {
          G.audio.sfx("error");
          L.msg = "Not enough gold!";
        }
      } else {
        // sell
        const val = entry.sell;
        G.player.gold += val;
        removeItem(G.player, entry.id, 1);
        G.audio.sfx("coin");
        L.msg = `Sold ${entry.name} for ${val}g.`;
        const newList = currentList(G, L);
        if (L.idx >= newList.length) L.idx = Math.max(0, newList.length - 1);
      }
      L.msgT = 0;
    }
  },

  render(G, L) {
    const ctx = G.ctx;
    const sp = G.sprites;
    ctx.fillStyle = "rgba(4,6,12,0.7)";
    ctx.fillRect(0, 0, G.W, G.H);

    const x = 24;
    const y = 16;
    const w = G.W - 48;
    const h = G.H - 32;
    sp.panel(ctx, x, y, w, h, { border: "#ffd86a" });
    sp.text(ctx, L.shop.name, x + 8, y + 6, "#ffe9a8");
    // gold
    const gtxt = `${G.player.gold}g`;
    ctx.drawImage(sp.icon("coin"), x + w - sp.textWidth(gtxt) - 24, y + 4);
    sp.text(ctx, gtxt, x + w - sp.textWidth(gtxt) - 10, y + 6, "#ffe27a");

    // tabs
    const tabs = ["Buy", "Sell"];
    tabs.forEach((t, i) => {
      const tx = x + 8 + i * 50;
      const ty = y + 18;
      if (i === L.tab) {
        ctx.fillStyle = "#2a3566";
        ctx.fillRect(tx - 4, ty - 2, 46, 12);
      }
      sp.text(ctx, t, tx, ty, i === L.tab ? "#fff" : "#8f97ad");
    });

    const list = currentList(G, L);
    const listY = y + 34;
    const rowH = 12;
    const maxRows = Math.floor((h - 56) / rowH);
    const start = clamp(L.idx - 3, 0, Math.max(0, list.length - maxRows));
    if (!list.length) {
      sp.text(ctx, L.tab === 0 ? "Nothing for sale." : "Nothing to sell.", x + 10, listY + 4, "#8f97ad");
    }
    for (let i = 0; i < Math.min(maxRows, list.length); i++) {
      const idx = start + i;
      const e = list[idx];
      const yy = listY + i * rowH;
      if (idx === L.idx) {
        ctx.fillStyle = "#243056";
        ctx.fillRect(x + 4, yy - 1, w - 8, rowH - 1);
        sp.text(ctx, ">", x + 6, yy, "#ffd86a");
      }
      ctx.drawImage(sp.icon(e.icon || "potion"), x + 14, yy - 1);
      const cost = L.tab === 0 ? `${e.price}g` : `${e.sell}g`;
      // Reserve the right edge for price (and sell-tab quantity) so the name,
      // truncated if needed, can never run into them.
      const rightReserve = L.tab === 1 ? 78 : 30;
      sp.text(ctx, fit(sp, e.name, w - 28 - rightReserve), x + 28, yy, idx === L.idx ? "#fff" : "#cdd6f4");
      const col = L.tab === 0 && G.player.gold < e.price ? "#a05a5a" : "#ffe27a";
      sp.text(ctx, cost, x + w - sp.textWidth(cost) - 10, yy, col);
      if (L.tab === 1 && e.qty != null)
        sp.text(ctx, `x${e.qty}`, x + w - 60, yy, "#9aa1ad");
    }

    // scroll markers
    if (start > 0) sp.text(ctx, "^", x + w - 12, listY - 9, "#8f97ad");
    if (start + maxRows < list.length)
      sp.text(ctx, "v", x + w - 12, listY + maxRows * rowH - 2, "#8f97ad");

    // info line: a transient message takes priority over the item blurb so the
    // two never overlap; both are truncated to the panel width.
    const sel = list[L.idx];
    const infoY = y + h - 22;
    if (L.msg) {
      sp.text(ctx, fit(sp, L.msg, w - 16), x + 8, infoY, "#9fffb0");
    } else if (sel && sel.desc) {
      sp.text(ctx, fit(sp, sel.desc, w - 16), x + 8, infoY, "#8f97ad");
    }
    const hint = "Z buy/sell  </> tab  X exit";
    sp.text(ctx, hint, x + w - sp.textWidth(hint) - 8, y + h - 12, "#5b6478");
  },
});

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Truncate a string with a trailing ".." so long names/blurbs never overflow.
function fit(sp, str, maxW) {
  if (!str) return "";
  if (sp.textWidth(str) <= maxW) return str;
  let s = str;
  while (s.length > 1 && sp.textWidth(s + "..") > maxW) s = s.slice(0, -1);
  return s + "..";
}

function currentList(G, L) {
  if (L.tab === 0) {
    return L.shop.items
      .map((id) => G.content.items[id])
      .filter(Boolean)
      .map((it) => ({ ...it }));
  }
  // sell: consumables in inventory
  return G.player.inventory
    .map((slot) => {
      const it = G.content.items[slot.id];
      if (!it || it.type === "key") return null;
      return { ...it, qty: slot.qty, sell: it.sell || Math.floor((it.price || 0) / 2) };
    })
    .filter(Boolean);
}
