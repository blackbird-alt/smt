# Sunstone — a pixel RPG

A self-contained 2D pixel-art RPG built on the HTML5 Canvas with vanilla ES
modules. **No external assets** — every sprite, tile, portrait, sound effect, and
music track is generated procedurally at runtime.

## Run it

From the repo root:

```bash
npx vite game            # dev server (http://localhost:5173 or the printed port)
npx vite build game      # production build -> game/dist
npx vite preview game    # preview the build
```

Then open the printed URL. (You can also serve `game/` with any static server.)

## Controls

- **Move:** Arrow keys / WASD
- **Confirm:** Z / Enter / Space
- **Cancel / back:** X / Esc
- **Run:** Shift
- **Menu:** C
- **Gamepad:** supported (d-pad/stick, A confirm, B cancel, X skill, Start menu)

## Features

- **Overworld:** 9 connected regions (town, interiors, two forests, shrine,
  dungeon, sanctum) with tile collision, a follow camera, chests, signs, doors,
  and zone transitions.
- **Animated movement:** 4-direction walk cycles, idle, and run.
- **NPCs & dialogue:** typewriter text, portraits, name labels, and branching
  dialogue trees whose choices set story flags.
- **Story system:** a multi-act main quest with a quest log, story flags,
  **3 branch points**, and **4 endings** (`dawn`, `radiant`, `eclipse`,
  `redemption`) — the final boss changes with your path.
- **Turn-based combat:** speed-based turn order; Attack / Skill / Item / Defend /
  Flee; MP, status effects (poison, burn, stun, atk/def down), buffs, elemental
  weakness/resist, crits, and per-element particle effects, hit flashes, floating
  damage numbers, lunge animations, and screen shake.
- **Power-ups:** choose 1 of 3 on level-up; 16 power-ups (stat mods plus
  specials like lifesteal, thorns, evasion, haste, crit, and skill grants) for
  build variety.
- **Shops, inn healing, save/load** (localStorage) for stats, inventory,
  power-ups, story flags, and position.

## Architecture

```
game/
  index.html, style.css
  CONTRACT.md            # the module API/data contract everything conforms to
  src/
    main.js              # game loop + state-stack manager + game context (G)
    registry.js          # state registry
    input.js             # keyboard + gamepad -> abstract actions
    sprites.js           # procedural pixel-art (tiles, actors, enemies, UI, icons)
    audio.js             # procedural WebAudio SFX + looping music
    stats.js             # player creation, derived stats, leveling
    story.js             # flags + quest log
    save.js              # localStorage persistence
    data.js              # ALL content: maps, enemies, skills, items, power-ups,
                         #   dialogue trees, quests, shops (JSON-style)
    states/
      title.js overworld.js dialogue.js battle.js
      powerup.js menu.js shop.js gameover.js
```

States implement a small interface (`enter/exit/resume/update/render`) and share
the game context `G`. Content in `data.js` is data-only and authored against the
shapes in `CONTRACT.md`, so the world is easy to extend.

## Smoke test

`node game/smoke.mjs` boots the game headlessly (DOM/canvas stubbed) and drives
every state — title, overworld, all dialogue trees, normal + boss battles,
power-up, menu, shop, game-over — failing on any runtime error.
