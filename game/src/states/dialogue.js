// ============================================================================
// Sunstone — Dialogue state (overlay).
//
// Drives every NPC/sign/event conversation: typewriter text, portraits, branch
// nodes, choice menus, the full CONTRACT action grammar (flags, quests, items,
// gold, learn, powerup, heal, save, battle, shop, goto, ending) and the full
// condition grammar. Battles/shops opened from a node suspend the dialogue and
// resume on the same node's `to`/end. Implements styled multi-line endings.
//
// params: { treeId } -> G.content.dialogues[treeId]
// ============================================================================

import { registerState } from "../registry.js";
import { sprites } from "../sprites.js";
import { addItem, removeItem, hasItem, gainXp } from "../stats.js";

const TILE = sprites.TILE; // 16
const CHARS_PER_SEC = 48;

// ----------------------------------------------------------- condition eval ---
// Local evaluator over G.story / G.player. Mirrors overworld.js so independent
// files agree on the grammar. Array of conds = logical AND.
function evalCond(G, cond) {
  if (!cond) return true;
  if (Array.isArray(cond)) return cond.every((c) => evalCond(G, c));
  const story = G.story;
  const player = G.player;

  if (cond.startsWith("!flag:")) return !story.get(cond.slice(6));
  if (cond.startsWith("flag:")) {
    const body = cond.slice(5);
    const eq = body.indexOf("=");
    if (eq === -1) return !!story.get(body);
    return story.is(body.slice(0, eq), parseValue(body.slice(eq + 1)));
  }
  if (cond.startsWith("quest:")) {
    const body = cond.slice(6);
    const eq = body.indexOf("=");
    if (eq === -1) return story.hasQuest(body);
    return story.questStatus(body.slice(0, eq)) === body.slice(eq + 1);
  }
  if (cond.startsWith("item:")) return hasItem(player, cond.slice(5)) > 0;
  if (cond.startsWith("level:")) {
    const m = cond.slice(6).match(/(>=|<=|>|<|=)?\s*(\d+)/);
    if (!m) return false;
    const op = m[1] || ">=";
    const n = parseInt(m[2], 10);
    switch (op) {
      case ">": return player.level > n;
      case "<": return player.level < n;
      case "<=": return player.level <= n;
      case "=": return player.level === n;
      default: return player.level >= n;
    }
  }
  return false;
}

function parseValue(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  return v;
}

// --------------------------------------------------------------- actions -----
// Transition actions push a state or change the flow and are deferred until the
// node's text has been confirmed; all others apply immediately on node enter.
function isTransition(a) {
  return (
    a.startsWith("battle:") ||
    a.startsWith("shop:") ||
    a.startsWith("goto:") ||
    a.startsWith("ending:")
  );
}

function splitActions(doField) {
  const all = [].concat(doField || []);
  return {
    immediate: all.filter((a) => !isTransition(a)),
    transition: all.filter(isTransition),
  };
}

function runImmediate(G, action) {
  const story = G.story;
  const player = G.player;

  if (action.startsWith("unflag:")) {
    story.set(action.slice(7), false);
  } else if (action.startsWith("flag:")) {
    const body = action.slice(5);
    const eq = body.indexOf("=");
    if (eq === -1) story.set(body, true);
    else story.set(body.slice(0, eq), parseValue(body.slice(eq + 1)));
  } else if (action.startsWith("quest:start:")) {
    const qid = action.split(":")[2];
    const def = G.content.quests[qid];
    if (def) story.startQuest(def);
  } else if (action.startsWith("quest:obj:")) {
    const p = action.split(":");
    story.completeObjective(p[2], p[3]);
  } else if (action.startsWith("quest:done:")) {
    story.completeQuest(action.split(":")[2]);
  } else if (action.startsWith("give:")) {
    const p = action.split(":");
    const qty = parseInt(p[2], 10) || 1;
    addItem(player, p[1], qty);
    const it = G.content.items[p[1]];
    G.toast(`+${qty} ${it ? it.name : p[1]}`);
    G.audio.sfx("coin");
  } else if (action.startsWith("take:")) {
    const p = action.split(":");
    removeItem(player, p[1], parseInt(p[2], 10) || 1);
  } else if (action.startsWith("gold:")) {
    const n = parseInt(action.slice(5), 10) || 0;
    player.gold = Math.max(0, player.gold + n);
    if (n > 0) {
      G.toast(`+${n} Gold`);
      G.audio.sfx("coin");
    }
  } else if (action.startsWith("xp:")) {
    // Award XP (e.g. quest rewards). gainXp handles leveling + queues power-up
    // picks, which drain on dialogue close like any other pendingPicks.
    const n = parseInt(action.slice(3), 10) || 0;
    if (n > 0) {
      const levels = gainXp(player, n);
      G.toast(`+${n} XP`);
      if (levels > 0) {
        G.audio.sfx("confirm");
        G.toast(levels > 1 ? `Level up! (x${levels})` : "Level up!");
      }
    }
  } else if (action.startsWith("learn:")) {
    const id = action.slice(6);
    if (!player.skills.includes(id)) {
      player.skills.push(id);
      const sk = G.content.skills[id];
      G.toast(`Learned ${sk ? sk.name : id}!`);
    }
  } else if (action === "powerup") {
    player.pendingPicks += 1;
  } else if (action === "heal") {
    const st = G.stats();
    player.hp = st.maxHp;
    player.mp = st.maxMp;
    G.audio.sfx("heal");
  } else if (action === "save") {
    G.saveGame();
  }
}

// Run one transition action. Returns "suspend" (a state was pushed; wait for
// resume), "ending" (ending sequence took over) or "continue".
function runTransition(G, local, action) {
  if (action.startsWith("battle:")) {
    const ids = action.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
    G.audio.sfx("encounter");
    G.startBattle(ids, { music: "battle" });
    return "suspend";
  }
  if (action.startsWith("shop:")) {
    G.push("shop", { shopId: action.slice(5) });
    return "suspend";
  }
  if (action.startsWith("goto:")) {
    const p = action.split(":");
    G.player.map = p[1];
    G.player.x = (parseInt(p[2], 10) || 0) * TILE;
    G.player.y = (parseInt(p[3], 10) || 0) * TILE;
    if (p[4]) G.player.dir = p[4];
    return "continue";
  }
  if (action.startsWith("ending:")) {
    startEnding(G, local, action.slice(7));
    return "ending";
  }
  return "continue";
}

// ----------------------------------------------------------- node lifecycle ---

function enterNode(G, local, id) {
  const node = G.content.dialogues[local.treeId].nodes[id];
  local.nodeId = id;
  local.node = node;
  if (!node) {
    closeDialogue(G, local);
    return;
  }

  // 1) Immediate actions fire as the node is entered.
  const { immediate, transition } = splitActions(node.do);
  for (const a of immediate) runImmediate(G, a);

  // 2) Branch nodes jump silently to the first passing entry.
  if (node.branch) {
    for (const b of node.branch) {
      if (!b.requires || evalCond(G, b.requires)) {
        enterNode(G, local, b.to);
        return;
      }
    }
    closeDialogue(G, local);
    return;
  }

  // 3) Prepare deferred transitions + advance target for this node.
  local.pendingTrans = transition;
  local.transIdx = 0;
  local.advanceTo = node.to || null;

  // 4) Set up the display. Long text auto-paginates: wrap once with the SAME
  // maxW renderBox uses (portrait shifts the text right), then split into pages
  // that fit the box height. The typewriter reveals one page at a time.
  local.fullText = node.text || "";
  const m = boxMetrics(G, node);
  local.pages = paginate(local.fullText, m.maxW, m.linesPerPage);
  local.pageIdx = 0;
  local.reveal = 0;
  local.typing = local.pages.length > 0;
  local.choices = node.choices
    ? node.choices
        .map((c, idx) => ({ ...c, _i: idx }))
        .filter((c) => !c.requires || evalCond(G, c.requires))
    : null;
  local.choiceIdx = 0;
  local.showChoices = false;

  // Nodes with no text and no choices proceed at once (e.g. a pure shop hop).
  if (!local.pages.length && !(local.choices && local.choices.length)) {
    continueNode(G, local);
  }
}

// Paginate body text so each box holds COMPLETE sentences (never orphaning a
// trailing word/fragment onto the next box). Sentences are packed greedily into
// a page until adding the next would overflow the box height; only a single
// sentence too long to fit on its own is split across pages by line.
function paginate(text, maxW, linesPerPage) {
  const pages = [];
  if (!text) return pages;
  // Sentences keep their terminal punctuation (+ any closing quote) and the
  // trailing space; the final clause may have no terminal punctuation.
  const sentences = text.match(/[^.!?]*[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];

  let cur = "";
  for (const s of sentences) {
    const tentative = cur + s;
    if (sprites.wrap(tentative.trim(), maxW).length <= linesPerPage) {
      cur = tentative;
      continue;
    }
    // Adding this sentence overflows: flush what we have, then place it.
    if (cur.trim()) {
      pages.push(sprites.wrap(cur.trim(), maxW));
      cur = "";
    }
    const sLines = sprites.wrap(s.trim(), maxW);
    if (sLines.length <= linesPerPage) {
      cur = s;
    } else {
      // A lone sentence too tall for one box — split it by line as a fallback.
      for (let i = 0; i < sLines.length; i += linesPerPage) {
        pages.push(sLines.slice(i, i + linesPerPage));
      }
    }
  }
  if (cur.trim()) pages.push(sprites.wrap(cur.trim(), maxW));
  return pages;
}

// Characters to reveal for a full page: sum of line lengths plus the inter-line
// spaces that drawPartial charges (one per gap). Matches drawPartial's pacing so
// the typewriter ends exactly as the last glyph appears.
function pageLen(page) {
  if (!page || !page.length) return 0;
  let n = 0;
  for (const l of page) n += l.length + 1;
  return n - 1;
}

function onLastPage(local) {
  return local.pageIdx >= local.pages.length - 1;
}

// Drain any deferred transitions for the current step, then advance.
function continueNode(G, local) {
  while (local.transIdx < local.pendingTrans.length) {
    const act = local.pendingTrans[local.transIdx];
    local.transIdx += 1;
    const r = runTransition(G, local, act);
    if (r === "suspend") return; // resume() will call continueNode again
    if (r === "ending") return; // ending sequence owns the flow now
  }
  doAdvance(G, local);
}

function doAdvance(G, local) {
  if (local.advanceTo) enterNode(G, local, local.advanceTo);
  else closeDialogue(G, local);
}

// Confirm a highlighted choice: run its actions, then go to its target.
function selectChoice(G, local) {
  const ch = local.choices[local.choiceIdx];
  G.audio.sfx("confirm");
  const { immediate, transition } = splitActions(ch.do);
  for (const a of immediate) runImmediate(G, a);
  local.pendingTrans = transition;
  local.transIdx = 0;
  local.advanceTo = ch.to || null;
  local.showChoices = false;
  continueNode(G, local);
}

// Close: first drain any pending power-up picks (CONTRACT), then pop.
function closeDialogue(G, local) {
  if (G.player && G.player.pendingPicks > 0) {
    local.closing = true;
    G.push("powerup");
    return;
  }
  G.pop();
}

// ------------------------------------------------------------- endings -------

const ENDINGS = {
  dawn: {
    title: "THE SUN RETURNS",
    color: "#ffd86a",
    music: "victory",
    continue: { flag: "act2_unlocked", map: "town" },
    lines: [
      "The Sunstone blazes whole again.",
      "Sunhollow wakes to a golden morning,",
      "its long night finally broken.",
      "",
      "Bells ring. Children run into the light.",
      "You did what had to be done.",
      "",
      "Yet far to the north, a cold tide stirs...",
    ],
  },
  radiant: {
    title: "A RADIANT DAWN",
    color: "#fff0b0",
    music: "victory",
    continue: { flag: "act2_unlocked", map: "town" },
    lines: [
      "Every kindness you carried answers the stone.",
      "Light pours out brighter than before,",
      "mending all the dark had broken.",
      "",
      "The child laughs. The sick are well.",
      "A traveler lives to walk new roads.",
      "The land, and you, are made whole.",
      "",
      "But the sea remembers an older hunger...",
    ],
  },
  eclipse: {
    title: "THE ECLIPSE ETERNAL",
    color: "#b48ad8",
    music: "boss",
    lines: [
      "You hang the blackened sun like a crown.",
      "Sunhollow kneels in your endless shadow,",
      "and the long night bows to its sovereign.",
      "",
      "Power answered power, just as he warned.",
      "The throne of dusk is yours alone.",
    ],
  },
  redemption: {
    title: "A DAWN, HARD-WON",
    color: "#cfe0ff",
    music: "victory",
    continue: { flag: "act2_unlocked", map: "town" },
    lines: [
      "You broke the dark you nearly became.",
      "The sun rises pale, but true.",
      "",
      "Sunhollow forgives slowly...",
      "but it forgives.",
      "Some scars become the proof of change.",
      "",
      "And the road ahead is not yet walked...",
    ],
  },
  tide_dawn: {
    title: "THE TIDE TURNS",
    color: "#9fe3ff",
    music: "victory",
    lines: [
      "Magmaroth's last cinder gutters out.",
      "The drowned tide recedes from the coast,",
      "and the salt air turns sweet again.",
      "",
      "Saltmere and Sunhollow raise their lamps",
      "to the same unbroken dawn.",
      "",
      "Twice now you have held back the dark.",
      "This time, the morning is yours to keep.",
    ],
  },
  tide_fall: {
    title: "ASHES AND SALT",
    color: "#e8a07a",
    music: "victory",
    lines: [
      "The caldera stills, but the cost was dear.",
      "Where the tide rose, the coast lies changed,",
      "its old harbors given to the deep.",
      "",
      "You carry the survivors inland,",
      "toward whatever shore remains.",
      "",
      "The fire is spent. The flood is spent.",
      "And you walk on, scarred but unbroken.",
    ],
  },
};

function startEnding(G, local, key) {
  const data = ENDINGS[key] || {
    title: "THE END",
    color: "#ffe9a8",
    music: "victory",
    lines: ["Your story comes to a close."],
  };
  local.ending = { ...data, t: 0 };
  if (data.music) G.audio.playMusic(data.music);
}

// ------------------------------------------------------------------ state ----

registerState({
  name: "dialogue",
  overlay: true,

  enter(G, params, local) {
    local.treeId = params.treeId;
    // Colors to render a portrait that matches the speaking character: the
    // talked-to NPC's own colors for their lines, the player's for "hero" lines.
    local.portraitColors = params.portraitColors || null;
    local.npcPortrait = params.npcPortrait || null;
    local.heroColors = (G.player && G.player.appearance) || null;
    local.ending = null;
    local.closing = false;
    local.pendingTrans = [];
    local.transIdx = 0;
    const tree = G.content.dialogues[local.treeId];
    if (!tree) {
      G.pop();
      return;
    }
    enterNode(G, local, tree.start);
  },

  update(G, dt, local) {
    // Ending epilogue: reveal, then confirm returns to the title.
    if (local.ending) {
      local.ending.t += dt;
      if (local.ending.t > 0.6 && G.input.justPressed("confirm")) {
        G.audio.sfx("confirm");
        const cont = local.ending.continue;
        if (cont) {
          // Continuing chapter ending: unlock the next act and hand the player
          // back to the overworld at the target map's spawn.
          G.story.set(cont.flag, true);
          const m = G.content.maps[cont.map];
          if (m && m.spawn) {
            G.player.map = cont.map;
            G.player.x = m.spawn.tx * TILE;
            G.player.y = m.spawn.ty * TILE;
            G.player.dir = m.spawn.dir || "down";
          }
          if (G.saveGame) G.saveGame();
          G.clearTo("overworld");
        } else {
          G.clearTo("title");
        }
      }
      return;
    }

    // Advance the typewriter over the CURRENT page only.
    if (local.typing) {
      local.reveal += dt * CHARS_PER_SEC;
      const target = pageLen(local.pages[local.pageIdx]);
      if (local.reveal >= target) {
        local.reveal = target;
        local.typing = false;
      }
    } else if (onLastPage(local) && local.choices && local.choices.length) {
      // Choices appear only once the final page has finished revealing.
      local.showChoices = true;
    }

    if (local.showChoices && local.choices.length) {
      if (G.input.justPressed("up")) {
        local.choiceIdx = (local.choiceIdx - 1 + local.choices.length) % local.choices.length;
        G.audio.sfx("cursor");
      } else if (G.input.justPressed("down")) {
        local.choiceIdx = (local.choiceIdx + 1) % local.choices.length;
        G.audio.sfx("cursor");
      }
      if (G.input.justPressed("confirm")) selectChoice(G, local);
      return;
    }

    if (G.input.justPressed("confirm")) {
      if (local.typing) {
        // Fast-forward the current page's reveal.
        local.reveal = pageLen(local.pages[local.pageIdx]);
        local.typing = false;
        if (onLastPage(local) && local.choices && local.choices.length) {
          local.showChoices = true;
        }
      } else if (!onLastPage(local)) {
        // More pages remain: turn to the next box and keep typing.
        local.pageIdx += 1;
        local.reveal = 0;
        local.typing = true;
        G.audio.sfx("cursor");
      } else if (!(local.choices && local.choices.length)) {
        G.audio.sfx("cursor");
        continueNode(G, local);
      }
    }
  },

  resume(G, result, local) {
    // Returning from a power-up pick during close: keep draining, else pop.
    if (local.closing) {
      if (G.player.pendingPicks > 0) {
        G.push("powerup");
        return;
      }
      local.closing = false;
      G.pop();
      return;
    }
    // A dialogue-triggered battle was lost -> hand off to game over.
    if (result && result.outcome === "lose") {
      G.push("gameover");
      return;
    }
    // Returning from a battle/shop transition: continue the same node.
    if (!local.ending) continueNode(G, local);
  },

  render(G, local) {
    const ctx = G.ctx;
    if (local.ending) {
      renderEnding(G, local);
      return;
    }
    renderBox(G, local);
  },
});

// ----------------------------------------------------------------- render ----

// Box geometry + text metrics, shared by enterNode (pagination) and renderBox
// (drawing) so wrapping/splitting matches what is actually painted. The portrait
// shifts text right by 38px, exactly as the rendering does below.
function boxMetrics(G, node) {
  const boxX = 6;
  const boxH = 52;
  const boxY = G.H - boxH - 6;
  const boxW = G.W - 12;
  const textX = node && node.portrait ? boxX + 6 + 38 : boxX + 8;
  const maxW = boxX + boxW - 8 - textX;
  const topPad = 7;
  const lineStep = sprites.lineH + 2;
  // Reserve roughly one line's worth at the bottom for the advance arrow.
  const linesPerPage = Math.max(
    1,
    Math.floor((boxH - topPad - (lineStep + 2)) / lineStep),
  );
  return { boxX, boxY, boxW, boxH, textX, maxW, topPad, lineStep, linesPerPage };
}

function renderBox(G, local) {
  const ctx = G.ctx;
  const node = local.node;
  const { boxX, boxY, boxW, boxH, textX, topPad } = boxMetrics(G, node);

  sprites.panel(ctx, boxX, boxY, boxW, boxH);

  if (node.portrait) {
    // Match the portrait to who's speaking: the NPC's colors for their own
    // portrait, the player's appearance for the "hero" portrait.
    let port;
    if (node.portrait === "hero" && local.heroColors) {
      port = sprites.portraitFor("hero", local.heroColors);
    } else if (local.portraitColors && node.portrait === local.npcPortrait) {
      port = sprites.portraitFor(node.portrait, local.portraitColors);
    } else {
      port = sprites.portrait(node.portrait);
    }
    const px = boxX + 6;
    const py = boxY + (boxH - 32) / 2;
    if (port) {
      ctx.fillStyle = "#05060c";
      ctx.fillRect(px - 1, py - 1, 34, 34);
      ctx.drawImage(port, px, py);
    }
  }

  // Speaker name tab above the box.
  if (node.speaker) {
    const nameW = sprites.textWidth(node.speaker) + 10;
    sprites.panel(ctx, boxX + 2, boxY - 11, nameW, 12, { fill: "#1a1330" });
    sprites.text(ctx, node.speaker, boxX + 7, boxY - 8, "#ffe9a8");
  }

  // Typewriter body text: only the current page's lines.
  const page = local.pages && local.pages.length ? local.pages[local.pageIdx] : [];
  drawPartial(ctx, page, textX, boxY + topPad, Math.floor(local.reveal), "#eef2ff");

  // Choices panel (anchored above the box, right-aligned).
  if (local.showChoices && local.choices && local.choices.length) {
    renderChoices(G, local, boxX, boxW, boxY);
  } else if (!local.typing) {
    // Blinking advance arrow.
    if ((G.time * 2) % 1 < 0.6) {
      const ax = boxX + boxW - 12;
      const ay = boxY + boxH - 10;
      ctx.fillStyle = "#ffd86a";
      ctx.fillRect(ax, ay, 5, 1);
      ctx.fillRect(ax + 1, ay + 1, 3, 1);
      ctx.fillRect(ax + 2, ay + 2, 1, 1);
    }
  }
}

function renderChoices(G, local, boxX, boxW, boxY) {
  const ctx = G.ctx;
  const chs = local.choices;
  let w = 60;
  for (const c of chs) w = Math.max(w, sprites.textWidth(c.text) + 22);
  w = Math.min(w, boxW);
  const lh = 12;
  const h = chs.length * lh + 8;
  const x = boxX + boxW - w;
  const y = boxY - h - 13;
  sprites.panel(ctx, x, y, w, h, { fill: "#120c26" });
  for (let i = 0; i < chs.length; i++) {
    const sel = i === local.choiceIdx;
    const yy = y + 5 + i * lh;
    if (sel) {
      sprites.text(ctx, ">", x + 6, yy, "#ffd86a");
    }
    sprites.text(ctx, chs[i].text, x + 16, yy, sel ? "#ffe9a8" : "#b9b4d6");
  }
}

// Draw wrapped lines revealing up to `count` characters (spaces count as 1).
function drawPartial(ctx, lines, x, y, count, color) {
  let remaining = count;
  let yy = y;
  for (const ln of lines) {
    if (remaining <= 0) break;
    const s = remaining >= ln.length ? ln : ln.slice(0, remaining);
    sprites.text(ctx, s, x, yy, color);
    remaining -= ln.length + 1;
    yy += sprites.lineH + 2;
  }
}

function renderEnding(G, local) {
  const ctx = G.ctx;
  const e = local.ending;
  ctx.fillStyle = "#05030c";
  ctx.fillRect(0, 0, G.W, G.H);

  // Title (scaled) fades in.
  const tScale = 2;
  const tw = sprites.textWidth(e.title, tScale);
  const titleAlpha = Math.min(1, e.t / 0.8);
  ctx.globalAlpha = titleAlpha;
  sprites.text(ctx, e.title, (G.W - tw) / 2, 24, e.color, { scale: tScale, shadow: false });
  ctx.globalAlpha = 1;

  // Lines reveal one-by-one.
  const shown = Math.floor((e.t - 0.6) / 0.45);
  let yy = 58;
  for (let i = 0; i < e.lines.length; i++) {
    if (i > shown) break;
    const ln = e.lines[i];
    if (ln) sprites.text(ctx, ln, (G.W - sprites.textWidth(ln)) / 2, yy, "#dfe4ff");
    yy += 11;
  }

  if (shown >= e.lines.length) {
    const end = e.continue ? "- TO BE CONTINUED -" : "- THE END -";
    sprites.text(ctx, end, (G.W - sprites.textWidth(end)) / 2, yy + 6, e.color);
    if ((G.time * 1.5) % 1 < 0.6) {
      const hint = "Press Z";
      sprites.text(ctx, hint, (G.W - sprites.textWidth(hint)) / 2, G.H - 14, "#8f8ab8");
    }
  }
}
