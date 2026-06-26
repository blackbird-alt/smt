# Sunstone RPG — Module Contract (authoritative)

Self-contained HTML5 Canvas RPG, vanilla ES modules, internal resolution
320x180, TILE = 16. All sprites are generated procedurally (see `src/sprites.js`).
Every module below MUST conform exactly to this contract so independently-built
files integrate without changes.

## State interface

States are plain objects registered via `registerState` (imported from
`../main.js`). Each state:

```js
import { registerState } from "../main.js";
registerState({
  name: "overworld",        // unique
  overlay: false,           // if true, the opaque state below also renders
  enter(G, params, local) {},   // called on push
  exit(G, local) {},            // called on pop
  resume(G, result, local) {},  // called when a state pushed above pops, with its result
  update(G, dt, local) {},      // only the TOP state updates
  render(G, local) {},          // draws to G.ctx; opaque states + overlays above render
});
```

`local` is a per-instance scratch object (persists for the life of that push).
Use `local` for state-specific data (do NOT use module-level mutable state for
per-instance data, since a state can be on the stack once at a time here, but
prefer `local`).

## Game context G (passed to every state callback)

```
G.ctx, G.canvas, G.W (320), G.H (180)
G.input    -> input.js: isDown(a), justPressed(a), axis()->{x,y}
              actions: up,down,left,right,confirm,cancel,run,menu,skill,defend
G.sprites  -> see API below
G.audio    -> sfx(name), playMusic(name), stopMusic(), resume(), toggleMute()
G.save     -> has(), save(obj), load()->obj|null, clear()
G.content  -> all game data (alias G.data). See data shapes below.
G.story    -> story.js instance (flags + quests). See below.
G.player   -> player object (see stats.js). null until newGame/continueGame.
G.time, G.dt
G.push(name, params) / G.replace(name, params) / G.pop(result) / G.clearTo(name, params)
G.top()
G.stats(player?)         -> computeStats: effective stats incl. power-ups
G.startBattle(enemyIds, opts)   -> push battle. enemyIds: string|string[]
G.openDialogue(treeId, opts)    -> push dialogue
G.newGame(name) / G.continueGame() / G.saveGame()
G.toast(msg, ttl?)       -> transient message banner
```

## sprites API (src/sprites.js) — already implemented

```
sprites.TILE = 16
sprites.tile(name) -> HTMLCanvas 16x16   (names listed below)
sprites.makeActor({skin,hair,shirt,pants}) -> actor (cached)
sprites.drawActor(ctx, actor, x, y, dir, col, scale)   dir: down|left|right|up; col 0..3
sprites.walkCol(phase01) -> column for walk animation
sprites.enemy(name) -> HTMLCanvas battler (names below)
sprites.portrait(name) -> HTMLCanvas 32x32 (names below)
sprites.icon(name) -> HTMLCanvas 12x12 (names below)
sprites.text(ctx, str, x, y, color="#fff", {scale=1, shadow=true})
sprites.textWidth(str, scale=1) ; sprites.charW=6 ; sprites.lineH=9
sprites.wrap(str, maxWpx, scale=1) -> string[]
sprites.panel(ctx, x, y, w, h, {fill,border,inner})
sprites.bar(ctx, x, y, w, h, frac01, col, bg)
```

Tile names: grass, grass2, flower, path, dirt, sand, water, water2, tree, bush,
rock, wall_stone, floor_stone, floor_wood, rug, roof, roof_dark, wall_brick,
door, door_dungeon, sign, chest, chest_open, stairs, pillar, torch, fence,
bridge, void, shrine, grave.

Enemy sprite names: slime, slime_blue, king_slime, wolf, dire_wolf, bat,
cave_bat, goblin, goblin_chief, bandit, skeleton, wraith, specter, golem,
crystal_golem, thornjaw, warden, shadowlord, sunshade, mushroom.

Portrait names: hero, elder, shopkeeper, guard, villager_f, villager_m, child,
warden, ghost, king, narrator.

Icon names: potion, ether, elixir, sword, shield, boot, star, key, coin, heart,
skull, scroll.

## story API (src/story.js)

```
get(flag), set(flag,val=true), is(flag,val=true), inc(flag,by=1)
startQuest(def), hasQuest(id), questStatus(id) -> "active"|"done"|undefined
completeObjective(qid,oid), completeQuest(id)
activeQuests() -> [], allQuests() -> []
serialize()
```

## stats API (src/stats.js)

```
newPlayer(name) -> player
computeStats(player, content) -> {maxHp,maxMp,atk,def,mag,spd,luck,critChance,
   critMult,lifesteal,thorns,dodge,extraTurnChance,special:{}}
xpForNext(level), gainXp(player, amt) -> levelsGained (sets player.pendingPicks)
knownSkills(player, content), addItem(p,id,qty), removeItem(p,id,qty), hasItem(p,id)
```

Player object: { name, level, xp, base{maxHp,maxMp,atk,def,mag,spd,luck},
hp, mp, gold, inventory:[{id,qty}], skills:[id], powerups:[id], map, x, y, dir,
pendingPicks, appearance{skin,hair,shirt,pants} }

x,y are PIXEL coordinates in the current map. dir in down|left|right|up.

## DATA SHAPES (src/data.js exports `content`)

`export const content = { tileDefs, maps, enemies, skills, items, powerups, dialogues, quests, shops };`

### content.tileDefs
`{ [tileName]: { solid:boolean } }` — solidity for collision. Any tile name not
present defaults to NON-solid. (Tree, water, walls, rock, pillar, fence, roof,
door is NON-solid only if it's a transition; treat plain "wall_*"/"tree"/"water"/
"rock"/"pillar"/"fence"/"roof*"/"void" as solid.)

### content.maps  `{ [mapId]: Map }`
```
Map = {
  name, music,                 // music: track name for audio.playMusic
  legend: { [char]: tileName },// single-char -> tile
  rows: [ "string", ... ],     // grid; height=rows.length, width=rows[0].length
  spawn: { tx, ty, dir },      // default spawn (tiles)
  npcs: [ NPC ],               // optional
  triggers: [ Trigger ],       // optional
  encounters?: {               // optional random battles while walking
     tiles: [tileName,...],    // only on these tiles
     rate: 0.06,               // chance per tile stepped
     groups: [ { enemies:[id,...], weight, minHp? } ]
  }
}
```
`NPC = { id, name, tx, ty, dir, portrait, sprite:{skin,hair,shirt,pants},
   move:"static"|"wander"|"patrol", path?:[{tx,ty},...],
   dialogue:treeId, shop?:shopId,
   requires?:Cond, hideWhen?:Cond }` (requires => only present if Cond true;
   hideWhen => hidden if Cond true)

`Trigger = { tx, ty, w?, h?, type, ... }` where type is one of:
   - "transition": { to:mapId, tx, ty, dir, requires?:Cond, blocked?:treeId }
     (also used for doors/stairs). `requires` (optional) is a Cond; if present and
     FALSE the transition does NOT fire — instead, if `blocked` (a dialogue treeId)
     is set it opens via `G.openDialogue(blocked)`, else a "The way is blocked."
     toast shows. The trigger tile stays non-solid (walkable) so reachability is
     unchanged. A `blocked` dialogue may run a `battle:` + set a flag (boss gate);
     once `requires` passes, stepping onto the tile again transitions normally.
   - "sign": { dialogue:treeId }  OR { text:"..." }
   - "chest": { flag, item?, qty?, gold? }   (flag marks looted; tile auto -> chest_open)
   - "event": { dialogue:treeId, once?:flag, requires?:Cond }  (auto-fires on step)
   - "encounter": same fields as map.encounters group (forced)

### content.skills `{ [id]: Skill }`
```
Skill = { id, name, mp, type:"phys"|"mag"|"heal"|"buff"|"debuff",
   power:number, target:"one"|"all"|"self"|"allies",
   element:"none"|"fire"|"ice"|"bolt"|"holy"|"dark",
   status?:{name:"poison"|"burn"|"stun"|"atkdown"|"defdown", chance:0..1, dur:int, power?:n},
   buff?:{stat:"atk"|"def"|"spd", amount:n, dur:int},
   anim:"slash"|"thrust"|"fire"|"ice"|"bolt"|"holy"|"dark"|"heal"|"buff"|"bite"|"claw"|"quake"|"thorn",
   hits?:1, desc }
```
Damage formula reference: phys ≈ (atk*power - def/2); mag ≈ (mag*power - def/4);
heal ≈ mag*power. Implement in battle.

### content.items `{ [id]: Item }`
```
Item = { id, name, icon, type:"consumable"|"key", price, sell?,
   use?:{ hp?, mp?, cure?:true, revive?, target:"self" }, desc,
   usableInBattle?:true, usableInField?:true }
```

### content.powerups `{ [id]: Powerup }`
```
Powerup = { id, name, desc, icon, rarity:"common"|"rare"|"epic",
   mods?:{ atk?,def?,mag?,spd?,maxHp?,maxMp?,luck?,critChance?,critMult? },
   special?:"lifesteal"|"thorns"|"evasion"|"haste"|"crit", amount?:n,
   grantsSkill?:skillId }
```

### content.dialogues `{ [treeId]: { start:nodeId, nodes:{ [nodeId]: Node } } }`
```
Node = {
  speaker?, portrait?,            // portrait name
  text,                          // shown with typewriter
  do?: Action|Action[],          // run when node is entered (before showing)
  choices?: [ { text, to?, requires?:Cond, do?:Action|Action[] } ],
  branch?: [ { requires?:Cond, to } ],  // pick first matching to jump (no UI)
  to?: nodeId,                   // auto-advance after confirm
  end?: true                     // close dialogue after confirm
}
```
`text` auto-paginates: when a node's wrapped text exceeds the dialogue box
height, dialogue.js splits it across successive boxes. The typewriter reveals one
page at a time; `confirm` turns the page until the last one, then advances/shows
choices as usual. Authors can write longer nodes without manual splitting (but
avoid absurdly long ones).
ACTION strings (dialogue.js MUST implement; data.js MUST only emit these):
  "flag:NAME"  "flag:NAME=VALUE"  "unflag:NAME"
  "quest:start:QID"  "quest:obj:QID:OID"  "quest:done:QID"
  "give:ITEMID:QTY"  "take:ITEMID:QTY"  "gold:+N"  "gold:-N"  "xp:+N"
  "learn:SKILLID"  "powerup"  "heal"  "save"
  "battle:ID[,ID2]"   (push battle; dialogue resumes on the same node's `to`)
  "shop:SHOPID"  "goto:MAPID:tx:ty:dir"  "ending:KEY"
CONDITION strings (Cond):
  "flag:NAME"  "flag:NAME=VALUE"  "!flag:NAME"
  "quest:QID=active"  "quest:QID=done"  "item:ITEMID"  "level:>=N"

### content.quests `{ [id]: { id, name, desc, objectives:[{id,text}] } }`

### content.shops `{ [id]: { name, items:[itemId,...] } }`

## Progression / battle handoff (IMPORTANT)

- Overworld triggers battles via `G.startBattle(ids, {boss?, music?, intro?})`.
- battle.js applies results itself on victory: gainXp (stats.js), add gold/loot,
  and if levels gained set player.hp/mp to new max. Then `G.pop({outcome:"win"})`.
- On defeat: `G.pop({outcome:"lose"})`. On flee: `G.pop({outcome:"flee"})`.
- overworld.js `resume(G, result)`: if result.outcome==="lose" -> `G.push("gameover")`.
  Always, after resume, if `player.pendingPicks>0` -> `G.push("powerup")`.
  (powerup.js pops back; overworld.resume runs again -> can push next pick.)
- dialogue.js with action "battle:..." pushes battle, and on resume continues the
  node's `to`/end. After dialogue, it also drains pendingPicks via powerup.

## Battle biomes (battle.js)

`biomeFor(G, mapId)` maps a map id (case-insensitive substring) to a battle
backdrop, and `drawBattleBg` paints a palette + silhouette per biome:

- `forest` (forest/shrine/green/wood), `cave` (dungeon/cave/sanctum/crypt),
  `town` (town/store/inn/house/hollow), `plains` (default).
- Act II biomes: `mountain` (karsthal/mountain/pass/snow — snowy layered peaks),
  `swamp` (mire/swamp/bog — dead leaning trees + fog band), `ruins`
  (ruins/drowned/sunken — broken columns over dark water), `volcanic`
  (ember/forge/caldera/magma — jagged rock ridge + glowing lava seam + embers).
- Order matters: `swamp` is checked before `ruins` so `sunken_mire` resolves to
  swamp while `drowned_ruins` resolves to ruins.

## Endings (dialogue.js)

`ending:KEY` plays a styled epilogue from the `ENDINGS` map
(`{ title, color, music, lines[], continue? }`). Existing true endings end to
the title screen ("- THE END -").

An ending may carry `continue: { flag, map }` to hand control back to the
overworld instead of ending the game (used to unlock Act II). On confirm the
engine sets `G.story.set(flag, true)`, moves the player to `maps[map].spawn`,
calls `G.saveGame()`, then `G.clearTo("overworld")`. Its footer reads
"- TO BE CONTINUED -". Act 1 light endings (`dawn`, `radiant`, `redemption`)
continue into Act II via `continue:{flag:"act2_unlocked", map:"town"}`; `eclipse`
remains a true ending. Act II finale ending keys: `tide_dawn`, `tide_fall`
(both true endings → title).

## Controls

Arrows/WASD move; Z/Enter confirm; X/Esc cancel; Shift run; C menu.
Gamepad mapped in input.js.
```
