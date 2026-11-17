// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Static game data: resources, buildings, units, technologies, maps, missions.

export const GAME_TITLE = 'Iron Crown: Medieval Kingdoms';
export const VERSION = '1.0.1';
export const SAVE_VERSION = 3;

export const RES = ['wood', 'stone', 'iron', 'gold', 'food', 'wheat', 'flour', 'bread'];
export const TILE = 2; // world units per navigation tile

export const TEAM_COLORS = [0x2f6fe0, 0xc8372d, 0x2e9a57, 0xe0b020, 0x8a4fc0];
export const TEAM_CSS = ['#2f6fe0', '#c8372d', '#2e9a57', '#e0b020', '#8a4fc0'];

// ---------------------------------------------------------------- Buildings
// w,d in tiles. time = build effort (builder-seconds). prod defines worker driven production.
const B = (o) => Object.assign({ hp: 300, cost: {}, time: 15, workers: 0, upkeep: 0, popCap: 0, store: 0, territory: 0, tech: null, cat: 'eco', limit: 0 }, o);

export const BUILDINGS = {
  // economy
  house:       B({ cat: 'eco', w: 2, d: 2, hp: 320, cost: { wood: 40, stone: 10 }, time: 12, popCap: 6, upkeep: 0.2 }),
  farm:        B({ cat: 'eco', w: 4, d: 4, hp: 420, cost: { wood: 60 }, time: 18, workers: 4, prod: { out: { food: 4 }, cycle: 4 }, upkeep: 0.3 }),
  wheatfield:  B({ cat: 'eco', w: 4, d: 4, hp: 160, cost: { wood: 20 }, time: 10, workers: 2, prod: { out: { wheat: 2 }, cycle: 3.5 } }),
  mill:        B({ cat: 'eco', w: 3, d: 3, hp: 460, cost: { wood: 80, stone: 30 }, time: 22, workers: 2, prod: { inp: { wheat: 3 }, out: { flour: 3 }, cycle: 5 }, upkeep: 0.4 }),
  bakery:      B({ cat: 'eco', w: 3, d: 3, hp: 420, cost: { wood: 60, stone: 40 }, time: 22, workers: 2, prod: { inp: { flour: 3 }, out: { bread: 4 }, cycle: 5 }, upkeep: 0.4 }),
  woodcutter:  B({ cat: 'eco', w: 2, d: 2, hp: 260, cost: { wood: 30 }, time: 8, workers: 3, gather: 'wood', needNode: 'tree' }),
  quarry:      B({ cat: 'eco', w: 3, d: 3, hp: 520, cost: { wood: 50 }, time: 14, workers: 4, gather: 'stone', needNode: 'stone', upkeep: 0.3 }),
  mine:        B({ cat: 'eco', w: 3, d: 3, hp: 520, cost: { wood: 80, stone: 20 }, time: 16, workers: 4, gather: 'iron', needNode: 'ore', upkeep: 0.4 }),
  market:      B({ cat: 'eco', w: 4, d: 3, hp: 520, cost: { wood: 100, stone: 40, gold: 50 }, time: 24, workers: 2, upkeep: 0.6, taxBonus: 0.1 }),
  warehouse:   B({ cat: 'eco', w: 3, d: 3, hp: 640, cost: { wood: 100, stone: 40 }, time: 18, store: 450, upkeep: 0.2 }),
  hunter:      B({ cat: 'eco', w: 2, d: 2, hp: 260, cost: { wood: 40 }, time: 10, workers: 2, gather: 'food', upkeep: 0.2 }),
  // military
  barracks:    B({ cat: 'mil', w: 4, d: 3, hp: 950, cost: { wood: 120, stone: 80, gold: 60 }, time: 30, upkeep: 0.8, trains: ['sword', 'shield', 'spear', 'heavy', 'guard'] }),
  archery:     B({ cat: 'mil', w: 4, d: 3, hp: 820, cost: { wood: 140, stone: 40, gold: 60 }, time: 28, upkeep: 0.8, trains: ['archer', 'crossbow'] }),
  stable:      B({ cat: 'mil', w: 5, d: 3, hp: 850, cost: { wood: 160, stone: 40, gold: 80 }, time: 30, upkeep: 0.9, trains: ['lightcav', 'heavycav'] }),
  blacksmith:  B({ cat: 'mil', w: 3, d: 3, hp: 740, cost: { wood: 80, stone: 80, iron: 40, gold: 50 }, time: 26, workers: 2, upkeep: 0.8, research: 'mil' }),
  siegeworks:  B({ cat: 'mil', w: 4, d: 4, hp: 950, cost: { wood: 200, stone: 100, iron: 80, gold: 100 }, time: 40, upkeep: 1.0, tech: 'engineering', trains: ['catapult', 'ram', 'siegetower'] }),
  training:    B({ cat: 'mil', w: 5, d: 5, hp: 520, cost: { wood: 150, gold: 80 }, time: 24, upkeep: 0.5, trainBonus: 0.12 }),
  // defense
  wallw:       B({ cat: 'def', w: 1, d: 1, hp: 260, cost: { wood: 6 }, time: 2.5, line: true }),
  walls:       B({ cat: 'def', w: 1, d: 1, hp: 760, cost: { stone: 12 }, time: 4, line: true, wall: true }),
  guardtower:  B({ cat: 'def', w: 2, d: 2, hp: 850, cost: { wood: 60, stone: 60 }, time: 22, tower: { range: 28, dmg: 9, cd: 1.5, slots: 2 }, upkeep: 0.3 }),
  archertower: B({ cat: 'def', w: 3, d: 3, hp: 1150, cost: { wood: 80, stone: 120 }, time: 30, tower: { range: 36, dmg: 11, cd: 1.15, slots: 4 }, upkeep: 0.5 }),
  deftower:    B({ cat: 'def', w: 4, d: 4, hp: 2300, cost: { stone: 260, iron: 60, gold: 80 }, time: 46, tower: { range: 42, dmg: 38, cd: 3.0, slots: 4, bolt: true }, tech: 'bastions', upkeep: 0.9 }),
  gate:        B({ cat: 'def', w: 3, d: 1, hp: 950, cost: { wood: 120, stone: 40 }, time: 16, gate: true, upkeep: 0.2 }),
  rgate:       B({ cat: 'def', w: 3, d: 1, hp: 2300, cost: { wood: 80, stone: 100, iron: 60 }, time: 24, gate: true, tech: 'rgates', upkeep: 0.4 }),
  moat:        B({ cat: 'def', w: 1, d: 1, hp: 99999, cost: { stone: 3 }, time: 1.2, line: true, moat: true }),
  bridge:      B({ cat: 'def', w: 1, d: 1, hp: 320, cost: { wood: 12 }, time: 3, line: true, bridge: true }),
  // admin
  keep:        B({ cat: 'admin', w: 6, d: 6, hp: 4200, cost: { wood: 700, stone: 1100, gold: 500 }, time: 110, popCap: 24, store: 650, territory: 26, tower: { range: 32, dmg: 12, cd: 1.6, slots: 4 }, limit: 3, trains: ['villager'], upkeep: 1.0 }),
  townhall:    B({ cat: 'admin', w: 4, d: 4, hp: 1600, cost: { wood: 200, stone: 150, gold: 100 }, time: 44, popCap: 8, territory: 14, research: 'eco', trains: ['villager'], upkeep: 0.8, taxBonus: 0.08 }),
  treasury:    B({ cat: 'admin', w: 3, d: 3, hp: 1300, cost: { wood: 80, stone: 200, gold: 100 }, time: 34, storeGold: 900, taxBonus: 0.15, upkeep: 0.2 }),
  storage:     B({ cat: 'admin', w: 4, d: 4, hp: 1100, cost: { wood: 250, stone: 100 }, time: 30, store: 1200, upkeep: 0.4 }),
  church:      B({ cat: 'admin', w: 4, d: 3, hp: 950, cost: { wood: 80, stone: 150, gold: 60 }, time: 32, happy: 10, workers: 1, upkeep: 0.6 }),
};
export const BUILD_ORDER = {
  eco: ['house', 'farm', 'wheatfield', 'mill', 'bakery', 'woodcutter', 'quarry', 'mine', 'hunter', 'market', 'warehouse'],
  mil: ['barracks', 'archery', 'stable', 'blacksmith', 'siegeworks', 'training'],
  def: ['wallw', 'walls', 'gate', 'rgate', 'guardtower', 'archertower', 'deftower', 'moat', 'bridge'],
  admin: ['keep', 'townhall', 'treasury', 'storage', 'church'],
};

// ---------------------------------------------------------------- Units
const U = (o) => Object.assign({ cls: 'inf', hp: 100, atk: 10, def: 0, speed: 3.2, range: 1.7, cd: 1.1, cost: {}, time: 12, pop: 1, bld: 0.25, rad: 0.8, block: 0, vsCav: 1, from: 'barracks', tech: null }, o);
export const UNITS = {
  villager:   U({ cls: 'work', hp: 42, atk: 3, def: 0, speed: 3.0, range: 1.4, cd: 1.4, cost: { food: 20, gold: 8 }, time: 8, from: 'keep', bld: 0.1 }),
  sword:      U({ hp: 110, atk: 14, def: 4, speed: 3.4, cd: 1.0, cost: { gold: 30, iron: 10, food: 10 }, time: 14 }),
  heavy:      U({ hp: 200, atk: 23, def: 11, speed: 2.7, cd: 1.35, range: 1.9, cost: { gold: 60, iron: 32, food: 15 }, time: 22, tech: 'plate', rad: 0.95 }),
  shield:     U({ hp: 155, atk: 10, def: 9, speed: 3.0, cd: 1.1, block: 0.45, cost: { gold: 40, iron: 14, wood: 10, food: 10 }, time: 16 }),
  spear:      U({ hp: 95, atk: 11, def: 3, speed: 3.3, cd: 1.2, range: 2.8, vsCav: 2.2, cost: { gold: 25, wood: 15, food: 10 }, time: 12 }),
  guard:      U({ hp: 290, atk: 27, def: 14, speed: 3.2, cd: 1.0, range: 2.0, block: 0.3, cost: { gold: 120, iron: 50, food: 20 }, time: 32, tech: 'royalguard', rad: 0.95 }),
  archer:     U({ cls: 'rng', hp: 62, atk: 12, def: 1, speed: 3.4, cd: 1.7, range: 26, minRange: 3, cost: { gold: 35, wood: 20, food: 10 }, time: 14, from: 'archery', bld: 0.05 }),
  crossbow:   U({ cls: 'rng', hp: 84, atk: 24, def: 3, speed: 3.0, cd: 2.5, range: 24, minRange: 3, pierce: 0.5, cost: { gold: 55, wood: 25, iron: 10, food: 10 }, time: 20, from: 'archery', tech: 'crossbow', bld: 0.05 }),
  lightcav:   U({ cls: 'cav', hp: 135, atk: 15, def: 3, speed: 6.8, cd: 1.0, range: 2.0, cost: { gold: 70, food: 30, iron: 10 }, time: 20, from: 'stable', rad: 1.2, bld: 0.2 }),
  heavycav:   U({ cls: 'cav', hp: 270, atk: 29, def: 10, speed: 5.6, cd: 1.2, range: 2.3, cost: { gold: 130, food: 40, iron: 40 }, time: 32, from: 'stable', tech: 'barding', rad: 1.35, bld: 0.25 }),
  catapult:   U({ cls: 'siege', hp: 230, atk: 92, def: 6, speed: 1.7, cd: 5.5, range: 62, minRange: 14, splash: 5, bld: 1.7, cost: { gold: 100, wood: 80, stone: 30, iron: 20 }, time: 34, from: 'siegeworks', rad: 2.0, pop: 3 }),
  ram:        U({ cls: 'siege', hp: 460, atk: 70, def: 12, speed: 2.0, cd: 2.0, range: 2.6, bld: 2.6, cost: { gold: 80, wood: 100, iron: 30 }, time: 30, from: 'siegeworks', rad: 1.8, pop: 3 }),
  siegetower: U({ cls: 'siege', hp: 620, atk: 0, def: 8, speed: 1.5, cd: 9, range: 3, bld: 0, cost: { gold: 120, wood: 150, iron: 40 }, time: 40, from: 'siegeworks', tech: 'siege2', rad: 2.2, pop: 4 }),
};
export const UNIT_ORDER = ['villager', 'sword', 'heavy', 'shield', 'spear', 'guard', 'archer', 'crossbow', 'lightcav', 'heavycav', 'catapult', 'ram', 'siegetower'];

// ---------------------------------------------------------------- Technology tree
const T = (id, tier, bld, cost, time, req, fx, unlock) => ({ id, tier, bld, cost, time, req: req || [], fx: fx || {}, unlock: unlock || null });
export const TECHS = [
  T('tools1', 1, 'eco', { wood: 100, iron: 40 }, 35, [], { gather: 0.2 }),
  T('tools2', 2, 'eco', { gold: 150, iron: 100 }, 55, ['tools1'], { gather: 0.2 }),
  T('plow1', 1, 'eco', { wood: 120, gold: 40 }, 35, [], { farm: 0.25 }),
  T('plow2', 2, 'eco', { wood: 200, gold: 120 }, 55, ['plow1'], { farm: 0.25 }),
  T('taxes1', 1, 'eco', { gold: 120, wood: 60 }, 40, [], { tax: 0.2 }),
  T('trade1', 2, 'eco', { gold: 160 }, 45, ['taxes1'], { fee: 0.12, tax: 0.1 }),
  T('granary', 2, 'eco', { wood: 200, stone: 100 }, 50, ['tools1'], { store: 0.35 }),
  T('masonry1', 1, 'eco', { stone: 150, gold: 60 }, 45, [], { wallHp: 0.25, build: 0.15 }),
  T('masonry2', 2, 'eco', { stone: 300, gold: 140 }, 65, ['masonry1'], { wallHp: 0.25, towerDmg: 0.12 }),
  T('rgates', 2, 'eco', { stone: 200, iron: 80 }, 50, ['masonry1'], { gateHp: 0.4 }, 'rgate'),
  T('bastions', 3, 'eco', { stone: 400, iron: 150, gold: 200 }, 80, ['masonry2'], {}, 'deftower'),
  T('engineering', 2, 'eco', { wood: 250, iron: 100, gold: 150 }, 60, ['masonry1'], {}, 'siegeworks'),
  T('siege2', 3, 'eco', { wood: 300, iron: 200, gold: 250 }, 80, ['engineering'], { siegeDmg: 0.2 }, 'siegetower'),
  T('weapons1', 1, 'mil', { iron: 80, gold: 80 }, 40, [], { atk: 0.1 }),
  T('weapons2', 2, 'mil', { iron: 160, gold: 160 }, 60, ['weapons1'], { atk: 0.1 }),
  T('weapons3', 3, 'mil', { iron: 260, gold: 280 }, 80, ['weapons2'], { atk: 0.1 }),
  T('armor1', 1, 'mil', { iron: 80, gold: 80 }, 40, [], { def: 2 }),
  T('armor2', 2, 'mil', { iron: 160, gold: 160 }, 60, ['armor1'], { def: 2 }),
  T('armor3', 3, 'mil', { iron: 260, gold: 280 }, 80, ['armor2'], { def: 2 }),
  T('plate', 2, 'mil', { iron: 150, gold: 120 }, 50, ['armor1'], {}, 'heavy'),
  T('fletching', 1, 'mil', { wood: 120, gold: 80 }, 40, [], { rdmg: 0.12, rrange: 2 }),
  T('fletching2', 2, 'mil', { wood: 220, gold: 160 }, 60, ['fletching'], { rdmg: 0.12, rrange: 2 }),
  T('crossbow', 2, 'mil', { wood: 150, iron: 100, gold: 120 }, 50, ['fletching'], {}, 'crossbow'),
  T('horses1', 1, 'mil', { food: 150, gold: 100 }, 40, [], { cav: 0.1 }),
  T('barding', 2, 'mil', { iron: 160, gold: 160 }, 60, ['horses1', 'armor1'], {}, 'heavycav'),
  T('royalguard', 3, 'mil', { iron: 300, gold: 400 }, 90, ['weapons2', 'armor2'], {}, 'guard'),
  T('train1', 1, 'mil', { gold: 100, food: 80 }, 35, [], { train: 0.15 }),
  T('train2', 2, 'mil', { gold: 200, food: 150 }, 55, ['train1'], { train: 0.15 }),
  T('train3', 3, 'mil', { gold: 320, food: 220 }, 75, ['train2'], { train: 0.15 }),
  T('shieldwall', 2, 'mil', { iron: 120, wood: 100 }, 45, ['armor1'], { block: 0.15 }),
];
export const TECH_BY_ID = Object.fromEntries(TECHS.map((t) => [t.id, t]));

// ---------------------------------------------------------------- Formations
export const FORMATIONS = ['line', 'square', 'shieldwall', 'wedge', 'archer', 'charge'];
export const STANCES = ['aggressive', 'defensive', 'hold'];

// ---------------------------------------------------------------- AI difficulty
export const DIFFICULTY = {
  easy:   { think: 6.0, wave: 8,  waveEvery: 260, firstWave: 420, towers: 0, walls: false, siege: false, eco: 0.8,  workers: 10, retreat: 0.3, flank: false },
  normal: { think: 4.0, wave: 14, waveEvery: 190, firstWave: 330, towers: 2, walls: false, siege: false, eco: 1.0, workers: 16, retreat: 0.35, flank: false },
  hard:   { think: 2.6, wave: 22, waveEvery: 150, firstWave: 260, towers: 4, walls: true,  siege: true,  eco: 1.1, workers: 22, retreat: 0.4, flank: true },
  expert: { think: 1.6, wave: 32, waveEvery: 115, firstWave: 200, towers: 6, walls: true,  siege: true,  eco: 1.2, workers: 28, retreat: 0.4, flank: true },
};
export const START_RES = {
  low:    { wood: 200, stone: 100, iron: 40,  gold: 250,  food: 150, wheat: 0, flour: 0, bread: 0 },
  normal: { wood: 500, stone: 300, iron: 120, gold: 600,  food: 350, wheat: 0, flour: 0, bread: 40 },
  high:   { wood: 1000, stone: 700, iron: 300, gold: 1500, food: 700, wheat: 40, flour: 40, bread: 150 },
  rich:   { wood: 2500, stone: 2000, iron: 900, gold: 4000, food: 1500, wheat: 150, flour: 150, bread: 400 },
};

// ---------------------------------------------------------------- Maps (hand-authored parameter sets)
// Coordinates normalised 0..1. rivers: polylines with width in tiles; fords: [0..1] path positions that are shallow.
export const MAPS = {
  greenvalley: { name: 'map.greenvalley', theme: 'green', seed: 1101, N: 112, base: 4.0, amp: 3.2, freq: 1.0, water: 1.1, forest: 0.55, lakes: [{ x: 0.5, z: 0.5, r: 9 }], rivers: [{ w: 5, pts: [[0.0, 0.45], [0.3, 0.5], [0.5, 0.55], [0.75, 0.5], [1, 0.6]], fords: [0.25, 0.7] }], mountains: [{ x: 0.5, z: 0.15, r: 14, h: 6 }, { x: 0.5, z: 0.87, r: 14, h: 6 }], starts: [[0.2, 0.8], [0.8, 0.2], [0.8, 0.8], [0.2, 0.2]], stone: 7, iron: 6, gold: 4, deer: 14 },
  highlands:   { name: 'map.highlands', theme: 'snow', seed: 2202, N: 112, base: 5.0, amp: 6.0, freq: 1.25, water: 1.0, forest: 0.35, lakes: [{ x: 0.35, z: 0.45, r: 7 }, { x: 0.68, z: 0.55, r: 8 }], rivers: [], mountains: [{ x: 0.5, z: 0.5, r: 16, h: 9 }, { x: 0.12, z: 0.45, r: 10, h: 7 }, { x: 0.9, z: 0.5, r: 10, h: 7 }], starts: [[0.18, 0.2], [0.82, 0.8], [0.82, 0.2], [0.18, 0.8]], stone: 10, iron: 9, gold: 5, deer: 8 },
  riverkingdom: { name: 'map.riverkingdom', theme: 'green', seed: 3303, N: 128, base: 3.6, amp: 2.4, freq: 0.9, water: 1.2, forest: 0.45, lakes: [], rivers: [{ w: 6, pts: [[0.5, 0], [0.45, 0.3], [0.55, 0.55], [0.5, 0.8], [0.5, 1]], fords: [0.3, 0.62] }, { w: 4, pts: [[0, 0.5], [0.3, 0.52], [0.5, 0.55]], fords: [0.45] }], mountains: [], starts: [[0.18, 0.82], [0.84, 0.18], [0.84, 0.82], [0.16, 0.2]], stone: 7, iron: 6, gold: 4, deer: 12 },
  forestfrontier: { name: 'map.forestfrontier', theme: 'forest', seed: 4404, N: 112, base: 4.2, amp: 3.0, freq: 1.1, water: 1.0, forest: 1.0, lakes: [{ x: 0.5, z: 0.5, r: 6 }], rivers: [], mountains: [{ x: 0.3, z: 0.5, r: 8, h: 5 }, { x: 0.7, z: 0.5, r: 8, h: 5 }], starts: [[0.2, 0.2], [0.8, 0.8], [0.8, 0.2], [0.2, 0.8]], stone: 6, iron: 5, gold: 3, deer: 22 },
  rockyfortress: { name: 'map.rockyfortress', theme: 'rock', seed: 5505, N: 112, base: 5.5, amp: 5.0, freq: 1.4, water: 0.8, forest: 0.22, lakes: [], rivers: [], mountains: [{ x: 0.5, z: 0.5, r: 13, h: 8 }, { x: 0.5, z: 0.25, r: 9, h: 6 }, { x: 0.5, z: 0.75, r: 9, h: 6 }, { x: 0.25, z: 0.5, r: 9, h: 6 }, { x: 0.75, z: 0.5, r: 9, h: 6 }], starts: [[0.15, 0.15], [0.85, 0.85], [0.85, 0.15], [0.15, 0.85]], stone: 14, iron: 12, gold: 7, deer: 6 },
  desert: { name: 'map.desert', theme: 'desert', seed: 6606, N: 120, base: 3.4, amp: 2.2, freq: 0.8, water: 0.9, forest: 0.12, lakes: [{ x: 0.5, z: 0.3, r: 5 }, { x: 0.5, z: 0.72, r: 5 }], rivers: [], mountains: [{ x: 0.5, z: 0.5, r: 11, h: 5 }], starts: [[0.15, 0.5], [0.85, 0.5], [0.5, 0.1], [0.5, 0.9]], stone: 8, iron: 6, gold: 8, deer: 5 },
  plains: { name: 'map.plains', theme: 'green', seed: 7707, N: 144, base: 3.5, amp: 1.5, freq: 0.7, water: 1.0, forest: 0.3, lakes: [{ x: 0.5, z: 0.5, r: 8 }], rivers: [], mountains: [], starts: [[0.12, 0.5], [0.88, 0.5], [0.5, 0.12], [0.5, 0.88]], stone: 9, iron: 7, gold: 5, deer: 24 },
};
export const MAP_ORDER = ['greenvalley', 'highlands', 'riverkingdom', 'forestfrontier', 'rockyfortress', 'desert', 'plains'];
export const MAP_SIZES = { small: 96, medium: 120, large: 144 };

// ---------------------------------------------------------------- Campaign
// obj types: build{key,n} pop{n} army{n} survive{s} destroy (all enemy keeps) gold{n} kill{n} defend (keep survives until survive done)
export const MISSIONS = [
  { id: 1, map: 'greenvalley', title: 'mis1.t', intro: 'mis1.i', res: 'normal', army: 4, enemies: [{ diff: 'easy', castle: 'small', army: 4 }], objectives: [{ t: 'build', key: 'barracks', n: 1 }, { t: 'pop', n: 22 }, { t: 'destroy' }], reward: { gold: 300, wood: 200 } },
  { id: 2, map: 'highlands', title: 'mis2.t', intro: 'mis2.i', res: 'normal', army: 8, enemies: [{ diff: 'easy', castle: 'small', army: 8 }], objectives: [{ t: 'survive', s: 420 }, { t: 'build', key: 'guardtower', n: 2 }, { t: 'destroy' }], reward: { gold: 400, iron: 150 } },
  { id: 3, map: 'riverkingdom', title: 'mis3.t', intro: 'mis3.i', res: 'normal', army: 8, enemies: [{ diff: 'normal', castle: 'medium', army: 10 }], objectives: [{ t: 'build', key: 'bridge', n: 1 }, { t: 'army', n: 18 }, { t: 'destroy' }], reward: { gold: 500, stone: 250 } },
  { id: 4, map: 'forestfrontier', title: 'mis4.t', intro: 'mis4.i', res: 'high', army: 10, enemies: [{ diff: 'normal', castle: 'medium', army: 14 }, { diff: 'easy', castle: 'small', army: 8 }], objectives: [{ t: 'gold', n: 1500 }, { t: 'destroy' }], reward: { gold: 600, iron: 250 } },
  { id: 5, map: 'rockyfortress', title: 'mis5.t', intro: 'mis5.i', res: 'high', army: 12, enemies: [{ diff: 'hard', castle: 'large', army: 18 }], objectives: [{ t: 'build', key: 'siegeworks', n: 1 }, { t: 'destroy' }], reward: { gold: 800, stone: 400 } },
  { id: 6, map: 'desert', title: 'mis6.t', intro: 'mis6.i', res: 'high', army: 14, enemies: [{ diff: 'hard', castle: 'large', army: 22 }, { diff: 'normal', castle: 'medium', army: 12 }], objectives: [{ t: 'survive', s: 600 }, { t: 'destroy' }], reward: { gold: 1000, iron: 400 } },
  { id: 7, map: 'plains', title: 'mis7.t', intro: 'mis7.i', res: 'rich', army: 16, enemies: [{ diff: 'expert', castle: 'large', army: 28 }, { diff: 'hard', castle: 'medium', army: 18 }], objectives: [{ t: 'destroy' }], reward: { gold: 0 } },
];

export const CUSTOM_ARMIES = {
  small:  { sword: 8, shield: 4, spear: 4, archer: 8, lightcav: 2 },
  medium: { sword: 16, heavy: 4, shield: 8, spear: 8, archer: 14, crossbow: 4, lightcav: 4, heavycav: 2, ram: 1, catapult: 1 },
  large:  { sword: 26, heavy: 10, shield: 14, spear: 12, archer: 22, crossbow: 10, lightcav: 8, heavycav: 6, guard: 4, ram: 2, catapult: 2, siegetower: 1 },
  epic:   { sword: 40, heavy: 16, shield: 22, spear: 18, archer: 34, crossbow: 16, lightcav: 12, heavycav: 10, guard: 8, ram: 3, catapult: 3, siegetower: 2 },
};

// ---------------------------------------------------------------- Economy constants
export const NODE_RES = { tree: 'wood', stone: 'stone', ore: 'iron', gold: 'gold', deer: 'food' };
export const PRICES = { wood: 1.0, stone: 1.5, iron: 3.0, food: 1.0, wheat: 0.8, flour: 1.2, bread: 2.0 };
export const STORE_BASE = { wood: 400, stone: 300, iron: 250, gold: 1500, food: 400, wheat: 250, flour: 250, bread: 250 };
export const TAX_RATES = [0, 0.6, 1.0, 1.6];
export const BUILDER_CAP = 4;
export const CARRY = { wood: 10, stone: 8, iron: 8, gold: 6, food: 12 };
export const POP_EAT = 0.05; // portions per second per inhabitant

export const BH = { walls: 3.6, wallw: 2.6, guardtower: 7.5, archertower: 9.8, deftower: 12, keep: 12.5, gate: 4, rgate: 4, townhall: 5 };
