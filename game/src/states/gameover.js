// Game over screen: atmospheric fade-in with drifting ash, an epitaph, and
// framed Load Save / Return to Title options.
import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";

registerState({
  name: "gameover",
  overlay: false,

  enter(G, params, L) {
    L.opts = [];
    if (G.save.has()) L.opts.push({ label: "Load Last Save", act: "load", icon: "heart" });
    L.opts.push({ label: "Return to Title", act: "title", icon: "scroll" });
    L.idx = 0;
    L.t = 0;

    // Snapshot the run for the epitaph (player still exists on defeat).
    const p = G.player;
    if (p) {
      const mapName = (G.content.maps[p.map] && G.content.maps[p.map].name) || "the wilds";
      L.epitaph = `Fell at Level ${p.level} in ${mapName}`;
    } else {
      L.epitaph = "";
    }

    // Drifting ash/ember particles.
    L.ash = [];
    for (let i = 0; i < 40; i++) {
      L.ash.push(spawnAsh(G, Math.random() * G.H));
    }

    G.audio.stopMusic();
    G.audio.sfx("death");
  },

  update(G, dt, L) {
    L.t += dt;
    for (const a of L.ash) {
      a.y += a.vy * dt;
      a.x += a.vx * dt;
      a.tw += dt * 2;
      if (a.y > G.H + 4) Object.assign(a, spawnAsh(G, -4));
    }

    if (L.t < 1.0) return; // wait for the fade-in before accepting input
    const I = G.input;
    if (I.justPressed("up")) {
      L.idx = (L.idx + L.opts.length - 1) % L.opts.length;
      G.audio.sfx("cursor");
    }
    if (I.justPressed("down")) {
      L.idx = (L.idx + 1) % L.opts.length;
      G.audio.sfx("cursor");
    }
    if (I.justPressed("confirm")) {
      G.audio.sfx("confirm");
      const o = L.opts[L.idx];
      if (o.act === "load") {
        if (!G.continueGame()) G.clearTo("title");
      } else {
        G.clearTo("title");
      }
    }
  },

  render(G, L) {
    const ctx = G.ctx;
    const W = G.W;
    const H = G.H;

    // Background gradient.
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0608");
    bg.addColorStop(1, "#1a0a0e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Drifting ash.
    for (const a of L.ash) {
      ctx.globalAlpha = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(a.tw))) * a.a;
      ctx.fillStyle = a.c;
      ctx.fillRect(Math.round(a.x), Math.round(a.y), a.sz, a.sz);
    }
    ctx.globalAlpha = 1;

    // Red radial vignette.
    const vg = ctx.createRadialGradient(W / 2, H / 2 - 10, 24, W / 2, H / 2, 200);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(50,0,6,0.7)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // Title with a soft pulsing glow.
    const fade = clamp(L.t / 1.0, 0, 1);
    const title = "GAME OVER";
    const tw = sprites.textWidth(title, 3);
    const tx = (W - tw) / 2;
    const ty = 36;
    const pulse = 0.5 + 0.5 * Math.sin(L.t * 2);
    ctx.globalAlpha = fade;
    sprites.text(ctx, title, tx, ty + 2, `rgba(120,20,28,${0.5 + 0.3 * pulse})`, { scale: 3, shadow: false });
    sprites.text(ctx, title, tx, ty, "#e0505c", { scale: 3, shadow: false });
    ctx.globalAlpha = 1;

    // Skull + epitaph.
    const skull = sprites.icon("skull");
    ctx.globalAlpha = fade;
    ctx.drawImage(skull, W / 2 - 6, ty + 26);
    if (L.epitaph) {
      sprites.text(ctx, L.epitaph, (W - sprites.textWidth(L.epitaph)) / 2, ty + 44, "#9a7a80");
    }
    ctx.globalAlpha = 1;

    if (L.t < 1.0) return;

    // Framed option buttons.
    const bw = 150;
    const bx = (W - bw) / 2;
    let by = ty + 62;
    for (let i = 0; i < L.opts.length; i++) {
      const o = L.opts[i];
      const sel = i === L.idx;
      sprites.panel(ctx, bx, by, bw, 18, {
        fill: sel ? "#3a1218" : "#160a0e",
        border: sel ? "#ffd86a" : "#5a3a40",
        inner: sel ? "#5a2230" : "#2a161c",
      });
      const ic = sprites.icon(o.icon);
      if (ic) {
        ctx.globalAlpha = sel ? 1 : 0.7;
        ctx.drawImage(ic, bx + 8, by + 3);
        ctx.globalAlpha = 1;
      }
      const tcol = sel ? "#ffe9a8" : "#b09098";
      sprites.text(ctx, o.label, bx + 24, by + 6, tcol);
      if (sel) {
        const blink = 0.6 + 0.4 * Math.sin(L.t * 8);
        ctx.globalAlpha = blink;
        sprites.text(ctx, "\x3e", bx + bw - 12, by + 6, "#ffd86a");
        ctx.globalAlpha = 1;
      }
      by += 22;
    }

    const hint = "Up/Down: Select    Z: Confirm";
    sprites.text(ctx, hint, (W - sprites.textWidth(hint)) / 2, H - 12, "#6a4a50");
  },
});

function spawnAsh(G, y) {
  const embers = ["#7a2a22", "#a8443a", "#c86a4a", "#5a3a40"];
  return {
    x: Math.random() * G.W,
    y,
    vy: 6 + Math.random() * 14,
    vx: (Math.random() - 0.5) * 6,
    sz: Math.random() < 0.3 ? 2 : 1,
    c: embers[(Math.random() * embers.length) | 0],
    a: 0.5 + Math.random() * 0.5,
    tw: Math.random() * Math.PI * 2,
  };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
