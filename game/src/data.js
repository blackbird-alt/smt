// ============================================================================
// Sunstone — game content backbone. Conforms to game/CONTRACT.md.
// Exports a single `content` object consumed as G.content / G.data.
//
//   export const content = {
//     tileDefs, maps, enemies, skills, items, powerups, dialogues, quests, shops
//   };
//
// World: Sunhollow (town hub) -> Greenwood (forest) -> Blackwood (forest_deep)
//   -> the Shrine (Act 2 climax + major branch) and, via the cave east of town,
//   the Dungeon -> the Sanctum (Act 3 climax + alternate endings).
// ============================================================================

// ---------------------------------------------------------------- TILE DEFS --
// Solidity for collision. Tiles not listed default to NON-solid.
// Doors / stairs / signs / chests are NON-solid because they are transitions
// or step-on interactables.
const tileDefs = {
  // solid terrain / structures
  tree: { solid: true },
  bush: { solid: true },
  rock: { solid: true },
  water: { solid: true },
  water2: { solid: true },
  wall_stone: { solid: true },
  wall_brick: { solid: true },
  roof: { solid: true },
  roof_dark: { solid: true },
  pillar: { solid: true },
  fence: { solid: true },
  void: { solid: true },
  shrine: { solid: true },
  grave: { solid: true },
  torch: { solid: true },
  // underground / cave structures + hazards (all solid)
  cave_wall: { solid: true },
  stalagmite: { solid: true },
  chasm: { solid: true },
  lava: { solid: true },
  cave_water: { solid: true },
  brazier: { solid: true },
  crystal: { solid: true },
  bones: { solid: true },
  cobweb: { solid: true },
  // sacred shrine masonry (sun-warmed stone, distinct from the dungeon)
  sun_wall: { solid: true },
  // walkable terrain / floors
  sun_floor: { solid: false },
  grass: { solid: false },
  grass2: { solid: false },
  flower: { solid: false },
  path: { solid: false },
  dirt: { solid: false },
  sand: { solid: false },
  floor_stone: { solid: false },
  floor_crack: { solid: false },
  rubble: { solid: false },
  moss_stone: { solid: false },
  floor_wood: { solid: false },
  rug: { solid: false },
  bridge: { solid: false },
  // transitions (NON-solid so the player can step onto them)
  door: { solid: false },
  door_dungeon: { solid: false },
  stairs: { solid: false },
  // interactable objects — SOLID, so the player bumps them and interacts from
  // the front rather than walking through.
  sign: { solid: true },
  chest: { solid: true },
  chest_open: { solid: true },
  // furniture / interior props (all solid)
  table: { solid: true },
  bed: { solid: true },
  bookshelf: { solid: true },
  counter: { solid: true },
  barrel: { solid: true },
  crate: { solid: true },
  pot: { solid: true },
  plant: { solid: true },
  window: { solid: true },
  lamp: { solid: true },
  // ----- ACT II biome tiles (mountain / swamp / ruins / volcanic) -----
  // walkable ground
  snow: { solid: false },
  ice: { solid: false },
  bog: { solid: false },
  mud: { solid: false },
  ruin_floor: { solid: false },
  ash: { solid: false },
  // solid terrain / obstacles
  snowdrift: { solid: true },
  pine: { solid: true },
  bog_water: { solid: true },
  reeds: { solid: true },
  ruin_wall: { solid: true },
  coral: { solid: true },
  ember_rock: { solid: true },
};

// -------------------------------------------------------------------- MAPS ---
const maps = {
  // === TOWN: Sunhollow — hub with shop/inn/elder house, NPCs, signs, chests ==
  town: {
    name: "Sunhollow",
    music: "town",
    checkpoint: true, // respawn point: arriving in town saves your progress
    legend: {
      T: "tree",
      ".": "grass",
      "=": "path",
      H: "roof",
      W: "wall_brick",
      D: "door",
      S: "sign",
      C: "chest",
      f: "fence",
      "*": "flower",
      w: "water",
      R: "rock",
      U: "door_dungeon",
    },
    // Road network: a front street links the three house doors; the main road
    // runs south to the forest gate; an east branch leads to the dungeon mouth.
    // A small fenced kitchen-garden (the old flower patch) tucks against the
    // west house; the village pond is an irregular pool with a memorial plaque.
    rows: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "T....T....*......T...*....T..T",
      "T..HHHHH....HHHHH....HHHHH...T",
      "T..HHHHH....HHHHH....HHHHH...T",
      "T..WWDWWS...WWDWW....WWDWW...T",
      "T....===================.....T",
      "T.............=..............=",
      "Tffff.........=.....*......T.T",
      "Tf**f........==......*ww.....T",
      "Tf..f........=......wwwww....T",
      "T............==....Swwww.....T",
      "T.............=....*.wwww....T",
      "T.............===========....T",
      "T.............=.........=....T",
      "T.............=......CRR=RR..T",
      "T.............=.......RRURR..T",
      "T...*.........==...........T.T",
      "T.T............=S............T",
      "T.T..........===...........T.T",
      "TTTTTTTTTTTTT===TTTTTTTTTTTTTT",
    ],
    spawn: { tx: 10, ty: 8, dir: "down" },
    npcs: [
      {
        id: "elder",
        name: "Elder Soltan",
        tx: 23,
        ty: 6,
        dir: "down",
        portrait: "elder",
        sprite: { skin: "#dcb594", hair: "#d8d8d8", shirt: "#6a5a8a", pants: "#4a4060" },
        move: "static",
        dialogue: "elder_main",
      },
      {
        id: "brann_out",
        name: "Brann",
        tx: 5,
        ty: 6,
        dir: "down",
        portrait: "shopkeeper",
        sprite: { skin: "#caa07a", hair: "#3a2a18", shirt: "#2f8a5a", pants: "#3a2a18" },
        move: "static",
        dialogue: "shopkeeper_town",
      },
      {
        id: "guard_hollis",
        name: "Guard Hollis",
        tx: 12,
        ty: 17,
        dir: "down",
        portrait: "guard",
        sprite: { skin: "#d8a878", hair: "#2a2a2a", shirt: "#5a6173", pants: "#3a3f52" },
        move: "static",
        dialogue: "guard_gate",
      },
      {
        id: "mira_mother",
        name: "Aldis",
        tx: 19,
        ty: 8,
        dir: "down",
        portrait: "villager_f",
        sprite: { skin: "#e6c0a0", hair: "#7a4a2a", shirt: "#b23c8a", pants: "#5a3a6a" },
        move: "static",
        dialogue: "villager_woman",
      },
      {
        id: "oden",
        name: "Farmer Oden",
        tx: 8,
        ty: 11,
        dir: "down",
        portrait: "villager_m",
        sprite: { skin: "#d2a072", hair: "#4a3018", shirt: "#7a6a3a", pants: "#4a3a22" },
        move: "static",
        dialogue: "villager_man",
      },
      {
        id: "mira",
        name: "Mira",
        tx: 20,
        ty: 13,
        dir: "down",
        portrait: "child",
        sprite: { skin: "#f0c8a8", hair: "#caa24f", shirt: "#d8a040", pants: "#7a5a20" },
        move: "wander",
        dialogue: "child_play",
      },
      {
        id: "pell",
        name: "Tinker Pell",
        tx: 17,
        ty: 7,
        dir: "down",
        portrait: "villager_m",
        sprite: { skin: "#caa07a", hair: "#8a8a8a", shirt: "#3a6a8a", pants: "#3a3a4a" },
        move: "static",
        dialogue: "pell_collect",
      },
      {
        id: "fenwick",
        name: "Curator Fenwick",
        tx: 6,
        ty: 10,
        dir: "down",
        portrait: "villager_m",
        sprite: { skin: "#d8b89a", hair: "#6a3a2a", shirt: "#6a2a3a", pants: "#3a2a2a" },
        move: "static",
        dialogue: "heirloom_quest",
      },
      {
        id: "petra",
        name: "Goodwife Petra",
        tx: 8,
        ty: 9,
        dir: "down",
        portrait: "villager_f",
        sprite: { skin: "#e6c0a0", hair: "#b0b0b0", shirt: "#3a7a6a", pants: "#3a4a4a" },
        move: "wander",
        dialogue: "petra_shawl",
      },
      // ACT II HOOK: a salt-stained envoy who only appears once the dawn breaks
      // (flag:act2_unlocked) to point the hero east toward the failing coast.
      {
        id: "envoy",
        name: "Envoy Saltveigr",
        tx: 27,
        ty: 6,
        dir: "left",
        portrait: "villager_m",
        sprite: { skin: "#cdb9a0", hair: "#5a6a7a", shirt: "#2f5a7a", pants: "#2a3a4a" },
        move: "static",
        dialogue: "envoy_threat",
        requires: "flag:act2_unlocked",
      },
    ],
    triggers: [
      { tx: 5, ty: 4, type: "transition", to: "general_store", dir: "up" },
      { tx: 14, ty: 4, type: "transition", to: "inn", dir: "up" },
      { tx: 23, ty: 4, type: "transition", to: "elder_house", dir: "up" },
      { tx: 13, ty: 19, w: 3, type: "transition", to: "forest", dir: "down" },
      // PROGRESSION GATE: the cave stays sealed until the Elder grants his key
      // (flag:dungeon_open via elder_main -> give_key after flag:path_chosen).
      { tx: 24, ty: 15, type: "transition", to: "dungeon", dir: "down", requires: "flag:dungeon_open", blocked: "gate_cave" },
      // Welcome sign anchored to the west house wall, fronting the street.
      { tx: 8, ty: 4, type: "sign", dialogue: "sign_town" },
      { tx: 16, ty: 17, type: "sign", text: "South gate - Greenwood Forest" },
      // Memorial plaque on the pond's shore (sparse town lore).
      { tx: 19, ty: 10, type: "sign", dialogue: "town_plaque" },
      // Chest tucked into the rock alcove by the cave mouth (was open grass).
      { tx: 21, ty: 14, type: "chest", flag: "chest_town_1", item: "potion", qty: 2 },
      // ACT II GATEWAY: the east road to the coast. Sealed (gate_act2 just says
      // the road is quiet) until the Act 1 light-finale sets flag:act2_unlocked;
      // then it opens onto Saltmere, hub of the second act.
      { tx: 29, ty: 6, type: "transition", to: "saltmere", dir: "right", requires: "flag:act2_unlocked", blocked: "gate_act2" },
    ],
  },

  // === GENERAL STORE interior ==============================================
  general_store: {
    name: "Brann's Goods",
    music: "town",
    legend: {
      W: "wall_brick",
      n: "window",
      F: "floor_wood",
      D: "door",
      r: "rug",
      C: "chest",
      B: "bookshelf",
      b: "barrel",
      "=": "counter",
      l: "lamp",
    },
    // Shelves of stock along the back wall, a service counter with Brann at the
    // gap, goods (barrels) in the corners, and an open shopping floor.
    rows: [
      "WWWWWnWWWWnWWWWW",
      "WBBBBBBBBBBBBBBW",
      "WCFFFFFFFFFFFFbW",
      "WbFFFFFFFFFFFFFW",
      "WFFF===F===FFFFW",
      "WFFFFFFFFFFFFFFW",
      "WFFFFrrrrFFFFFFW",
      "WFFFFrrrrFFFFFFW",
      "WFFFFFFFFFFFFFFW",
      "WbFFFFFFFFFFFFbW",
      "WFFFFFFFFFFFFFFW",
      "WWWWWWWWDWWWWWWW",
    ],
    spawn: { tx: 8, ty: 10, dir: "up" },
    npcs: [
      {
        id: "brann",
        name: "Brann",
        tx: 7,
        ty: 4,
        dir: "down",
        portrait: "shopkeeper",
        sprite: { skin: "#caa07a", hair: "#3a2a18", shirt: "#2f8a5a", pants: "#3a2a18" },
        move: "static",
        dialogue: "shopkeeper_store",
        shop: "general",
      },
    ],
    triggers: [
      { tx: 8, ty: 11, type: "transition", to: "town", dir: "down" },
      { tx: 1, ty: 2, type: "chest", flag: "chest_store_1", gold: 50 },
    ],
  },

  // === INN interior (heal + save + arcane shop) ============================
  inn: {
    name: "The Warm Hearth",
    music: "town",
    legend: {
      W: "wall_brick",
      n: "window",
      F: "floor_wood",
      D: "door",
      r: "rug",
      B: "bookshelf",
      t: "table",
      e: "bed",
      l: "lamp",
    },
    // A row of guest beds with nightstands along the top, a dining area with
    // rugs and tables in the middle, and the staff (Wenna, Vyle) near the back.
    rows: [
      "WWWnWWWWWWWWnWWW",
      "WeFeFeFFFFFFFFFW",
      "WtFtFtFFFFFFFFlW",
      "WFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFW",
      "WFFrrFFttFFrrFFW",
      "WFFrrFFFFFFrrFFW",
      "WFFFFFFFFFFFFFFW",
      "WBBFFFFFFFFFFBBW",
      "WFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFW",
      "WWWWWWWWDWWWWWWW",
    ],
    spawn: { tx: 8, ty: 10, dir: "up" },
    npcs: [
      {
        id: "wenna",
        name: "Innkeeper Wenna",
        tx: 3,
        ty: 9,
        dir: "down",
        portrait: "villager_f",
        sprite: { skin: "#e6c0a0", hair: "#9a6a3a", shirt: "#caa24f", pants: "#6a4a2a" },
        move: "static",
        dialogue: "innkeeper",
      },
      {
        id: "vyle",
        name: "Arcanist Vyle",
        tx: 12,
        ty: 9,
        dir: "down",
        portrait: "king",
        sprite: { skin: "#cbb0d8", hair: "#2c2150", shirt: "#3a2c66", pants: "#1d1638" },
        move: "static",
        dialogue: "arcanist",
        shop: "arcane",
      },
      {
        id: "hessa",
        name: "Hessa",
        tx: 8,
        ty: 3,
        dir: "down",
        portrait: "villager_f",
        sprite: { skin: "#e6c0a0", hair: "#5a3a2a", shirt: "#7a4a8a", pants: "#4a3a5a" },
        move: "static",
        dialogue: "hessa_rescue",
      },
      // Ambient lore: an old storyteller by the hearth with world/boss tales.
      {
        id: "storyteller",
        name: "Old Calla",
        tx: 10,
        ty: 4,
        dir: "down",
        portrait: "villager_f",
        sprite: { skin: "#e0b49a", hair: "#cfcfcf", shirt: "#7a5a8a", pants: "#4a3a5a" },
        move: "static",
        dialogue: "inn_storyteller",
      },
    ],
    triggers: [{ tx: 8, ty: 11, type: "transition", to: "town", dir: "down" }],
  },

  // === ELDER'S HOUSE interior (lore + chest) ===============================
  elder_house: {
    name: "Elder's House",
    music: "town",
    legend: {
      W: "wall_brick",
      n: "window",
      F: "floor_wood",
      D: "door",
      r: "rug",
      C: "chest",
      S: "sign",
      B: "bookshelf",
      t: "table",
      e: "bed",
      l: "lamp",
    },
    rows: [
      "WWWnWWWWWWnWWW",
      "WBBBBFFFFBBBBW",
      "WCFFFFFFFFFFSW",
      "WFFFFFFFFFFFFW",
      "WFFtFFFFFFlFFW",
      "WFFFFrrrrFFFFW",
      "WFFFFrrrrFFFFW",
      "WeeFFFFFFFFFFW",
      "WFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFW",
      "WWWWWDWWWWWWWW",
    ],
    spawn: { tx: 5, ty: 9, dir: "up" },
    npcs: [
      {
        id: "wrenna",
        name: "Scholar Wrenna",
        tx: 6,
        ty: 4,
        dir: "down",
        portrait: "villager_f",
        sprite: { skin: "#e0b89a", hair: "#9a9a9a", shirt: "#3a4a7a", pants: "#2a2f4a" },
        move: "static",
        dialogue: "wrenna_scholar",
      },
    ],
    triggers: [
      { tx: 5, ty: 10, type: "transition", to: "town", dir: "down" },
      { tx: 1, ty: 2, type: "chest", flag: "chest_elder_1", item: "hi_potion", qty: 1, gold: 80 },
      { tx: 12, ty: 2, type: "sign", dialogue: "elder_house_lore" },
    ],
  },

  // === FOREST: Greenwood ====================================================
  forest: {
    name: "Greenwood",
    music: "forest",
    legend: {
      T: "tree",
      ".": "grass",
      ",": "grass2",
      "=": "path",
      b: "bush",
      w: "water",
      R: "rock",
      "*": "flower",
      S: "sign",
      C: "chest",
    },
    // The deer-trail winds south from the town gate, curving past a west pond
    // before forking east to a sunlit clearing; the treeline wanders raggedly.
    rows: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "T....T...b....=.......T...*..T",
      "T.C...,,,....S=............T.T",
      "TT............==..........C..T",
      "T.....b........=.....,,.....TT",
      "T..TT..........==.......TT...T",
      "T......,,,.b....=........=====",
      "T..............==========C...T",
      "T.www.b.......==.............T",
      "T..wwwb.......=.....*........T",
      "T...w........==..RRR.........T",
      "T......bb....=....R..........T",
      "T............==.......TTT....T",
      "T....,,,,.....=............T.T",
      "TT......*.....=.......b......T",
      "T.............=...,,.........T",
      "T.............=S..........T..T",
      "T...bb........=.....*........T",
      "T.TT..........=...........TT.T",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    spawn: { tx: 14, ty: 3, dir: "down" },
    npcs: [
      {
        id: "traveler",
        name: "Wounded Traveler",
        tx: 9,
        ty: 8,
        dir: "right",
        portrait: "villager_m",
        sprite: { skin: "#d2a072", hair: "#5a3a22", shirt: "#7a3a3a", pants: "#3a2f45" },
        move: "static",
        dialogue: "forest_traveler",
      },
      {
        id: "bram",
        name: "Hunter Bram",
        tx: 20,
        ty: 3,
        dir: "down",
        portrait: "villager_m",
        sprite: { skin: "#c89868", hair: "#3a2a18", shirt: "#5a6a3a", pants: "#4a3a22" },
        move: "static",
        dialogue: "bram_bounty",
        // Once the bounty is taken Bram heads into the hunting grounds (east
        // trail) to flush out the beast; his other self waits there.
        hideWhen: "flag:bounty_started",
      },
    ],
    triggers: [
      { tx: 14, ty: 1, type: "transition", to: "town", dir: "up" },
      // East game-trail into the Hunting Grounds clearing (bounty staging).
      { tx: 29, ty: 6, type: "transition", to: "hunting_grounds", dir: "right" },
      // BOSS GATE: Thornjaw bars the way south. gate_thornjaw runs the fight and
      // sets flag:beat_thornjaw on victory; until then the Blackwood is sealed.
      { tx: 14, ty: 18, type: "transition", to: "forest_deep", dir: "down", requires: "flag:beat_thornjaw", blocked: "gate_thornjaw" },
      { tx: 13, ty: 2, type: "sign", dialogue: "forest_sign" },
      { tx: 15, ty: 16, type: "sign", dialogue: "forest_path_sign" },
      { tx: 26, ty: 3, type: "chest", flag: "got_relic_a", item: "ember_crystal", qty: 1 },
      // FAST quest item (sq_shawl): a quick fetch just inside the Greenwood,
      // tucked into the north-west corner thicket.
      { tx: 2, ty: 2, type: "chest", flag: "got_shawl", item: "shawl", qty: 1 },
      // Loot chest on the east path (was a chest tile with no trigger).
      { tx: 25, ty: 7, type: "chest", flag: "chest_forest_path", item: "potion", qty: 2 },
      // HIDDEN: a tree in the southern clump is hollow — walk into it (secret).
      { tx: 23, ty: 12, type: "transition", to: "hollow_tree", dir: "down" },
    ],
    encounters: {
      tiles: ["grass", "grass2"],
      rate: 0.05,
      groups: [
        { enemies: ["slime"], weight: 4 },
        { enemies: ["forest_wasp"], weight: 3 },
        { enemies: ["wolf"], weight: 2 },
        { enemies: ["goblin"], weight: 1 },
        { enemies: ["mushroom"], weight: 1 },
        { enemies: ["slime", "slime"], weight: 1 },
        { enemies: ["wolf", "forest_wasp"], weight: 1 },
      ],
    },
  },

  // === HUNTING GROUNDS: bounty staging clearing (off Greenwood, east trail) =
  // A dense-grass glade where Hunter Bram flushes out the great scarred wolf.
  // Reached via the Greenwood's east trail; the bounty fight happens here.
  hunting_grounds: {
    name: "Hunting Grounds",
    music: "forest",
    legend: {
      T: "tree",
      ".": "grass",
      ",": "grass2",
      b: "bush",
      C: "chest",
      "=": "path",
      R: "rock",
    },
    // A ragged-edged glade: the west game-trail spills into an open clearing
    // dotted with thickets, boulders and tall grass where the wolf is flushed.
    rows: [
      "TTTTTTTTTTTTTTTTTT",
      "T,,,.T....bb....CT",
      "T.....TT....,,...T",
      "T....,,,.....R...T",
      "Tbb..,,,......b..T",
      "====.............T",
      "T..T...,,,bb.....T",
      "T...,,......R..b.T",
      "T.,,...bb........T",
      "T..b.......,,,.T.T",
      "TC......,,....TT.T",
      "TTTTTTTTTTTTTTTTTT",
    ],
    spawn: { tx: 2, ty: 5, dir: "right" },
    npcs: [
      {
        id: "bram_hunt",
        name: "Hunter Bram",
        tx: 8,
        ty: 5,
        dir: "down",
        portrait: "villager_m",
        sprite: { skin: "#c89868", hair: "#3a2a18", shirt: "#5a6a3a", pants: "#4a3a22" },
        move: "static",
        dialogue: "bram_bounty",
        // Only present once the bounty is accepted; gone once the wolf is slain.
        requires: "flag:bounty_started",
        hideWhen: "flag:slew_greyfang",
      },
    ],
    triggers: [
      { tx: 0, ty: 5, type: "transition", to: "forest", dir: "left" },
      { tx: 16, ty: 1, type: "chest", flag: "chest_hunt_1", item: "potion", qty: 2 },
      { tx: 1, ty: 10, type: "chest", flag: "chest_hunt_2", item: "ether", qty: 1 },
    ],
    encounters: {
      tiles: ["grass", "grass2"],
      rate: 0.05,
      groups: [
        { enemies: ["wolf"], weight: 3 },
        { enemies: ["forest_wasp"], weight: 3 },
        { enemies: ["slime"], weight: 2 },
        { enemies: ["wolf", "forest_wasp"], weight: 1 },
      ],
    },
  },

  // === FOREST DEEP: Blackwood ===============================================
  forest_deep: {
    name: "Blackwood",
    music: "forest",
    legend: {
      T: "tree",
      ".": "grass",
      ",": "grass2",
      "=": "path",
      R: "rock",
      G: "grave",
      w: "water",
      S: "sign",
      C: "chest",
      P: "pillar",
      A: "shrine",
      U: "door_dungeon",
      W: "wall_stone",
      F: "floor_stone",
      B: "brazier",
      Y: "crystal",
    },
    // The path opens into a clearing where the old Sunstone Shrine stands - a
    // pillared stone building with braziers and a north door (U) you step into.
    // The path threads down through a ragged treeline, curving past gravestones
    // and an irregular pool to the old Sunstone Shrine in its cleared hollow.
    rows: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "T..,..T.......=.......T......T",
      "T.T...........=........,,....T",
      "T............==...........,..T",
      "T..CRRR......=.............TTT",
      "T........GS====......G.......T",
      "T...,,........=......TTT.....T",
      "T.............==......C......T",
      "T....R.........=.............T",
      "T.............==...wwww......T",
      "T.............=.....wwww.....T",
      "T...C..RRR....=..............T",
      "T.............=...S..........T",
      "T..........PWAUAWP...........T",
      "T..........BWWWWWB...........T",
      "T..........WWFFFWW...........T",
      "T........Y.WWWWWWW.Y.........T",
      "T..C..,,,.........,,,.....C..T",
      "T....TT.................TT...T",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    spawn: { tx: 14, ty: 3, dir: "down" },
    npcs: [
      {
        id: "woodsman",
        name: "Lost Woodsman",
        tx: 10,
        ty: 16,
        dir: "down",
        portrait: "villager_m",
        sprite: { skin: "#d2a072", hair: "#3a3a3a", shirt: "#4a5a4a", pants: "#3a3a2a" },
        move: "static",
        dialogue: "deep_villager",
      },
      {
        id: "garron",
        name: "Poacher Garron",
        tx: 4,
        ty: 3,
        dir: "down",
        portrait: "villager_m",
        sprite: { skin: "#bf8e63", hair: "#2a1f12", shirt: "#5a4a3a", pants: "#33291c" },
        move: "static",
        dialogue: "garron_poacher",
      },
    ],
    triggers: [
      { tx: 14, ty: 1, type: "transition", to: "forest", dir: "up" },
      { tx: 14, ty: 13, type: "transition", to: "shrine", dir: "down" },
      { tx: 18, ty: 12, type: "sign", dialogue: "forest_deep_sign" },
      { tx: 26, ty: 17, type: "chest", flag: "chest_deep_medicine", item: "medicine", qty: 1 },
      // Tucked under the tree clump (was open grass east of the path).
      { tx: 22, ty: 7, type: "chest", flag: "chest_deep_1", item: "hi_potion", qty: 1 },
      { tx: 10, ty: 5, type: "sign", dialogue: "verse_grave" },
      { tx: 4, ty: 11, type: "chest", flag: "got_relic_b", item: "ember_crystal", qty: 1 },
      { tx: 3, ty: 17, type: "chest", flag: "chest_forest_locket", item: "locket", qty: 1 },
      // Loot chest in the north-west stone alcove (was open grass).
      { tx: 3, ty: 4, type: "chest", flag: "chest_deep_2", gold: 60 },
      // HIDDEN: a standing stone among the cluster gives way — walk through it.
      { tx: 8, ty: 11, type: "transition", to: "sunken_alcove", dir: "down" },
    ],
    encounters: {
      tiles: ["grass"],
      rate: 0.08,
      groups: [
        { enemies: ["slime_blue"], weight: 3 },
        { enemies: ["dire_wolf"], weight: 2 },
        { enemies: ["bandit"], weight: 2 },
        { enemies: ["goblin", "goblin"], weight: 1 },
        { enemies: ["mushroom", "mushroom"], weight: 1 },
        { enemies: ["goblin_chief"], weight: 1 },
        { enemies: ["king_slime"], weight: 1, minHp: 100 },
      ],
    },
  },

  // === SHRINE: Act 2 climax — the Warden & the major branch =================
  shrine: {
    name: "Sunstone Shrine",
    music: "dungeon",
    // RESKIN: sun-warmed sacred masonry, distinct from the dungeon's grey rock.
    // Walls are sun_wall, the aisle is sun_floor. No bones — this is holy ground.
    legend: {
      W: "sun_wall",
      t: "torch",
      F: "sun_floor",
      A: "shrine",
      k: "crystal",
      P: "pillar",
      b: "brazier",
      D: "door_dungeon",
    },
    // A sacred colonnade: the player enters from the south door and walks a
    // brazier-lit aisle, flanked by paired pillars and glowing crystals, up to
    // the raised Sunstone altar where the Warden waits.
    rows: [
      "WWWWWWWWWWWWWWWWWWWWWWWW",
      "WtFFFFFFFFFFFFFFFFFFFFtW",
      "WFFFFFFFFFAAAAFFFFFFFFFW",
      "WFFFFFFFFkFFFFkFFFFFFFFW",
      "WFFPFFbFFFFFFFFFFbFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFPFFFFFFFFFFFFFFFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFPFFbFFFFFFFFFFbFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFPFFFFFFFFFFFFFFFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFPFFbFFFFFFFFFFbFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WWWWWWWWWWWDWWWWWWWWWWWW",
    ],
    spawn: { tx: 11, ty: 15, dir: "up" },
    npcs: [
      {
        id: "warden",
        name: "The Warden",
        tx: 11,
        ty: 3,
        dir: "down",
        portrait: "warden",
        sprite: { skin: "#9aa8c8", hair: "#2c2150", shirt: "#2c2150", pants: "#1d1638" },
        move: "static",
        dialogue: "shrine_warden",
      },
    ],
    triggers: [{ tx: 11, ty: 17, type: "transition", to: "forest_deep", dir: "down" }],
  },

  // === DUNGEON: gateway to the Sanctum (Act 3) ==============================
  dungeon: {
    name: "Sealed Cavern",
    music: "dungeon",
    legend: {
      W: "wall_stone",
      X: "cave_wall",
      t: "torch",
      s: "stairs",
      F: "floor_stone",
      f: "floor_crack",
      r: "rubble",
      m: "moss_stone",
      P: "pillar",
      b: "brazier",
      B: "bones",
      k: "crystal",
      g: "stalagmite",
      c: "chasm",
      w: "cave_water",
      L: "lava",
      C: "chest",
      G: "grave",
      D: "door_dungeon",
    },
    // Three chambers carved from the rock: a lantern-lit entry hall (top), a
    // wild central cavern split by a chasm with lava and a cold pool, and the
    // sealed-gate hall (bottom). Chests sit in the four corners; cracked floors,
    // rubble, moss, bones, crystals and stalagmites litter the way.
    rows: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "WtFFFFFFFFFFFFsFFFFFFFFFFFtW",
      "WFFPFFbFFFFFFFFFFFFFFbFFPFFW",
      "WFFFGFFFFFFFFFFFFFFFFFFFFFFW",
      "WFrFFFFFFFFFFFFFFFFFFFFFFBFW",
      "XXXXFXXXXXXXXXFXXXXXXXXFXXXX",
      "WCFFFFFFFFFFFFFFFFFFFFFFFFCW",
      "WFFFkFFFPFFFFFFFFFFPFFFgFFFW",
      "WFmFFwFFFFFFccccFFFFFFLFFFFW",
      "WFFFmFFFFkFFccccFFBFFFFFFFFW",
      "WFFFFFFFPFFFFFrFFFFPFFFFmFFW",
      "WCFFFFFFFFFFFFFFFFFFFFFFFFCW",
      "WFFFFgFFFFkFFFFFBFFFFFgFFFFW",
      "XXXXXXXXFXXXXXFXXXXXFXXXXXXX",
      "WFFFFFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFPFFbFFFFFFFFFFFFFFbFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFFCFFW",
      "WFFFFFFFFFFFtFDFtFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFFFFFW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    ],
    spawn: { tx: 14, ty: 2, dir: "down" },
    npcs: [
      {
        id: "tomm",
        name: "Tomm",
        tx: 4,
        ty: 16,
        dir: "right",
        portrait: "villager_m",
        sprite: { skin: "#d2a072", hair: "#6a4a2a", shirt: "#7a3a3a", pants: "#3a2f45" },
        move: "static",
        dialogue: "tomm_lost",
        hideWhen: "flag:found_tomm",
      },
    ],
    triggers: [
      { tx: 14, ty: 1, type: "transition", to: "town", dir: "up" },
      // SEALED DOOR -> Sanctum. The door_dungeon tile (14,17) is the gate. While
      // flag:dungeon_open is unset the transition is blocked and dungeon_gate
      // shows the "needs the Elder's key" message; once set it opens for good.
      // Auto-pairs with the sanctum->dungeon door, so leaving the Sanctum lands
      // the player back here at the sealed door (not the cave mouth above).
      { tx: 14, ty: 17, type: "transition", to: "sanctum", dir: "up", requires: "flag:dungeon_open", blocked: "dungeon_gate" },
      { tx: 1, ty: 6, type: "chest", flag: "chest_dun_a", item: "hi_potion", qty: 1 },
      { tx: 26, ty: 6, type: "chest", flag: "chest_dun_b", item: "ether", qty: 2 },
      { tx: 1, ty: 11, type: "chest", flag: "chest_dun_c", gold: 120 },
      { tx: 26, ty: 11, type: "chest", flag: "chest_dun_d", item: "phoenix_down", qty: 1 },
      { tx: 24, ty: 16, type: "chest", flag: "got_relic_c", item: "ember_crystal", qty: 1 },
      // sq_verse chain step 2: the twin grave, gated behind the Elder's key.
      { tx: 4, ty: 3, type: "sign", dialogue: "verse_grave_2" },
      // HIDDEN: a cave wall in the lower divider is false — walk through it.
      { tx: 2, ty: 13, type: "transition", to: "cavern_vault", dir: "down" },
    ],
    encounters: {
      tiles: ["floor_stone", "floor_crack", "rubble", "moss_stone"],
      rate: 0.07,
      groups: [
        { enemies: ["skeleton"], weight: 3 },
        { enemies: ["cave_bat"], weight: 2 },
        { enemies: ["bat"], weight: 2 },
        { enemies: ["wraith"], weight: 2 },
        { enemies: ["golem"], weight: 1 },
        { enemies: ["specter"], weight: 1 },
        { enemies: ["skeleton", "skeleton", "cave_bat"], weight: 1 },
      ],
    },
  },

  // === SANCTUM: Act 3 climax — final boss & endings =========================
  sanctum: {
    name: "The Sanctum",
    music: "boss",
    legend: {
      W: "wall_stone",
      t: "torch",
      F: "floor_stone",
      A: "shrine",
      b: "brazier",
      L: "lava",
      P: "pillar",
      k: "crystal",
      c: "chasm",
      B: "bones",
      D: "door_dungeon",
    },
    // The final arena: a long, pillared hall climbing to the shattered Sunstone
    // pedestal. Lava and chasms scar the flanks, crystals throb in the gloom,
    // and the climactic confrontation fires at the ritual spot mid-hall (11,7).
    rows: [
      "WWWWWWWWWWWWWWWWWWWWWWWW",
      "WtFFFFFFFFFFFFFFFFFFFFtW",
      "WFFFFFFFFFAAAAFFFFFFFFFW",
      "WFFFFFFFFbFFFFbFFFFFFFFW",
      "WFFPFFLFFFFFFFFFFLFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFPFFkFFFFFFFFFFkFFPFFW",
      "WFFFFFFFFbFFFFbFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFPFFcFFFFFFFFFFcFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFPFFBFFFFFFFFFFBFFPFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFFFFFFFW",
      "WWWWWWWWWWWDWWWWWWWWWWWW",
    ],
    spawn: { tx: 11, ty: 13, dir: "up" },
    npcs: [],
    triggers: [
      { tx: 11, ty: 14, type: "transition", to: "dungeon", dir: "down" },
      { tx: 11, ty: 7, type: "event", dialogue: "sanctum_final", once: "sanctum_event_fired" },
    ],
  },

  // === HIDDEN: Hollow Tree (secret off Greenwood, early) ====================
  // Entered by walking into the hollow tree at forest (23,12). A real early
  // treasure for the curious. No sign points to it.
  hollow_tree: {
    name: "Hollow Tree",
    music: "forest",
    legend: {
      T: "tree",
      ".": "dirt",
      b: "bush",
      C: "chest",
      s: "stairs",
    },
    rows: [
      "TTTTTTTTT",
      "T.......T",
      "T.b...b.T",
      "T...C...T",
      "T.......T",
      "T...s...T",
      "TTTTTTTTT",
    ],
    spawn: { tx: 4, ty: 4, dir: "up" },
    triggers: [
      { tx: 4, ty: 5, type: "transition", to: "forest", dir: "down" },
      { tx: 4, ty: 3, type: "chest", flag: "chest_hollow_tree", item: "hi_potion", qty: 1, gold: 60 },
    ],
  },

  // === HIDDEN: Sunken Alcove (secret off Blackwood, post-Thornjaw) ==========
  // Entered through the standing stone at forest_deep (8,11). Holds the sealed
  // reliquary for sq_heirloom (the satirical quest). Gated behind Thornjaw.
  sunken_alcove: {
    name: "Sunken Alcove",
    music: "forest",
    legend: {
      W: "wall_stone",
      ".": "floor_stone",
      w: "water",
      C: "chest",
      s: "stairs",
    },
    rows: [
      "WWWWWWWWW",
      "W.......W",
      "W.wwww..W",
      "W.wwww..W",
      "W......CW",
      "W...s...W",
      "WWWWWWWWW",
    ],
    spawn: { tx: 4, ty: 5, dir: "up" },
    triggers: [
      { tx: 4, ty: 5, type: "transition", to: "forest_deep", dir: "down" },
      { tx: 7, ty: 4, type: "chest", flag: "chest_alcove_reliquary", item: "reliquary", qty: 1 },
    ],
  },

  // === HIDDEN: Cavern Vault (secret off the Sealed Cavern, late) ============
  // Entered through the false cave wall at dungeon (2,13). The genuinely good
  // late find — NOT the satirical relic (that's a quest reward).
  cavern_vault: {
    name: "Cavern Vault",
    music: "dungeon",
    legend: {
      X: "cave_wall",
      ".": "floor_stone",
      k: "crystal",
      b: "brazier",
      C: "chest",
      s: "stairs",
    },
    rows: [
      "XXXXXXXXX",
      "X.......X",
      "Xb.....bX",
      "X...C...X",
      "X.k...k.X",
      "X...s...X",
      "XXXXXXXXX",
    ],
    spawn: { tx: 4, ty: 4, dir: "up" },
    triggers: [
      { tx: 4, ty: 5, type: "transition", to: "dungeon", dir: "down" },
      { tx: 4, ty: 3, type: "chest", flag: "chest_cavern_vault", item: "elixir", qty: 1, gold: 200 },
    ],
  },

  // ##########################################################################
  // ## ACT II — "AFTER THE DAWN": Saltmere hub + four gated coastal regions ##
  // ## Reached from Sunhollow's east gate once flag:act2_unlocked is set.    ##
  // ## salt -> karsthal -[Rimewyrm]-> mire -[Mirelord]-> ruins -[tide_key]-> ##
  // ## emberforge -> heart [Magmaroth finale]. Biomes auto-pick off map ids. ##
  // ##########################################################################

  // === SALTMERE: Act II hub town (harbor at the mountains' foot) ============
  // Coastal town: snow-dusted streets, an inn/shop, a dock on the south water,
  // the road home to Sunhollow (east edge), and the climb to Karsthal (north).
  saltmere: {
    name: "Saltmere",
    music: "town",
    checkpoint: true,
    legend: {
      P: "pine",
      ".": "snow",
      "=": "path",
      H: "roof",
      W: "wall_brick",
      D: "door",
      S: "sign",
      C: "chest",
      "~": "sand",
      w: "water",
      o: "coral",
    },
    // The harbor road bends down through scattered pines from the Karsthal gate;
    // the snowline gives onto a ragged, bay-bitten beach and coral-strewn shallows.
    rows: [
      "PPPPPPPPPPPP=PPPPPPPPPPP",
      ".P.....P....=........P..",
      "..HHHHH....==.....P...P.",
      "..HHHHH....=........P...",
      "..WWDWW....==...........",
      "..P.........=........P..",
      "...S........=.......P...",
      "............============",
      "...P........==......P...",
      "..P..........=.....C....",
      "..~~....P...==.......~..",
      "~~~~o~~~~www~~~~~~~o~~~~",
      "wwwwooowwwwww~wooowwwwww",
      "wwwwwwwwwwooowwwwwwwwwww",
    ],
    spawn: { tx: 12, ty: 5, dir: "down" },
    npcs: [
      {
        id: "sten",
        name: "Harbor Master Sten",
        tx: 15,
        ty: 6,
        dir: "left",
        portrait: "shopkeeper",
        sprite: { skin: "#caa07a", hair: "#7a6a5a", shirt: "#2f6a8a", pants: "#3a3a4a" },
        move: "static",
        dialogue: "saltmere_harbor",
      },
      {
        id: "coll",
        name: "Ranger Coll",
        tx: 8,
        ty: 8,
        dir: "down",
        portrait: "guard",
        sprite: { skin: "#d8a878", hair: "#3a2a1a", shirt: "#4a6a4a", pants: "#3a4a3a" },
        move: "wander",
        dialogue: "saltmere_ranger",
      },
      {
        id: "saltkid",
        name: "Salla",
        tx: 18,
        ty: 5,
        dir: "down",
        portrait: "child",
        sprite: { skin: "#f0c8a8", hair: "#9a7a4a", shirt: "#5a8ac0", pants: "#3a5a7a" },
        move: "wander",
        dialogue: "saltmere_villager",
      },
    ],
    triggers: [
      { tx: 4, ty: 4, type: "transition", to: "saltmere_inn", dir: "up" },
      { tx: 23, ty: 7, type: "transition", to: "town", dir: "right" },
      { tx: 12, ty: 0, type: "transition", to: "karsthal", dir: "up" },
      { tx: 3, ty: 6, type: "sign", dialogue: "saltmere_sign" },
      { tx: 19, ty: 9, type: "chest", flag: "chest_saltmere_1", item: "hi_potion", qty: 1 },
    ],
  },

  // === SALTMERE INN: heal/save + the Act II trader (shop) ===================
  saltmere_inn: {
    name: "The Saltrest Inn",
    music: "town",
    legend: {
      W: "wall_brick",
      n: "window",
      F: "floor_wood",
      D: "door",
      r: "rug",
      B: "bookshelf",
      t: "table",
      e: "bed",
      l: "lamp",
      C: "chest",
    },
    rows: [
      "WWWnWWWWWWnWWW",
      "WeeFFFFFFFFllW",
      "WttFFFFFFFFFFW",
      "WFFFFFFFFFFFFW",
      "WFFrrFFFFrrFFW",
      "WFFrrFFFFrrFFW",
      "WFFFFFFFFFFFFW",
      "WBBFFFFFFFFCFW",
      "WFFFFFFFFFFFFW",
      "WWWWWWDWWWWWWW",
    ],
    spawn: { tx: 6, ty: 8, dir: "up" },
    npcs: [
      {
        id: "yarrow",
        name: "Innkeeper Yarrow",
        tx: 3,
        ty: 8,
        dir: "right",
        portrait: "villager_f",
        sprite: { skin: "#e6c0a0", hair: "#8a8a8a", shirt: "#5a7a6a", pants: "#3a4a44" },
        move: "static",
        dialogue: "saltmere_inn_keep",
      },
      {
        id: "bex",
        name: "Trader Bex",
        tx: 10,
        ty: 2,
        dir: "down",
        portrait: "shopkeeper",
        sprite: { skin: "#caa07a", hair: "#3a2a18", shirt: "#7a5a2f", pants: "#3a2a18" },
        move: "static",
        dialogue: "saltmere_trader",
        shop: "saltmere_shop",
      },
    ],
    triggers: [
      { tx: 6, ty: 9, type: "transition", to: "saltmere", dir: "down" },
      { tx: 11, ty: 7, type: "chest", flag: "chest_saltmere_inn", item: "ether", qty: 2 },
    ],
  },

  // === KARSTHAL PASS: mountain (frost_wolf/ice_wisp); Rimewyrm gates north ==
  karsthal: {
    name: "Karsthal Pass",
    music: "forest",
    legend: {
      P: "pine",
      R: "rock",
      d: "snowdrift",
      ",": "snow",
      i: "ice",
      "=": "path",
      S: "sign",
      C: "chest",
    },
    // The pass climbs in switchbacks between ragged pine ranks; wind-scoured ice
    // sheets and drifts spill irregularly across the snowfield to either side.
    rows: [
      "PPPPPPPPPPPP=PPPPPPPPPPP",
      ",,,P,,,,,,,,=,,,,,,,P,,,",
      ",,PP,,,,,,,,==,,,dd,,,,,",
      ",,,,,S,,,,,,,=,,,,,,R,,,",
      ",,,,,,,,,,,,==,,,,,C,,,,",
      ",,RR,,,,,,,,=,,,PP,,,,,,",
      ",,,,,,,,,,,==,,,,,,,d,,,",
      ",,,,iiiii,,=,,,,,,,,,,,,",
      ",,,,iii,,,,==,,,iiii,,,,",
      ",,,R,,,,,,,,=,,,,,,,,,,,",
      ",,,,,dd,,,,,==,,,,dd,,,,",
      ",,,,,,,RR,,,,=,,,,,,,,,,",
      ",,,PP,,,,,,,==,,,,S,,,,,",
      ",,PP,,,,PP,,=,,,,,,,,,,,",
      ",,,,,,,,,,,==,,,,ii,,,,,",
      ",,,,,,,,,,,,=,,RR,,,,C,,",
      ",,,,,,P,,,,,=,,,,,,P,,,,",
      "PPPPPPPPPPPP=PPPPPPPPPPP",
    ],
    spawn: { tx: 12, ty: 16, dir: "up" },
    npcs: [
      {
        id: "yuki",
        name: "Guide Yuki",
        tx: 8,
        ty: 9,
        dir: "right",
        portrait: "villager_f",
        sprite: { skin: "#e0bca0", hair: "#3a3a4a", shirt: "#5a7aa0", pants: "#3a4a5a" },
        move: "static",
        dialogue: "yuki_climb",
      },
    ],
    triggers: [
      { tx: 12, ty: 17, type: "transition", to: "saltmere", dir: "down" },
      // BOSS GATE: Rimewyrm coils across the high pass. gate_rimewyrm runs the
      // fight and sets flag:beat_rimewyrm; until then the Mire is sealed off.
      { tx: 12, ty: 0, type: "transition", to: "sunken_mire", dir: "up", requires: "flag:beat_rimewyrm", blocked: "gate_rimewyrm" },
      { tx: 5, ty: 3, type: "sign", dialogue: "karsthal_sign" },
      { tx: 18, ty: 12, type: "sign", dialogue: "karsthal_warn" },
      { tx: 19, ty: 4, type: "chest", flag: "chest_karsthal_1", item: "hi_potion", qty: 2 },
      { tx: 21, ty: 15, type: "chest", flag: "chest_karsthal_2", gold: 120 },
    ],
    encounters: {
      tiles: ["snow", "ice"],
      rate: 0.06,
      groups: [
        { enemies: ["frost_wolf"], weight: 4 },
        { enemies: ["ice_wisp"], weight: 3 },
        { enemies: ["dire_wolf"], weight: 2 },
        { enemies: ["frost_wolf", "ice_wisp"], weight: 2 },
        { enemies: ["golem"], weight: 1 },
        { enemies: ["frost_wolf", "frost_wolf"], weight: 1 },
      ],
    },
  },

  // === SUNKEN MIRE: swamp (bog_toad/leech); Mirelord gates north ============
  sunken_mire: {
    name: "Sunken Mire",
    music: "forest",
    legend: {
      T: "tree",
      ".": "bog",
      m: "mud",
      w: "bog_water",
      r: "reeds",
      S: "sign",
      C: "chest",
    },
    // A firm mud causeway snakes through the bog between leaning trees; reed-choked
    // pools spread in irregular lobes, their edges feathered with rushes.
    rows: [
      "TTTTTTTTTTTTmTTTTTTTTTTTTT",
      "....T...r...m.......T.....",
      "...rwwwwr...mm...rr.......",
      ".....ww......m........T...",
      ".....rr.....mm..S.........",
      "............m.......r.....",
      "...T.......mm...rwwwwr....",
      "...........m......ww.C....",
      "..TT....TT.mm.........r...",
      "....r.......m.............",
      "............mm....S.......",
      "..rwwwwr.....m............",
      "....ww......mm.......T....",
      "......r.....m.....rr......",
      ".C.........mm.............",
      "........T...m........r....",
      ".....T......m......T......",
      "TTTTTTTTTTTTmTTTTTTTTTTTTT",
    ],
    spawn: { tx: 12, ty: 16, dir: "up" },
    npcs: [
      {
        id: "hesper",
        name: "Bogwise Hesper",
        tx: 5,
        ty: 5,
        dir: "down",
        portrait: "elder",
        sprite: { skin: "#bcae9a", hair: "#8a8a7a", shirt: "#4a5a3a", pants: "#3a3a2a" },
        move: "static",
        dialogue: "hesper_miasma",
      },
    ],
    triggers: [
      { tx: 12, ty: 17, type: "transition", to: "karsthal", dir: "down" },
      // BOSS GATE: the Mirelord wallows across the only firm ground north.
      { tx: 12, ty: 0, type: "transition", to: "drowned_ruins", dir: "up", requires: "flag:beat_mirelord", blocked: "gate_mirelord" },
      { tx: 16, ty: 4, type: "sign", dialogue: "mire_sign" },
      { tx: 18, ty: 10, type: "sign", dialogue: "mire_warn" },
      { tx: 21, ty: 7, type: "chest", flag: "chest_mire_1", item: "antidote", qty: 3 },
      { tx: 1, ty: 14, type: "chest", flag: "chest_mire_2", gold: 140 },
    ],
    encounters: {
      tiles: ["bog", "mud"],
      rate: 0.07,
      groups: [
        { enemies: ["bog_toad"], weight: 3 },
        { enemies: ["leech"], weight: 3 },
        { enemies: ["mushroom"], weight: 2 },
        { enemies: ["leech", "leech"], weight: 2 },
        { enemies: ["bandit"], weight: 1 },
        { enemies: ["bog_toad", "leech"], weight: 1 },
      ],
    },
  },

  // === DROWNED RUINS: ruins/coast (drowned/siren); Tidewrought guards the ===
  // tide_key. A wall line at row 10 forces the path through the guardian, so
  // you can't reach the north gate (or Castaway Doryn) without the key fight.
  drowned_ruins: {
    name: "Drowned Ruins",
    music: "dungeon",
    legend: {
      W: "ruin_wall",
      F: "ruin_floor",
      o: "coral",
      w: "water",
      P: "pillar",
      S: "sign",
      C: "chest",
    },
    // Three broken bronze walls split the ruin into halls, each pierced by a
    // single drowned gateway. Tide-pools and coral spread in ragged sheets, and a
    // collapsed nook in the north hall hides the relic chest off the main aisle.
    rows: [
      "WWWWWWWWWWWWFWWWWWWWWWWWWW",
      "FFFWFFFFoFFFFFFFFFFWFFFFFF",
      "FFoooFFFFFFFFFFFFFFoooFFFF",
      "FFFFFFFoFFFFFFFFoFFFFFFFFF",
      "FFPFFFFFFFFFFFFFFFFFFFPFFF",
      "FFFFFFFFFFoFFFoFFFFFFFFFFF",
      "FwwwwFFFFFFFFFFFFFwwwwoFFF",
      "FFwwFFFFFFFFFFFFFFFFFWWWFF",
      "FFFFFFFFFFFFFFFFFFFFFWCWFF",
      "FFFFFFFFFFFSFFFFFFFFFFFFFF",
      "WWWWWWWWWWWWFWWWWWWWWWWWWW",
      "FFFFFWFFFFFFFFFFFFWFFFFFFF",
      "FFFoooFFFFFFFFFFooFFFFFFFF",
      "FFFFFFwwFFFFFFFFFFFoFFFFFF",
      "FFFFFWFFFFFFFFFFFFFFWWWWFF",
      "FFFFoFFFFFFFFwwFFFFFFFFFFF",
      "FFFFFFFWFFFFFFFFFFFFWFFFFF",
      "WWWWWWWWWWWWFWWWWWWWWWWWWW",
    ],
    spawn: { tx: 12, ty: 16, dir: "up" },
    npcs: [
      {
        id: "doryn",
        name: "Castaway Doryn",
        tx: 4,
        ty: 4,
        dir: "down",
        portrait: "villager_m",
        sprite: { skin: "#c89868", hair: "#2a3a4a", shirt: "#3a5a6a", pants: "#2a3a3a" },
        move: "static",
        dialogue: "doryn_tide",
      },
    ],
    triggers: [
      { tx: 12, ty: 17, type: "transition", to: "sunken_mire", dir: "down" },
      // ITEM GATE: a wall of drowned bronze. Only the Tide Key (from Tidewrought)
      // opens the way up to the Emberforge. gate_emberforge says so until then.
      { tx: 12, ty: 0, type: "transition", to: "emberforge", dir: "up", requires: "item:tide_key", blocked: "gate_emberforge" },
      // SECRET: a cracked masonry block (looks solid) gives onto a flooded vault.
      { tx: 21, ty: 14, type: "transition", to: "drowned_vault", dir: "down" },
      // GUARDIAN: stepping into the central hall wakes the Tidewrought. Gated on
      // !beat_tidewrought (NOT `once`) so a loss can be retried without softlock.
      { tx: 12, ty: 10, type: "event", dialogue: "tidewrought_guard", requires: "!flag:beat_tidewrought" },
      // Sign anchored to the broken wall beside the guardian's gateway.
      { tx: 11, ty: 9, type: "sign", dialogue: "ruins_sign" },
      // Relic chest tucked into a collapsed wall nook off the north aisle.
      { tx: 22, ty: 8, type: "chest", flag: "chest_ruins_1", item: "hi_potion", qty: 2 },
    ],
    encounters: {
      tiles: ["ruin_floor"],
      rate: 0.07,
      groups: [
        { enemies: ["drowned"], weight: 3 },
        { enemies: ["siren"], weight: 3 },
        { enemies: ["skeleton"], weight: 2 },
        { enemies: ["drowned", "siren"], weight: 2 },
        { enemies: ["specter"], weight: 1 },
        { enemies: ["drowned", "drowned"], weight: 1 },
      ],
    },
  },

  // === HIDDEN: Drowned Vault (secret off the Drowned Ruins) ==================
  drowned_vault: {
    name: "Drowned Vault",
    music: "dungeon",
    legend: {
      W: "ruin_wall",
      F: "ruin_floor",
      o: "coral",
      C: "chest",
      s: "stairs",
    },
    rows: [
      "WWWWWWWWW",
      "WFFFFFFFW",
      "WoFFFFFoW",
      "WFFFCFFFW",
      "WFFFFFFFW",
      "WFFFsFFFW",
      "WWWWWWWWW",
    ],
    spawn: { tx: 4, ty: 4, dir: "up" },
    triggers: [
      { tx: 4, ty: 5, type: "transition", to: "drowned_ruins", dir: "down" },
      { tx: 4, ty: 3, type: "chest", flag: "chest_drowned_vault", item: "elixir", qty: 1, gold: 200 },
    ],
  },

  // === EMBERFORGE CALDERA: volcanic (magma_hound/ash_wraith); leads to Heart =
  emberforge: {
    name: "Emberforge Caldera",
    music: "dungeon",
    legend: {
      e: "ember_rock",
      a: "ash",
      L: "lava",
      S: "sign",
      C: "chest",
    },
    // The caldera floor is a sea of ash rimmed by ragged ember-rock; lava wells
    // up in irregular seams. Warning-marks lean on the rocks and the two caches
    // sit tucked into ember-rock nooks off the open ground.
    rows: [
      "eeeeeeeeeeeeaeeeeeeeeeeeee",
      "aaaeaaaaaaaaaaaaaaaaaeaaaa",
      "aaLLLLaaaaaaaaaaaaaLLaaaaa",
      "aaaaLaaaaaaaaaaaaaaaaaeaaa",
      "aaeeaaaaaaaaaaaaaaaaaeeeaa",
      "aaaeeaaaaaaaaaaaaaaeeeaaaa",
      "aaaeSaaaaaaaaaaaaaaeCeaaaa",
      "aaaaaaaaLaaaaaaaaaaaaaaaaa",
      "aaaaaaLLLaaaaLLLLLaaaaaaaa",
      "aaaeaaaaaaaaaaaLaaaaaaaaaa",
      "aaeeeaaaaaaaaaaaaaaaaaeeaa",
      "aeaaaaaaaaaaaaaaaaeaaaaaaa",
      "aCeaaaaaaaaaaaaaaaeSeaaaaa",
      "aaaaaaaaaaaaeaaaaaaaaaaaaa",
      "aaLLaaaaaaaaaaaaaLLLLaaaaa",
      "aaaLaaaaaaaaaaaaaaaaaeaaaa",
      "aaaaaaeaaaaaaaaaaaaeaaaaaa",
      "eeeeeeeeeeeeaeeeeeeeeeeeee",
    ],
    spawn: { tx: 12, ty: 16, dir: "up" },
    npcs: [
      {
        id: "ashpilgrim",
        name: "Ashfallen Pilgrim",
        tx: 5,
        ty: 5,
        dir: "down",
        portrait: "ghost",
        sprite: { skin: "#b0a098", hair: "#6a5a52", shirt: "#5a3a2a", pants: "#3a2a22" },
        move: "static",
        dialogue: "ember_pilgrim",
      },
    ],
    triggers: [
      { tx: 12, ty: 17, type: "transition", to: "drowned_ruins", dir: "down" },
      { tx: 12, ty: 0, type: "transition", to: "emberforge_heart", dir: "up" },
      { tx: 4, ty: 6, type: "sign", dialogue: "ember_sign" },
      { tx: 19, ty: 12, type: "sign", dialogue: "ember_warn" },
      { tx: 20, ty: 6, type: "chest", flag: "chest_ember_1", item: "elixir", qty: 1 },
      { tx: 1, ty: 12, type: "chest", flag: "chest_ember_2", gold: 200 },
    ],
    encounters: {
      tiles: ["ash"],
      rate: 0.07,
      groups: [
        { enemies: ["magma_hound"], weight: 3 },
        { enemies: ["ash_wraith"], weight: 3 },
        { enemies: ["wraith"], weight: 2 },
        { enemies: ["magma_hound", "ash_wraith"], weight: 2 },
        { enemies: ["golem"], weight: 1 },
        { enemies: ["magma_hound", "magma_hound"], weight: 1 },
      ],
    },
  },

  // === EMBERFORGE HEART: the final arena. The event fires the Magmaroth finale.
  emberforge_heart: {
    name: "Emberforge Heart",
    music: "boss",
    legend: {
      e: "ember_rock",
      a: "ash",
      L: "lava",
      b: "brazier",
    },
    rows: [
      "eeeeeeeeeeeeeeeeeeeeee",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eaaLLaaaaaaaaaaaaLLaae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eabaaaaaaaaaaaaaaaabae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eabaaaaaaaaaaaaaaaabae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eaaLLaaaaaaaaaaaaLLaae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eaaaaaaaaaaaaaaaaaaaae",
      "eeeeeeeeeeeaeeeeeeeeee",
    ],
    spawn: { tx: 11, ty: 13, dir: "up" },
    npcs: [],
    triggers: [
      { tx: 11, ty: 15, type: "transition", to: "emberforge", dir: "down" },
      // FINALE: wakes Magmaroth. Gated on !act2_complete (not `once`) so a defeat
      // can be retried; on victory the ending takes over and returns to title.
      { tx: 11, ty: 7, type: "event", dialogue: "emberforge_finale", requires: "!flag:act2_complete" },
    ],
  },
};

// ------------------------------------------------------------------ ENEMIES --
// Conventional battler shape: stats + element weak/resist + skills + ai + loot.
const enemies = {
  slime: {
    id: "slime", name: "Slime", sprite: "slime", level: 1,
    maxHp: 16, hp: 16, atk: 5, def: 2, mag: 1, spd: 4, luck: 2,
    xp: 6, gold: 4, ai: "random", skills: ["strike"],
    weak: ["fire", "bolt"], resist: [],
    loot: [{ id: "potion", chance: 0.2 }],
  },
  slime_blue: {
    id: "slime_blue", name: "Blue Slime", sprite: "slime_blue", level: 3,
    maxHp: 30, hp: 30, atk: 8, def: 4, mag: 6, spd: 6, luck: 2,
    xp: 14, gold: 8, ai: "random", skills: ["strike", "ice_lance"],
    weak: ["bolt"], resist: ["ice"],
    loot: [{ id: "ether", chance: 0.2 }],
  },
  king_slime: {
    id: "king_slime", name: "King Slime", sprite: "king_slime", level: 6,
    maxHp: 140, hp: 140, atk: 16, def: 8, mag: 10, spd: 6, luck: 4,
    xp: 80, gold: 60, ai: "aggressive", skills: ["cleave", "quake"],
    weak: ["bolt"], resist: ["ice"],
    loot: [{ id: "hi_potion", chance: 0.5 }],
  },
  bat: {
    id: "bat", name: "Cave Moth", sprite: "bat", level: 1,
    maxHp: 12, hp: 12, atk: 5, def: 2, mag: 2, spd: 10, luck: 4,
    xp: 7, gold: 3, ai: "aggressive", skills: ["strike", "screech"],
    weak: ["ice"], resist: [],
    loot: [{ id: "potion", chance: 0.15 }],
  },
  cave_bat: {
    id: "cave_bat", name: "Night Bat", sprite: "cave_bat", level: 4,
    maxHp: 26, hp: 26, atk: 10, def: 4, mag: 5, spd: 12, luck: 5,
    xp: 18, gold: 9, ai: "aggressive", skills: ["screech", "drain"],
    weak: ["holy"], resist: ["dark"],
    loot: [{ id: "potion", chance: 0.15 }],
  },
  wolf: {
    id: "wolf", name: "Gray Wolf", sprite: "wolf", level: 2,
    maxHp: 20, hp: 20, atk: 7, def: 3, mag: 1, spd: 9, luck: 3,
    xp: 12, gold: 6, ai: "aggressive", skills: ["bite"],
    weak: ["fire"], resist: [],
    loot: [{ id: "potion", chance: 0.2 }],
  },
  dire_wolf: {
    id: "dire_wolf", name: "Dire Wolf", sprite: "dire_wolf", level: 5,
    maxHp: 48, hp: 48, atk: 16, def: 6, mag: 2, spd: 11, luck: 4,
    xp: 34, gold: 16, ai: "aggressive", skills: ["bite", "claw", "war_cry"],
    weak: ["fire"], resist: [],
    loot: [{ id: "hi_potion", chance: 0.2 }],
  },
  goblin: {
    id: "goblin", name: "Goblin", sprite: "goblin", level: 3,
    maxHp: 24, hp: 24, atk: 8, def: 3, mag: 2, spd: 7, luck: 3,
    xp: 16, gold: 12, ai: "aggressive", skills: ["strike", "guard_break"],
    weak: [], resist: [],
    loot: [{ id: "potion", chance: 0.25 }],
  },
  goblin_chief: {
    id: "goblin_chief", name: "Goblin Chief", sprite: "goblin_chief", level: 6,
    maxHp: 80, hp: 80, atk: 18, def: 8, mag: 4, spd: 8, luck: 5,
    xp: 60, gold: 45, ai: "aggressive", skills: ["cleave", "war_cry", "guard_break"],
    weak: [], resist: [],
    loot: [{ id: "hi_potion", chance: 0.4 }],
  },
  bandit: {
    id: "bandit", name: "Bandit", sprite: "bandit", level: 4,
    maxHp: 40, hp: 40, atk: 13, def: 5, mag: 3, spd: 9, luck: 6,
    xp: 26, gold: 30, ai: "random", skills: ["poison_sting", "strike"],
    weak: [], resist: [],
    loot: [{ id: "potion", chance: 0.3 }, { id: "antidote", chance: 0.2 }],
  },
  skeleton: {
    id: "skeleton", name: "Skeleton", sprite: "skeleton", level: 4,
    maxHp: 34, hp: 34, atk: 12, def: 6, mag: 2, spd: 6, luck: 3,
    xp: 22, gold: 10, ai: "aggressive", skills: ["strike", "guard_break"],
    weak: ["holy"], resist: ["dark"],
    loot: [{ id: "potion", chance: 0.2 }],
  },
  wraith: {
    id: "wraith", name: "Wraith", sprite: "wraith", level: 5,
    maxHp: 40, hp: 40, atk: 10, def: 5, mag: 14, spd: 10, luck: 5,
    xp: 30, gold: 14, ai: "caster", skills: ["shadow_bolt", "drain"],
    weak: ["holy"], resist: ["dark"],
    loot: [{ id: "ether", chance: 0.25 }],
  },
  specter: {
    id: "specter", name: "Specter", sprite: "specter", level: 7,
    maxHp: 60, hp: 60, atk: 12, def: 7, mag: 18, spd: 12, luck: 6,
    xp: 48, gold: 22, ai: "caster", skills: ["shadow_bolt", "doom", "drain"],
    weak: ["holy"], resist: ["dark"],
    loot: [{ id: "ether", chance: 0.3 }],
  },
  golem: {
    id: "golem", name: "Stone Golem", sprite: "golem", level: 6,
    maxHp: 110, hp: 110, atk: 18, def: 14, mag: 4, spd: 4, luck: 2,
    xp: 55, gold: 20, ai: "defensive", skills: ["quake", "iron_skin", "strike"],
    weak: ["bolt"], resist: [],
    loot: [{ id: "hi_potion", chance: 0.25 }],
  },
  crystal_golem: {
    id: "crystal_golem", name: "Crystal Golem", sprite: "crystal_golem", level: 8,
    maxHp: 150, hp: 150, atk: 20, def: 16, mag: 10, spd: 5, luck: 3,
    xp: 80, gold: 40, ai: "defensive", skills: ["quake", "ice_lance", "iron_skin"],
    weak: ["bolt"], resist: ["ice"],
    loot: [{ id: "hi_potion", chance: 0.4 }],
  },
  mushroom: {
    id: "mushroom", name: "Myconid", sprite: "mushroom", level: 2,
    maxHp: 22, hp: 22, atk: 7, def: 3, mag: 5, spd: 5, luck: 3,
    xp: 12, gold: 5, ai: "caster", skills: ["poison_sting", "venom_spit"],
    weak: ["fire"], resist: [],
    loot: [{ id: "antidote", chance: 0.3 }],
  },
  // Named bounty foe (see sq_bounty). A great scarred wolf; the hunter never
  // names it. Keeps the internal id `greyfang` / flag `slew_greyfang`, but its
  // display name and sprite are the scarred wolf. Tuned in line with other
  // level-5 forest enemies (cf. dire_wolf 48 HP / 16 ATK).
  greyfang: {
    id: "greyfang", name: "Scarred Wolf", sprite: "scarred_wolf", level: 5,
    maxHp: 64, hp: 64, atk: 15, def: 6, mag: 2, spd: 11, luck: 5,
    xp: 42, gold: 35, ai: "aggressive", skills: ["bite", "claw", "war_cry"],
    weak: ["fire"], resist: [],
    loot: [{ id: "hi_potion", chance: 0.3 }],
  },
  // Greenwood biome regular: a quick, venomous wasp swarm-thing. Forest-tuned
  // (~lvl 2), weak to fire. Uses the parallel agent's `forest_wasp` sprite.
  forest_wasp: {
    id: "forest_wasp", name: "Forest Wasp", sprite: "forest_wasp", level: 2,
    maxHp: 15, hp: 15, atk: 7, def: 2, mag: 2, spd: 12, luck: 4,
    xp: 10, gold: 5, ai: "aggressive", skills: ["strike", "poison_sting"],
    weak: ["fire"], resist: [],
    loot: [{ id: "antidote", chance: 0.2 }],
  },
  // Forest gate miniboss (see gate_thornjaw). A bark-scaled brute that seals the
  // way into the Blackwood; tuned between goblin_chief (80hp) and golem (110hp)
  // so it's a real wall without outclassing the level-8 Warden boss ahead.
  thornjaw: {
    id: "thornjaw", name: "Thornjaw", sprite: "thornjaw", level: 6, boss: true,
    intro: "Thornjaw, the bark-scaled terror of the deep wood, unfolds from the shadow - all horns, thorns and hunger. It guards the only way south. Burn it down - and brace when it lashes its barbed vines.",
    maxHp: 120, hp: 120, atk: 17, def: 9, mag: 4, spd: 7, luck: 4,
    xp: 75, gold: 50, ai: "aggressive",
    skills: ["bramble_lash", "thorn_volley", "claw", "war_cry"],
    weak: ["fire"], resist: [],
    loot: [{ id: "hi_potion", chance: 0.5 }],
  },

  // ----- BOSSES -----
  warden: {
    id: "warden", name: "The Warden", sprite: "warden", level: 8, boss: true,
    intro: "The Warden levels his staff. 'Prove your light - or be judged by it.' He shields himself and gathers radiance; strike when his guard is down, and DEFEND when he charges.",
    maxHp: 280, hp: 280, atk: 21, def: 12, mag: 22, spd: 10, luck: 5,
    xp: 200, gold: 150, ai: "caster",
    skills: ["holy_smite", "ice_lance", "iron_skin", "war_cry", "heal"],
    weak: ["dark"], resist: ["holy"],
    loot: [{ id: "elixir", chance: 1 }],
  },
  shadowlord: {
    id: "shadowlord", name: "The Shadowlord", sprite: "shadowlord", level: 12, boss: true,
    intro: "The Shadowlord's crown drips night. 'Come - feed the long dark.' As he weakens he tears rifts to summon servants and builds toward Doomsday.",
    maxHp: 520, hp: 520, atk: 31, def: 16, mag: 31, spd: 13, luck: 8,
    xp: 600, gold: 400, ai: "caster",
    skills: ["shadow_bolt", "doom", "drain", "inferno", "war_cry"],
    weak: ["holy"], resist: ["dark"],
    loot: [{ id: "elixir", chance: 1 }],
  },
  sunshade: {
    id: "sunshade", name: "Sunshade", sprite: "sunshade", level: 12, boss: true,
    intro: "The blackened sun roars, blistering the air. It rains fire and charges Solar Flares - and when wounded, a desperate Supernova.",
    maxHp: 520, hp: 520, atk: 38, def: 14, mag: 36, spd: 14, luck: 8,
    xp: 600, gold: 400, ai: "aggressive",
    skills: ["inferno", "firebolt", "quake", "holy_smite"],
    weak: ["ice", "dark"], resist: ["fire", "holy"],
    loot: [{ id: "elixir", chance: 1 }],
  },

  // ====================== ACT II ENEMIES (post-finale tuning) ===============
  // The player arrives here after Act 1, ~level 10+ with power-ups, so these
  // sit ABOVE the Sanctum: regulars lvl 10-14, region bosses lvl 14-16, and the
  // final Magmaroth the strongest battler in the game.
  // --- Karsthal (mountain) regulars ---
  frost_wolf: {
    id: "frost_wolf", name: "Frost Wolf", sprite: "frost_wolf", level: 10,
    maxHp: 72, hp: 72, atk: 21, def: 9, mag: 4, spd: 14, luck: 5,
    xp: 60, gold: 22, ai: "aggressive", skills: ["bite", "claw", "war_cry"],
    weak: ["fire"], resist: ["ice"],
    loot: [{ id: "hi_potion", chance: 0.25 }],
  },
  ice_wisp: {
    id: "ice_wisp", name: "Ice Wisp", sprite: "ice_wisp", level: 11,
    maxHp: 58, hp: 58, atk: 12, def: 7, mag: 24, spd: 15, luck: 6,
    xp: 64, gold: 20, ai: "caster", skills: ["ice_lance", "frost_breath", "drain"],
    weak: ["fire", "bolt"], resist: ["ice"],
    loot: [{ id: "ether", chance: 0.3 }],
  },
  // --- Sunken Mire (swamp) regulars ---
  bog_toad: {
    id: "bog_toad", name: "Bog Toad", sprite: "bog_toad", level: 11,
    maxHp: 98, hp: 98, atk: 20, def: 10, mag: 8, spd: 7, luck: 3,
    xp: 66, gold: 24, ai: "aggressive", skills: ["strike", "poison_sting", "venom_spit"],
    weak: ["bolt"], resist: [],
    loot: [{ id: "antidote", chance: 0.4 }],
  },
  leech: {
    id: "leech", name: "Blood Leech", sprite: "leech", level: 10,
    maxHp: 56, hp: 56, atk: 16, def: 6, mag: 12, spd: 12, luck: 4,
    xp: 52, gold: 14, ai: "caster", skills: ["drain", "poison_sting"],
    weak: ["fire"], resist: ["dark"],
    loot: [{ id: "potion", chance: 0.3 }],
  },
  // --- Drowned Ruins (ruins/coast) regulars ---
  drowned: {
    id: "drowned", name: "The Drowned", sprite: "drowned", level: 12,
    maxHp: 92, hp: 92, atk: 23, def: 11, mag: 6, spd: 7, luck: 4,
    xp: 78, gold: 26, ai: "aggressive", skills: ["strike", "guard_break", "claw"],
    weak: ["holy", "bolt"], resist: ["dark", "ice"],
    loot: [{ id: "hi_potion", chance: 0.25 }],
  },
  siren: {
    id: "siren", name: "Tide Siren", sprite: "siren", level: 13,
    maxHp: 82, hp: 82, atk: 15, def: 9, mag: 27, spd: 13, luck: 7,
    xp: 88, gold: 34, ai: "caster", skills: ["ice_lance", "shadow_bolt", "screech", "drain"],
    weak: ["holy", "bolt"], resist: ["ice"],
    loot: [{ id: "ether", chance: 0.35 }],
  },
  // --- Emberforge (volcanic) regulars ---
  magma_hound: {
    id: "magma_hound", name: "Magma Hound", sprite: "magma_hound", level: 13,
    maxHp: 100, hp: 100, atk: 27, def: 11, mag: 12, spd: 14, luck: 5,
    xp: 92, gold: 30, ai: "aggressive", skills: ["bite", "claw", "firebolt"],
    weak: ["ice"], resist: ["fire"],
    loot: [{ id: "hi_potion", chance: 0.3 }],
  },
  ash_wraith: {
    id: "ash_wraith", name: "Ash Wraith", sprite: "ash_wraith", level: 14,
    maxHp: 88, hp: 88, atk: 18, def: 10, mag: 30, spd: 13, luck: 6,
    xp: 100, gold: 32, ai: "caster", skills: ["firebolt", "shadow_bolt", "inferno"],
    weak: ["ice", "holy"], resist: ["fire", "dark"],
    loot: [{ id: "ether", chance: 0.35 }],
  },

  // ----- ACT II BOSSES -----
  rimewyrm: {
    id: "rimewyrm", name: "Rimewyrm", sprite: "rimewyrm", level: 14, boss: true,
    intro: "A serpent of living glacier uncoils across the pass, its breath a white blizzard. Rimewyrm has frozen the road for a season. Bring fire - and DEFEND when it inhales for a killing frost.",
    maxHp: 660, hp: 660, atk: 30, def: 16, mag: 30, spd: 12, luck: 6,
    xp: 700, gold: 320, ai: "caster",
    skills: ["frost_breath", "ice_lance", "rime_fang", "iron_skin", "war_cry"],
    weak: ["fire"], resist: ["ice"],
    loot: [{ id: "elixir", chance: 1 }],
  },
  mirelord: {
    id: "mirelord", name: "The Mirelord", sprite: "mirelord", level: 15, boss: true,
    intro: "The bog itself heaves upright - a hydra-toad horror sheathed in rot and reeking gas. The Mirelord drowns the mire in poison. Keep antidotes close and burn the miasma away.",
    maxHp: 740, hp: 740, atk: 31, def: 16, mag: 31, spd: 11, luck: 6,
    xp: 780, gold: 360, ai: "caster",
    skills: ["miasma", "venom_spit", "bramble_lash", "shadow_bolt", "heal"],
    weak: ["fire", "holy"], resist: ["dark"],
    loot: [{ id: "elixir", chance: 1 }],
  },
  tidewrought: {
    id: "tidewrought", name: "The Tidewrought", sprite: "tidewrought", level: 16, boss: true,
    intro: "Coral and drowned bronze grind together into a colossus, the lost Tide Key fused in its chest. The Tidewrought guards the ruins' only stair. Topple it - and DEFEND when the sea rears up behind it.",
    maxHp: 820, hp: 820, atk: 36, def: 20, mag: 26, spd: 10, luck: 6,
    xp: 880, gold: 420, ai: "aggressive",
    skills: ["tide_crush", "drown", "ice_lance", "iron_skin", "war_cry"],
    weak: ["bolt"], resist: ["ice", "dark"],
    loot: [{ id: "elixir", chance: 1 }],
  },
  magmaroth: {
    id: "magmaroth", name: "Magmaroth", sprite: "magmaroth", level: 18, boss: true,
    intro: "The caldera splits and the Cinder Tyrant rises, armoured in cooling crust over a furnace heart. Magmaroth is the strongest thing this world has ever borne. Bring ice, bring everything - and DEFEND when the forge erupts.",
    maxHp: 1100, hp: 1100, atk: 42, def: 22, mag: 40, spd: 13, luck: 8,
    xp: 1500, gold: 800, ai: "aggressive",
    skills: ["magma_wave", "inferno", "eruption", "ember_maul", "war_cry"],
    weak: ["ice"], resist: ["fire"],
    loot: [{ id: "elixir", chance: 1 }],
  },
};

// ------------------------------------------------------------------- SKILLS --
const skills = {
  strike: {
    id: "strike", name: "Strike", mp: 0, type: "phys", power: 1.0,
    target: "one", element: "none", anim: "slash", desc: "A basic melee attack.",
  },
  guard_break: {
    id: "guard_break", name: "Guard Break", mp: 4, type: "phys", power: 1.1,
    target: "one", element: "none", anim: "thrust",
    status: { name: "defdown", chance: 0.6, dur: 3 },
    desc: "A heavy blow that shatters the foe's defense.",
  },
  cleave: {
    id: "cleave", name: "Cleave", mp: 6, type: "phys", power: 0.9,
    target: "all", element: "none", anim: "slash", desc: "A wide swing striking all foes.",
  },
  bite: {
    id: "bite", name: "Bite", mp: 0, type: "phys", power: 1.1,
    target: "one", element: "none", anim: "bite", desc: "Savage fanged attack.",
  },
  claw: {
    id: "claw", name: "Rend", mp: 0, type: "phys", power: 1.0,
    target: "one", element: "none", anim: "claw",
    status: { name: "atkdown", chance: 0.4, dur: 2 },
    desc: "Raking claws that sap strength.",
  },
  bramble_lash: {
    id: "bramble_lash", name: "Bramble Lash", mp: 0, type: "phys", power: 1.15,
    target: "one", element: "none", anim: "thorn",
    status: { name: "poison", chance: 0.45, dur: 3, power: 3 },
    desc: "A whip of barbed vines that rakes and festers.",
  },
  thorn_volley: {
    id: "thorn_volley", name: "Thorn Volley", mp: 6, type: "phys", power: 0.9,
    target: "all", element: "none", anim: "thorn",
    desc: "A spray of barbed thorns at all foes.",
  },
  poison_sting: {
    id: "poison_sting", name: "Poison Sting", mp: 3, type: "phys", power: 0.8,
    target: "one", element: "none", anim: "thrust",
    status: { name: "poison", chance: 0.6, dur: 3, power: 3 },
    desc: "A venomous jab that poisons.",
  },
  firebolt: {
    id: "firebolt", name: "Firebolt", mp: 5, type: "mag", power: 1.2,
    target: "one", element: "fire", anim: "fire",
    status: { name: "burn", chance: 0.4, dur: 3, power: 3 },
    desc: "Hurls a bolt of flame.",
  },
  inferno: {
    id: "inferno", name: "Inferno", mp: 16, type: "mag", power: 1.3,
    target: "all", element: "fire", anim: "fire",
    status: { name: "burn", chance: 0.5, dur: 3, power: 4 },
    desc: "Engulfs all foes in fire.",
  },
  ice_lance: {
    id: "ice_lance", name: "Ice Lance", mp: 5, type: "mag", power: 1.2,
    target: "one", element: "ice", anim: "ice",
    status: { name: "stun", chance: 0.2, dur: 1 },
    desc: "A spear of ice that may freeze.",
  },
  thunder: {
    id: "thunder", name: "Thunder", mp: 6, type: "mag", power: 1.3,
    target: "one", element: "bolt", anim: "bolt", desc: "Calls down a lightning strike.",
  },
  holy_smite: {
    id: "holy_smite", name: "Holy Smite", mp: 8, type: "mag", power: 1.4,
    target: "one", element: "holy", anim: "holy", desc: "Searing light, cruel to the undead.",
  },
  shadow_bolt: {
    id: "shadow_bolt", name: "Shadow Bolt", mp: 5, type: "mag", power: 1.2,
    target: "one", element: "dark", anim: "dark", desc: "A lance of cold darkness.",
  },
  doom: {
    id: "doom", name: "Doom", mp: 10, type: "mag", power: 1.5,
    target: "one", element: "dark", anim: "dark",
    status: { name: "stun", chance: 0.3, dur: 1 },
    desc: "Crushing dark magic that may stun.",
  },
  drain: {
    id: "drain", name: "Drain", mp: 5, type: "mag", power: 0.9,
    target: "one", element: "dark", anim: "dark", desc: "Siphons the life of a foe.",
  },
  venom_spit: {
    id: "venom_spit", name: "Venom Spit", mp: 4, type: "debuff", power: 0.6,
    target: "one", element: "none", anim: "dark",
    status: { name: "poison", chance: 0.8, dur: 3, power: 4 },
    desc: "Spits potent venom.",
  },
  screech: {
    id: "screech", name: "Screech", mp: 3, type: "debuff", power: 0,
    target: "one", element: "none", anim: "dark",
    status: { name: "atkdown", chance: 0.7, dur: 3 },
    desc: "A piercing cry that weakens the foe.",
  },
  quake: {
    id: "quake", name: "Quake", mp: 8, type: "mag", power: 1.1,
    target: "all", element: "none", anim: "quake", desc: "Shakes the earth beneath all foes.",
  },
  heal: {
    id: "heal", name: "Heal", mp: 6, type: "heal", power: 2.0,
    target: "self", element: "none", anim: "heal", desc: "Restores HP.",
  },
  cure: {
    id: "cure", name: "Cure", mp: 5, type: "heal", power: 1.2,
    target: "self", element: "holy", anim: "heal", desc: "Soothing light mends wounds.",
  },
  mend_all: {
    id: "mend_all", name: "Mend", mp: 12, type: "heal", power: 1.5,
    target: "allies", element: "none", anim: "heal", desc: "Restores HP to all allies.",
  },
  war_cry: {
    id: "war_cry", name: "War Cry", mp: 6, type: "buff", power: 0,
    target: "allies", element: "none", anim: "buff",
    buff: { stat: "atk", amount: 4, dur: 3 }, desc: "Raises allies' attack.",
  },
  iron_skin: {
    id: "iron_skin", name: "Iron Skin", mp: 5, type: "buff", power: 0,
    target: "self", element: "none", anim: "buff",
    buff: { stat: "def", amount: 5, dur: 4 }, desc: "Hardens the body, raising defense.",
  },
  quicken: {
    id: "quicken", name: "Quicken", mp: 5, type: "buff", power: 0,
    target: "self", element: "none", anim: "buff",
    buff: { stat: "spd", amount: 4, dur: 3 }, desc: "Hastens the body, raising speed.",
  },

  // ----- ACT II boss skills (thematic kits, all reuse existing anims) -----
  frost_breath: {
    id: "frost_breath", name: "Frost Breath", mp: 12, type: "mag", power: 1.25,
    target: "all", element: "ice", anim: "ice",
    status: { name: "stun", chance: 0.25, dur: 1 },
    desc: "A glacial gale that sweeps and may freeze all foes.",
  },
  rime_fang: {
    id: "rime_fang", name: "Rime Fang", mp: 0, type: "phys", power: 1.35,
    target: "one", element: "none", anim: "bite",
    status: { name: "atkdown", chance: 0.5, dur: 3 },
    desc: "Frostbitten fangs that numb the limbs.",
  },
  miasma: {
    id: "miasma", name: "Miasma", mp: 14, type: "mag", power: 1.1,
    target: "all", element: "dark", anim: "dark",
    status: { name: "poison", chance: 0.7, dur: 4, power: 5 },
    desc: "A pall of swamp-rot that poisons everything it touches.",
  },
  tide_crush: {
    id: "tide_crush", name: "Tide Crush", mp: 10, type: "phys", power: 1.15,
    target: "all", element: "none", anim: "quake",
    desc: "A crushing surge of stone and sea that pounds all foes.",
  },
  drown: {
    id: "drown", name: "Drown", mp: 8, type: "mag", power: 1.4,
    target: "one", element: "ice", anim: "ice",
    status: { name: "stun", chance: 0.3, dur: 1 },
    desc: "Drags a single foe under crushing, freezing water.",
  },
  magma_wave: {
    id: "magma_wave", name: "Magma Wave", mp: 18, type: "mag", power: 1.4,
    target: "all", element: "fire", anim: "fire",
    status: { name: "burn", chance: 0.6, dur: 3, power: 5 },
    desc: "A tidal wave of molten rock breaks over all foes.",
  },
  eruption: {
    id: "eruption", name: "Eruption", mp: 12, type: "mag", power: 1.3,
    target: "all", element: "none", anim: "quake",
    desc: "The caldera bucks, hurling stone and cinder at all foes.",
  },
  ember_maul: {
    id: "ember_maul", name: "Ember Maul", mp: 0, type: "phys", power: 1.45,
    target: "one", element: "none", anim: "claw",
    status: { name: "burn", chance: 0.4, dur: 2, power: 4 },
    desc: "A searing claw that rends and sets flesh alight.",
  },
};

// -------------------------------------------------------------------- ITEMS --
const items = {
  potion: {
    id: "potion", name: "Potion", icon: "potion", type: "consumable",
    price: 30, sell: 12, use: { hp: 60, target: "self" },
    usableInBattle: true, usableInField: true, desc: "Restores 60 HP.",
  },
  hi_potion: {
    id: "hi_potion", name: "Hi-Potion", icon: "potion", type: "consumable",
    price: 90, sell: 36, use: { hp: 180, target: "self" },
    usableInBattle: true, usableInField: true, desc: "Restores 180 HP.",
  },
  ether: {
    id: "ether", name: "Ether", icon: "ether", type: "consumable",
    price: 40, sell: 16, use: { mp: 30, target: "self" },
    usableInBattle: true, usableInField: true, desc: "Restores 30 MP.",
  },
  elixir: {
    id: "elixir", name: "Elixir", icon: "elixir", type: "consumable",
    price: 500, sell: 150, use: { hp: 9999, mp: 9999, target: "self" },
    usableInBattle: true, usableInField: true, desc: "Fully restores HP and MP.",
  },
  antidote: {
    id: "antidote", name: "Antidote", icon: "potion", type: "consumable",
    price: 15, sell: 6, use: { cure: true, target: "self" },
    usableInBattle: true, usableInField: true, desc: "Cures poison and other ailments.",
  },
  phoenix_down: {
    id: "phoenix_down", name: "Phoenix Down", icon: "heart", type: "consumable",
    price: 200, sell: 60, use: { revive: 0.5, target: "self" },
    usableInBattle: true, usableInField: true, desc: "Revives with half HP.",
  },
  // ----- key items -----
  locket: {
    id: "locket", name: "Silver Locket", icon: "star", type: "key",
    price: 0, desc: "A child's silver locket, stamped with a tiny sun.",
  },
  medicine: {
    id: "medicine", name: "Sunmoss Medicine", icon: "heart", type: "key",
    price: 0, desc: "Healing moss from the deep wood. Someone needs this.",
  },
  sunstone_shard: {
    id: "sunstone_shard", name: "Sunstone Shard", icon: "star", type: "key",
    price: 0, desc: "A shard of the Sunstone. It pulses with faint warmth.",
  },
  cave_key: {
    id: "cave_key", name: "Sun-Sigil Key", icon: "key", type: "key",
    price: 0, desc: "The Elder's key. It opens the sealed door beneath the cave.",
  },
  ember_crystal: {
    id: "ember_crystal", name: "Ember Crystal", icon: "star", type: "key",
    price: 0, desc: "A warm shard of crystallized sunfire. Tinker Pell needs three.",
  },
  shawl: {
    id: "shawl", name: "Wool Shawl", icon: "heart", type: "key",
    price: 0, desc: "Goodwife Petra's good wool shawl, soft and a little dewy.",
  },
  reliquary: {
    id: "reliquary", name: "Sealed Reliquary", icon: "scroll", type: "key",
    price: 0, desc: "An ancient coffer from the Blackwood alcove. Something shifts inside when you tilt it.",
  },
  // Reward for setting the snared sunhart free (sq_poacher, mercy path). A
  // keepsake boon rather than coin — paired with a real power-up in dialogue.
  sunhart_charm: {
    id: "sunhart_charm", name: "Sunhart's Blessing", icon: "star", type: "key",
    price: 0, desc: "A warm token left by the sunhart you set free. Its brow's warmth still lingers in it, a quiet blessing that travels with you.",
  },
  // The satire (see heirloom_quest): grand, legendary-sounding, and by design
  // does NOTHING. It's type:"key", so it can't be equipped, used, or sold.
  grand_relic: {
    id: "grand_relic", name: "Dawnbreaker, Blade of the First Hero", icon: "sword", type: "key",
    price: 0,
    desc: "The fabled sword that split the first night and hung the dawn in the sky. Utterly legendary, utterly priceless - and far too important to ever be wielded, equipped, sold, or used. It does, quite literally, nothing.",
  },
  // ----- ACT II key item: opens the Drowned Ruins -> Emberforge gate -----
  tide_key: {
    id: "tide_key", name: "Tide Key", icon: "key", type: "key",
    price: 0, desc: "A barnacled key wrought from drowned bronze, torn from the Tidewrought's heart. It hums when the sealed caldera is near.",
  },
};

// ----------------------------------------------------------------- POWERUPS --
const powerups = {
  vigor_charm: {
    id: "vigor_charm", name: "Vigor Charm", icon: "heart", rarity: "common",
    mods: { maxHp: 15 }, desc: "+15 Max HP.",
  },
  power_band: {
    id: "power_band", name: "Power Band", icon: "sword", rarity: "common",
    mods: { atk: 3 }, desc: "+3 Attack.",
  },
  guard_brooch: {
    id: "guard_brooch", name: "Guard Brooch", icon: "shield", rarity: "common",
    mods: { def: 3 }, desc: "+3 Defense.",
  },
  mage_ring: {
    id: "mage_ring", name: "Mage Ring", icon: "star", rarity: "common",
    mods: { mag: 3, maxMp: 6 }, desc: "+3 Magic, +6 Max MP.",
  },
  swift_boots: {
    id: "swift_boots", name: "Swift Boots", icon: "boot", rarity: "common",
    mods: { spd: 3 }, desc: "+3 Speed.",
  },
  lucky_clover: {
    id: "lucky_clover", name: "Lucky Clover", icon: "star", rarity: "rare",
    mods: { luck: 5, critChance: 0.05 }, desc: "+5 Luck and a better chance to crit.",
  },
  vampire_fang: {
    id: "vampire_fang", name: "Vampire Fang", icon: "skull", rarity: "rare",
    special: "lifesteal", amount: 1, desc: "Heal for a portion of damage dealt.",
  },
  spiked_mail: {
    id: "spiked_mail", name: "Spiked Mail", icon: "shield", rarity: "rare",
    special: "thorns", amount: 1, mods: { def: 2 }, desc: "Reflect damage to attackers.",
  },
  shadow_cloak: {
    id: "shadow_cloak", name: "Shadow Cloak", icon: "boot", rarity: "rare",
    special: "evasion", amount: 1, desc: "Greatly improves dodge chance.",
  },
  haste_rune: {
    id: "haste_rune", name: "Haste Rune", icon: "boot", rarity: "rare",
    special: "haste", amount: 1, desc: "Chance to act an extra time each turn.",
  },
  crit_lens: {
    id: "crit_lens", name: "Crit Lens", icon: "star", rarity: "rare",
    special: "crit", amount: 1, desc: "Higher critical chance and damage.",
  },
  fire_charm: {
    id: "fire_charm", name: "Cinder Charm", icon: "star", rarity: "rare",
    mods: { mag: 3 }, grantsSkill: "firebolt", desc: "+3 Magic and grants Firebolt.",
  },
  titan_heart: {
    id: "titan_heart", name: "Titan Heart", icon: "heart", rarity: "epic",
    mods: { maxHp: 40, def: 5 }, desc: "+40 Max HP, +5 Defense.",
  },
  archmage_tome: {
    id: "archmage_tome", name: "Archmage Tome", icon: "scroll", rarity: "epic",
    mods: { mag: 8, maxMp: 20 }, grantsSkill: "thunder", desc: "+8 Magic, +20 Max MP, grants Thunder.",
  },
  sun_pendant: {
    id: "sun_pendant", name: "Sun Pendant", icon: "star", rarity: "epic",
    mods: { atk: 6, mag: 6 }, grantsSkill: "holy_smite", desc: "+6 Atk/Mag, grants Holy Smite.",
  },
  berserker_idol: {
    id: "berserker_idol", name: "Berserker Idol", icon: "skull", rarity: "epic",
    mods: { atk: 10 }, special: "crit", amount: 1, grantsSkill: "cleave",
    desc: "+10 Attack, sharper crits, grants Cleave.",
  },
};

// ---------------------------------------------------------------- DIALOGUES --
const dialogues = {
  // ----- signs / lore -----
  sign_town: {
    start: "s",
    nodes: {
      s: {
        text: "WELCOME TO SUNHOLLOW - a quiet village blessed by the Sunstone. Beware the woods to the south.",
        end: true,
      },
    },
  },
  forest_sign: {
    start: "s",
    nodes: {
      s: {
        text: "GREENWOOD TRAIL. North: Sunhollow. South: the deep forest. Keep your blade close.",
        end: true,
      },
    },
  },
  forest_path_sign: {
    start: "s",
    nodes: {
      s: {
        text: "Beyond here the trees grow black. The old shrine lies south. Turn back if your heart is weak.",
        end: true,
      },
    },
  },
  forest_deep_sign: {
    start: "s",
    nodes: {
      s: {
        text: "THE BLACKWOOD. The Warden guards the dimmed Sunstone at the shrine ahead.",
        end: true,
      },
    },
  },
  elder_house_lore: {
    start: "s",
    nodes: {
      s: {
        text: "A dusty tome reads: 'When the Sunstone dims, shadow pools in the hollows of the world. Only a chosen heart may rekindle its light - or claim its power.'",
        end: true,
      },
    },
  },
  // Town memorial plaque on the pond shore (ambient lore).
  town_plaque: {
    start: "s",
    nodes: {
      s: {
        speaker: "Memorial Plaque",
        portrait: "narrator",
        text: "Cast into the stone: 'Here the first Sunhollowers dug their well and raised the Sunstone's light above it. While the stone shines, the pond never freezes and the dark keeps its distance. Tend both, and be tended.'",
        end: true,
      },
    },
  },
  // Inn storyteller: optional world/story/boss background (ambient lore NPC).
  inn_storyteller: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:act2_unlocked", to: "hub_dawn" },
          { to: "hub" },
        ],
      },
      hub: {
        speaker: "Old Calla",
        portrait: "villager_f",
        text: "Pull up a stool, traveler. An old woman knows the bones of this valley - which tale will you have?",
        choices: [
          { text: "The Sunstone.", to: "t_stone" },
          { text: "The Warden of the shrine.", to: "t_warden" },
          { text: "The dark beneath the cave.", to: "t_dark" },
          { text: "Enough tales.", to: "bye" },
        ],
      },
      hub_dawn: {
        speaker: "Old Calla",
        portrait: "villager_f",
        text: "You're the one who hung the sun back in the sky - I'll tell YOU the tales now. Which will you have?",
        choices: [
          { text: "The Sunstone.", to: "t_stone" },
          { text: "The Warden of the shrine.", to: "t_warden" },
          { text: "The dark beneath the cave.", to: "t_dark" },
          { text: "And the troubled coast?", to: "t_coast" },
          { text: "Enough tales.", to: "bye" },
        ],
      },
      t_stone: {
        speaker: "Old Calla",
        portrait: "villager_f",
        text: "The Sunstone is no jewel - it's a shard of the first dawn, set at the forest shrine when the world was young. Its light is why no true night ever fell on Sunhollow... until it dimmed, the wolves grew bold, and the dark remembered us.",
        to: "hubback",
      },
      t_warden: {
        speaker: "Old Calla",
        portrait: "villager_f",
        text: "The Warden was the first to kneel to the Sunstone and swear to guard it. Kind once - they say he'd greet every traveler by name. He has held that shrine alone longer than any mortal should. If his eyes have gone cold, pity him before you judge him.",
        to: "hubback",
      },
      t_dark: {
        speaker: "Old Calla",
        portrait: "villager_f",
        text: "Beneath the eastern cave sleeps the Sanctum, and in it a thing crowned in night - the Shadowlord, the old folk named it. It was its hunger that drank the Sunstone's light. Sealed away once; never slain. Mind that, if ever that door opens to you.",
        to: "hubback",
      },
      t_coast: {
        speaker: "Old Calla",
        portrait: "villager_f",
        text: "When your dawn broke, it woke more than gratitude. Old powers along the coast stirred - ice, rot, drowned bronze, and a fire older than the Sunstone itself. Light calls to such things. Saltmere will need you worse than we ever did.",
        to: "hubback",
      },
      hubback: {
        branch: [
          { requires: "flag:act2_unlocked", to: "hub_dawn" },
          { to: "hub" },
        ],
      },
      bye: {
        speaker: "Old Calla",
        portrait: "villager_f",
        text: "Go on, then. The hearth and the tale will both keep.",
        end: true,
      },
    },
  },

  // ----- ELDER: main questline hub -----
  elder_main: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:sunstone_complete", to: "epilogue" },
          { requires: "flag:path_chosen", to: "returned" },
          { requires: "quest:sunstone=active", to: "remind" },
          { to: "intro" },
        ],
      },
      intro: {
        speaker: "Elder Soltan",
        portrait: "elder",
        text: "Stranger! You come at a dark hour. Our Sunstone has dimmed, and monsters spill from the Blackwood to circle Sunhollow.",
        to: "intro2",
      },
      intro2: {
        speaker: "Elder Soltan",
        portrait: "elder",
        text: "Long ago the Warden swore to guard the Sunstone at the forest shrine. Now even he has gone silent. Will you seek him and learn what darkened the stone?",
        choices: [
          { text: "I'll go. Sunhollow can count on me.", to: "accept" },
          { text: "What's in it for me?", to: "reward" },
        ],
      },
      reward: {
        speaker: "Elder Soltan",
        portrait: "elder",
        text: "Gold, glory, and a village that remembers your name. And should you fall, none of it will matter. Choose well.",
        to: "intro2",
      },
      accept: {
        speaker: "Elder Soltan",
        portrait: "elder",
        text: "Bless you. Take these, and some coin. Reach the shrine beyond the Blackwood and find the Warden.",
        do: ["quest:start:sunstone", "give:potion:2", "gold:+40", "flag:met_elder"],
        end: true,
      },
      remind: {
        speaker: "Elder Soltan",
        portrait: "elder",
        text: "The shrine lies south, past the forest and the Blackwood. Seek the Warden - and may the light hold.",
        end: true,
      },
      returned: {
        branch: [
          { requires: "flag:got_key", to: "go_sanctum" },
          { to: "give_key" },
        ],
      },
      give_key: {
        speaker: "Elder Soltan",
        portrait: "elder",
        text: "You return changed... I feel it. The Sunstone's heart beats again, faintly. Take this key - it opens the sealed stair beneath the eastern cave. End this, one way or another.",
        do: ["give:cave_key:1", "flag:dungeon_open", "flag:got_key"],
        end: true,
      },
      go_sanctum: {
        speaker: "Elder Soltan",
        portrait: "elder",
        text: "The Sanctum waits beneath the cave east of town. Whatever you mean to do - do it before the dark drinks us all.",
        end: true,
      },
      epilogue: {
        speaker: "Elder Soltan",
        portrait: "elder",
        text: "You did what had to be done. Sunhollow will sing of you for a hundred winters.",
        end: true,
      },
    },
  },

  // ----- shop / inn / arcanist -----
  shopkeeper_town: {
    start: "s",
    nodes: {
      s: {
        speaker: "Brann",
        portrait: "shopkeeper",
        text: "Stock's inside, friend - potions, ethers, the works. Or trade right here if you're in a hurry.",
        choices: [
          { text: "Trade now", to: "open" },
          { text: "Maybe later", to: "bye" },
        ],
      },
      open: { do: ["shop:general"], speaker: "Brann", portrait: "shopkeeper", text: "Pleasure doing business.", end: true },
      bye: { speaker: "Brann", portrait: "shopkeeper", text: "Safe travels.", end: true },
    },
  },
  shopkeeper_store: {
    start: "s",
    nodes: {
      s: {
        speaker: "Brann",
        portrait: "shopkeeper",
        text: "Welcome to Brann's Goods! What'll it be?",
        choices: [
          { text: "Buy / Sell", to: "open" },
          { text: "Any news?", to: "news" },
          { text: "Leave", to: "bye" },
        ],
      },
      open: { do: ["shop:general"], to: "s" },
      news: {
        speaker: "Brann",
        portrait: "shopkeeper",
        text: "Folk say the wolves hunt by daylight now. The Sunstone's dimming, sure as anything. Stay stocked.",
        to: "s",
      },
      bye: { speaker: "Brann", portrait: "shopkeeper", text: "Light keep you.", end: true },
    },
  },
  innkeeper: {
    start: "s",
    nodes: {
      s: {
        speaker: "Innkeeper Wenna",
        portrait: "villager_f",
        text: "Rooms are warm and the soup's hot. Rest a while?",
        choices: [
          { text: "Rest (heal)", to: "rest" },
          { text: "No thanks", to: "bye" },
        ],
      },
      rest: {
        do: ["heal"],
        speaker: "Innkeeper Wenna",
        portrait: "villager_f",
        text: "There - good as new. Mind how you go.",
        end: true,
      },
      bye: { speaker: "Innkeeper Wenna", portrait: "villager_f", text: "Door's always open.", end: true },
    },
  },
  arcanist: {
    start: "s",
    nodes: {
      s: {
        speaker: "Arcanist Vyle",
        portrait: "king",
        text: "Magic for the brave. Ethers, elixirs... and for the worthy, a spark of true power.",
        choices: [
          { text: "Buy arcana", to: "open" },
          { text: "Learn a spell", to: "learn", requires: "!flag:learned_thunder" },
          { text: "Leave", to: "bye" },
        ],
      },
      open: { do: ["shop:arcane"], to: "s" },
      learn: {
        branch: [
          { requires: "level:>=3", to: "learn_ok" },
          { to: "learn_no" },
        ],
      },
      learn_ok: {
        speaker: "Arcanist Vyle",
        portrait: "king",
        text: "You have the spark. Take this word of thunder - let it answer your foes.",
        do: ["learn:thunder", "flag:learned_thunder"],
        to: "s",
      },
      learn_no: {
        speaker: "Arcanist Vyle",
        portrait: "king",
        text: "Come back when you've seen more of the world - level 3, at least.",
        to: "s",
      },
      bye: { speaker: "Arcanist Vyle", portrait: "king", text: "The arcane abides.", end: true },
    },
  },

  // ----- guard (reacts to story progress) -----
  guard_gate: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:path_chosen", to: "after" },
          { requires: "quest:sunstone=active", to: "active" },
          { to: "idle" },
        ],
      },
      idle: {
        speaker: "Guard Hollis",
        portrait: "guard",
        text: "Keep clear of the south woods unless the Elder sent you. Wolves don't knock.",
        end: true,
      },
      active: {
        speaker: "Guard Hollis",
        portrait: "guard",
        text: "So the Elder sent you to the shrine? Brave. Cut through the forest, then the Blackwood. The shrine's at the end.",
        end: true,
      },
      after: {
        speaker: "Guard Hollis",
        portrait: "guard",
        text: "Whatever you found out there, it changed the air. The cave east of here... be careful.",
        end: true,
      },
    },
  },

  // ----- villagers -----
  villager_woman: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:helped_mira", to: "thanks" },
          { requires: "quest:sq_locket=done", to: "thanks" },
          { requires: "item:locket", to: "return" },
          { to: "s" },
        ],
      },
      s: {
        speaker: "Aldis",
        portrait: "villager_f",
        text: "My Mira lost her locket deep in the Blackwood - she's the little one playing nearby. If you brave those woods and find it, give it to her, or bring it to me.",
        end: true,
      },
      return: {
        speaker: "Aldis",
        portrait: "villager_f",
        text: "Mira's locket! Oh, thank you - she braved nightmares about those woods. Please, take this coin with my whole heart - and a tonic for the road, you've surely earned it.",
        do: [
          "quest:start:sq_locket",
          "take:locket:1",
          "quest:obj:sq_locket:o1",
          "quest:obj:sq_locket:o2",
          "quest:done:sq_locket",
          "gold:+60",
          "give:hi_potion:1",
          "xp:+40",
          "flag:helped_mira",
        ],
        end: true,
      },
      thanks: {
        speaker: "Aldis",
        portrait: "villager_f",
        text: "Mira hasn't stopped smiling since you found it. Bless you.",
        end: true,
      },
    },
  },
  villager_man: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:cured_girl", to: "thanks" },
          { requires: "quest:sq_medicine=done", to: "thanks" },
          { requires: "item:medicine", to: "return" },
          { requires: "quest:sq_medicine=active", to: "remind" },
          { requires: "flag:path_shadow", to: "shadow" },
          { requires: "flag:path_light", to: "light" },
          // The offer only opens once the way into the Blackwood is forced
          // (Thornjaw beaten) - before that the sunmoss is unreachable anyway.
          { requires: "!flag:beat_thornjaw", to: "idle" },
          { to: "ask" },
        ],
      },
      idle: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "Crops won't grow in this gloom, and the wolves are bold as brass. A man can't even reach the deep wood for healing herbs with that thorned horror barring the way south. Naught to do but wait and worry.",
        end: true,
      },
      ask: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "Crops won't grow in this gloom, and now my girl's taken ill. There's sunmoss medicine cached deep in the Blackwood. I'm too old to fetch it - would you?",
        choices: [
          { text: "I'll bring the medicine.", to: "accept" },
          { text: "Not now.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "You're a good soul. Look for an old chest in the deep wood - the healers left it there.",
        do: ["quest:start:sq_medicine"],
        end: true,
      },
      remind: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "The sunmoss is deep in the Blackwood, in an old cache.",
        end: true,
      },
      return: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "The medicine! Bless you a thousand times. I can't repay a life with coin alone - take what I've saved, and my late wife's good tonic besides. My girl will live.",
        do: [
          "quest:start:sq_medicine",
          "take:medicine:1",
          "quest:obj:sq_medicine:o1",
          "quest:obj:sq_medicine:o2",
          "quest:done:sq_medicine",
          "gold:+100",
          "give:hi_potion:1",
          "xp:+40",
          "flag:cured_girl",
        ],
        end: true,
      },
      thanks: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "My daughter's up and laughing again. We owe you everything.",
        end: true,
      },
      light: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "There's warmth in the air today. Did you do that? Bless you, traveler.",
        end: true,
      },
      shadow: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "The shadows lean toward you now. I don't know whether to thank you or run.",
        end: true,
      },
      bye: {
        speaker: "Farmer Oden",
        portrait: "villager_m",
        text: "Think on it. We're running out of days.",
        end: true,
      },
    },
  },
  child_play: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:helped_mira", to: "thanks" },
          { requires: "quest:sq_locket=done", to: "thanks" },
          { requires: "item:locket", to: "return" },
          { requires: "quest:sq_locket=active", to: "remind" },
          { to: "ask" },
        ],
      },
      ask: {
        speaker: "Mira",
        portrait: "child",
        text: "I lost my mama's locket way out in the dark Blackwood, past the green forest. Mama says it's too far... but you're brave, right? Please find it?",
        choices: [
          { text: "I'll find it.", to: "accept" },
          { text: "I'm busy.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Mira",
        portrait: "child",
        text: "Thank you thank you! It's silver, with a little sun on it.",
        do: ["quest:start:sq_locket"],
        end: true,
      },
      remind: {
        speaker: "Mira",
        portrait: "child",
        text: "It's deep in the Blackwood, in an old chest near the bottom, I think... past all the dark trees.",
        end: true,
      },
      return: {
        speaker: "Mira",
        portrait: "child",
        text: "My locket! You found it! I saved up my coppers for the hero who found it - that's you! Take them all, and Mama's spare tonic too. And... thank you.",
        do: [
          "quest:start:sq_locket",
          "take:locket:1",
          "quest:obj:sq_locket:o1",
          "quest:obj:sq_locket:o2",
          "quest:done:sq_locket",
          "gold:+60",
          "give:hi_potion:1",
          "xp:+40",
          "flag:helped_mira",
        ],
        end: true,
      },
      thanks: {
        speaker: "Mira",
        portrait: "child",
        text: "You're my favorite hero ever!",
        end: true,
      },
      bye: { speaker: "Mira", portrait: "child", text: "...okay.", end: true },
    },
  },

  // ----- BRANCH POINT 1: the wounded traveler -----
  forest_traveler: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:traveler_done", to: "done" },
          { to: "ask" },
        ],
      },
      ask: {
        speaker: "Wounded Traveler",
        portrait: "villager_m",
        text: "Please... wolves took my pack and my strength. Spare a potion, or sit with me a while. Or just take what's left of me, like the others tried.",
        choices: [
          { text: "Take my potion. (give 1)", to: "help", requires: "item:potion" },
          { text: "Sit. Rest. You'll live.", to: "help2" },
          { text: "Hand over your coin.", to: "rob" },
        ],
      },
      help: {
        speaker: "Wounded Traveler",
        portrait: "villager_m",
        text: "Bless you... Take this - I found it near the shrine, but it's wasted on a dying man. May it light your way.",
        do: ["take:potion:1", "flag:helped_traveler", "flag:traveler_done", "gold:+30", "powerup"],
        end: true,
      },
      help2: {
        speaker: "Wounded Traveler",
        portrait: "villager_m",
        text: "Your kindness is rarer than gold out here. Take these few coins. The Warden ahead... he is not what he was.",
        do: ["flag:helped_traveler", "flag:traveler_done", "gold:+15"],
        end: true,
      },
      rob: {
        speaker: "Wounded Traveler",
        portrait: "villager_m",
        text: "...Of course. Take it. The cold takes the rest of us anyway. I hope it's worth your soul.",
        do: ["flag:robbed_traveler", "flag:traveler_done", "gold:+50"],
        end: true,
      },
      done: {
        branch: [
          { requires: "flag:robbed_traveler", to: "done_rob" },
          { to: "done_help" },
        ],
      },
      done_help: {
        speaker: "Wounded Traveler",
        portrait: "villager_m",
        text: "I'm stronger now, thanks to you. Go carefully.",
        end: true,
      },
      done_rob: {
        speaker: "Wounded Traveler",
        portrait: "villager_m",
        text: "Haven't you taken enough?",
        end: true,
      },
    },
  },
  deep_villager: {
    start: "s",
    nodes: {
      s: {
        speaker: "Lost Woodsman",
        portrait: "villager_m",
        text: "You hear it too? The shrine hums wrong. The Warden used to greet travelers - now his eyes glow cold. Tread soft, friend.",
        end: true,
      },
    },
  },

  // ----- BRANCH POINT 2 (MAJOR): the Warden at the shrine -----
  shrine_warden: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:path_chosen", to: "after" },
          { to: "meet" },
        ],
      },
      meet: {
        speaker: "The Warden",
        portrait: "warden",
        text: "Far enough, child of the sun. I am the Warden of this shrine. The Sunstone you seek lies dimmed behind me - and I will not yield it lightly.",
        do: ["quest:obj:sunstone:o1", "flag:warden_met"],
        to: "meet2",
      },
      meet2: {
        speaker: "The Warden",
        portrait: "warden",
        text: "A shadow crept from the Sanctum and drank the stone's light. I have held the dark at bay alone, too long. Why have you come?",
        choices: [
          { text: "To restore the light. Let me prove myself.", to: "light_path" },
          { text: "To take the Sunstone. Stand aside.", to: "shadow_path" },
          { text: "Tell me of this shadow.", to: "lore" },
        ],
      },
      lore: {
        speaker: "The Warden",
        portrait: "warden",
        text: "It wears a crown of night and calls itself the Shadowlord. It would have the sun gutter out forever. To face it you need a shard of the stone - and a reason I can trust.",
        to: "meet2",
      },
      light_path: {
        speaker: "The Warden",
        portrait: "warden",
        text: "Then show me - not with words, but with mercy and steel both. ...Yes. I see it now. Take this shard of the Sunstone, and with it, my blessing.",
        do: [
          "flag:path_chosen",
          "flag:path_light",
          "give:sunstone_shard:1",
          "quest:obj:sunstone:o2",
          "flag:warden_spared",
        ],
        to: "light_end",
      },
      light_end: {
        speaker: "The Warden",
        portrait: "warden",
        text: "Go to the Sanctum beneath the eastern cave. End the Shadowlord, and let the sun rise. I will hold the shrine until you return.",
        end: true,
      },
      shadow_path: {
        speaker: "The Warden",
        portrait: "warden",
        text: "So. Another would-be tyrant. Then take it from my cold hands. Come - let us see whose darkness runs deeper!",
        do: ["battle:warden"],
        to: "shadow_after",
      },
      shadow_after: {
        speaker: "The Warden",
        portrait: "warden",
        text: "...Heh. Strength enough to damn you. Take the shard, then. And take this warning: power answers only to more power. The Sanctum awaits its new master.",
        do: [
          "flag:path_chosen",
          "flag:path_shadow",
          "give:sunstone_shard:1",
          "quest:obj:sunstone:o2",
          "flag:warden_beaten",
        ],
        to: "shadow_end",
      },
      shadow_end: {
        speaker: "The Warden",
        portrait: "warden",
        text: "Go then, conqueror. The dark beneath the cave will know its kin.",
        end: true,
      },
      after: {
        branch: [
          { requires: "flag:path_shadow", to: "after_shadow" },
          { to: "after_light" },
        ],
      },
      after_light: {
        speaker: "The Warden",
        portrait: "warden",
        text: "The shard is yours, friend of the sun. The Sanctum lies east, beneath the cave. Go - and come back to me alive.",
        end: true,
      },
      after_shadow: {
        speaker: "The Warden",
        portrait: "warden",
        text: "...You again. Finish what you started, usurper. The Sanctum is east, beneath the cave.",
        end: true,
      },
    },
  },

  // ----- the sealed door (gates the Sanctum) -----
  // Now purely the "still sealed" message: the door itself is a gated transition
  // tile (dungeon trigger, requires flag:dungeon_open). Once the Elder's key sets
  // that flag the transition fires on its own and this never shows again.
  dungeon_gate: {
    start: "s",
    nodes: {
      s: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "A door of black stone, sealed with a sun-sigil. It will not open without the Elder's key.",
        end: true,
      },
    },
  },

  // ----- Act 3 climax: final boss + alternate endings -----
  sanctum_final: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:path_shadow", to: "shadow_intro" },
          { to: "light_intro" },
        ],
      },
      // --- LIGHT PATH ---
      light_intro: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The Sunstone's pedestal stands shattered. From the dark coils a figure crowned in night.",
        do: ["quest:obj:sunstone:o3"],
        to: "light_talk",
      },
      light_talk: {
        speaker: "Shadowlord",
        portrait: "king",
        text: "So the Warden's pet arrives, clutching a sliver of light. I snuffed the sun once. I will snuff you, and then the world.",
        choices: [
          { text: "For Sunhollow. For the dawn!", to: "light_fight" },
          { text: "(Raise the shard) Burn.", to: "light_fight" },
        ],
      },
      light_fight: {
        speaker: "Shadowlord",
        portrait: "king",
        text: "Impossible... the light... it BURNS-!",
        do: ["battle:shadowlord"],
        to: "light_win",
      },
      light_win: {
        branch: [
          { requires: "flag:helped_traveler", to: "lw2" },
          { to: "ending_dawn" },
        ],
      },
      lw2: {
        branch: [
          { requires: "flag:cured_girl", to: "lw3" },
          { to: "ending_dawn" },
        ],
      },
      lw3: {
        branch: [
          { requires: "flag:helped_mira", to: "ending_radiant" },
          { to: "ending_dawn" },
        ],
      },
      ending_dawn: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "You press the shard to the pedestal. Light roars upward, and dawn breaks over Sunhollow for the first time in a year. THE SUN RETURNS.",
        do: ["flag:sunstone_complete", "quest:done:sunstone", "ending:dawn"],
        end: true,
      },
      ending_radiant: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The shard blazes - and every kindness you showed answers it. Light pours into the world brighter than before, mending all that was broken. A RADIANT DAWN. The land, and you, are made whole.",
        do: ["flag:sunstone_complete", "quest:done:sunstone", "ending:radiant"],
        end: true,
      },
      // --- SHADOW PATH ---
      shadow_intro: {
        speaker: "Shadowlord",
        portrait: "king",
        text: "Ahhh. The one who broke the Warden and stole his shard. I have waited for someone... hungry. Stand with me, and we will rule the long night together.",
        do: ["quest:obj:sunstone:o3"],
        choices: [
          { text: "The night is MINE. Out of my way.", to: "embrace" },
          { text: "No. I won't become you.", to: "renounce" },
        ],
      },
      embrace: {
        speaker: "You",
        portrait: "hero",
        text: "You raise the shard - and it drinks the dark instead of the light. The dimmed sun answers a new master, swelling into a black and burning thing.",
        do: ["flag:embraced_dark"],
        to: "sun_fight",
      },
      sun_fight: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The corrupted sun shrieks as you bend it to your will...",
        do: ["battle:sunshade"],
        to: "ending_eclipse",
      },
      ending_eclipse: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "You hang the blackened sun in the sky like a crown. Sunhollow kneels in its long shadow. THE ECLIPSE ETERNAL - and you, its sovereign.",
        do: ["flag:sunstone_complete", "quest:done:sunstone", "ending:eclipse"],
        end: true,
      },
      renounce: {
        speaker: "You",
        portrait: "hero",
        text: "You turn the shard against the dark you carried. The Shadowlord howls - betrayed by his chosen heir.",
        do: ["flag:redeemed"],
        to: "renounce_fight",
      },
      renounce_fight: {
        speaker: "Shadowlord",
        portrait: "king",
        text: "Traitor! After all I- the light- NO-!",
        do: ["battle:shadowlord"],
        to: "ending_redeem",
      },
      ending_redeem: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "You break the Shadowlord and the chains you forged on yourself. The sun rises pale but true. Sunhollow forgives slowly - but it forgives. A DAWN, HARD-WON.",
        do: ["flag:sunstone_complete", "quest:done:sunstone", "ending:redemption"],
        end: true,
      },
    },
  },

  // ===== SIDE QUEST: bounty hunt — Hunter Bram & the scarred wolf ==========
  // Bram NEVER names the beast. Offer happens in the Greenwood; accepting sets
  // flag:bounty_started, which hides the Greenwood Bram and reveals his other
  // self in the Hunting Grounds clearing, where the fight is fought. The same
  // tree drives both locations via the root branch.
  bram_bounty: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:slew_greyfang", to: "done" },
          { requires: "quest:sq_bounty=active", to: "ready" },
          { to: "offer" },
        ],
      },
      offer: {
        speaker: "Hunter Bram",
        portrait: "villager_m",
        text: "You've the look of a fighter. A great scarred wolf - bigger than any I've seen - has been savaging the trail and tearing up my snares. I'll pay well for its hide. Take the bounty?",
        choices: [
          { text: "I'll hunt the beast.", to: "accept" },
          { text: "Not my problem.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Hunter Bram",
        portrait: "villager_m",
        text: "Hah! Good. I'll head out east to the old hunting grounds and flush it from the brush - meet me in the clearing along the trail, and we'll end the great brute together.",
        do: ["quest:start:sq_bounty", "flag:bounty_started"],
        end: true,
      },
      ready: {
        speaker: "Hunter Bram",
        portrait: "villager_m",
        text: "The beast is close - I can smell the carrion on the wind. Ready to bring it down right now?",
        choices: [
          { text: "Move in for the kill. (fight)", to: "fight" },
          { text: "Give me a moment.", to: "wait" },
        ],
      },
      wait: {
        speaker: "Hunter Bram",
        portrait: "villager_m",
        text: "Don't dawdle. That scarred brute's eating my livelihood.",
        end: true,
      },
      fight: {
        speaker: "Hunter Bram",
        portrait: "villager_m",
        text: "There - it breaks from the brush, all teeth and old scars! GO!",
        do: ["battle:greyfang"],
        to: "victory",
      },
      victory: {
        speaker: "Hunter Bram",
        portrait: "villager_m",
        text: "Down at last! Clean work, that. Here's your bounty in full, coin for coin as promised - and take a couple of my best draughts besides. You earned every bit.",
        do: [
          "quest:obj:sq_bounty:o1",
          "quest:obj:sq_bounty:o2",
          "quest:done:sq_bounty",
          "gold:+120",
          "give:hi_potion:1",
          "xp:+50",
          "flag:slew_greyfang",
        ],
        end: true,
      },
      done: {
        speaker: "Hunter Bram",
        portrait: "villager_m",
        text: "The trail's safe again, thanks to you. Snares are full and the camp eats well tonight.",
        end: true,
      },
      bye: {
        speaker: "Hunter Bram",
        portrait: "villager_m",
        text: "Suit yourself. That scarred wolf won't wait forever.",
        end: true,
      },
    },
  },

  // ===== SIDE QUEST: moral choice — Poacher Garron & the sunhart (deep) ====
  garron_poacher: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:poacher_done", to: "done" },
          { requires: "quest:sq_poacher=active", to: "decide" },
          { to: "offer" },
        ],
      },
      offer: {
        speaker: "Poacher Garron",
        portrait: "villager_m",
        text: "Psst. I snared something rare - a sunhart, a deer that glows like dawn. Worth a fortune in the city... if I can get it out alive. Lend a hand?",
        choices: [
          { text: "Tell me the deal.", to: "accept" },
          { text: "Poaching's not for me.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Poacher Garron",
        portrait: "villager_m",
        text: "Simple: help me haul it to market and we split the coin - or don't. It's in the snare right there, thrashing. Decide soon; it won't last the night.",
        do: ["quest:start:sq_poacher"],
        end: true,
      },
      decide: {
        speaker: "Poacher Garron",
        portrait: "villager_m",
        text: "Well? The sunhart's bleeding in the snare. Coin in our pockets - or your soft conscience?",
        choices: [
          { text: "Haul it to market with you.", to: "path_help" },
          { text: "Cut it loose. It's suffering.", to: "path_free" },
        ],
      },
      path_help: {
        speaker: "Poacher Garron",
        portrait: "villager_m",
        text: "Ha! A partner with sense. Here's your cut - heavy, just like I promised. Pleasure doing crime with you.",
        do: [
          "quest:obj:sq_poacher:o1",
          "quest:done:sq_poacher",
          "gold:+130",
          "xp:+40",
          "flag:poacher_paid",
          "flag:poacher_done",
        ],
        end: true,
      },
      path_free: {
        speaker: "Poacher Garron",
        portrait: "villager_m",
        text: "No - NO! You've cost me a fortune, you soft-hearted fool!",
        to: "free_narr",
      },
      // Narration of the freeing itself + its boon: a Narrator node, not Garron.
      // The mercy path pays NO gold - the sunhart's blessing (a charm + a real
      // power-up) is the reward instead.
      free_narr: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "You cut the snare. The sunhart staggers up and bounds into the trees - but before it vanishes it presses its glowing brow to yours, and warmth pours into your bones. Garron spits, curses your name, and storms off into the dark.",
        do: [
          "quest:obj:sq_poacher:o1",
          "quest:done:sq_poacher",
          "give:sunhart_charm:1",
          "powerup",
          "xp:+40",
          "flag:beast_freed",
          "flag:poacher_done",
        ],
        end: true,
      },
      done: {
        branch: [
          { requires: "flag:beast_freed", to: "done_free" },
          { to: "done_help" },
        ],
      },
      done_free: {
        speaker: "Poacher Garron",
        portrait: "villager_m",
        text: "You cost me a fortune, bleeding-heart. Get out of my sight.",
        end: true,
      },
      done_help: {
        speaker: "Poacher Garron",
        portrait: "villager_m",
        text: "Spent my share already. Find another sunhart and you know where I'll be.",
        end: true,
      },
      bye: {
        speaker: "Poacher Garron",
        portrait: "villager_m",
        text: "Pfah. Tender heart, empty purse.",
        end: true,
      },
    },
  },

  // ===== SIDE QUEST: investigation/riddle — Scholar Wrenna & the verse =====
  wrenna_scholar: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:verse_done", to: "done" },
          { requires: "quest:sq_verse=active", to: "active_check" },
          // The verse-hunt offer waits until the Blackwood opens (Thornjaw
          // beaten); before that Wrenna shares a little lore instead.
          { requires: "!flag:beat_thornjaw", to: "idle" },
          { to: "offer" },
        ],
      },
      idle: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "You've the Elder's errand, haven't you? Mind the old histories: the Warden was no monster once - he was the first to swear himself to the Sunstone, and the kindest soul in these vales. Whatever you find at that shrine, remember he kept the dark out alone for longer than any of us were alive.",
        end: true,
      },
      // CHAIN gating: route by how far the two-grave hunt has progressed. Order
      // matters - check the deepest flag first so out-of-order reading is safe.
      active_check: {
        branch: [
          { requires: "flag:found_verse2", to: "recite2" },
          { requires: "flag:verse_chain", to: "remind2" },
          { requires: "flag:found_verse", to: "recite1" },
          { to: "remind1" },
        ],
      },
      offer: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "You there - do you read? I'm restoring an old funerary verse, but its ending is lost. One copy is carved on a lonely grave deep in the Blackwood. Bring me what it says?",
        choices: [
          { text: "I'll find the lost line.", to: "accept" },
          { text: "I can't read graves for you.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "Wonderful. Seek the leaning grave among the old stones in the Blackwood - read it, remember it, and return to me.",
        do: ["quest:start:sq_verse", "quest:obj:sq_verse:o1"],
        end: true,
      },
      remind1: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "The grave lies in the Blackwood, beside the old stones. Read the whole verse and bring me its words.",
        end: true,
      },
      recite1: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "You found it! Quickly - how does the first part end? 'When shadow drinks the dawn away...'",
        choices: [
          { text: "'...and the sun remembers its name.'", to: "correct1" },
          { text: "'...and the wolves inherit the dark.'", to: "wrong1" },
          { text: "'...and gold outlasts the grave.'", to: "wrong1" },
        ],
      },
      wrong1: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "No, no - that's not how it goes. Picture the carving again, then tell me true.",
        to: "recite1",
      },
      correct1: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "Yes - 'and the sun remembers its name.' A promise, not a lament! But wait... the stone speaks of a TWIN grave, and the true ending sleeps with it - older, sunk in the dark beneath the world. The poem is only half-finished.",
        do: ["quest:obj:sq_verse:o2", "flag:verse_chain"],
        to: "send2",
      },
      send2: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "Please - the twin grave lies in the sealed cavern east of town, once the Elder's key opens the way. Find the rest of the verse, and the poem is whole at last.",
        end: true,
      },
      remind2: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "The twin grave waits in the sealed cavern east of town. Bring me the verse's true ending.",
        end: true,
      },
      recite2: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "The twin grave - you read it! Then speak the ending, the line none living remember... 'Though we go down into the long night...'",
        choices: [
          { text: "'...and the faithful are not forgotten.'", to: "correct2" },
          { text: "'...and the dark keeps what it takes.'", to: "wrong2" },
          { text: "'...and silence outlasts the song.'", to: "wrong2" },
        ],
      },
      wrong2: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "No - that's a mourner's despair, not this poem's heart. Picture the sunken stone again.",
        to: "recite2",
      },
      correct2: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "'...and the faithful are not forgotten.' That's it - the whole of it, mended at last! You walked two graves' worth of dark for a single poem. Few would have finished it. Take these ethers from my study - and this, a fragment of true power I copied from the old texts. You've more than earned both.",
        do: [
          "quest:obj:sq_verse:o3",
          "quest:done:sq_verse",
          "gold:+90",
          "give:ether:2",
          "xp:+70",
          "flag:verse_done",
          "powerup",
        ],
        end: true,
      },
      done: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "The verse is whole again, both halves of it, thanks to you. 'The sun remembers its name, and the faithful are not forgotten.' Fitting, in days like these.",
        end: true,
      },
      bye: {
        speaker: "Scholar Wrenna",
        portrait: "villager_f",
        text: "A pity. Some lines deserve to be finished.",
        end: true,
      },
    },
  },

  // ----- the lonely grave (sq_verse chain, step 1: Blackwood) -----
  verse_grave: {
    start: "s",
    nodes: {
      s: {
        speaker: "Leaning Grave",
        portrait: "narrator",
        text: "Worn letters cling to the cracked stone: 'When shadow drinks the dawn away... and the sun remembers its name.' Below, fainter: 'the rest lies with my twin, in the dark beneath the world.' You fix the line in your memory.",
        do: ["flag:found_verse"],
        end: true,
      },
    },
  },

  // ----- the twin grave (sq_verse chain, step 2: Sealed Cavern) -----
  verse_grave_2: {
    start: "s",
    nodes: {
      s: {
        speaker: "Sunken Grave",
        portrait: "narrator",
        text: "A twin stone, half-swallowed by the cavern floor. The final couplet endures where no daylight ever reached it: 'Though we go down into the long night... and the faithful are not forgotten.' You commit it to heart.",
        do: ["flag:found_verse2"],
        end: true,
      },
    },
  },

  // ===== SIDE QUEST: collection — Tinker Pell & three ember crystals ========
  pell_collect: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:relics_done", to: "done" },
          { requires: "quest:sq_relics=active", to: "check1" },
          // Two of the three crystals lie past the Blackwood gate, so Pell only
          // floats the job once Thornjaw's beaten. Until then, a grumble.
          { requires: "!flag:beat_thornjaw", to: "idle" },
          { to: "offer" },
        ],
      },
      idle: {
        speaker: "Tinker Pell",
        portrait: "villager_m",
        text: "Half my lamps are dead since the Sunstone dimmed, and the spare parts I need are stashed in old chests out past the deep wood - no use to me while that thorned brute holds the south trail. Soon as the way's clear, I'll have work for steady hands.",
        end: true,
      },
      offer: {
        speaker: "Tinker Pell",
        portrait: "villager_m",
        text: "Our street-lamps went dark when the Sunstone dimmed. I can relight them - but I need three ember crystals the old miners stashed in chests: one in the green wood, one in the Blackwood, one in the sealed cavern. Fetch them?",
        choices: [
          { text: "I'll find all three.", to: "accept" },
          { text: "Maybe later.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Tinker Pell",
        portrait: "villager_m",
        text: "Bless you. Look for old chests - the green wood, the black wood, and the cavern east of town. Bring me three ember crystals.",
        do: ["quest:start:sq_relics"],
        end: true,
      },
      check1: {
        branch: [
          { requires: "flag:got_relic_a", to: "check2" },
          { to: "remind" },
        ],
      },
      check2: {
        branch: [
          { requires: "flag:got_relic_b", to: "check3" },
          { to: "remind" },
        ],
      },
      check3: {
        branch: [
          { requires: "flag:got_relic_c", to: "reward" },
          { to: "remind" },
        ],
      },
      remind: {
        speaker: "Tinker Pell",
        portrait: "villager_m",
        text: "Three ember crystals - green wood, black wood, sealed cavern. Come back once you've gathered them all.",
        end: true,
      },
      reward: {
        speaker: "Tinker Pell",
        portrait: "villager_m",
        text: "All three! Warm as a hearth. Watch - the lamps catch, and the whole street glows gold again. Here, coin for your trouble, a hi-potion from my kit, and a little something I tinkered from the leftover spark.",
        do: [
          "take:ember_crystal:3",
          "quest:obj:sq_relics:o1",
          "quest:obj:sq_relics:o2",
          "quest:done:sq_relics",
          "gold:+60",
          "give:hi_potion:1",
          "xp:+50",
          "flag:relics_done",
          "powerup",
        ],
        end: true,
      },
      done: {
        speaker: "Tinker Pell",
        portrait: "villager_m",
        text: "Lovely glow, isn't it? Children play in the lamplight again. All thanks to you.",
        end: true,
      },
      bye: {
        speaker: "Tinker Pell",
        portrait: "villager_m",
        text: "The dark can wait, I suppose. But not forever.",
        end: true,
      },
    },
  },

  // ===== SIDE QUEST: rescue — Hessa (inn) & Tomm (dungeon) =================
  hessa_rescue: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:rescue_done", to: "done" },
          { requires: "quest:sq_rescue=active", to: "active_check" },
          // No point begging a rescue while the cavern's still sealed - the
          // offer waits until the Elder's key opens it (flag:dungeon_open).
          { requires: "!flag:dungeon_open", to: "idle" },
          { to: "offer" },
        ],
      },
      idle: {
        speaker: "Hessa",
        portrait: "villager_f",
        text: "My Tomm chased some fool's treasure-tale into the sealed cavern east of town, and now the door won't even open. I pace this floor and pray. If ever that seal breaks... I'll have a desperate favor to ask of someone brave.",
        end: true,
      },
      active_check: {
        branch: [
          { requires: "flag:found_tomm", to: "reunion" },
          { to: "remind" },
        ],
      },
      offer: {
        speaker: "Hessa",
        portrait: "villager_f",
        text: "Have you seen my Tomm? He chased some fool's treasure-tale into the sealed cavern east of town - days ago. The monsters down there... please, will you find him?",
        choices: [
          { text: "I'll bring him home.", to: "accept" },
          { text: "I can't, sorry.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Hessa",
        portrait: "villager_f",
        text: "Oh, thank you. The cavern's east of town, past the rocks. He's stubborn but he isn't strong - hurry, I beg you.",
        do: ["quest:start:sq_rescue"],
        end: true,
      },
      remind: {
        speaker: "Hessa",
        portrait: "villager_f",
        text: "He's somewhere in the eastern cavern. Please - bring my Tomm back to me.",
        end: true,
      },
      reunion: {
        speaker: "Hessa",
        portrait: "villager_f",
        text: "He's home! Limping and sheepish, but ALIVE - he says you drew the monsters off so he could escape. Here's our whole travel-purse, and the healing draughts we'd saved for the road. It's all yours. Bless you, bless you.",
        do: [
          "quest:obj:sq_rescue:o2",
          "quest:done:sq_rescue",
          "gold:+120",
          "give:hi_potion:2",
          "xp:+50",
          "flag:rescue_done",
        ],
        end: true,
      },
      done: {
        speaker: "Hessa",
        portrait: "villager_f",
        text: "Tomm's mending by the fire, swearing off treasure-tales forever. We owe you our little world.",
        end: true,
      },
      bye: {
        speaker: "Hessa",
        portrait: "villager_f",
        text: "Then I'll keep watching the road. Someone has to.",
        end: true,
      },
    },
  },

  // ----- Tomm, lost in the Sealed Cavern (target of sq_rescue) -----
  tomm_lost: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "quest:sq_rescue=active", to: "found" },
          { to: "stranger" },
        ],
      },
      stranger: {
        speaker: "Trembling Man",
        portrait: "villager_m",
        text: "S-stay back! ...Oh. You're no beast. I'm lost, and my torch is nearly out. Don't mind me - I'll find my own way. Probably.",
        end: true,
      },
      found: {
        speaker: "Tomm",
        portrait: "villager_m",
        text: "Hessa SENT you? Oh, thank the light. I'm Tomm - twisted my ankle, and the monsters boxed me in. If you can draw their eyes, I'll make a run for the surface. Tell my Hessa I'm coming home!",
        do: ["quest:obj:sq_rescue:o1", "flag:found_tomm"],
        end: true,
      },
    },
  },

  // ===== GATE: forest -> forest_deep — the Thornjaw boss gate ==============
  // Opened by overworld.js when requires:"flag:beat_thornjaw" fails on the
  // forest->forest_deep transition. Runs the fight; victory sets the flag so the
  // way south stays open. (Player steps off and back onto the tile to cross.)
  gate_thornjaw: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:beat_thornjaw", to: "clear" },
          { to: "warn" },
        ],
      },
      warn: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The trail narrows between black trunks - and the shadow itself unfolds. A bark-scaled brute, all horns and splintered teeth, drags across the only way south. Thornjaw has claimed this gate, and it does not share.",
        to: "charge",
      },
      charge: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "Thornjaw rears, splinters raining from its hide, and CHARGES!",
        do: ["battle:thornjaw"],
        to: "victory",
      },
      victory: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "Thornjaw crashes down and goes still, and the black trees seem to lean back from you. The way south into the Blackwood lies open at last.",
        do: ["flag:beat_thornjaw"],
        end: true,
      },
      clear: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "Thornjaw's fallen bulk lies where it dropped. The way south is open.",
        end: true,
      },
    },
  },

  // ===== GATE: town -> dungeon — the sealed cave mouth =====================
  // Only opens when requires:"flag:dungeon_open" passes (granted by the Elder).
  // So this message only ever shows while the cave is still sealed.
  gate_cave: {
    start: "s",
    nodes: {
      s: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "A sun-sigil is graven deep across the cave mouth, and it will not let you pass. The Elder spoke of a key that wakes the sigil - until it is in hand, the dark below stays sealed.",
        end: true,
      },
    },
  },

  // ===== SIDE QUEST (satire): Curator Fenwick & the grand-useless relic ====
  // The ONLY quest that ceremoniously "gives you a super important item" — the
  // grand_relic, which is type:"key" and does absolutely nothing. The reliquary
  // is found in the hidden Sunken Alcove (Blackwood, post-Thornjaw). Guarded so
  // arriving with the reliquary before talking starts + completes cleanly.
  heirloom_quest: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:heirloom_done", to: "done" },
          { requires: "item:reliquary", to: "present" },
          { requires: "quest:sq_heirloom=active", to: "remind" },
          // The reliquary sleeps in a Blackwood alcove past Thornjaw, so Fenwick
          // only unveils his grand commission once the way south is forced open.
          { requires: "!flag:beat_thornjaw", to: "idle" },
          { to: "offer" },
        ],
      },
      idle: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "Ah - a moment! No, no, never mind, it isn't ready. I am on the very brink of a discovery that will shake the Historical Society to its foundations, but the resting place lies deep past the Blackwood, quite beyond reach while that thorned beast holds the trail. Come back when the south wood is safe. History will keep. Barely.",
        end: true,
      },
      offer: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "You! Yes, you with the capable look. I am Fenwick, keeper of Sunhollow's history - and I have located, at last, the resting place of DAWNBREAKER, the Blade of the First Hero. A relic beyond all price! Will you recover it for the people?",
        choices: [
          { text: "A legendary blade? I'm in.", to: "accept" },
          { text: "Sounds like a fairy tale.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "Splendid! The old texts are clear: it sleeps in a hidden alcove in the Blackwood. Press your hand to the standing stones among the cluster and the way will open. Bring me the sealed reliquary within - and tell NO ONE.",
        do: ["quest:start:sq_heirloom", "quest:obj:sq_heirloom:o1"],
        end: true,
      },
      remind: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "The reliquary lies in a hidden alcove deep in the Blackwood - behind the standing stones, past where Thornjaw fell. History is counting on you!",
        end: true,
      },
      present: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "You FOUND it! The sealed reliquary of the First Hero, intact! Let me just- *crrrack*- there. Behold...",
        do: [
          "quest:start:sq_heirloom",
          "take:reliquary:1",
          "quest:obj:sq_heirloom:o1",
          "quest:obj:sq_heirloom:o2",
        ],
        to: "present2",
      },
      present2: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "DAWNBREAKER! The Blade that split the first night! Forged in the heart of the waking sun, borne by the Hero who hung the very dawn in the sky! Words fail me. Hold out your hands, champion...",
        to: "present3",
      },
      present3: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "By the authority of the Sunhollow Historical Society, I bestow upon YOU the legendary Dawnbreaker! May it blaze in song for a thousand years! Guard it with your very life!",
        do: ["give:grand_relic:1", "quest:done:sq_heirloom", "xp:+40", "flag:heirloom_done"],
        to: "present4",
      },
      present4: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "...What? Does it DO anything? My friend - it is a SYMBOL. A priceless, irreplaceable, eternally important symbol. You can't swing it, or sell it, or so much as light a candle with it. That would be vulgar. Simply treasure it!",
        end: true,
      },
      done: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "Ah, the bearer of Dawnbreaker! Carry it proudly. (Do mind you never try to actually use it. It's far too important for anything so crude as that.)",
        end: true,
      },
      bye: {
        speaker: "Curator Fenwick",
        portrait: "villager_m",
        text: "A philistine. No matter - the legend endures without you.",
        end: true,
      },
    },
  },

  // ===== SIDE QUEST (fast): Goodwife Petra & the snagged shawl =============
  // A quick town<->Greenwood errand for tiny gold. Guarded so picking up the
  // shawl before accepting still resolves correctly.
  petra_shawl: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:shawl_done", to: "done" },
          { requires: "item:shawl", to: "return" },
          { requires: "quest:sq_shawl=active", to: "remind" },
          { to: "offer" },
        ],
      },
      offer: {
        speaker: "Goodwife Petra",
        portrait: "villager_f",
        text: "Oh, bother. I snagged my good wool shawl on a branch just inside the Greenwood, by the north trail, and my knees aren't what they were. Would you fetch it before the dew ruins it, dear?",
        choices: [
          { text: "Sure, I'll grab it.", to: "accept" },
          { text: "Maybe later.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Goodwife Petra",
        portrait: "villager_f",
        text: "Bless you. It's caught on the brush just past the south gate, near the top of the wood - you'll be back before my kettle boils.",
        do: ["quest:start:sq_shawl", "quest:obj:sq_shawl:o1"],
        end: true,
      },
      remind: {
        speaker: "Goodwife Petra",
        portrait: "villager_f",
        text: "Just inside the Greenwood, near the north trail, dear. Quick as you like!",
        end: true,
      },
      return: {
        speaker: "Goodwife Petra",
        portrait: "villager_f",
        text: "There it is - not a snag in it! You're a treasure. Here, a few coins and a potion from the larder for your trouble. Now I'll take my tea in comfort.",
        do: [
          "quest:start:sq_shawl",
          "take:shawl:1",
          "quest:obj:sq_shawl:o1",
          "quest:obj:sq_shawl:o2",
          "quest:done:sq_shawl",
          "gold:+20",
          "give:potion:1",
          "xp:+20",
          "flag:shawl_done",
        ],
        end: true,
      },
      done: {
        speaker: "Goodwife Petra",
        portrait: "villager_f",
        text: "Warm as toast again, thanks to you. Mind the dew out there!",
        end: true,
      },
      bye: {
        speaker: "Goodwife Petra",
        portrait: "villager_f",
        text: "No rush, no rush. It's only my very favorite shawl.",
        end: true,
      },
    },
  },

  // ##########################################################################
  // ## ACT II DIALOGUES                                                     ##
  // ##########################################################################

  // ===== GATE: Sunhollow east road -> Saltmere ==============================
  // Only shows BEFORE flag:act2_unlocked (after that the transition just fires).
  gate_act2: {
    start: "s",
    nodes: {
      s: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The old east road runs down to the coast and the harbor town of Saltmere - but all is quiet that way, and nothing yet calls you from the sea.",
        end: true,
      },
    },
  },

  // ===== ACT II HOOK: the envoy in Sunhollow (post-dawn) ====================
  envoy_threat: {
    start: "s",
    nodes: {
      s: {
        speaker: "Envoy Saltveigr",
        portrait: "villager_m",
        text: "Dawnbringer! I rode three days from the coast. Since your sun returned, the sea off Saltmere has gone wrong - it freezes, it rots, it burns. The mountains spit ash and the old ruins walk. Saltmere begs your aid. Take the east road, I beg you.",
        end: true,
      },
    },
  },

  // ===== SALTMERE hub flavor ================================================
  saltmere_sign: {
    start: "s",
    nodes: {
      s: {
        speaker: "Sign",
        portrait: "narrator",
        text: "SALTMERE - last harbor before the high country. North: Karsthal Pass. East road: home to Sunhollow. Mind the tide; mind the cold.",
        end: true,
      },
    },
  },
  saltmere_harbor: {
    start: "s",
    nodes: {
      s: {
        speaker: "Harbor Master Sten",
        portrait: "shopkeeper",
        text: "You're the one from Sunhollow? Thank the dawn. Half my boats are frozen into the bay and the other half won't sail past the drowned ruins. It all started up in Karsthal - the pass froze solid overnight. Whatever's loose up there, it's spreading.",
        to: "s2",
      },
      s2: {
        speaker: "Harbor Master Sten",
        portrait: "shopkeeper",
        text: "Rest at the Saltrest Inn if you need it - Yarrow keeps a warm hearth, and Bex will sell you what you can carry. Then climb the north pass. And... be careful. Folk who go up don't come back.",
        end: true,
      },
    },
  },
  saltmere_ranger: {
    start: "s",
    nodes: {
      s: {
        speaker: "Ranger Coll",
        portrait: "guard",
        text: "I scouted the pass to Karsthal. Got as far as the high switchbacks before something vast and white turned the air to knives. Frost wolves hunt the slopes now, and worse coils above. Talk to Yuki up there - she knows the trail better than anyone living.",
        end: true,
      },
    },
  },
  saltmere_villager: {
    start: "s",
    nodes: {
      s: {
        speaker: "Salla",
        portrait: "child",
        text: "Mama says the sea is sick. I saw a lady made of seafoam SINGING out past the rocks last night. She had too many teeth. I'm not going back down to the beach. You shouldn't either.",
        end: true,
      },
    },
  },
  saltmere_inn_keep: {
    start: "root",
    nodes: {
      root: {
        speaker: "Innkeeper Yarrow",
        portrait: "villager_f",
        text: "Welcome to the Saltrest. You look half-frozen and twice as tired. A warm bed will set you right - and it's on the house, for the one who brought the dawn back. Rest a while?",
        choices: [
          { text: "Rest (full heal & save).", to: "rest" },
          { text: "Maybe later.", to: "bye" },
        ],
      },
      rest: {
        speaker: "Innkeeper Yarrow",
        portrait: "villager_f",
        text: "Sleep deep. The hearth will keep the cold out.",
        do: ["heal", "save"],
        to: "rested",
      },
      rested: {
        speaker: "Innkeeper Yarrow",
        portrait: "villager_f",
        text: "There - good as new, and your road's set down in the book. Come back any time you need a bed.",
        end: true,
      },
      bye: {
        speaker: "Innkeeper Yarrow",
        portrait: "villager_f",
        text: "The hearth's always lit. Mind the cold out there.",
        end: true,
      },
    },
  },
  saltmere_trader: {
    start: "s",
    nodes: {
      s: {
        speaker: "Trader Bex",
        portrait: "shopkeeper",
        text: "Coast prices, mountain stock. If you're climbing past Karsthal you'll want potions and a cure or three - the things up there don't fight clean.",
        end: true,
      },
    },
  },

  // ===== KARSTHAL PASS ======================================================
  karsthal_sign: {
    start: "s",
    nodes: {
      s: {
        speaker: "Sign",
        portrait: "narrator",
        text: "KARSTHAL PASS. Rope-lines down. Do not cross in a whiteout. The summit gate leads to the Sunken Mire - if anything still holds the summit.",
        end: true,
      },
    },
  },
  karsthal_warn: {
    start: "s",
    nodes: {
      s: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "Claw-furrows the width of a wagon score the ice ahead, and the rock is glazed in blue frost. Something enormous and cold lairs across the summit gate. The air here hurts to breathe.",
        end: true,
      },
    },
  },
  yuki_climb: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:frostward_done", to: "done" },
          { requires: "flag:beat_rimewyrm", to: "checkpost" },
          { requires: "quest:sq_frostward=active", to: "remind" },
          { to: "offer" },
        ],
      },
      offer: {
        speaker: "Guide Yuki",
        portrait: "villager_f",
        text: "You came UP here? Then you saw the furrows. A wyrm of living ice - Rimewyrm - took the summit gate and froze the whole pass with its breath. My climbers are scattered and the road's sealed. Put that thing down and you'll open the way north. Will you?",
        choices: [
          { text: "I'll break the Rimewyrm.", to: "accept" },
          { text: "Not yet.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Guide Yuki",
        portrait: "villager_f",
        text: "Dawnbringer's nerve, all right. The gate's at the very top of the pass - it won't let you by until the wyrm is dead. Bring fire if you have it. Go careful.",
        do: ["quest:start:sq_frostward", "quest:obj:sq_frostward:o1"],
        end: true,
      },
      remind: {
        speaker: "Guide Yuki",
        portrait: "villager_f",
        text: "The Rimewyrm's still up at the summit gate, still breathing winter. The way north stays shut until it falls.",
        end: true,
      },
      checkpost: {
        branch: [
          { requires: "quest:sq_frostward=active", to: "reward" },
          { to: "cleared" },
        ],
      },
      reward: {
        speaker: "Guide Yuki",
        portrait: "villager_f",
        text: "The pass... it's THAWING. You did it - you broke the Rimewyrm! My climbers can come home. Take this, with the whole pass's thanks. The summit gate's open; the Mire lies beyond it.",
        do: [
          "quest:obj:sq_frostward:o2",
          "quest:done:sq_frostward",
          "gold:+150",
          "give:hi_potion:2",
          "flag:frostward_done",
        ],
        end: true,
      },
      cleared: {
        speaker: "Guide Yuki",
        portrait: "villager_f",
        text: "The wyrm's dead and the pass is thawing - I felt it. You've my thanks, even if you never took the job. The road north is open.",
        end: true,
      },
      done: {
        speaker: "Guide Yuki",
        portrait: "villager_f",
        text: "Clear skies over Karsthal again, thanks to you. The climbers light a candle for you each night.",
        end: true,
      },
      bye: {
        speaker: "Guide Yuki",
        portrait: "villager_f",
        text: "Don't wait too long. The cold's only getting deeper.",
        end: true,
      },
    },
  },
  // BOSS GATE: Rimewyrm (Karsthal -> Sunken Mire). Mirrors gate_thornjaw.
  gate_rimewyrm: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:beat_rimewyrm", to: "clear" },
          { to: "warn" },
        ],
      },
      warn: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The summit gate is a throat of blue ice - and it MOVES. A serpent vast as a glacier lifts its head, frost streaming from jaws that could swallow a cart. Rimewyrm has waited all winter for something warm to break.",
        to: "charge",
      },
      charge: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "It inhales - the whole pass goes white - and the killing frost comes down!",
        do: ["battle:rimewyrm"],
        to: "victory",
      },
      victory: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The Rimewyrm shatters into a thousand melting shards, and warm wind pours through the gate for the first time in a season. The way down into the Sunken Mire lies open.",
        do: ["flag:beat_rimewyrm"],
        end: true,
      },
      clear: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "Meltwater runs where the Rimewyrm died. The summit gate stands open to the Mire below.",
        end: true,
      },
    },
  },

  // ===== SUNKEN MIRE ========================================================
  mire_sign: {
    start: "s",
    nodes: {
      s: {
        speaker: "Sign",
        portrait: "narrator",
        text: "SUNKEN MIRE. Stay on the mud causeway. The black water is deeper than it looks, and it bites. North causeway: the Drowned Ruins.",
        end: true,
      },
    },
  },
  mire_warn: {
    start: "s",
    nodes: {
      s: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The reeds ahead are slick with green rot and the air is thick enough to chew. Something immense wallows across the north causeway, and the whole bog seems to breathe poison in time with it.",
        end: true,
      },
    },
  },
  hesper_miasma: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:miasma_done", to: "done" },
          { requires: "flag:beat_mirelord", to: "checkpost" },
          { requires: "quest:sq_miasma=active", to: "remind" },
          { to: "offer" },
        ],
      },
      offer: {
        speaker: "Bogwise Hesper",
        portrait: "elder",
        text: "Hsst - a living thing, and warm! Listen, dawnbringer. The mire was never kind, but it was never POISON until the Mirelord rose and squatted on the north causeway. Now every breath here festers. Cut the head off the rot and the mire heals. The bog-folk will owe you their lives.",
        choices: [
          { text: "I'll end the Mirelord.", to: "accept" },
          { text: "Find someone else.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Bogwise Hesper",
        portrait: "elder",
        text: "Brave or foolish, same road. It guards the only firm ground north - you cannot pass it without a fight. Keep antidotes close; its breath is all venom. Go, and come back breathing.",
        do: ["quest:start:sq_miasma", "quest:obj:sq_miasma:o1"],
        end: true,
      },
      remind: {
        speaker: "Bogwise Hesper",
        portrait: "elder",
        text: "The Mirelord still chokes the north causeway with its miasma. The mire won't heal till it's dead.",
        end: true,
      },
      checkpost: {
        branch: [
          { requires: "quest:sq_miasma=active", to: "reward" },
          { to: "cleared" },
        ],
      },
      reward: {
        speaker: "Bogwise Hesper",
        portrait: "elder",
        text: "The air... it's CLEAN. I can smell green things again instead of rot. You broke the Mirelord! Here - my cures, my coin, all I have. The bog-folk will sing your name in the reeds for a generation.",
        do: [
          "quest:obj:sq_miasma:o2",
          "quest:done:sq_miasma",
          "gold:+180",
          "give:antidote:3",
          "give:ether:1",
          "flag:miasma_done",
        ],
        end: true,
      },
      cleared: {
        speaker: "Bogwise Hesper",
        portrait: "elder",
        text: "The miasma's lifted - the Mirelord's dead, I can breathe it. My thanks, dawnbringer, job or no job. The causeway north is yours.",
        end: true,
      },
      done: {
        speaker: "Bogwise Hesper",
        portrait: "elder",
        text: "Green shoots in the black mud again. You gave us that. Mind the ruins north - the dead there don't lie quiet.",
        end: true,
      },
      bye: {
        speaker: "Bogwise Hesper",
        portrait: "elder",
        text: "Then hold your breath, friend. The rot won't wait.",
        end: true,
      },
    },
  },
  // BOSS GATE: Mirelord (Sunken Mire -> Drowned Ruins).
  gate_mirelord: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:beat_mirelord", to: "clear" },
          { to: "warn" },
        ],
      },
      warn: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The causeway ends at a heaving mound of bog-flesh and reed - and it unfolds upward, head after dripping head, into the Mirelord. A wave of green miasma rolls off it, and the world tastes of poison.",
        to: "charge",
      },
      charge: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The Mirelord bellows, and the whole bog vomits venom toward you!",
        do: ["battle:mirelord"],
        to: "victory",
      },
      victory: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The Mirelord collapses into stinking sludge and sinks, and a clean wind finally crosses the mire. The firm causeway to the Drowned Ruins lies open.",
        do: ["flag:beat_mirelord"],
        end: true,
      },
      clear: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "Only a slick of rot marks where the Mirelord fell. The north causeway is clear.",
        end: true,
      },
    },
  },

  // ===== DROWNED RUINS ======================================================
  ruins_sign: {
    start: "s",
    nodes: {
      s: {
        speaker: "Sign",
        portrait: "narrator",
        text: "Half-sunk stone, older than Sunhollow. Salvagers' warning scratched below: 'THE COLOSSUS HOLDS THE KEY. NO STAIR WITHOUT IT. TURN BACK.'",
        end: true,
      },
    },
  },
  doryn_tide: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:tidecaller_done", to: "done" },
          { requires: "flag:beat_tidewrought", to: "checkpost" },
          { requires: "quest:sq_tidecaller=active", to: "remind" },
          { to: "offer" },
        ],
      },
      offer: {
        speaker: "Castaway Doryn",
        portrait: "villager_m",
        text: "Another living soul - I'd given up hope. My crew came to salvage these ruins; the Tidewrought took them all. It's a colossus of coral and drowned bronze, and the old Tide Key is fused right in its chest. There's no stair out of here, no road on to the caldera, without that key. Help me, and the reward is yours.",
        choices: [
          { text: "I'll take the Tidewrought's key.", to: "accept" },
          { text: "That thing killed your crew. No.", to: "bye" },
        ],
      },
      accept: {
        speaker: "Castaway Doryn",
        portrait: "villager_m",
        text: "Then dawn keep you. It haunts the central hall - you can't reach the upper ruins without passing it, and it won't let you pass alive. Tear the Tide Key from its heart and bring it back to me. I'll make it worth your while - on my crew's memory.",
        do: ["quest:start:sq_tidecaller", "quest:obj:sq_tidecaller:o1"],
        end: true,
      },
      remind: {
        speaker: "Castaway Doryn",
        portrait: "villager_m",
        text: "The Tidewrought's still down in the central hall, the Tide Key still locked in its chest. No way up or on without it.",
        end: true,
      },
      checkpost: {
        branch: [
          { requires: "quest:sq_tidecaller=active", to: "reward" },
          { to: "cleared" },
        ],
      },
      reward: {
        speaker: "Castaway Doryn",
        portrait: "villager_m",
        text: "You DID it - the Tidewrought's down and the Tide Key's in your hand. My crew can rest now. Take this: coin, my last elixir, and a charm I pulled from the deep wreck - press it, it'll change you. You earned every scrap of it, hero.",
        do: [
          "quest:obj:sq_tidecaller:o2",
          "quest:obj:sq_tidecaller:o3",
          "quest:done:sq_tidecaller",
          "gold:+250",
          "give:elixir:1",
          "powerup",
          "flag:tidecaller_done",
        ],
        end: true,
      },
      cleared: {
        speaker: "Castaway Doryn",
        portrait: "villager_m",
        text: "The Tidewrought's dead and you've the key - I saw it. Thank you, even though you never shook on it. Go on up; the caldera waits.",
        end: true,
      },
      done: {
        speaker: "Castaway Doryn",
        portrait: "villager_m",
        text: "I'm building a raft from the wreck. When the sea calms I'll sail home and tell them what you did here. Safe roads, hero.",
        end: true,
      },
      bye: {
        speaker: "Castaway Doryn",
        portrait: "villager_m",
        text: "I understand. But there's no way on without that key. When you change your mind, I'll be here.",
        end: true,
      },
    },
  },
  // GUARDIAN EVENT: the Tidewrought fight that yields the Tide Key. Triggered
  // by stepping into the central hall while !flag:beat_tidewrought (so a defeat
  // can be retried without softlocking the only source of the key).
  tidewrought_guard: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:beat_tidewrought", to: "done" },
          { to: "wake" },
        ],
      },
      wake: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The flooded hall shudders. Coral and barnacled bronze drag themselves together into a towering shape - and deep in its chest, behind a cage of ribs, a key of green metal glows. The Tidewrought has woken, and it bars the only stair.",
        to: "fight",
      },
      fight: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The sea rears up behind it like a wall, and the colossus brings its fists down!",
        do: ["battle:tidewrought"],
        to: "victory",
      },
      victory: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The Tidewrought grinds to a halt and crumbles back into reef and rust. From the wreck of its chest you lift the TIDE KEY - warm, humming, and yours. The way up, and on to the caldera, is open.",
        do: ["flag:beat_tidewrought", "give:tide_key:1"],
        end: true,
      },
      done: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The ruin of the Tidewrought lies scattered across the hall. The stair beyond stands clear.",
        end: true,
      },
    },
  },
  // ITEM GATE: Drowned Ruins -> Emberforge. Shows only while you lack tide_key.
  gate_emberforge: {
    start: "s",
    nodes: {
      s: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "A wall of cooled black magma seals the cleft to the caldera, hot to the touch and humming faintly. A keyhole of green bronze waits at its center. Only the Tide Key will quench this door - and it lies in the Tidewrought's chest.",
        end: true,
      },
    },
  },

  // ===== EMBERFORGE =========================================================
  ember_sign: {
    start: "s",
    nodes: {
      s: {
        speaker: "Sign",
        portrait: "narrator",
        text: "EMBERFORGE CALDERA. Ash underfoot, fire below. The Heart lies north. Whatever sleeps there has been waking since the sun returned. Tread the cold stone, not the seams.",
        end: true,
      },
    },
  },
  ember_warn: {
    start: "s",
    nodes: {
      s: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The ground ahead glows along its seams and the heat presses like a hand. To the north the caldera narrows into the Heart, where a furnace-light pulses in time with something vast and patient. The end of the road waits there.",
        end: true,
      },
    },
  },
  ember_pilgrim: {
    start: "s",
    nodes: {
      s: {
        speaker: "Ashfallen Pilgrim",
        portrait: "ghost",
        text: "You feel it too, don't you... the heartbeat under the stone. It woke when your sun came back - light calls to fire, the old texts say. I came to look upon it before the end. You came to fight it. Only one of us is a fool, and I no longer know which.",
        to: "s2",
      },
      s2: {
        speaker: "Ashfallen Pilgrim",
        portrait: "ghost",
        text: "Magmaroth, the Cinder Tyrant. Older than the Sunstone, hungrier than the dark you already beat. If you mean to face it... bring the cold of the mountains in your heart. And bring everything else besides.",
        end: true,
      },
    },
  },
  // FINALE: Magmaroth. Event-gated on !flag:act2_complete (retry on loss). On
  // victory the player chooses the ending: tide_dawn (restore) or tide_fall.
  emberforge_finale: {
    start: "root",
    nodes: {
      root: {
        branch: [
          { requires: "flag:act2_complete", to: "after" },
          { to: "intro" },
        ],
      },
      intro: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The Heart of the caldera is a cathedral of cooling crust over a lake of fire. As you step onto the central stone, the whole floor heaves - and the crust splits, and the Cinder Tyrant unfolds from the magma, vast and burning and awake.",
        to: "taunt",
      },
      taunt: {
        speaker: "Magmaroth",
        portrait: "narrator",
        text: "SO. The little dawn that relit the world walks into my fire on its own legs. You hung a sun in the sky, child. I will melt it, and you, and the salt sea besides, and the world will be one great forge with ME as its heart.",
        choices: [
          { text: "Not while I draw breath. Burn out.", to: "fight" },
          { text: "(Raise everything you have) Then we end it here.", to: "fight" },
        ],
      },
      fight: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The Cinder Tyrant rears, the caldera erupts around it, and the final battle begins!",
        do: ["battle:magmaroth"],
        to: "won",
      },
      won: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "Magmaroth buckles. Its crust cracks, its furnace-heart guttering, and it sinks back toward the magma that birthed it. As it falls, the lake of fire stills - and for one held breath, the whole caldera is yours to decide.",
        to: "choose",
      },
      choose: {
        speaker: "You",
        portrait: "hero",
        text: "The Heart lies open before you. Quench it, and the tide and the cold will settle and the coast will heal. Or seize the dying forge's fire, and take its power for your own.",
        choices: [
          { text: "Quench the Heart. Let the coast heal.", to: "dawn" },
          { text: "Seize the forge's fire for myself.", to: "fall" },
        ],
      },
      dawn: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "You drive the Tide Key into the Heart and the sea pours in. The forge dies in a great white plume of steam, and far below the coast goes quiet and cool and whole again.",
        do: ["flag:act2_complete", "ending:tide_dawn"],
        end: true,
      },
      fall: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "You reach into the dying Heart and take its fire for your own. Power floods you, terrible and bright - but the coast does not heal. Salt and ash settle over Saltmere, and the people learn a new name to fear: yours.",
        do: ["flag:act2_complete", "ending:tide_fall"],
        end: true,
      },
      after: {
        speaker: "Narrator",
        portrait: "narrator",
        text: "The Heart of the caldera lies still and cold. Whatever was decided here is decided. Only ash remains.",
        end: true,
      },
    },
  },
};

// ------------------------------------------------------------------- QUESTS --
const quests = {
  sunstone: {
    id: "sunstone",
    name: "The Dimmed Sunstone",
    desc: "Monsters spread as the Sunstone darkens. Find the Warden, decide the stone's fate, and confront the shadow.",
    objectives: [
      { id: "o1", text: "Find the Warden at the forest shrine" },
      { id: "o2", text: "Decide the fate of the Sunstone" },
      { id: "o3", text: "Confront the darkness in the Sanctum" },
    ],
  },
  sq_locket: {
    id: "sq_locket",
    name: "Mira's Locket",
    desc: "A child lost her mother's locket somewhere in the woods.",
    objectives: [
      { id: "o1", text: "Find the locket deep in the Blackwood" },
      { id: "o2", text: "Return it to Mira" },
    ],
  },
  sq_medicine: {
    id: "sq_medicine",
    name: "Sunmoss for the Sick",
    desc: "Farmer Oden's daughter is ill. Healing sunmoss is cached deep in the Blackwood.",
    objectives: [
      { id: "o1", text: "Recover the sunmoss medicine" },
      { id: "o2", text: "Bring it to Farmer Oden" },
    ],
  },
  sq_bounty: {
    id: "sq_bounty",
    name: "The Scarred Wolf",
    desc: "Hunter Bram will pay to be rid of a great scarred wolf that has been savaging the Greenwood trail.",
    objectives: [
      { id: "o1", text: "Hunt down the great scarred wolf" },
      { id: "o2", text: "Claim the bounty from Hunter Bram" },
    ],
  },
  sq_poacher: {
    id: "sq_poacher",
    name: "The Poacher's Snare",
    desc: "Poacher Garron has trapped a rare sunhart in the Blackwood. Help him sell it - or set it free.",
    objectives: [
      { id: "o1", text: "Decide the fate of the snared sunhart" },
    ],
  },
  sq_verse: {
    id: "sq_verse",
    name: "The Sunken Verse",
    desc: "Scholar Wrenna's lost funerary verse is carved across two graves - one in the Blackwood, its twin deep in the sealed cavern.",
    objectives: [
      { id: "o1", text: "Read the verse on the grave in the Blackwood" },
      { id: "o2", text: "Find the twin grave in the Sealed Cavern" },
      { id: "o3", text: "Recite the whole verse to Wrenna" },
    ],
  },
  sq_relics: {
    id: "sq_relics",
    name: "Emberlight",
    desc: "Tinker Pell needs three ember crystals, stashed in chests across the green wood, the Blackwood, and the sealed cavern.",
    objectives: [
      { id: "o1", text: "Gather 3 ember crystals from old chests" },
      { id: "o2", text: "Bring the crystals to Tinker Pell" },
    ],
  },
  sq_rescue: {
    id: "sq_rescue",
    name: "Into the Dark",
    desc: "Hessa's husband Tomm is lost somewhere in the sealed cavern east of town. Find him and bring him home.",
    objectives: [
      { id: "o1", text: "Find Tomm in the Sealed Cavern" },
      { id: "o2", text: "Return to Hessa at the inn" },
    ],
  },
  sq_shawl: {
    id: "sq_shawl",
    name: "Petra's Shawl",
    desc: "Goodwife Petra snagged her wool shawl just inside the Greenwood. A quick errand near town.",
    objectives: [
      { id: "o1", text: "Fetch the shawl from the Greenwood" },
      { id: "o2", text: "Return it to Goodwife Petra" },
    ],
  },
  sq_heirloom: {
    id: "sq_heirloom",
    name: "The Hero's Heirloom",
    desc: "Curator Fenwick believes the legendary Dawnbreaker lies in a hidden alcove in the Blackwood. Recover the sealed reliquary for him.",
    objectives: [
      { id: "o1", text: "Recover the sealed reliquary from the Blackwood alcove" },
      { id: "o2", text: "Bring the reliquary to Curator Fenwick" },
    ],
  },

  // ----- ACT II quests (one per region) -----
  sq_frostward: {
    id: "sq_frostward",
    name: "The Pass Must Open",
    desc: "Guide Yuki's climbers are trapped beyond Karsthal Pass, which the Rimewyrm has frozen solid. Slay the wyrm at the summit gate.",
    objectives: [
      { id: "o1", text: "Defeat the Rimewyrm at the Karsthal summit gate" },
      { id: "o2", text: "Return to Guide Yuki" },
    ],
  },
  sq_miasma: {
    id: "sq_miasma",
    name: "The Choking Mire",
    desc: "Bogwise Hesper says the Mirelord's poison is killing the Sunken Mire. End the rot at its source on the north causeway.",
    objectives: [
      { id: "o1", text: "Defeat the Mirelord poisoning the Sunken Mire" },
      { id: "o2", text: "Return to Bogwise Hesper" },
    ],
  },
  sq_tidecaller: {
    id: "sq_tidecaller",
    name: "The Drowned Colossus",
    desc: "Castaway Doryn's crew were lost to the Tidewrought, which holds the Tide Key fused in its chest. Topple the colossus, take the key, and return.",
    objectives: [
      { id: "o1", text: "Defeat the Tidewrought in the central hall" },
      { id: "o2", text: "Recover the Tide Key" },
      { id: "o3", text: "Return to Castaway Doryn" },
    ],
  },
};

// -------------------------------------------------------------------- SHOPS --
const shops = {
  general: {
    name: "Brann's Goods",
    items: ["potion", "hi_potion", "ether", "antidote", "phoenix_down"],
  },
  arcane: {
    name: "Vyle's Arcana",
    items: ["ether", "elixir", "antidote", "phoenix_down"],
  },
  // ----- ACT II: Trader Bex at the Saltrest Inn (Saltmere hub) -----
  saltmere_shop: {
    name: "Bex's Coastal Stock",
    items: ["potion", "hi_potion", "ether", "antidote", "phoenix_down", "elixir"],
  },
};

// ------------------------------------------------------------------ EXPORT ---
export const content = {
  tileDefs,
  maps,
  enemies,
  skills,
  items,
  powerups,
  dialogues,
  quests,
  shops,
};
