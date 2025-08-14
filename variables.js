export const debugOn = false;
export const tacticianSpeed = 10;
export const fee = {
  buyExp: 4,
  reroll: 2,
};

export const bgUrl = "/bg.jpg";
// export const arenaUrl = "/models/arenas/tft_arena_default.glb";
export const debugObjs = [];
export const LOW_GRAPHICS_MODE = true;
export const debugFolders = [];
export const MODEL_CACHES = [];
export const ARGUMENTS_CACHES = [];
export const TRAITS_INFOR = [];
export const EXCLUDE_TRAITS = [];
export const CHAMPS_INFOR = [];
export const EXCLUDE_CHAMPS = [];
export const ITEMS_INFOR = [];
export const ITEMS_EMBLEM = [];
export const ITEMS_COMPONENT = [];
export const ITEMS_RADIANT = [];
export const ITEMS_ARTIFACT = [];
export const ITEMS_GOLD_COLLECTOR_ARTIFACT = [];
export const ITEMS_EQUIPMENT = [];
export const ITEMS_SUPPORT = [];
export const EXCLUDE_ITEMS = [];
export const ARGUMENTS_INFOR = [];
export const disabledOrbitControlsIds = [
  "shop",
  "animations",
  "left-bar",
  "champ-inspect",
  "config",
  "primary-modal",
  "enemy-define",
  "items-list",
  "toast",
];
export const EXP_TABLE = {
  1: 0, // turn 1, cannot up level
  2: 2, // turn 2
  3: 2,
  4: 6,
  5: 10,
  6: 20,
  7: 32,
  8: 50,
  9: 66,
  10: 80,
};
export const ARENA_DATAS = [
  {
    name: "default",
    url: "/models/arenas/tft_arena_default.glb",
    arena: [
      [0, -0.5, 1],
      [0, 0, 0],
      [0.145, 0.15, 0.15],
    ],
    battlefield: {
      radius: 1.75,
      startX: -12,
      startZ: 0.85,
    },
    enemyBattlefield: { radius: 1.75, startX: -12, startZ: -11.5 },
    bench: [
      [-13.3, 0, 13.8],
      [0, 0, 0],
      [1.5, 1.5, 1.5],
    ],
    enemyBench: [
      [-11.3, 0, -16.5],
      [0, 0, 0],
      [1.5, 1.5, 1.5],
    ],
    benchGap: 0.8,
    tactacianFirstPos: [-14.5, 0, 9.5],
    arguments: ["fire"],
  },
  {
    name: "galaxies",
    url: "/models/arenas/tft_arena_galaxies.glb",
    arena: [
      [0, -0.5, 0],
      [0, 0, 0],
      [9, 7.5, 9],
    ],
    battlefield: {
      radius: 1.6,
      startX: -9.5,
      startZ: 2,
    },
    enemyBattlefield: { radius: 1.75, startX: -12, startZ: -11.5 },
    bench: [
      [-13, 0, 13.8],
      [0, 0, 0],
      [1.5, 1.5, 1.5],
    ],
    enemyBench: [
      [-11.3, 0, -16.5],
      [0, 0, 0],
      [1.5, 1.5, 1.5],
    ],
    benchGap: 0.95,
    tactacianFirstPos: [-16.8, 0, 12.4],
    arguments: [],
  },
];
// color:
export const COLOR_SELECTABLE = 0xf2e77c;
export const COLOR_MOVEABLE = 0x77caff;
export const COLOR_SELECTING = 0xff7777;
export const COLOR_ORANGE = 0xff9966;
export const COLOR_SPECIAL = 0xa84cf5;
export const COLOR_DELETE_ZONE = 0x990000;
export const COLOR_DELETE_MOVEIN = 0x800000;
export const COLOR_HP = 0x2bd034;
export const COLOR_MP = 0x0099ff;
