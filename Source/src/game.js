// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Simulation core: world state, teams, buildings, placement, techs, victory. (No rendering code in here.)
import { BUILDINGS, UNITS, TECH_BY_ID, TECHS, RES, TILE, MAP_SIZES, START_RES, STORE_BASE, PRICES, TEAM_COLORS, NODE_RES, BH } from './data.js';
import { Terrain, KIND } from './terrain.js';
import { Nav } from './nav.js';
import { mulberry32, dist, dist2, clamp } from './util.js';

export { BH };
export const BLOCKING_NODES = new Set(['tree', 'stone', 'ore', 'gold', 'rock']);
const MOD_KEYS = ['atk', 'def', 'rdmg', 'rrange', 'cav', 'train', 'block', 'gather', 'farm', 'tax', 'store', 'wallHp', 'gateHp', 'build', 'towerDmg', 'siegeDmg'];

export class Game {
  constructor(opts) {
    this.opts = opts;
    this.mode = opts.mode || 'skirmish';
    this.N = opts.N || MAP_SIZES[opts.size || 'medium'] || 120;
    this.T = new Terrain(opts.mapId, this.N, opts.seed, opts.def);
    this.nextId = 1;
    this.byId = new Map();
    this.buildings = []; this.units = []; this.nodes = []; this.projs = [];
    this.nav = new Nav(this.T, (id) => this.byId.get(id));
    this.teams = [];
    this.time = 0; this.rng = mulberry32((opts.seed || 1) * 7919 + 13);
    this.listeners = {};
    this.pathBudget = 0;
    this.over = null;
    this.objectives = opts.objectives ? opts.objectives.map((o) => Object.assign({ done: false, v: 0 }, o)) : [];
    this.hashCell = 6;
    this.hCols = Math.ceil(this.N * TILE / this.hashCell) + 1;
    this.hash = Array.from({ length: this.hCols * this.hCols }, () => []);
    this.bhash = Array.from({ length: this.hCols * this.hCols }, () => []);
    this.nhash = Array.from({ length: this.hCols * this.hCols }, () => []);
    this.bDirty = true; this.qStamp = 1;
    this.secT = 0; this.sec = 0;
    this.stats = { kills: 0, lost: 0 };
    this.notifyT = {};
    for (const n of this.T.nodes) this._addNode(n);
  }

  // ---------------------------------------------------------------- events
  on(type, fn) { (this.listeners[type] || (this.listeners[type] = [])).push(fn); }
  emit(type, data) { const l = this.listeners[type]; if (l) for (let i = 0; i < l.length; i++) l[i](data); }
  notify(team, key, params, level = 'info', pos = null, throttle = 0) {
    if (throttle) {
      const k = team + key;
      if (this.notifyT[k] && this.time - this.notifyT[k] < throttle) return;
      this.notifyT[k] = this.time;
    }
    this.emit('notify', { team, key, params: params || {}, level, pos });
  }
  id() { return this.nextId++; }
  ent(id) { return this.byId.get(id); }

  // ---------------------------------------------------------------- nodes
  _addNode(n) {
    n.id = this.id(); n.kind = 'n'; n.claims = 0; n.rad = 0.8; n.dead = false;
    this.nodes.push(n); this.byId.set(n.id, n);
    if (BLOCKING_NODES.has(n.type)) this.nav.nocc[n.tz * this.N + n.tx] = n.id;
    this._nodeHashAdd(n);
    return n;
  }
  _cellIdx(x, z) { return clamp(Math.floor(z / this.hashCell), 0, this.hCols - 1) * this.hCols + clamp(Math.floor(x / this.hashCell), 0, this.hCols - 1); }
  _nodeHashAdd(n) { this.nhash[this._cellIdx(n.x, n.z)].push(n); }
  removeNode(n) {
    if (n.dead) return;
    n.dead = true;
    const c = this.nhash[this._cellIdx(n.x, n.z)]; const i = c.indexOf(n); if (i >= 0) c.splice(i, 1);
    if (this.nav.nocc[n.tz * this.N + n.tx] === n.id) this.nav.nocc[n.tz * this.N + n.tx] = 0;
    this.nav.version++;
    const k = this.nodes.indexOf(n); if (k >= 0) this.nodes.splice(k, 1);
    this.byId.delete(n.id);
    this.emit('nodeRemoved', n);
  }
  nodesNear(x, z, r, cb) {
    const cs = this.hashCell, cols = this.hCols;
    const x0 = clamp(Math.floor((x - r) / cs), 0, cols - 1), x1 = clamp(Math.floor((x + r) / cs), 0, cols - 1);
    const z0 = clamp(Math.floor((z - r) / cs), 0, cols - 1), z1 = clamp(Math.floor((z + r) / cs), 0, cols - 1);
    const r2 = r * r;
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const arr = this.nhash[cz * cols + cx];
      for (let i = 0; i < arr.length; i++) { const n = arr[i]; const d = dist2(x, z, n.x, n.z); if (d <= r2) cb(n, d); }
    }
  }

  // ---------------------------------------------------------------- teams
  addTeam(cfg) {
    const i = this.teams.length;
    const t = {
      id: i, name: cfg.name || 'Lord ' + (i + 1), kind: cfg.kind || 'ai', diff: cfg.diff || 'normal', color: TEAM_COLORS[i % TEAM_COLORS.length],
      res: Object.assign({}, START_RES[cfg.res || 'normal']), cap: {}, techs: new Set(), mods: {}, happiness: 60, tax: 2,
      pop: 0, popCap: 0, vill: 0, army: 0, starving: false, flow: {}, acc: {}, stats: { kills: 0, lost: 0, built: 0, gathered: 0 },
      defeated: false, start: cfg.start || null, ai: null, growT: 6, eatT: 0, upkeepT: 0, deserterT: 0, happyTarget: 60,
      ecoMul: cfg.ecoMul || 1, groups: {}, lastHitAt: -99, capitalId: 0,
    };
    for (const r of RES) { t.flow[r] = { rin: 0, rout: 0 }; t.acc[r] = { i: 0, o: 0 }; }
    for (const k of MOD_KEYS) t.mods[k] = 0;
    t.mods.fee = 0.25;
    this.teams.push(t);
    this.recalcTeam(t);
    return t;
  }

  recalcMods(t) {
    const m = t.mods;
    for (const k of MOD_KEYS) m[k] = 0;
    m.fee = 0.25;
    for (const id of t.techs) {
      const tech = TECH_BY_ID[id]; if (!tech) continue;
      for (const k in tech.fx) { if (k === 'fee') m.fee -= tech.fx[k]; else m[k] = (m[k] || 0) + tech.fx[k]; }
    }
    m.fee = Math.max(0.05, m.fee);
  }

  // population, caps etc. (cheap enough to call every second)
  recalcTeam(t) {
    let popCap = 10, store = 0, storeGold = 0;
    for (const b of this.buildings) {
      if (b.team !== t.id || !b.built) continue;
      const d = b.def;
      popCap += d.popCap || 0; store += d.store || 0; storeGold += d.storeGold || 0;
    }
    const mul = 1 + t.mods.store;
    for (const r of RES) t.cap[r] = Math.floor((STORE_BASE[r] + (r === 'gold' ? storeGold : store)) * mul);
    t.popCap = popCap;
    let pop = 0, vill = 0, army = 0;
    for (const u of this.units) {
      if (u.team !== t.id || u.dead) continue;
      pop += u.def.pop;
      if (u.cls === 'work') vill++; else army += u.def.pop;
    }
    t.pop = pop; t.vill = vill; t.army = army;
  }

  recalcAll() { for (const t of this.teams) { this.recalcMods(t); this.recalcTeam(t); this.refreshBuildingStats(t); } for (const u of this.units) this.refreshUnitStats(u); }

  canAfford(t, cost) { for (const k in cost) if ((t.res[k] || 0) < cost[k] - 1e-6) return false; return true; }
  spend(t, cost) { for (const k in cost) { t.res[k] -= cost[k]; t.acc[k].o += cost[k]; } }
  refund(t, cost, f = 1) { for (const k in cost) this.addRes(t, k, Math.floor(cost[k] * f), true); }
  addRes(t, r, n, quiet) {
    const room = Math.max(0, t.cap[r] - t.res[r]);
    const a = Math.min(room, n);
    t.res[r] += a;
    if (!quiet) t.acc[r].i += a;
    return a;
  }
  scaledCost(b, key, f) { const c = {}; const d = BUILDINGS[key]; for (const k in d.cost) c[k] = Math.ceil(d.cost[k] * f); return c; }

  // ---------------------------------------------------------------- spatial hash
  rebuildHash() {
    const hs = this.hash; for (let i = 0; i < hs.length; i++) hs[i].length = 0;
    const us = this.units;
    for (let i = 0; i < us.length; i++) { const u = us[i]; if (u.dead || u.inside) continue; hs[this._cellIdx(u.x, u.z)].push(u); }
    if (this.bDirty) {
      this.bDirty = false;
      const bh = this.bhash; for (let i = 0; i < bh.length; i++) bh[i].length = 0;
      for (const b of this.buildings) {
        if (b.dead) continue;
        const x0 = clamp(Math.floor(b.tx * TILE / this.hashCell), 0, this.hCols - 1), x1 = clamp(Math.floor((b.tx + b.w) * TILE / this.hashCell), 0, this.hCols - 1);
        const z0 = clamp(Math.floor(b.tz * TILE / this.hashCell), 0, this.hCols - 1), z1 = clamp(Math.floor((b.tz + b.d) * TILE / this.hashCell), 0, this.hCols - 1);
        for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) bh[cz * this.hCols + cx].push(b);
      }
    }
  }
  unitsNear(x, z, r, cb) {
    const cs = this.hashCell, cols = this.hCols;
    const x0 = clamp(Math.floor((x - r) / cs), 0, cols - 1), x1 = clamp(Math.floor((x + r) / cs), 0, cols - 1);
    const z0 = clamp(Math.floor((z - r) / cs), 0, cols - 1), z1 = clamp(Math.floor((z + r) / cs), 0, cols - 1);
    const r2 = r * r;
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const arr = this.hash[cz * cols + cx];
      for (let i = 0; i < arr.length; i++) { const u = arr[i]; const d = dist2(x, z, u.x, u.z); if (d <= r2) cb(u, d); }
    }
  }
  buildingsNear(x, z, r, cb) {
    const cs = this.hashCell, cols = this.hCols;
    const x0 = clamp(Math.floor((x - r) / cs), 0, cols - 1), x1 = clamp(Math.floor((x + r) / cs), 0, cols - 1);
    const z0 = clamp(Math.floor((z - r) / cs), 0, cols - 1), z1 = clamp(Math.floor((z + r) / cs), 0, cols - 1);
    const st = ++this.qStamp;
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const arr = this.bhash[cz * cols + cx];
      for (let i = 0; i < arr.length; i++) {
        const b = arr[i]; if (b._q === st || b.dead) continue; b._q = st;
        const d = this.distToBuilding(x, z, b);
        if (d <= r) cb(b, d);
      }
    }
  }
  // distance from point to the footprint rectangle (world units)
  distToBuilding(x, z, b) {
    const x0 = b.tx * TILE, x1 = (b.tx + b.w) * TILE, z0 = b.tz * TILE, z1 = (b.tz + b.d) * TILE;
    const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0, dz = z < z0 ? z0 - z : z > z1 ? z - z1 : 0;
    return Math.hypot(dx, dz);
  }

  // ---------------------------------------------------------------- buildings
  footprint(key, rot) { const d = BUILDINGS[key]; return rot & 1 ? { w: d.d, d: d.w } : { w: d.w, d: d.d }; }

  inTerritory(t, key, tx, tz, w, d) {
    const cx = tx + w / 2, cz = tz + d / 2;
    let near = false;
    for (const b of this.buildings) {
      if (b.dead) continue;
      const dd = Math.hypot(b.tx + b.w / 2 - cx, b.tz + b.d / 2 - cz);
      if (b.team === t.id) {
        if (b.built && b.def.territory && dd <= b.def.territory) near = true;
        else if (b.built && dd <= 7 && !b.def.line) near = true;
      } else if (dd < 9 + (b.w + b.d) / 4 && !(b.def.line && !BUILDINGS[key].line)) {
        return false;
      }
    }
    return near;
  }

  canPlace(key, teamId, tx, tz, rot, o = {}) {
    const t = this.teams[teamId]; const def = BUILDINGS[key];
    if (!def) return { ok: false, reason: 'unknown' };
    const { w, d } = this.footprint(key, rot);
    const N = this.N;
    if (tx < 3 || tz < 3 || tx + w > N - 3 || tz + d > N - 3) return { ok: false, reason: 'bounds' };
    if (def.tech && !o.ignoreTech && !t.techs.has(def.tech)) return { ok: false, reason: 'tech' };
    if (def.limit) { let c = 0; for (const b of this.buildings) if (b.team === teamId && b.key === key) c++; if (c >= def.limit) return { ok: false, reason: 'limit' }; }
    let hMin = 1e9, hMax = -1e9;
    for (let z = tz; z < tz + d; z++) {
      for (let x = tx; x < tx + w; x++) {
        const idx = z * N + x;
        const k = this.T.kind[idx];
        if (def.bridge) { if (k === KIND.CLIFF) return { ok: false, reason: 'terrain' }; }
        else if (k !== KIND.LAND) return { ok: false, reason: k === KIND.CLIFF ? 'terrain' : 'water' };
        if (this.nav.nocc[idx]) return { ok: false, reason: 'node' };
        const oid = this.nav.occ[idx];
        if (oid) {
          const ob = this.byId.get(oid);
          if (!(def.bridge && ob && ob.def.moat)) return { ok: false, reason: 'occupied' };
        }
        if (this.T.slope[idx] > 1.1 && !def.line && !def.bridge) return { ok: false, reason: 'slope' };
      }
    }
    for (let z = tz; z <= tz + d; z++) for (let x = tx; x <= tx + w; x++) { const h = this.T.H[z * (N + 1) + x]; if (h < hMin) hMin = h; if (h > hMax) hMax = h; }
    if (!def.bridge && !def.moat && hMax - hMin > (def.line ? 2.4 : 1.7)) return { ok: false, reason: 'slope' };
    if (def.needNode) {
      const types = def.needNode === 'tree' ? ['tree'] : def.needNode === 'stone' ? ['stone'] : ['ore', 'gold'];
      let c = 0; const cx = (tx + w / 2) * TILE, cz = (tz + d / 2) * TILE;
      this.nodesNear(cx, cz, 18, (n) => { if (types.includes(n.type)) c++; });
      if (c < (def.needNode === 'tree' ? 4 : 2)) return { ok: false, reason: 'nores' };
    }
    if (key === 'hunter') {
      let c = 0; this.nodesNear((tx + w / 2) * TILE, (tz + d / 2) * TILE, 44, (n) => { if (n.type === 'deer') c++; });
      if (!c) return { ok: false, reason: 'nores' };
    }
    if (!o.free && !o.ignoreTerritory && this.mode !== 'custom' && !this.inTerritory(t, key, tx, tz, w, d)) {
      // the very first capital building may be placed anywhere inside the map
      const hasCapital = this.buildings.some((b) => b.team === teamId && b.def.territory && !b.dead);
      if (hasCapital) return { ok: false, reason: 'territory' };
    }
    if (!o.free && !o.skipCost) {
      const cost = def.cost;
      if (!this.canAfford(t, cost)) return { ok: false, reason: 'cost' };
    }
    return { ok: true, w, d };
  }

  addBuilding(key, teamId, tx, tz, rot = 0, o = {}) {
    const def = BUILDINGS[key];
    const { w, d } = this.footprint(key, rot);
    const t = this.teams[teamId];
    const b = {
      id: o.id || this.id(), kind: 'b', key, def, team: teamId, tx, tz, w, d, rot: rot & 1, level: 1,
      cx: (tx + w / 2) * TILE, cz: (tz + d / 2) * TILE, hp: 1, maxHp: def.hp, progress: o.complete ? 1 : 0, built: !!o.complete,
      queue: [], rally: null, want: def.workers || 0, workers: [], prog: 0, cd: 0, garrison: [], gateOpen: 0,
      dead: false, rad: Math.max(w, d) * TILE * 0.5, passable: !!(def.bridge || key === 'wheatfield'), gate: !!def.gate, builders: 0, _w: 0,
      under: [], upg: null, captureT: 0, lastHit: -99, age: 0, noRes: 0,
    };
    b.y = this._footY(tx, tz, w, d);
    b.height = BH[key] || 6;
    b.maxHp = def.hp * this.hpMult(b, t);
    b.hp = o.complete ? b.maxHp : b.maxHp * 0.1;
    // occupancy
    for (let z = tz; z < tz + d; z++) for (let x = tx; x < tx + w; x++) {
      const idx = z * this.N + x; const prev = this.nav.occ[idx];
      if (prev && def.bridge) b.under.push([idx, prev]);
      this.nav.occ[idx] = b.id;
    }
    this.buildings.push(b); this.byId.set(b.id, b);
    this.nav.version++; this.bDirty = true;
    if (o.complete) this._finish(b, true);
    this.emit('buildingAdded', b);
    return b;
  }
  _footY(tx, tz, w, d) {
    let mx = -1e9;
    for (let z = tz; z <= tz + d; z++) for (let x = tx; x <= tx + w; x++) { const h = this.T.H[z * (this.N + 1) + x]; if (h > mx) mx = h; }
    return mx + 0.02;
  }
  hpMult(b, t) {
    let m = 1 + (b.level - 1) * 0.3;
    if (b.def.wall || b.def.tower || b.def.line) m *= 1 + t.mods.wallHp;
    if (b.def.gate) m *= 1 + t.mods.gateHp;
    return m;
  }
  refreshBuildingStats(t) {
    for (const b of this.buildings) {
      if (b.team !== t.id) continue;
      const nm = b.def.hp * this.hpMult(b, t);
      if (Math.abs(nm - b.maxHp) > 0.5) { const f = b.hp / b.maxHp; b.maxHp = nm; b.hp = nm * f; }
    }
  }
  _finish(b, silent) {
    b.built = true; b.progress = 1; b.hp = Math.max(b.hp, b.maxHp * (silent ? 1 : 0.95)); if (silent) b.hp = b.maxHp;
    const t = this.teams[b.team];
    if (b.def.territory) t.capitalId = t.capitalId || b.id;
    t.stats.built++;
    this.recalcTeam(t);
    if (!silent) { this.emit('buildingDone', b); this.notify(b.team, 'n.built', { b: b.key }, 'good', { x: b.cx, z: b.cz }); }
  }

  isCapital(b) { return !!b.def.territory; }

  // remove a building from the world (destroyed or demolished)
  removeBuilding(b, how) {
    if (b.dead) return;
    b.dead = true;
    const N = this.N;
    for (let z = b.tz; z < b.tz + b.d; z++) for (let x = b.tx; x < b.tx + b.w; x++) {
      const idx = z * N + x;
      if (this.nav.occ[idx] === b.id) this.nav.occ[idx] = 0;
    }
    for (const [idx, prev] of b.under) { const pb = this.byId.get(prev); if (pb && !pb.dead) this.nav.occ[idx] = prev; }
    this.nav.version++; this.bDirty = true;
    // free garrison / workers / queue refunds
    for (const uid of b.garrison.slice()) { const u = this.byId.get(uid); if (u) this.ungarrison(u, how === 'destroyed'); }
    for (const uid of b.workers) { const u = this.byId.get(uid); if (u && u.job && u.job.bid === b.id) u.job = null; }
    const t = this.teams[b.team];
    if (how !== 'captured') for (const q of b.queue) if (q.cost) this.refund(t, q.cost, 1);
    const i = this.buildings.indexOf(b); if (i >= 0) this.buildings.splice(i, 1);
    this.byId.delete(b.id);
    this.emit('buildingRemoved', { b, how });
    this.recalcTeam(t);
    if (b.def.territory && t.capitalId === b.id) { t.capitalId = 0; for (const o of this.buildings) if (o.team === t.id && o.def.territory && o.built) { t.capitalId = o.id; break; } }
    if (how === 'destroyed') { t.stats.lost++; this.notify(b.team, 'n.lostbuilding', { b: b.key }, 'bad', { x: b.cx, z: b.cz }, 3); }
  }

  demolish(b) {
    if (b.dead) return false;
    const t = this.teams[b.team];
    if (b.def.territory) { const caps = this.buildings.filter((o) => o.team === b.team && o.def.territory && !o.dead); if (caps.length <= 1 && this.mode !== 'free') return false; }
    const f = b.built ? 0.5 : 0.8 * (1 - b.progress);
    this.refund(t, b.def.cost, f);
    this.removeBuilding(b, 'demolished');
    return true;
  }

  // ---- relocation: a finished building is taken down and re-erected elsewhere for a quarter of its cost (half the work is kept)
  relocateCost(b) { return this.scaledCost(b, b.key, 0.25); }
  canRelocate(b) {
    return !!b && !b.dead && b.built && !b.upg && !b.def.line && !b.def.wall && !b.def.moat && !b.def.bridge && !b.def.territory && !b.def.limit;
  }
  relocateBuilding(b, tx, tz, rot) {
    if (!this.canRelocate(b)) return { ok: false, reason: 'norelocate' };
    const t = this.teams[b.team], cost = this.relocateCost(b);
    const chk = this.canPlace(b.key, b.team, tx, tz, rot, { skipCost: true });
    if (!chk.ok) return { ok: false, reason: chk.reason };
    if (!this.canAfford(t, cost)) return { ok: false, reason: 'cost' };
    this.spend(t, cost);
    const level = b.level, frac = b.hp / b.maxHp, key = b.key, team = b.team;
    this.removeBuilding(b, 'relocated');
    const nb = this.addBuilding(key, team, tx, tz, rot, { complete: false });
    nb.progress = 0.5;
    if (level > 1) { nb.level = level; nb.maxHp = nb.def.hp * this.hpMult(nb, t); }
    nb.hp = Math.max(1, nb.maxHp * Math.min(1, frac) * 0.5);
    this.emit('sfx', { s: 'place', x: nb.cx, z: nb.cz });
    return { ok: true, b: nb };
  }

  damageBuilding(b, dmg, src, kind) {
    if (b.dead || !(dmg > 0)) return;
    b.hp -= dmg; b.lastHit = this.time;
    const t = this.teams[b.team];
    this.notify(b.team, 'n.attack', {}, 'bad', { x: b.cx, z: b.cz }, 12);
    t.lastHitAt = this.time;
    this.emit('bhit', { b, dmg, kind });
    if (b.hp <= 0) {
      if (b.def.wall || b.def.gate) this.emit('sfx', { s: 'collapse', x: b.cx, z: b.cz });
      this.removeBuilding(b, 'destroyed');
    }
  }

  // ownership change (capture)
  captureBuilding(b, newTeam) {
    const old = this.teams[b.team];
    b.team = newTeam; b.hp = Math.max(b.hp, b.maxHp * 0.35); b.queue.length = 0; b.captureT = 0;
    for (const uid of b.workers) { const u = this.byId.get(uid); if (u && u.job) u.job = null; }
    b.workers.length = 0;
    for (const uid of b.garrison.slice()) { const u = this.byId.get(uid); if (u) this.ungarrison(u, false); }
    this.recalcTeam(old); this.recalcTeam(this.teams[newTeam]);
    if (this.teams[newTeam].capitalId === 0 && b.def.territory) this.teams[newTeam].capitalId = b.id;
    if (old.capitalId === b.id) { old.capitalId = 0; for (const o of this.buildings) if (o.team === old.id && o.def.territory && o.built) { old.capitalId = o.id; break; } }
    this.emit('captured', b);
    this.notify(newTeam, 'n.captured', {}, 'good', { x: b.cx, z: b.cz });
    this.notify(old.id, 'n.lostcastle', {}, 'bad', { x: b.cx, z: b.cz });
  }

  // ---------------------------------------------------------------- player-facing building actions
  placeBuilding(teamId, key, tx, tz, rot, o = {}) {
    const chk = this.canPlace(key, teamId, tx, tz, rot, o);
    if (!chk.ok) return { ok: false, reason: chk.reason };
    const t = this.teams[teamId];
    if (!o.free) this.spend(t, BUILDINGS[key].cost);
    const b = this.addBuilding(key, teamId, tx, tz, rot, { complete: !!o.complete });
    this.emit('sfx', { s: 'place', x: b.cx, z: b.cz });
    return { ok: true, b };
  }

  upgradeCost(b) { const f = 0.5 * b.level; return this.scaledCost(b, b.key, f); }
  canUpgrade(b) {
    if (!b.built || b.level >= 3 || b.upg || b.def.moat || b.def.bridge || b.key === 'wheatfield') return false;
    return true;
  }
  upgradeBuilding(b) {
    const t = this.teams[b.team];
    if (!this.canUpgrade(b)) return false;
    const c = this.upgradeCost(b);
    if (!this.canAfford(t, c)) return false;
    this.spend(t, c);
    b.upg = { t: 0, total: Math.max(8, b.def.time * 0.7) };
    this.emit('sfx', { s: 'build', x: b.cx, z: b.cz });
    return true;
  }
  levelUp(b) {
    b.level++; b.upg = null;
    const t = this.teams[b.team];
    const nm = b.def.hp * this.hpMult(b, t);
    const f = b.hp / b.maxHp; b.maxHp = nm; b.hp = nm * Math.max(f, 0.9);
    this.emit('buildingLevel', b);
    this.notify(b.team, 'n.upgraded', { b: b.key, l: b.level }, 'good', { x: b.cx, z: b.cz });
  }

  setWorkers(b, n) { b.want = clamp(n, 0, b.def.workers || 0); }

  // ---------------------------------------------------------------- production & research
  unitAvailable(t, key) { const d = UNITS[key]; return !d.tech || t.techs.has(d.tech); }
  queueUnit(b, key) {
    const t = this.teams[b.team]; const d = UNITS[key];
    if (!b.built || !d || !b.def.trains || !b.def.trains.includes(key)) return false;
    if (!this.unitAvailable(t, key)) return false;
    if (b.queue.length >= 6) return false;
    if (!this.canAfford(t, d.cost)) return false;
    this.spend(t, d.cost);
    let pb = 1 + t.mods.train;
    if (this.buildings.some((o) => o.team === b.team && o.built && o.def.trainBonus && !o.dead)) pb += 0.12;
    pb += (b.level - 1) * 0.1;
    b.queue.push({ type: 'unit', id: key, left: d.time / pb, total: d.time / pb, cost: d.cost });
    this.emit('sfx', { s: 'ui', x: b.cx, z: b.cz });
    return true;
  }
  researchAvailable(t, tech, b) {
    if (t.techs.has(tech.id)) return false;
    if (b && b.queue.some((q) => q.type === 'tech' && q.id === tech.id)) return false;
    for (const r of tech.req) if (!t.techs.has(r)) return false;
    return true;
  }
  queueResearch(b, techId) {
    const t = this.teams[b.team]; const tech = TECH_BY_ID[techId];
    if (!tech || !b.built || b.def.research !== tech.bld) return false;
    if (!this.researchAvailable(t, tech, b)) return false;
    for (const o of this.buildings) if (o.team === b.team && o.queue.some((q) => q.type === 'tech' && q.id === techId)) return false;
    if (b.queue.length >= 4 || !this.canAfford(t, tech.cost)) return false;
    this.spend(t, tech.cost);
    b.queue.push({ type: 'tech', id: techId, left: tech.time, total: tech.time, cost: tech.cost });
    this.emit('sfx', { s: 'ui', x: b.cx, z: b.cz });
    return true;
  }
  cancelQueue(b, index) {
    const q = b.queue[index]; if (!q) return;
    this.refund(this.teams[b.team], q.cost, 1);
    b.queue.splice(index, 1);
  }

  // ---------------------------------------------------------------- trade
  trade(teamId, res, amount, sell) {
    const t = this.teams[teamId];
    if (!this.buildings.some((b) => b.team === teamId && b.key === 'market' && b.built)) return false;
    const price = PRICES[res]; if (!price) return false;
    const fee = t.mods.fee;
    if (sell) {
      if (t.res[res] < amount) return false;
      const g = Math.floor(amount * price * (1 - fee));
      t.res[res] -= amount; t.acc[res].o += amount;
      this.addRes(t, 'gold', g);
    } else {
      const cost = Math.ceil(amount * price * (1 + fee));
      if (t.res.gold < cost) return false;
      if (t.res[res] + amount > t.cap[res]) amount = Math.floor(t.cap[res] - t.res[res]);
      if (amount <= 0) return false;
      t.res.gold -= Math.ceil(amount * price * (1 + fee)); t.acc.gold.o += cost;
      this.addRes(t, res, amount);
    }
    this.emit('sfx', { s: 'coin' });
    return true;
  }

  // ---------------------------------------------------------------- update loop
  update(dt) {
    if (dt <= 0) return;
    this.time += dt;
    this.pathBudget = 48;
    this.rebuildHash();
    this.updateEconomy(dt);
    this.updateBuildings(dt);
    this.updateUnits(dt);
    this.updateProjectiles(dt);
    for (const t of this.teams) if (t.ai && !t.defeated) t.ai.update(dt);
    this.secT += dt;
    if (this.secT >= 1) { this.secT -= 1; this.sec++; this.everySecond(); }
  }

  everySecond() {
    for (const t of this.teams) {
      this.recalcTeam(t);
      for (const r of RES) { const a = t.acc[r]; t.flow[r].rin = t.flow[r].rin * 0.85 + a.i * 0.15; t.flow[r].rout = t.flow[r].rout * 0.85 + a.o * 0.15; a.i = 0; a.o = 0; }
    }
    this.checkDefeats();
    this.checkObjectives();
  }

  alive(teamId) { return !this.teams[teamId].defeated; }

  checkDefeats() {
    for (const t of this.teams) {
      if (t.defeated) continue;
      if (this.mode === 'custom') {
        // custom battle: defeated when every soldier is dead and no capital building stands
        const hasCap = this.buildings.some((b) => b.team === t.id && b.def.territory && !b.dead);
        const army = this.units.some((u) => u.team === t.id && !u.dead && u.cls !== 'work');
        if (!hasCap || !army) this.defeatTeam(t);
        continue;
      }
      const hasCap = this.buildings.some((b) => b.team === t.id && b.def.territory && !b.dead);
      if (!hasCap) this.defeatTeam(t);
    }
  }
  defeatTeam(t) {
    if (t.defeated) return;
    t.defeated = true;
    for (const b of this.buildings.slice()) if (b.team === t.id) { if (b.def.wall || b.def.tower) this.damageBuilding(b, b.hp + 1, null, 'collapse'); else this.removeBuilding(b, 'destroyed'); }
    for (const u of this.units) if (u.team === t.id && !u.dead) this.killUnit(u, null, true);
    this.emit('teamDefeated', t);
    this.notify(-1, 'n.teamdefeated', { name: t.name }, 'info');
  }

  checkObjectives() {
    if (this.over) return;
    const p = this.teams.find((t) => t.kind === 'player');
    if (!p) return;
    if (p.defeated) { this.finish(false, 'capital'); return; }
    const enemies = this.teams.filter((t) => t.id !== p.id);
    const allDead = enemies.length > 0 && enemies.every((t) => t.defeated);
    if (this.objectives.length) {
      let all = true;
      for (const o of this.objectives) {
        if (o.done) continue;
        switch (o.t) {
          case 'build': o.v = this.buildings.filter((b) => b.team === p.id && b.key === o.key && b.built).length; o.done = o.v >= o.n; break;
          case 'pop': o.v = p.pop; o.done = o.v >= o.n; break;
          case 'army': o.v = p.army; o.done = o.v >= o.n; break;
          case 'gold': o.v = Math.floor(p.res.gold); o.done = o.v >= o.n; break;
          case 'kill': o.v = p.stats.kills; o.done = o.v >= o.n; break;
          case 'survive': o.v = Math.floor(this.time); o.done = this.time >= o.s; break;
          case 'destroy': o.v = enemies.filter((t) => t.defeated).length; o.n = enemies.length; o.done = allDead; break;
        }
        if (o.done) this.notify(p.id, 'n.objdone', { o: o.t }, 'good');
        if (!o.done) all = false;
      }
      if (all) this.finish(true, 'objectives');
    } else if (this.mode !== 'free') {
      const v = this.opts.victory || 'conquest';
      if (allDead) this.finish(true, 'conquest');
      else if (v === 'wealth' && p.res.gold >= 3000) this.finish(true, 'wealth');
      else if (v === 'timed' && this.time >= (this.opts.timeLimit || 1800)) {
        const best = [...this.teams].sort((a, b) => this.score(b) - this.score(a))[0];
        this.finish(best.id === p.id, 'timed');
      }
    }
  }
  score(t) { let s = t.pop * 5 + t.res.gold * 0.2; for (const b of this.buildings) if (b.team === t.id) s += b.def.hp * 0.02; s += t.stats.kills * 10; return s; }
  finish(win, reason) {
    if (this.over) return;
    this.over = { win, reason, time: this.time };
    this.emit('gameOver', this.over);
  }
}

import { installUnits } from './units.js';
import { installEconomy } from './economy.js';
installUnits(Game);
installEconomy(Game);
