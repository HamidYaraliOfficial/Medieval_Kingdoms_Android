// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Scenario setup: castles, settlements, armies, and the four game modes.
import { BUILDINGS, UNITS, TILE, MAPS, MAP_SIZES, MISSIONS, CUSTOM_ARMIES, DIFFICULTY } from './data.js';
import { Game } from './game.js';
import { AI } from './ai.js';
import { findSpot } from './place.js';
import { formationOffsets } from './units.js';
import { mulberry32 } from './util.js';

export function randomMapDef(seed) {
  const r = mulberry32(seed * 31 + 5);
  const themes = ['green', 'green', 'forest', 'snow', 'rock', 'desert'];
  const theme = themes[Math.floor(r() * themes.length)];
  const starts = [[0.18, 0.82], [0.82, 0.18], [0.82, 0.82], [0.18, 0.18]];
  const mountains = [];
  const nm = Math.floor(r() * 4);
  for (let i = 0; i < nm; i++) {
    for (let k = 0; k < 20; k++) {
      const x = 0.25 + r() * 0.5, z = 0.25 + r() * 0.5;
      if (starts.every(([sx, sz]) => Math.hypot(sx - x, sz - z) > 0.3)) { mountains.push({ x, z, r: 8 + r() * 8, h: 4 + r() * 5 }); break; }
    }
  }
  const lakes = [];
  if (r() < 0.6) lakes.push({ x: 0.45 + r() * 0.1, z: 0.45 + r() * 0.1, r: 5 + r() * 5 });
  const rivers = [];
  if (r() < 0.45) rivers.push({ w: 4 + r() * 2, pts: [[0, 0.42 + r() * 0.16], [0.3, 0.5], [0.6, 0.5 + (r() - 0.5) * 0.1], [1, 0.4 + r() * 0.2]], fords: [0.3, 0.7] });
  return {
    name: 'map.random', theme, seed: Math.floor(seed), N: 120, base: 3.4 + r() * 2.0, amp: 1.5 + r() * 4.5, freq: 0.8 + r() * 0.6, water: 0.9 + r() * 0.3,
    forest: 0.15 + r() * 0.8, lakes, rivers, mountains, starts, stone: 6 + Math.floor(r() * 6), iron: 5 + Math.floor(r() * 5), gold: 3 + Math.floor(r() * 4), deer: 6 + Math.floor(r() * 12),
  };
}

export function armyMix(n) {
  const list = [];
  const plan = ['sword', 'archer', 'spear', 'shield', 'archer', 'sword', 'lightcav', 'sword', 'spear', 'archer'];
  for (let i = 0; i < n; i++) list.push(plan[i % plan.length]);
  return list;
}

// spawn units arranged in a block around (cx,cz) facing dir
export function spawnArmy(g, teamId, cx, cz, dir, list, o = {}) {
  const th = Math.atan2(dir.x, dir.z);
  const fx = Math.sin(th), fz = Math.cos(th), rx = Math.cos(th), rz = -Math.sin(th);
  const offs = formationOffsets('line', list.length, o.spacing || 2.4);
  const out = [];
  list.forEach((key, i) => {
    const px = cx + rx * offs[i].x + fx * offs[i].z, pz = cz + rz * offs[i].x + fz * offs[i].z;
    const f = g.nav.nearestFree(Math.floor(px / TILE), Math.floor(pz / TILE), teamId, 8);
    if (!f) return;
    const u = g.addUnit(key, teamId, (f[0] + 0.5) * TILE, (f[1] + 0.5) * TILE, { ry: th });
    u.faceAngle = th;
    out.push(u);
  });
  return out;
}

function sideOf(dir) {
  if (Math.abs(dir.x) > Math.abs(dir.z)) return dir.x > 0 ? 'E' : 'W';
  return dir.z > 0 ? 'S' : 'N';
}

// Build a complete fortified castle centred on tile (cx,cz); gate faces dir. Returns blueprint list.
export function buildCastle(g, teamId, cx, cz, size, dir, o = {}) {
  const R = { small: 9, medium: 12, large: 15 }[size] || 9;
  const bp = [];
  const wallKey = o.wallKey || 'walls';
  const put = (key, tx, tz, rot = 0) => {
    const r = g.canPlace(key, teamId, tx, tz, rot, { free: true, ignoreTech: true });
    if (!r.ok) return null;
    const b = g.addBuilding(key, teamId, tx, tz, rot, { complete: true });
    bp.push({ key, tx, tz, rot });
    return b;
  };
  const spot = (key, bx, bz, opts = {}) => {
    const s = findSpot(g, teamId, key, bx, bz, Object.assign({ free: true, ignoreTech: true, rmax: 12 }, opts));
    if (!s) return null;
    return put(key, s.tx, s.tz, s.rot);
  };
  const inner = { x0: cx - R + 2, z0: cz - R + 2, x1: cx + R - 2, z1: cz + R - 2 };
  const side = sideOf(dir);
  // gate position & keep placed slightly away from the gate side
  const bx = -Math.sign(dir.x) * (Math.abs(dir.x) > Math.abs(dir.z) ? 1 : 0), bz = -Math.sign(dir.z) * (Math.abs(dir.z) >= Math.abs(dir.x) ? 1 : 0);
  const kx = cx + Math.round(bx * R * 0.25), kz = cz + Math.round(bz * R * 0.25);
  const keep = put('keep', kx - 3, kz - 3);
  // towers
  const gateKey = o.gateKey || (size === 'large' ? 'rgate' : 'gate');
  const tKey = size === 'small' ? 'guardtower' : 'archertower';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (tKey === 'guardtower') put('guardtower', cx + (sx > 0 ? R - 1 : -R), cz + (sz > 0 ? R - 1 : -R));
    else put('archertower', cx + sx * R - 1, cz + sz * R - 1);
  }
  // gate and gate flanking towers
  let gx, gz, grot;
  if (side === 'S') { gx = cx - 1; gz = cz + R; grot = 0; } else if (side === 'N') { gx = cx - 1; gz = cz - R; grot = 0; }
  else if (side === 'E') { gx = cx + R; gz = cz - 1; grot = 1; } else { gx = cx - R; gz = cz - 1; grot = 1; }
  put(gateKey, gx, gz, grot);
  if (size !== 'small') {
    const off = 4;
    if (grot === 0) { put('guardtower', gx - off - 1, gz - (side === 'S' ? 1 : 0)); put('guardtower', gx + 3 + off - 1, gz - (side === 'S' ? 1 : 0)); }
    else { put('guardtower', gx - (side === 'E' ? 1 : 0), gz - off - 1); put('guardtower', gx - (side === 'E' ? 1 : 0), gz + 3 + off - 1); }
  }
  if (size === 'large') {
    // mid wall towers on the other three sides
    const mids = [[cx - 1, cz - R - 0], [cx - 1, cz + R - 1], [cx - R, cz - 1], [cx + R - 1, cz - 1]];
    for (const [mx, mz] of mids) put('guardtower', mx, mz);
  }
  // interior
  const interior = { small: ['barracks', 'house', 'house', 'warehouse', 'house'], medium: ['barracks', 'archery', 'house', 'stable', 'blacksmith', 'house', 'market', 'warehouse', 'house', 'house'], large: ['barracks', 'archery', 'stable', 'blacksmith', 'house', 'market', 'storage', 'barracks', 'treasury', 'siegeworks', 'house', 'house', 'church', 'house', 'house'] }[size];
  for (const k of interior) spot(k, cx, cz, { bounds: inner, rmax: R - 2 });
  // wall ring
  const ring = [];
  for (let x = cx - R; x <= cx + R; x++) { ring.push([x, cz - R]); ring.push([x, cz + R]); }
  for (let z = cz - R + 1; z <= cz + R - 1; z++) { ring.push([cx - R, z]); ring.push([cx + R, z]); }
  for (const [x, z] of ring) put(wallKey, x, z);
  // outside: farm behind the keep
  const back = { x: -dir.x, z: -dir.z };
  const fx = cx + Math.round(back.x * (R + 7)), fz = cz + Math.round(back.z * (R + 7));
  spot('farm', fx, fz, { rmax: 10, rmin: 0 });
  if (size !== 'small') spot('farm', fx + 5, fz + 5, { rmax: 12 });
  return { bp, keep, R };
}

export function placeTownhallSettlement(g, teamId, cx, cz, dir, o = {}) {
  const th = g.addBuilding('townhall', teamId, cx - 2, cz - 2, 0, { complete: true });
  const bp = [{ key: 'townhall', tx: cx - 2, tz: cz - 2, rot: 0 }];
  if (o.minimal) return { bp, th };
  const sp = (key, bx, bz, opts = {}) => {
    const s = findSpot(g, teamId, key, bx, bz, Object.assign({ free: true, ignoreTech: true, rmax: 14 }, opts));
    if (s) { g.addBuilding(key, teamId, s.tx, s.tz, s.rot, { complete: true }); bp.push({ key, tx: s.tx, tz: s.tz, rot: s.rot }); return true; }
    return false;
  };
  sp('house', cx - 7, cz + 1); sp('house', cx + 6, cz - 2); sp('house', cx, cz + 7);
  sp('warehouse', cx + 6, cz + 6);
  // gatherer huts next to the nearest resources
  const near = (types, cap) => {
    let best = null, bd = 1e12;
    g.nodesNear(cx * TILE, cz * TILE, 60, (n, d2) => { if (types.includes(n.type) && d2 < bd) { bd = d2; best = n; } });
    return best;
  };
  const tree = near(['tree']); if (tree) sp('woodcutter', tree.tx, tree.tz, { rmax: 8, ignoreTerritory: true });
  const rock = near(['stone']); if (rock) sp('quarry', rock.tx, rock.tz, { rmax: 8, ignoreTerritory: true });
  sp('farm', cx - 8, cz - 9);
  return { bp, th };
}

export function garrisonTowers(g, teamId, per, key = 'archer') {
  for (const b of g.buildings) {
    if (b.team !== teamId || !b.def.tower) continue;
    const n = Math.min(per, b.def.tower.slots);
    for (let i = 0; i < n; i++) {
      const u = g.addUnit(key, teamId, b.cx, b.cz);
      g.garrison(u, b);
    }
  }
}

function pickStarts(g, n) {
  const s = g.T.starts.slice();
  const p = s[0];
  const rest = s.slice(1).sort((a, b) => Math.hypot(b.tx - p.tx, b.tz - p.tz) - Math.hypot(a.tx - p.tx, a.tz - p.tz));
  return [p].concat(rest.slice(0, n));
}
function dirBetween(a, b) { const l = Math.hypot(b.tx - a.tx, b.tz - a.tz) || 1; return { x: (b.tx - a.tx) / l, z: (b.tz - a.tz) / l }; }

function aiTeam(g, e, i, start, nearestStart, o = {}) {
  const diff = e.diff || 'normal';
  const resKey = diff === 'easy' ? 'low' : diff === 'normal' ? 'normal' : 'high';
  const team = g.addTeam({ kind: 'ai', diff, name: e.name || AI_NAMES[i % AI_NAMES.length], res: e.res || resKey, start, ecoMul: DIFFICULTY[diff].eco });
  const dir = dirBetween(start, nearestStart);
  const castle = e.castle || 'medium';
  const out = buildCastle(g, team.id, start.tx, start.tz, castle, dir, { wallKey: diff === 'easy' ? 'wallw' : 'walls', gateKey: diff === 'easy' ? 'gate' : undefined });
  team.capitalId = out.keep ? out.keep.id : 0;
  g.recalcTeam(team);
  // villagers
  const vill = Math.max(4, Math.floor(DIFFICULTY[diff].workers * 0.45));
  for (let k = 0; k < vill; k++) { const p = g.spawnPos(out.keep); g.addUnit('villager', team.id, p.x, p.z); }
  // standing army just inside the gate
  const gate = { x: (start.tx + dir.x * (out.R - 4) + 0.5) * TILE, z: (start.tz + dir.z * (out.R - 4) + 0.5) * TILE };
  const list = e.armyList || armyMix(e.army != null ? e.army : 8);
  const units = spawnArmy(g, team.id, gate.x, gate.z, dir, list);
  garrisonTowers(g, team.id, castle === 'small' ? 1 : 2, diff === 'expert' || diff === 'hard' ? 'crossbow' : 'archer');
  team.ai = new AI(g, team, diff, Object.assign({ blueprint: out.bp }, o));
  g.recalcTeam(team);
  return team;
}
const AI_NAMES = ['Lord Varek', 'Baroness Isolde', 'Duke Aldric', 'Lady Morwen', 'Count Hadrian'];

export function createGame(cfg) {
  const seed = cfg.seed != null ? cfg.seed : (Math.random() * 1e6) | 0;
  let def = null, mapId = cfg.mapId || 'greenvalley';
  if (mapId === 'random') def = randomMapDef(seed);
  const mode = cfg.mode || 'skirmish';
  const mission = cfg.mission != null ? MISSIONS[cfg.mission] : null;
  if (mission) mapId = mission.map;
  const N = cfg.N || MAP_SIZES[cfg.size || 'medium'] || 120;
  const g = new Game({
    mapId, size: cfg.size, N, seed: def ? def.seed : seed, def, mode, objectives: mission ? mission.objectives : null,
    victory: cfg.victory || 'conquest', timeLimit: cfg.timeLimit, role: cfg.role, cfg, missionIndex: cfg.mission,
  });
  g.cfg = cfg;
  const nEnemies = mode === 'free' ? 0 : mission ? mission.enemies.length : mode === 'custom' ? 1 : Math.max(1, Math.min(3, cfg.enemies != null ? cfg.enemies : 1));
  const starts = pickStarts(g, nEnemies);
  const pStart = starts[0];
  const res = mission ? mission.res : cfg.res || (mode === 'free' ? 'high' : 'normal');
  const player = g.addTeam({ kind: 'player', name: cfg.playerName || 'Player', res, start: pStart });
  if (cfg.bonus) for (const k in cfg.bonus) player.res[k] = (player.res[k] || 0) + cfg.bonus[k];
  const enemies = mission ? mission.enemies : mode === 'custom' ? [{ diff: cfg.difficulty || 'normal' }] : Array.from({ length: nEnemies }, (_, i) => ({ diff: cfg.difficulty || 'normal', castle: cfg.castle || 'medium', army: cfg.enemyArmy != null ? cfg.enemyArmy : 8 }));
  const dirToEnemy = nEnemies ? dirBetween(pStart, starts[1]) : { x: 0, z: 1 };

  if (mode === 'custom') {
    setupCustom(g, cfg, player, starts, pStart);
    return g;
  }
  // player settlement
  const st = placeTownhallSettlement(g, player.id, pStart.tx, pStart.tz, dirToEnemy);
  player.capitalId = st.th.id;
  g.recalcTeam(player);
  for (let k = 0; k < 8; k++) { const p = g.spawnPos(st.th); g.addUnit('villager', player.id, p.x, p.z); }
  const armyN = mission ? mission.army : cfg.army != null ? cfg.army : mode === 'free' ? 0 : 8;
  if (armyN) spawnArmy(g, player.id, (pStart.tx + dirToEnemy.x * 9 + 0.5) * TILE, (pStart.tz + dirToEnemy.z * 9 + 0.5) * TILE, dirToEnemy, armyMix(armyN));
  for (let i = 0; i < nEnemies; i++) {
    const e = enemies[i];
    // enemy faces the player
    aiTeam(g, e, i, starts[i + 1], pStart, mission ? {} : {});
  }
  // let AI villagers settle into jobs immediately
  for (const t of g.teams) g.assignWorkers(t);
  g.recalcAll();
  g.emit('ready', g);
  return g;
}

function setupCustom(g, cfg, player, starts, pStart) {
  const enemyStart = starts[1];
  const role = cfg.role || 'attack';
  const size = cfg.armySize || 'medium';
  const counts = CUSTOM_ARMIES[size] || CUSTOM_ARMIES.medium;
  const list = []; for (const k in counts) for (let i = 0; i < counts[k]; i++) list.push(k);
  const fort = cfg.fort || 'castle';
  const castleSize = fort === 'light' ? 'small' : 'large';
  const dirPE = dirBetween(pStart, enemyStart), dirEP = dirBetween(enemyStart, pStart);
  const diff = cfg.difficulty || 'normal';
  const enemy = g.addTeam({ kind: 'ai', diff, name: 'Lord Varek', res: 'normal', start: enemyStart, ecoMul: DIFFICULTY[diff].eco });
  const fortify = (team, st, dir, isDefender) => {
    if (fort === 'none') { const th = g.addBuilding('townhall', team.id, st.tx - 2, st.tz - 2, 0, { complete: true }); team.capitalId = th.id; return { bp: [{ key: 'townhall', tx: st.tx - 2, tz: st.tz - 2, rot: 0 }], R: 6 }; }
    const out = buildCastle(g, team.id, st.tx, st.tz, castleSize, dir, { wallKey: 'walls' });
    team.capitalId = out.keep ? out.keep.id : 0; garrisonTowers(g, team.id, 2, 'archer'); return out;
  };
  let pOut, eOut;
  if (role === 'defend') {
    pOut = fortify(player, pStart, dirPE, true);
    const th = g.addBuilding('townhall', enemy.id, enemyStart.tx - 2, enemyStart.tz - 2, 0, { complete: true }); enemy.capitalId = th.id; eOut = { bp: [], R: 6 };
  } else {
    const th = g.addBuilding('townhall', player.id, pStart.tx - 2, pStart.tz - 2, 0, { complete: true }); player.capitalId = th.id; pOut = { bp: [], R: 6 };
    eOut = fortify(enemy, enemyStart, dirEP, true);
  }
  g.recalcTeam(player); g.recalcTeam(enemy);
  const pArmy = role === 'attack' ? list : list.filter((k) => !['ram', 'catapult', 'siegetower'].includes(k));
  const eArmy = role === 'attack' ? list.filter((k) => !['ram', 'catapult', 'siegetower'].includes(k)) : list;
  const pPos = { x: (pStart.tx + dirPE.x * (role === 'attack' ? 6 : (pOut.R - 4)) + 0.5) * TILE, z: (pStart.tz + dirPE.z * (role === 'attack' ? 6 : (pOut.R - 4)) + 0.5) * TILE };
  const ePos = { x: (enemyStart.tx + dirEP.x * (role === 'attack' ? (eOut.R - 4) : 6) + 0.5) * TILE, z: (enemyStart.tz + dirEP.z * (role === 'attack' ? (eOut.R - 4) : 6) + 0.5) * TILE };
  spawnArmy(g, player.id, pPos.x, pPos.z, dirPE, pArmy, { spacing: 2.6 });
  spawnArmy(g, enemy.id, ePos.x, ePos.z, dirEP, eArmy, { spacing: 2.6 });
  enemy.ai = new AI(g, enemy, diff, { noEconomy: true, passive: role === 'attack', immediate: role === 'defend', blueprint: [], sizeScale: 1 });
  if (role === 'defend') enemy.ai.waveSize = Math.max(6, Math.floor(eArmy.length * 0.7));
  g.recalcAll();
  g.emit('ready', g);
}
