// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Units: creation, orders, formations, movement, combat, siege, garrison, villager jobs, projectiles.
import { UNITS, BUILDINGS, TILE, NODE_RES, CARRY } from './data.js';
import { dist, dist2, clamp, angDiff } from './util.js';

const INF = 1e9;
const G = 17; // projectile gravity
const SIGHT = { inf: 17, cav: 22, rng: 0, siege: 14, work: 0 };
const DROP = {
  keep: null, townhall: null, warehouse: null, storage: null,
  treasury: ['gold'], woodcutter: ['wood'], quarry: ['stone'], mine: ['iron', 'gold'], hunter: ['food'], farm: ['food'],
};
let ORDER_SEQ = 1;

export function formationOffsets(type, n, sp) {
  const out = [];
  if (n <= 0) return out;
  switch (type) {
    case 'square': {
      if (n < 8) return formationOffsets('line', n, sp);
      const side = Math.max(3, Math.ceil(n / 4) + 1);
      const half = (side - 1) / 2;
      const ring = [];
      for (let i = 0; i < side; i++) { ring.push([i - half, half]); }
      for (let i = 1; i < side; i++) { ring.push([half, half - i]); }
      for (let i = 1; i < side; i++) { ring.push([half - i, -half]); }
      for (let i = 1; i < side - 1; i++) { ring.push([-half, -half + i]); }
      let k = 0;
      while (out.length < n) { const [x, z] = ring[k % ring.length]; const layer = Math.floor(k / ring.length); out.push({ x: x * sp * (1 - layer * 0.15), z: (z * sp * (1 - layer * 0.15)) - half * sp }); k++; }
      return out;
    }
    case 'wedge': {
      let row = 0;
      while (out.length < n) {
        const cnt = row * 2 + 1;
        for (let i = 0; i < cnt && out.length < n; i++) out.push({ x: (i - (cnt - 1) / 2) * sp, z: -row * sp * 0.95 });
        row++;
      }
      return out;
    }
    case 'shieldwall': {
      const cols = Math.max(2, Math.ceil(n / 3));
      for (let i = 0; i < n; i++) out.push({ x: ((i % cols) - (cols - 1) / 2) * sp * 0.78, z: -Math.floor(i / cols) * sp * 0.8 });
      return out;
    }
    case 'archer': {
      const cols = Math.min(n, 26);
      for (let i = 0; i < n; i++) out.push({ x: ((i % cols) - (cols - 1) / 2) * sp * 1.1, z: -Math.floor(i / cols) * sp * 1.1 });
      return out;
    }
    case 'charge': {
      const cols = Math.max(3, Math.ceil(n / 2));
      for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); out.push({ x: (c - (cols - 1) / 2) * sp * 1.35, z: -r * sp * 1.5 - Math.abs(c - (cols - 1) / 2) * 0.35 * sp }); }
      return out;
    }
    default: { // line
      const cols = Math.max(1, Math.min(n, Math.ceil(Math.sqrt(n * 3.2))));
      for (let i = 0; i < n; i++) out.push({ x: ((i % cols) - (cols - 1) / 2) * sp, z: -Math.floor(i / cols) * sp });
    }
  }
  return out;
}
const CLASS_PRI = { shield: 0, heavy: 0, guard: 0, sword: 1, spear: 1, lightcav: 1, heavycav: 1, archer: 3, crossbow: 3, catapult: 4, ram: 2, siegetower: 2 };

export function installUnits(Game) {
  const P = Game.prototype;

  // ------------------------------------------------------------- creation
  P.refreshUnitStats = function (u) {
    const d = u.def, m = this.teams[u.team].mods;
    u.atk = d.atk * (1 + m.atk) * (u.cls === 'cav' ? 1 + m.cav : 1) * (u.cls === 'rng' ? 1 + m.rdmg : 1);
    u.armor = d.def + m.def;
    u.blockStat = d.block ? d.block + m.block : 0;
    u.range = d.range + (u.cls === 'rng' ? m.rrange : 0);
    u.speed = d.speed;
    u.cd = d.cd;
    u.sight = u.cls === 'rng' ? Math.max(u.range + 3, 18) : u.key === 'catapult' ? 46 : SIGHT[u.cls] || 14;
  };

  P.addUnit = function (key, team, x, z, o = {}) {
    const def = UNITS[key];
    const u = {
      id: o.id || this.id(), kind: 'u', key, def, cls: def.cls, team, x, z, y: this.T.heightAt(x, z), ry: o.ry != null ? o.ry : this.rng() * 6.28,
      hp: def.hp, maxHp: def.hp, rad: def.rad * (def.cls === 'siege' ? 1 : 0.75) , order: { type: 'idle' }, path: null, pi: 0, target: null,
      atkPhase: 0, hitDone: false, atkCool: 0, state: 'idle', st: 0, stance: def.cls === 'work' ? 'passive' : 'aggressive', anchor: { x, z },
      carry: null, job: null, dead: false, deadT: 0, scanT: this.rng() * 0.4, hurtT: 0, blockT: 0, dodgeT: 0, workPhase: this.rng() * 6,
      vx: 0, vz: 0, kx: 0, kz: 0, speedNow: 0, stuckT: 0, navKey: null, blockBid: 0, navFail: 0, tx: Math.floor(x / TILE), tz: Math.floor(z / TILE),
      runDist: 0, inside: 0, garrisonOf: 0, form: o.form || null, faceAngle: null, holdT: 0, cheer: false, seed: this.rng(), passengers: null,
    };
    u.rad = def.cls === 'siege' ? def.rad : def.cls === 'cav' ? 1.0 : 0.62;
    this.refreshUnitStats(u);
    this.units.push(u); this.byId.set(u.id, u);
    this.emit('unitAdded', u);
    return u;
  };

  P.killUnit = function (u, src, silent) {
    if (u.dead) return;
    u.dead = true; u.hp = 0; u.state = 'die'; u.deadT = 0; u.target = null;
    if (u.garrisonOf) this.ungarrison(u, false, true);
    if (u.inside) { const tw = this.byId.get(u.inside); if (tw && tw.passengers) tw.passengers = tw.passengers.filter((i) => i !== u.id); }
    if (u.passengers) { for (const pid of u.passengers) { const p = this.byId.get(pid); if (p) this.killUnit(p, src, true); } u.passengers = null; }
    this.clearJob(u);
    const t = this.teams[u.team];
    t.stats.lost++;
    if (src && src.team !== u.team) { this.teams[src.team].stats.kills++; }
    this.emit('unitDied', { u, src, silent });
    if (!silent && u.team !== src?.team) this.notify(u.team, 'n.attack', {}, 'bad', { x: u.x, z: u.z }, 12);
  };

  P.damageUnit = function (t, dmg, src, type) {
    if (t.dead || !(dmg > 0)) return;
    t.hp -= dmg; t.hurtT = 0.25; t.lastHurt = this.time;
    this.emit('uhit', { u: t, dmg, type });
    if (src && !t.target && t.cls !== 'work' && t.order.type !== 'move' && t.order.type !== 'retreat') { t.target = src.id; }
    if (t.hp <= 0) this.killUnit(t, src);
  };

  // ------------------------------------------------------------- orders
  P._prep = function (units) {
    const out = [];
    for (const u of units) { if (!u || u.dead || u.cls === 'work' && false) continue; out.push(u); }
    return out;
  };
  P._resetOrderState = function (u) {
    if (u.garrisonOf) this.ungarrison(u, false);
    if (u.inside) this.leaveTower(u);
    u.target = null; u.blockBid = 0; u.path = null; u.navKey = null; u.atkPhase = 0; u.cheer = false;
    u.holdT = 0;
  };

  P.orderStance = function (units, stance) { for (const u of units) if (!u.dead) { u.stance = stance; u.anchor = { x: u.x, z: u.z }; } };

  P.slotsFor = function (units, x, z, formation, facing) {
    const n = units.length;
    let cx = 0, cz = 0; for (const u of units) { cx += u.x; cz += u.z; } cx /= n; cz /= n;
    let th = facing;
    if (th == null) { const dx = x - cx, dz = z - cz; th = Math.hypot(dx, dz) > 4 ? Math.atan2(dx, dz) : (units[0].faceAngle != null ? units[0].faceAngle : units[0].ry); }
    const big = units.some((u) => u.cls === 'siege');
    const sp = big ? 4.5 : units.some((u) => u.cls === 'cav') ? 2.8 : 1.95;
    const offs = formationOffsets(formation || 'line', n, sp);
    const fx = Math.sin(th), fz = Math.cos(th), rx = Math.cos(th), rz = -Math.sin(th);
    const slots = offs.map((o) => ({ x: x + rx * o.x + fx * o.z, z: z + rz * o.x + fz * o.z, row: -o.z, lat: o.x }));
    // assignment: front rows to heavy infantry, back rows to ranged; keep lateral order to avoid crossings
    const sortedU = units.slice().sort((a, b) => (CLASS_PRI[a.key] || 1) - (CLASS_PRI[b.key] || 1));
    const rows = {};
    for (const s of slots) { const k = Math.round(s.row * 10); (rows[k] = rows[k] || []).push(s); }
    const keys = Object.keys(rows).map(Number).sort((a, b) => a - b);
    const res = new Map();
    let ui = 0;
    for (const k of keys) {
      const rs = rows[k]; const take = sortedU.slice(ui, ui + rs.length); ui += rs.length;
      rs.sort((a, b) => a.lat - b.lat);
      take.sort((a, b) => ((a.x - cx) * rx + (a.z - cz) * rz) - ((b.x - cx) * rx + (b.z - cz) * rz));
      take.forEach((u, i) => res.set(u, rs[i]));
    }
    return { map: res, th };
  };

  P.orderMove = function (units, x, z, o = {}) {
    units = units.filter((u) => u && !u.dead);
    if (!units.length) return;
    const t = this.teams[units[0].team];
    const mil = units.filter((u) => u.cls !== 'work');
    const vil = units.filter((u) => u.cls === 'work');
    for (const v of vil) this._moveVillager(v, x + (this.rng() - 0.5) * 3, z + (this.rng() - 0.5) * 3);
    if (!mil.length) return;
    const seq = ORDER_SEQ++;
    const form = o.formation !== undefined ? o.formation : (mil.length > 4 ? (o.keepForm || t.formation || 'line') : null);
    if (form && mil.length > 1) {
      const { map, th } = this.slotsFor(mil, x, z, form, o.facing);
      for (const u of mil) {
        this._resetOrderState(u);
        const s = map.get(u);
        u.order = { type: o.attack ? 'attackmove' : 'move', x: s.x, z: s.z, key: 'o' + seq + u.id, face: th };
        u.faceAngle = th; u.form = form;
        if (form === 'charge' && u.cls === 'cav') u.chargeT = 8;
      }
    } else {
      for (const u of mil) {
        this._resetOrderState(u);
        u.order = { type: o.attack ? 'attackmove' : 'move', x: x + (mil.length > 1 ? (this.rng() - 0.5) * 5 : 0), z: z + (mil.length > 1 ? (this.rng() - 0.5) * 5 : 0), key: 'o' + seq + u.id, face: null };
        u.faceAngle = null;
      }
    }
  };
  P.orderAttackMove = function (units, x, z, o = {}) { this.orderMove(units, x, z, Object.assign({}, o, { attack: true })); };

  P.orderAttack = function (units, target) {
    for (const u of units) {
      if (!u || u.dead || u.cls === 'work') continue;
      this._resetOrderState(u);
      u.order = { type: 'attack', target: target.id, key: 'a' + ORDER_SEQ++ };
      if (u.chargeT === undefined && u.cls === 'cav') u.chargeT = 6;
    }
  };

  P.orderPatrol = function (units, x, z) {
    for (const u of units) {
      if (!u || u.dead || u.cls === 'work') continue;
      this._resetOrderState(u);
      u.order = { type: 'patrol', a: { x: u.x, z: u.z }, b: { x, z }, to: 'b', key: 'p' + ORDER_SEQ++ };
    }
  };

  P.orderRetreat = function (units) {
    for (const u of units) {
      if (!u || u.dead || u.cls === 'work') continue;
      const t = this.teams[u.team];
      const cap = this.byId.get(t.capitalId);
      this._resetOrderState(u);
      const tx = cap ? cap.cx : t.start ? t.start.tx * TILE : u.x, tz = cap ? cap.cz + cap.d * TILE * 0.5 + 6 : t.start ? t.start.tz * TILE : u.z;
      u.order = { type: 'retreat', x: tx + (this.rng() - 0.5) * 8, z: tz + (this.rng() - 0.5) * 8, key: 'r' + ORDER_SEQ++ };
      u.stance = 'defensive';
    }
  };

  P.orderStop = function (units) {
    for (const u of units) { if (!u || u.dead) continue; this._resetOrderState(u); u.order = { type: 'idle' }; u.anchor = { x: u.x, z: u.z }; if (u.cls === 'work') this.clearJob(u); }
  };

  P.orderGarrison = function (units, b) {
    for (const u of units) {
      if (!u || u.dead || u.cls !== 'rng') continue;
      this._resetOrderState(u);
      u.order = { type: 'garrison', target: b.id, key: 'g' + ORDER_SEQ++ };
    }
  };
  P.orderBoard = function (units, tower) {
    for (const u of units) {
      if (!u || u.dead || u.cls === 'work' || u.cls === 'siege' || u.cls === 'cav') continue;
      this._resetOrderState(u);
      u.order = { type: 'board', target: tower.id, key: 'bd' + ORDER_SEQ++ };
    }
  };
  P.orderDefend = function (units, x, z) {
    this.orderMove(units, x, z, { formation: undefined });
    for (const u of units) if (!u.dead && u.cls !== 'work') u.stance = 'defensive';
  };

  // right-click with villagers selected
  P.orderVillagers = function (units, target, x, z) {
    for (const u of units) {
      if (!u || u.dead || u.cls !== 'work') continue;
      this._villagerOrder(u, target, x, z);
    }
  };
  P._villagerOrder = function (u, target, x, z) {
    const t = this.teams[u.team];
    if (target && target.kind === 'n') {
      const res = NODE_RES[target.type];
      if (res) { this.assignJob(u, { type: 'gather', res, bid: 0, nodeId: 0, manual: true, pref: target.id }); return; }
    }
    if (target && target.kind === 'b' && target.team === u.team) {
      if (!target.built) { this.assignJob(u, { type: 'build', bid: target.id, manual: true }); return; }
      if (target.hp < target.maxHp) { this.assignJob(u, { type: 'repair', bid: target.id, manual: true }); return; }
      if (target.def.workers && target.workers.length < target.def.workers) {
        target.want = Math.max(target.want, target.workers.length + 1);
        if (target.def.gather) this.assignJob(u, { type: 'gather', res: target.def.gather, bid: target.id, nodeId: 0 });
        else this.assignJob(u, { type: 'work', bid: target.id });
        return;
      }
    }
    this._moveVillager(u, x != null ? x : (target ? target.x || target.cx : u.x), z != null ? z : (target ? target.z || target.cz : u.z));
  };
  P._moveVillager = function (u, x, z) {
    this.clearJob(u);
    u.order = { type: 'move', x, z, key: 'v' + ORDER_SEQ++ };
    u.holdT = this.time + 25;
  };

  // ------------------------------------------------------------- garrison / siege towers
  P.garrisonSlots = function (b) { return b.def.tower ? b.def.tower.slots : b.def.wall ? 1 : 0; };
  P.garrison = function (u, b) {
    const cap = this.garrisonSlots(b);
    if (!cap || b.garrison.length >= cap || b.team !== u.team || !b.built) return false;
    b.garrison.push(u.id); u.garrisonOf = b.id; u.order = { type: 'idle' }; u.path = null; u.target = null; u.stance = 'hold';
    const idx = b.garrison.length - 1;
    if (b.def.tower) { const a = idx / cap * 6.283 + 0.6; const r = Math.min(b.w * TILE * 0.5 - 1, 2.2); u.x = b.cx + Math.cos(a) * r; u.z = b.cz + Math.sin(a) * r; }
    else { u.x = b.cx; u.z = b.cz; }
    u.y = b.y + b.height - (b.def.wall ? 0.2 : 0.1);
    u.gy = u.y;
    this.emit('sfx', { s: 'ui', x: u.x, z: u.z });
    return true;
  };
  P.ungarrison = function (u, hurt, dying) {
    const b = this.byId.get(u.garrisonOf);
    u.garrisonOf = 0;
    if (b) { const i = b.garrison.indexOf(u.id); if (i >= 0) b.garrison.splice(i, 1); }
    if (dying) return;
    let tx = Math.floor(u.x / TILE), tz = Math.floor(u.z / TILE);
    if (b) { tx = b.tx + (b.w >> 1); tz = b.tz + b.d; }
    const f = this.nav.nearestFree(tx, tz, u.team, 6);
    if (f) { u.x = (f[0] + 0.5) * TILE; u.z = (f[1] + 0.5) * TILE; }
    u.y = this.T.heightAt(u.x, u.z);
    u.stance = 'aggressive'; u.anchor = { x: u.x, z: u.z };
    if (hurt) this.damageUnit(u, u.maxHp * 0.25, null, 'fall');
  };
  P.boardTower = function (u, tw) {
    if (!tw.passengers) tw.passengers = [];
    if (tw.passengers.length >= 10) return false;
    tw.passengers.push(u.id); u.inside = tw.id; u.order = { type: 'idle' }; u.path = null; u.target = null;
    this.emit('sfx', { s: 'ui', x: u.x, z: u.z });
    return true;
  };
  P.leaveTower = function (u) {
    const tw = this.byId.get(u.inside); u.inside = 0;
    if (tw) { if (tw.passengers) tw.passengers = tw.passengers.filter((i) => i !== u.id); u.x = tw.x + (this.rng() - 0.5) * 4; u.z = tw.z + (this.rng() - 0.5) * 4; }
  };
  P.deployTower = function (tw) {
    if (!tw.passengers || !tw.passengers.length) return;
    // find nearest hostile structure in front of the tower
    let wall = null, wd = 1e9;
    this.buildingsNear(tw.x, tw.z, 12, (b, d) => { if (b.team !== tw.team && d < wd && !b.def.moat) { wd = d; wall = b; } });
    let dx = Math.sin(tw.ry), dz = Math.cos(tw.ry);
    if (wall) { const l = Math.hypot(wall.cx - tw.x, wall.cz - tw.z) || 1; dx = (wall.cx - tw.x) / l; dz = (wall.cz - tw.z) / l; }
    const pass = tw.passengers.slice(); tw.passengers = [];
    let k = 0;
    for (const id of pass) {
      const u = this.byId.get(id); if (!u || u.dead) continue;
      u.inside = 0;
      let placed = false;
      for (let r = 2; r < 9 && !placed; r += 1) {
        const px = tw.x + dx * (wd + 2 + r) + (k % 3 - 1) * 1.8, pz = tw.z + dz * (wd + 2 + r) + (Math.floor(k / 3) - 1) * 1.8;
        const tx = Math.floor(px / TILE), tz = Math.floor(pz / TILE);
        if (this.nav.free(tx, tz, u.team)) { u.x = (tx + 0.5) * TILE; u.z = (tz + 0.5) * TILE; placed = true; }
      }
      if (!placed) { u.x = tw.x + dx * 3; u.z = tw.z + dz * 3; }
      u.y = this.T.heightAt(u.x, u.z) + 3; u.dropY = 3;
      u.stance = 'aggressive'; u.anchor = { x: u.x, z: u.z };
      const enemyCap = this.nearestEnemyCapital(u.team, u.x, u.z);
      u.order = enemyCap ? { type: 'attackmove', x: enemyCap.cx, z: enemyCap.cz, key: 'tw' + ORDER_SEQ++ } : { type: 'idle' };
      k++;
    }
    this.emit('sfx', { s: 'gate', x: tw.x, z: tw.z });
    this.emit('deploy', { tw });
  };
  P.nearestEnemyCapital = function (team, x, z) {
    let best = null, bd = 1e12;
    for (const b of this.buildings) { if (b.team === team || !b.def.territory) continue; const d = dist2(x, z, b.cx, b.cz); if (d < bd) { bd = d; best = b; } }
    return best;
  };

  // ------------------------------------------------------------- update loop
  P.updateUnits = function (dt) {
    const us = this.units; const n = us.length;
    for (let i = 0; i < n; i++) { const u = us[i]; if (u) this.updateUnit(u, dt); }
    for (let i = us.length - 1; i >= 0; i--) {
      const u = us[i];
      if (u.dead && u.deadT > 16) { us.splice(i, 1); this.byId.delete(u.id); this.emit('unitRemoved', u); }
    }
  };

  P.updateUnit = function (u, dt) {
    if (u.dead) { u.deadT += dt; return; }
    u.st += dt;
    if (u.hurtT > 0) u.hurtT -= dt;
    if (u.blockT > 0) u.blockT -= dt;
    if (u.dodgeT > 0) u.dodgeT -= dt;
    if (u.chargeT > 0) u.chargeT -= dt;
    const ox = u.x, oz = u.z;
    // knock-back impulse
    if (u.kx || u.kz) { this.tryMove(u, u.x + u.kx * dt, u.z + u.kz * dt); u.kx *= Math.max(0, 1 - dt * 7); u.kz *= Math.max(0, 1 - dt * 7); if (Math.abs(u.kx) + Math.abs(u.kz) < 0.1) u.kx = u.kz = 0; }
    if (u.dropY) { u.dropY = Math.max(0, u.dropY - dt * 6); }
    if (u.inside) { u.state = 'idle'; return; }
    if (u.garrisonOf) { this.updateGarrisoned(u, dt); return; }
    if (u.cls === 'work') this.updateVillager(u, dt); else this.updateSoldier(u, dt);
    // measured velocity for animation / leading shots
    const mv = Math.hypot(u.x - ox, u.z - oz) / dt;
    u.speedNow += (mv - u.speedNow) * Math.min(1, dt * 8);
    u.vx = (u.x - ox) / dt; u.vz = (u.z - oz) / dt;
    if (mv > 0.8) u.runDist += mv * dt; else u.runDist = Math.max(0, u.runDist - dt * 6);
    const gy = this.T.heightAt(u.x, u.z);
    u.y = u.dropY ? gy + u.dropY : gy;
  };

  // ------------------------------------------------------------- movement
  P.tryMove = function (u, nx, nz) {
    const want = Math.hypot(nx - u.x, nz - u.z);
    const tx = Math.floor(nx / TILE), tz = Math.floor(nz / TILE);
    if (tx !== u.tx || tz !== u.tz) {
      let c = this.nav.cost(tx, tz, u.team, false);
      if (c >= INF) {
        const bid = this.nav.occ[tz * this.N + tx];
        if (bid) { const b = this.byId.get(bid); if (b && b.team !== u.team && !b.passable) u.blockBid = bid; }
        // slide along obstacles
        if (this.nav.cost(tx, u.tz, u.team, false) < INF) { nz = u.z; }
        else if (this.nav.cost(u.tx, tz, u.team, false) < INF) { nx = u.x; }
        else { u.stuckT += 0.05; return false; }
        const ttx = Math.floor(nx / TILE), ttz = Math.floor(nz / TILE);
        if (this.nav.cost(ttx, ttz, u.team, false) >= INF && !(ttx === u.tx && ttz === u.tz)) { u.stuckT += 0.05; return false; }
      }
    }
    if (want > 0.02 && Math.hypot(nx - u.x, nz - u.z) < want * 0.3) { u.stuckT += 0.05; }
    u.x = nx; u.z = nz; u.tx = Math.floor(nx / TILE); u.tz = Math.floor(nz / TILE);
    return true;
  };

  P.turnTo = function (u, ang, dt, rate = 10) {
    const d = angDiff(u.ry, ang);
    u.ry += d * Math.min(1, dt * rate);
  };

  P.moveDirect = function (u, dt, x, z, speedMul = 1) {
    const dx = x - u.x, dz = z - u.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    let sp = u.speed * speedMul * (this.nav.stat[u.tz * this.N + u.tx] === 2 ? 0.65 : 1);
    if (u.chargeT > 0 && u.cls === 'cav') sp *= 1.2;
    const step = Math.min(d, sp * dt);
    this.tryMove(u, u.x + dx / d * step, u.z + dz / d * step);
    this.turnTo(u, Math.atan2(dx, dz), dt);
    this.separate(u, dt);
    u.state = 'walk';
    return d <= step + 0.05;
  };

  P.separate = function (u, dt) {
    let sx = 0, sz = 0, c = 0;
    const r = u.rad;
    this.unitsNear(u.x, u.z, r * 2 + 0.6, (o, d2) => {
      if (o === u) return;
      const d = Math.sqrt(d2) || 0.01; const m = r + o.rad;
      if (d < m) { const f = (m - d) / m; sx += (u.x - o.x) / d * f; sz += (u.z - o.z) / d * f; c++; }
    });
    if (c) {
      const l = Math.hypot(sx, sz);
      const k = Math.min(l, 1.4) * 3.2 * dt / (l || 1);
      this.tryMove(u, u.x + sx * k, u.z + sz * k);
    }
  };

  // generic path navigation: goal {x,z} or rect {x0,z0,x1,z1}; returns 'moving' | 'arrived' | 'fail'
  P.navTo = function (u, dt, goal, key, o = {}) {
    if (u.navKey !== key) {
      u.navKey = key; u.path = null; u.pi = 0; u.navFail = 0; u.pathDone = false;
    }
    if (u.pathDone) return 'arrived';
    if (!u.path) {
      if (this.pathBudget <= 0) { u.state = 'idle'; return 'moving'; }
      this.pathBudget--;
      const res = this.nav.findPath(u.x, u.z, goal, u.team, { breach: !!o.breach, reach: o.reach, maxExp: o.maxExp });
      if (!res) { u.navFail++; u.pathDone = true; return 'fail'; }
      u.path = res.path; u.pi = 0; u.partialPath = res.partial;
      if (!res.path.length) { u.pathDone = true; return 'arrived'; }
      if (goal.x != null && !res.partial) { const g = res.path[res.path.length - 1]; if (Math.abs(g.x - goal.x) < TILE && Math.abs(g.z - goal.z) < TILE) { g.x = goal.x; g.z = goal.z; } }
    }
    const wp = u.path[u.pi];
    if (!wp) { u.pathDone = true; return 'arrived'; }
    const dx = wp.x - u.x, dz = wp.z - u.z, d = Math.hypot(dx, dz);
    let sp = u.speed * (o.speedMul || 1) * (this.nav.stat[u.tz * this.N + u.tx] === 2 ? 0.65 : 1);
    if (u.chargeT > 0 && u.cls === 'cav') sp *= 1.2;
    const step = sp * dt;
    if (d <= Math.max(step, 0.2)) {
      u.x = wp.x; u.z = wp.z; u.tx = Math.floor(u.x / TILE); u.tz = Math.floor(u.z / TILE); u.pi++;
      if (u.pi >= u.path.length) { u.pathDone = true; return 'arrived'; }
    } else {
      const mx = u.x, mz = u.z;
      const ok = this.tryMove(u, u.x + dx / d * step, u.z + dz / d * step);
      if (ok && Math.hypot(u.x - mx, u.z - mz) > step * 0.5) u.stuckT = Math.max(0, u.stuckT - dt * 2);
      this.turnTo(u, Math.atan2(dx, dz), dt);
    }
    this.separate(u, dt);
    u.state = 'walk';
    if (u.stuckT > 0.45) {
      u.stuckT = 0;
      if (u.blockBid && o.breach) { /* hostile obstacle: caller will fight it */ }
      else { u.path = null; u.navKey = key; u.navFail++; if (u.navFail > 4) { u.pathDone = true; return 'fail'; } }
    }
    return 'moving';
  };

  // ------------------------------------------------------------- soldiers
  P.updateSoldier = function (u, dt) {
    const o = u.order;
    // validate target
    let tgt = u.target ? this.byId.get(u.target) : null;
    if (tgt && (tgt.dead || (tgt.hp !== undefined && tgt.hp <= 0) || tgt.team === u.team || (tgt.kind === 'n'))) { tgt = null; u.target = null; }
    if (tgt && tgt.kind === 'u' && this.teams[tgt.team].defeated) { tgt = null; u.target = null; }
    let forced = false;
    if (o.type === 'attack') {
      const e = this.byId.get(o.target);
      if (!e || e.dead || e.hp <= 0) { u.order = { type: 'idle' }; u.anchor = { x: u.x, z: u.z }; }
      else { tgt = e; forced = true; u.target = e.id; }
    }
    if (u.cheer) { u.state = 'cheer'; return; }
    const canAuto = !forced && (o.type === 'idle' || o.type === 'attackmove' || o.type === 'patrol');
    if (canAuto) {
      u.scanT -= dt;
      const inRange = tgt && this.edgeDist(u, tgt) <= u.range + 0.5;
      if (u.scanT <= 0 && !inRange) {
        u.scanT = 0.3 + this.rng() * 0.25;
        const acq = this.acquire(u);
        if (acq) { tgt = acq; u.target = acq.id; } else if (!tgt) u.target = null;
      }
    }
    if (u.blockBid && !forced) {
      const bb = this.byId.get(u.blockBid);
      if (bb && !bb.dead && bb.team !== u.team && o.type !== 'move' && o.type !== 'retreat') { if (!tgt || tgt.kind !== 'u' || this.edgeDist(u, tgt) > u.range + 2) { tgt = bb; u.target = bb.id; } }
      else u.blockBid = 0;
    }
    if (u.key === 'siegetower') { this.updateTowerUnit(u, dt, tgt); return; }
    if (tgt && o.type !== 'move' && o.type !== 'retreat') { this.engage(u, tgt, dt, forced); return; }
    u.atkPhase = 0;
    this.followOrder(u, dt);
  };

  P.edgeDist = function (u, t) {
    if (t.kind === 'b') return this.distToBuilding(u.x, u.z, t);
    return Math.hypot(u.x - t.x, u.z - t.z) - t.rad * 0.6 - u.rad * 0.3;
  };

  P.acquire = function (u) {
    const range = u.sight;
    if (u.key === 'ram' || u.key === 'siegetower') return this._acquireBuilding(u, range);
    let best = null, bs = -1e9;
    const o = u.order;
    const hold = u.stance === 'hold';
    const r = hold ? u.range + 1 : range;
    this.unitsNear(u.x, u.z, r, (e, d2) => {
      if (e.team === u.team || e.dead || e.inside) return;
      if (this.teams[e.team].defeated) return;
      if (e.garrisonOf && u.cls !== 'rng' && u.key !== 'catapult') return;
      if (u.key === 'catapult' && e.cls === 'work') return;
      const d = Math.sqrt(d2);
      let s = -d;
      if (e.cls === 'work') s -= 6;
      if (e.cls === 'siege') s += (u.cls === 'inf' || u.cls === 'cav') ? 9 : 2;
      if (e.cls === 'rng' && u.cls === 'cav') s += 5;
      if (e.cls === 'cav' && u.def.vsCav > 1) s += 7;
      if (e.target === u.id) s += 4;
      if (s > bs) { bs = s; best = e; }
    });
    if (best && u.cls !== 'siege') return best;
    const wantB = u.cls === 'siege' || ((o.type === 'attackmove') && (u.cls === 'inf' || u.cls === 'cav'));
    if (wantB) { const b = this._acquireBuilding(u, range); if (b) return b; }
    return best;
  };
  P._acquireBuilding = function (u, range) {
    let best = null, bs = -1e9;
    const siege = u.cls === 'siege';
    this.buildingsNear(u.x, u.z, range, (b, d) => {
      if (b.team === u.team || b.dead) return;
      if (this.teams[b.team].defeated) return;
      const df = b.def;
      if (df.moat || df.bridge || b.key === 'wheatfield') return;
      if ((df.wall || df.line) && !siege) return;
      let s = -d;
      if (df.tower) s += 14; if (df.territory) s += 10; if (df.gate) s += 6; if (df.trains) s += 4;
      if (df.wall && u.key !== 'ram') s -= 8;
      if (s > bs) { bs = s; best = b; }
    });
    return best;
  };

  P.engage = function (u, tgt, dt, forced) {
    const isB = tgt.kind === 'b';
    const d = this.edgeDist(u, tgt);
    const rng = u.range;
    // catapult min range
    if (u.def.minRange && d < u.def.minRange) {
      const dx = u.x - (isB ? tgt.cx : tgt.x), dz = u.z - (isB ? tgt.cz : tgt.z), l = Math.hypot(dx, dz) || 1;
      this.moveDirect(u, dt, u.x + dx / l * 6, u.z + dz / l * 6, 0.8); u.atkPhase = 0; return;
    }
    if (d <= rng + 0.15) {
      // in range -> face and fight
      const tx = isB ? tgt.cx : tgt.x, tz = isB ? tgt.cz : tgt.z;
      this.turnTo(u, Math.atan2(tx - u.x, tz - u.z), dt, 14);
      this.separate(u, dt * 0.4);
      this.doAttack(u, tgt, dt);
      return;
    }
    // out of range: chase
    u.atkPhase = 0;
    if (u.stance === 'hold') { u.target = null; this.followOrder(u, dt); return; }
    if (!forced && u.order.type === 'idle') {
      const lim = u.stance === 'defensive' ? 22 : 46;
      if (dist(u.x, u.z, u.anchor.x, u.anchor.z) > lim) { u.target = null; return; }
    }
    if (isB) {
      const rect = { x0: tgt.tx, z0: tgt.tz, x1: tgt.tx + tgt.w - 1, z1: tgt.tz + tgt.d - 1 };
      const reach = u.cls === 'rng' || u.key === 'catapult' ? Math.max(1, Math.floor((rng - 1) / TILE)) : 1;
      const r = this.navTo(u, dt, rect, 'tb' + tgt.id, { breach: true, reach });
      if (r === 'fail' || (r === 'arrived' && this.edgeDist(u, tgt) > rng + 1.5)) { u.target = null; if (forced) u.order = { type: 'idle' }; u.pathDone = false; u.navKey = null; }
    } else {
      const cell = ((tgt.x / 3) | 0) + ',' + ((tgt.z / 3) | 0);
      if (d < 14 && this.nav.los(u.x, u.z, tgt.x, tgt.z, u.team)) { this.moveDirect(u, dt, tgt.x, tgt.z); u.navKey = null; return; }
      const r = this.navTo(u, dt, { x: tgt.x, z: tgt.z }, 'tu' + tgt.id + cell, { breach: true });
      if (r === 'fail') { u.target = null; if (forced) { u.order = { type: 'idle' }; } }
      else if (r === 'arrived') { u.navKey = null; }
    }
  };

  P.doAttack = function (u, tgt, dt) {
    if (u.atkPhase === 0) {
      if (u.atkCool > 0) { u.atkCool -= dt; u.state = 'idle'; return; }
      u.atkPhase = 0.0001; u.hitDone = false;
    }
    u.state = 'attack';
    u.atkPhase += dt / u.cd;
    if (!u.hitDone && u.atkPhase >= 0.45) { u.hitDone = true; this.strike(u, tgt); }
    if (u.atkPhase >= 1) { u.atkPhase = 0; u.atkCool = 0.05 + this.rng() * 0.15; }
  };

  P.strike = function (u, tgt) {
    const m = this.teams[u.team].mods;
    if (u.key === 'catapult') {
      const ty = tgt.kind === 'b' ? tgt.y + 1 : tgt.y;
      this.shoot({ x: u.x, y: u.y + 3, z: u.z, team: u.team }, tgt, u.atk * (1 + m.siegeDmg), { type: 'stone', speed: 24, splash: u.def.splash, srcU: u.id, bld: u.def.bld });
      this.emit('sfx', { s: 'catapult', x: u.x, z: u.z });
      return;
    }
    if (u.cls === 'rng') {
      this.shoot({ x: u.x, y: u.y + 1.5, z: u.z, team: u.team }, tgt, u.atk, { type: 'arrow', speed: 40, srcU: u.id, pierce: u.def.pierce || 0 });
      this.emit('sfx', { s: u.key === 'crossbow' ? 'crossbow' : 'bow', x: u.x, z: u.z });
      return;
    }
    this.meleeHit(u, tgt);
  };

  P.meleeHit = function (u, t) {
    const m = this.teams[u.team].mods;
    let dmg = u.atk;
    if (t.kind === 'b') {
      dmg *= u.def.bld * (u.cls === 'siege' ? 1 + m.siegeDmg : 1);
      this.damageBuilding(t, dmg, u, 'melee');
      this.emit('impact', { x: (u.x + t.cx) / 2, y: t.y + 1.2, z: (u.z + t.cz) / 2, type: u.cls === 'siege' ? 'ram' : 'wall' });
      this.emit('sfx', { s: u.cls === 'siege' ? 'ram' : 'thud', x: u.x, z: u.z });
      return;
    }
    let charged = false;
    if (u.cls === 'cav' && u.runDist > 9) { dmg *= 1.7; charged = true; u.runDist = 0; }
    if (t.cls === 'cav' && u.def.vsCav > 1) dmg *= u.def.vsCav;
    const toA = Math.atan2(u.x - t.x, u.z - t.z);
    const front = Math.abs(angDiff(t.ry, toA)) < 1.35;
    let result = 'hit';
    if (t.state !== 'die' && t.cls !== 'siege') {
      if (t.blockStat > 0 && front && this.rng() < t.blockStat) result = 'block';
      else if (t.cls !== 'work' && this.rng() < 0.07) result = 'dodge';
    }
    const dx = t.x - u.x, dz = t.z - u.z, l = Math.hypot(dx, dz) || 1;
    if (result === 'block') {
      dmg *= 0.15; t.blockT = 0.35;
      this.emit('impact', { x: (u.x + t.x) / 2, y: t.y + 1.2, z: (u.z + t.z) / 2, type: 'clash' });
      this.emit('sfx', { s: 'clash', x: t.x, z: t.z });
    } else if (result === 'dodge') {
      dmg = 0; t.dodgeT = 0.4; t.dodgeDir = (this.rng() < 0.5 ? 1 : -1);
      this.emit('sfx', { s: 'swish', x: t.x, z: t.z });
    } else {
      this.emit('impact', { x: (u.x + t.x) / 2, y: t.y + 1.1, z: (u.z + t.z) / 2, type: charged ? 'charge' : 'hit' });
      this.emit('sfx', { s: charged ? 'charge' : (this.rng() < 0.5 ? 'clash' : 'hit'), x: t.x, z: t.z });
      t.kx += dx / l * (charged ? 5 : 1.4); t.kz += dz / l * (charged ? 5 : 1.4);
    }
    dmg *= 30 / (30 + Math.max(0, t.armor));
    if (dmg > 0) this.damageUnit(t, dmg, u, 'melee');
  };

  // follow non-combat order
  P.followOrder = function (u, dt) {
    const o = u.order;
    switch (o.type) {
      case 'move': case 'retreat': case 'attackmove': {
        const goal = { x: o.x, z: o.z };
        const r = this.navTo(u, dt, goal, o.key, { breach: o.type === 'attackmove', speedMul: o.type === 'retreat' ? 1.1 : 1 });
        if (r === 'arrived' || r === 'fail') {
          u.order = { type: 'idle' }; u.anchor = { x: u.x, z: u.z }; u.state = 'idle';
          if (o.face != null) u.faceAngle = o.face;
          u.navKey = null; u.pathDone = false;
          if (o.type === 'retreat') u.stance = 'defensive';
        }
        break;
      }
      case 'patrol': {
        const p = o.to === 'b' ? o.b : o.a;
        const r = this.navTo(u, dt, { x: p.x, z: p.z }, o.key + o.to, { breach: false });
        if (r === 'arrived' || r === 'fail') { o.to = o.to === 'b' ? 'a' : 'b'; u.navKey = null; u.pathDone = false; }
        break;
      }
      case 'garrison': {
        const b = this.byId.get(o.target);
        if (!b || b.dead || b.team !== u.team) { u.order = { type: 'idle' }; break; }
        const d = this.distToBuilding(u.x, u.z, b);
        if (d < 2.6) { this.garrison(u, b); break; }
        const rect = { x0: b.tx, z0: b.tz, x1: b.tx + b.w - 1, z1: b.tz + b.d - 1 };
        const r = this.navTo(u, dt, rect, o.key, { reach: 1 });
        if (r !== 'moving') { if (this.distToBuilding(u.x, u.z, b) < 3.4) this.garrison(u, b); else u.order = { type: 'idle' }; }
        break;
      }
      case 'board': {
        const tw = this.byId.get(o.target);
        if (!tw || tw.dead || tw.team !== u.team) { u.order = { type: 'idle' }; break; }
        if (Math.hypot(tw.x - u.x, tw.z - u.z) < tw.rad + 1.4) { this.boardTower(u, tw); break; }
        const r = this.navTo(u, dt, { x: tw.x, z: tw.z }, o.key + (tw.x | 0) + ',' + (tw.z | 0), {});
        if (r === 'fail') u.order = { type: 'idle' };
        break;
      }
      default: { // idle
        u.state = 'idle'; u.atkPhase = 0;
        const d = dist(u.x, u.z, u.anchor.x, u.anchor.z);
        if (u.stance !== 'hold' && d > 5) {
          const r = this.navTo(u, dt, { x: u.anchor.x, z: u.anchor.z }, 'anchor' + ((u.anchor.x * 7 + u.anchor.z) | 0), {});
          if (r !== 'moving') { u.navKey = null; u.pathDone = false; u.anchor = { x: u.x, z: u.z }; }
        } else if (u.faceAngle != null) this.turnTo(u, u.faceAngle, dt, 5);
        if (d > 0.5 && d <= 5 && u.stance !== 'hold') this.moveDirect(u, dt, u.anchor.x, u.anchor.z, 0.8);
        else this.separate(u, dt * 0.5);
      }
    }
  };

  // siege tower behaviour: roll to the nearest enemy structure, then deploy its passengers
  P.updateTowerUnit = function (u, dt, tgt) {
    const loaded = u.passengers && u.passengers.length > 0;
    if (tgt && tgt.kind === 'b' && loaded) {
      const d = this.distToBuilding(u.x, u.z, tgt);
      if (d <= u.range + 0.8) {
        u.state = 'attack'; u.atkPhase += dt / u.cd;
        if (u.atkPhase >= 1) { u.atkPhase = 0; this.deployTower(u); }
        return;
      }
      const rect = { x0: tgt.tx, z0: tgt.tz, x1: tgt.tx + tgt.w - 1, z1: tgt.tz + tgt.d - 1 };
      const r = this.navTo(u, dt, rect, 'tt' + tgt.id, { breach: true });
      if (r === 'fail') u.target = null;
      return;
    }
    if (!loaded) u.target = null;
    this.followOrder(u, dt);
  };

  // garrisoned archers shoot from battlements
  P.updateGarrisoned = function (u, dt) {
    const b = this.byId.get(u.garrisonOf);
    if (!b || b.dead) { u.garrisonOf = 0; return; }
    u.state = 'idle';
    let tgt = u.target ? this.byId.get(u.target) : null;
    const range = u.range + 4 + (b.level - 1) * 2;
    if (tgt && (tgt.dead || tgt.kind !== 'u' || Math.hypot(tgt.x - u.x, tgt.z - u.z) > range)) { tgt = null; u.target = null; }
    u.scanT -= dt;
    if (!tgt && u.scanT <= 0) {
      u.scanT = 0.3;
      let best = null, bd = 1e9;
      this.unitsNear(u.x, u.z, range, (e, d2) => { if (e.team === u.team || e.dead || e.inside || e.garrisonOf && false) return; let w = d2; if (e.cls === 'siege') w *= 0.6; if (w < bd) { bd = w; best = e; } });
      if (best) { tgt = best; u.target = best.id; }
    }
    if (tgt) {
      this.turnTo(u, Math.atan2(tgt.x - u.x, tgt.z - u.z), dt, 12);
      if (u.atkPhase === 0 && u.atkCool > 0) { u.atkCool -= dt; return; }
      if (u.atkPhase === 0) { u.atkPhase = 0.0001; u.hitDone = false; }
      u.state = 'attack';
      u.atkPhase += dt / u.cd;
      if (!u.hitDone && u.atkPhase >= 0.45) {
        u.hitDone = true;
        this.shoot({ x: u.x, y: u.y + 1.3, z: u.z, team: u.team }, tgt, u.atk * 1.15, { type: 'arrow', speed: 42, srcU: u.id, pierce: u.def.pierce || 0 });
        this.emit('sfx', { s: u.key === 'crossbow' ? 'crossbow' : 'bow', x: u.x, z: u.z });
      }
      if (u.atkPhase >= 1) { u.atkPhase = 0; u.atkCool = 0.05; }
    } else u.atkPhase = 0;
    u.y = u.gy;
  };

  // ------------------------------------------------------------- villagers
  P.updateVillager = function (u, dt) {
    const t = this.teams[u.team];
    // flee from nearby hostile soldiers
    u.fleeT = (u.fleeT || 0) - dt;
    if (u.fleeT <= 0) {
      u.fleeCheck = (u.fleeCheck || 0) - dt;
      if (u.fleeCheck <= 0) {
        u.fleeCheck = 0.5;
        let foe = null;
        this.unitsNear(u.x, u.z, 9, (e) => { if (e.team !== u.team && !e.dead && e.cls !== 'work' && e.cls !== 'siege') foe = e; });
        if (foe) { u.fleeT = 2.5; u.fleeDir = Math.atan2(u.x - foe.x, u.z - foe.z); }
      }
    } else {
      this.moveDirect(u, dt, u.x + Math.sin(u.fleeDir) * 6, u.z + Math.cos(u.fleeDir) * 6, 1.25);
      u.state = 'walk';
      return;
    }
    const j = u.job;
    if (!j) {
      const o = u.order;
      if (o.type === 'move') {
        const r = this.navTo(u, dt, { x: o.x, z: o.z }, o.key, {});
        if (r !== 'moving') { u.order = { type: 'idle' }; u.navKey = null; u.pathDone = false; }
      } else { u.state = 'idle'; this.separate(u, dt * 0.3); }
      u.carry = u.carry && u.carry.n > 0 ? u.carry : null;
      return;
    }
    const m = t.mods;
    const prod = this.productivity(t);
    switch (j.type) {
      case 'build': {
        const b = this.byId.get(j.bid);
        if (!b || b.dead || b.built) { this.clearJob(u); return; }
        const d = this.distToBuilding(u.x, u.z, b);
        if (d <= 2.2) {
          u.state = 'work'; u.workKind = 'build'; u.workPhase += dt;
          this.turnTo(u, Math.atan2(b.cx - u.x, b.cz - u.z), dt);
          const inc = dt / b.def.time * (1 + m.build) * Math.min(1.2, prod);
          b.progress = Math.min(1, b.progress + inc);
          b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.9 * inc);
          b._bd++;
          this._workSound(u, 'build');
          if (b.progress >= 1) { this._finish(b, false); this.clearJob(u); }
        } else this._goAdj(u, dt, b, 'b' + b.id);
        break;
      }
      case 'repair': {
        const b = this.byId.get(j.bid);
        if (!b || b.dead || b.hp >= b.maxHp - 0.5 || !b.built) { this.clearJob(u); return; }
        const d = this.distToBuilding(u.x, u.z, b);
        if (d <= 2.2) {
          u.state = 'work'; u.workKind = 'build'; u.workPhase += dt;
          this.turnTo(u, Math.atan2(b.cx - u.x, b.cz - u.z), dt);
          const dh = Math.min(b.maxHp - b.hp, 14 * dt * (1 + m.build));
          const f = dh / b.maxHp * 0.25;
          let ok = true;
          for (const k in b.def.cost) if (t.res[k] < b.def.cost[k] * f) ok = false;
          if (!ok) { this.notify(u.team, 'n.norepair', {}, 'bad', null, 30); this.clearJob(u); return; }
          for (const k in b.def.cost) { t.res[k] -= b.def.cost[k] * f; t.acc[k].o += b.def.cost[k] * f; }
          b.hp += dh; this._workSound(u, 'build');
        } else this._goAdj(u, dt, b, 'r' + b.id);
        break;
      }
      case 'work': {
        const b = this.byId.get(j.bid);
        if (!b || b.dead || !b.built) { this.clearJob(u); return; }
        const idx = Math.max(0, b.workers.indexOf(u.id));
        const s = this.workSlot(b, idx);
        const d = Math.hypot(s.x - u.x, s.z - u.z);
        if (d < 1.0) {
          u.state = 'work'; u.workKind = b.key === 'farm' || b.key === 'wheatfield' ? 'farm' : 'craft'; u.workPhase += dt;
          this.turnTo(u, Math.atan2(b.cx - u.x, b.cz - u.z), dt);
          b._w++;
          this._workSound(u, u.workKind);
        } else {
          const r = this.navTo(u, dt, { x: s.x, z: s.z }, 'w' + b.id + '_' + idx, {});
          if (r !== 'moving') { u.navKey = null; u.pathDone = false; if (d < 2.2) { u.x += (s.x - u.x) * 0.5; u.z += (s.z - u.z) * 0.5; } }
        }
        break;
      }
      case 'gather': this.gatherLogic(u, dt, j, t); break;
      default: this.clearJob(u);
    }
  };

  P._goAdj = function (u, dt, b, key) {
    const rect = { x0: b.tx, z0: b.tz, x1: b.tx + b.w - 1, z1: b.tz + b.d - 1 };
    const r = this.navTo(u, dt, rect, key, { reach: 1 });
    if (r !== 'moving') {
      u.navKey = null; u.pathDone = false;
      if (r === 'fail' || this.distToBuilding(u.x, u.z, b) > 3) { u.jobFail = (u.jobFail || 0) + 1; if (u.jobFail > 3) { u.jobFail = 0; this.clearJob(u); } }
    }
  };

  P.workSlot = function (b, idx) {
    const n = Math.max(1, b.def.workers);
    if (b.key === 'wheatfield') { const c = idx % 2, r = Math.floor(idx / 2); return { x: b.cx + (c - 0.5) * 3, z: b.cz + (r - 0.5) * 3 }; }
    const side = (b.tz + b.d) * TILE + 1.4;
    return { x: b.cx + (idx - (n - 1) / 2) * 1.6, z: side };
  };

  P._workSound = function (u, kind) {
    u.sndT = (u.sndT || 0) - 0.016;
    if (u.workPhase - (u.lastSnd || 0) > 0.75) { u.lastSnd = u.workPhase; this.emit('sfx', { s: kind === 'build' ? 'hammer' : kind === 'wood' ? 'chop' : kind === 'stone' || kind === 'iron' || kind === 'gold' ? 'pick' : kind === 'farm' ? 'hoe' : 'craft', x: u.x, z: u.z }); }
  };

  const TYPES = { wood: ['tree'], stone: ['stone'], iron: ['ore', 'gold'], gold: ['gold'], food: ['deer'] };
  P.findNode = function (u, j) {
    const b = j.bid ? this.byId.get(j.bid) : null;
    const ox = b ? b.cx : u.x, oz = b ? b.cz : u.z;
    const rad = b ? 38 : 46;
    if (j.pref) { const n = this.byId.get(j.pref); if (n && !n.dead && n.amount > 0) return n; j.pref = 0; }
    const types = TYPES[j.res];
    let best = null, bs = 1e9;
    const lim = j.res === 'wood' ? 2 : 4;
    this.nodesNear(ox, oz, rad, (n, d2) => {
      if (!types.includes(n.type) || n.amount <= 0 || n.claims >= lim) return;
      const du = Math.hypot(n.x - u.x, n.z - u.z);
      const s = Math.sqrt(d2) * 0.7 + du * 0.5 + n.claims * 3;
      if (s < bs) { bs = s; best = n; }
    });
    return best;
  };
  P.findDrop = function (u, res) {
    let best = null, bd = 1e12;
    for (const b of this.buildings) {
      if (b.team !== u.team || !b.built || b.dead) continue;
      const acc = DROP[b.key]; if (acc === undefined) continue;
      if (acc && !acc.includes(res)) continue;
      if (b.key === 'farm') continue;
      const d = this.distToBuilding(u.x, u.z, b);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  };

  P.gatherLogic = function (u, dt, j, t) {
    const m = t.mods;
    if (!j.stage) j.stage = 'find';
    const prod = this.productivity(t);
    switch (j.stage) {
      case 'find': {
        const n = this.findNode(u, j);
        if (!n) {
          j.fail = (j.fail || 0) + 1; u.state = 'idle';
          if (j.fail > 4) {
            const b = j.bid ? this.byId.get(j.bid) : null;
            if (b) { b.want = Math.max(0, b.want - 1); this.notify(u.team, 'n.nores', { b: b.key }, 'bad', { x: b.cx, z: b.cz }, 40); }
            this.clearJob(u); u.holdT = this.time + 8;
          }
          return;
        }
        j.fail = 0;
        if (j.nodeId) { const o = this.byId.get(j.nodeId); if (o) o.claims = Math.max(0, o.claims - 1); }
        j.nodeId = n.id; n.claims++; j.stage = 'toNode';
        if (j.bid) { const b = this.byId.get(j.bid); if (b && b.key === 'mine') j.res = NODE_RES[n.type]; } else j.res = NODE_RES[n.type] || j.res;
        break;
      }
      case 'toNode': {
        const n = this.byId.get(j.nodeId);
        if (!n || n.dead || n.amount <= 0) { j.stage = 'find'; j.nodeId = 0; return; }
        const d = Math.hypot(n.x - u.x, n.z - u.z);
        if (d <= 2.7) { j.stage = 'gather'; j.acc = 0; break; }
        const rect = { x0: n.tx, z0: n.tz, x1: n.tx, z1: n.tz };
        const r = this.navTo(u, dt, rect, 'n' + n.id, { reach: 1 });
        if (r !== 'moving') { u.navKey = null; u.pathDone = false; const dd = Math.hypot(n.x - u.x, n.z - u.z); if (dd > 3.4) { j.nfail = (j.nfail || 0) + 1; if (j.nfail > 2) { n.amount = Math.min(n.amount, 0.0001); j.nfail = 0; n.claims = Math.max(0, n.claims - 1); j.nodeId = 0; j.stage = 'find'; n.unreach = true; } } else j.stage = 'gather'; }
        break;
      }
      case 'gather': {
        const n = this.byId.get(j.nodeId);
        if (!n || n.dead || n.amount <= 0) { j.stage = u.carry && u.carry.n > 0 ? 'toDrop' : 'find'; if (j.stage === 'toDrop') u.dropId = 0; j.nodeId = 0; return; }
        u.state = 'work'; u.workKind = j.res === 'wood' ? 'wood' : j.res === 'food' ? 'hunt' : 'mine'; u.workPhase += dt;
        this.turnTo(u, Math.atan2(n.x - u.x, n.z - u.z), dt);
        const cap = CARRY[j.res] || 8;
        j.acc += dt * 1.5 * prod * (1 + m.gather);
        if (!u.carry || u.carry.res !== j.res) u.carry = { res: j.res, n: 0 };
        while (j.acc >= 1 && u.carry.n < cap && n.amount > 0) { j.acc -= 1; u.carry.n++; n.amount--; }
        this._workSound(u, u.workKind === 'wood' ? 'wood' : 'stone');
        if (n.amount <= 0) { n.claims = Math.max(0, n.claims - 1); this.removeNode(n); j.nodeId = 0; }
        if (u.carry.n >= cap || n.amount <= 0) { j.stage = 'toDrop'; u.dropId = 0; if (n.dead) j.stage = u.carry.n > 0 ? 'toDrop' : 'find'; }
        break;
      }
      case 'toDrop': {
        if (!u.carry || u.carry.n <= 0) { j.stage = j.nodeId ? 'toNode' : 'find'; return; }
        let drop = u.dropId ? this.byId.get(u.dropId) : null;
        if (!drop || drop.dead) { drop = this.findDrop(u, u.carry.res); if (!drop) { u.state = 'idle'; j.dropFail = (j.dropFail || 0) + 1; if (j.dropFail > 30) { this.notify(u.team, 'n.nodrop', {}, 'bad', null, 40); j.dropFail = 0; } return; } u.dropId = drop.id; }
        const d = this.distToBuilding(u.x, u.z, drop);
        if (d <= 2.4) {
          const a = this.addRes(t, u.carry.res, u.carry.n * (u.carry.res === 'food' && j.bid ? 1 : 1));
          if (a < u.carry.n) this.notify(u.team, 'n.storefull', {}, 'bad', null, 40);
          t.stats.gathered += a;
          this.emit('collect', { x: u.x, z: u.z, res: u.carry.res, n: a, team: u.team });
          u.carry = null; u.dropId = 0;
          const nn = j.nodeId ? this.byId.get(j.nodeId) : null;
          j.stage = nn && !nn.dead && nn.amount > 0 ? 'toNode' : 'find';
          if (j.stage === 'find') j.nodeId = 0;
        } else {
          const rect = { x0: drop.tx, z0: drop.tz, x1: drop.tx + drop.w - 1, z1: drop.tz + drop.d - 1 };
          const r = this.navTo(u, dt, rect, 'd' + drop.id, { reach: 1 });
          if (r !== 'moving') { u.navKey = null; u.pathDone = false; if (this.distToBuilding(u.x, u.z, drop) > 3.4) { j.dfail = (j.dfail || 0) + 1; if (j.dfail > 3) { j.dfail = 0; u.dropId = 0; } } }
        }
        break;
      }
    }
  };

  // ------------------------------------------------------------- projectiles
  P.shoot = function (src, tgt, dmg, o = {}) {
    const isB = tgt.kind === 'b';
    let tx = isB ? tgt.cx : tgt.x, tz = isB ? tgt.cz : tgt.z;
    const ty = (isB ? tgt.y + 1.5 : (tgt.y || 0) + 1.0);
    const d = Math.hypot(tx - src.x, tz - src.z);
    const speed = o.speed || 38;
    let T = Math.max(0.25, d / speed);
    if (!isB) { tx += (tgt.vx || 0) * T * 0.85; tz += (tgt.vz || 0) * T * 0.85; }
    const sp = o.type === 'stone' ? 1.5 : Math.min(2.6, 0.2 + d * 0.035);
    tx += (this.rng() - 0.5) * sp * 2; tz += (this.rng() - 0.5) * sp * 2;
    const dd = Math.hypot(tx - src.x, tz - src.z);
    T = Math.max(0.25, dd / speed) * (o.type === 'stone' ? 1.5 : 1);
    const p = {
      id: this.id(), type: o.type || 'arrow', x: src.x, y: src.y, z: src.z, team: src.team,
      vx: (tx - src.x) / T, vz: (tz - src.z) / T, vy: (ty - src.y + 0.5 * G * T * T) / T,
      t: 0, T, dmg, splash: o.splash || 0, srcU: o.srcU || 0, srcB: o.srcB || 0, pierce: o.pierce || 0, bld: o.bld || 0.1, tx, tz, tgtB: isB ? tgt.id : 0,
    };
    this.projs.push(p);
    this.emit('projectile', p);
    return p;
  };

  P.updateProjectiles = function (dt) {
    const ps = this.projs;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t += dt;
      p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= G * dt;
      if (p.t >= p.T) { this.impact(p); ps.splice(i, 1); this.emit('projectileEnd', p); }
    }
  };

  P.impact = function (p) {
    const src = p.srcU ? this.byId.get(p.srcU) : null;
    if (p.type === 'stone') {
      const R = p.splash || 4;
      this.emit('impact', { x: p.x, y: this.T.heightAt(p.x, p.z) + 0.5, z: p.z, type: 'boom' });
      this.emit('sfx', { s: 'boom', x: p.x, z: p.z });
      this.unitsNear(p.x, p.z, R, (u, d2) => { if (u.team !== p.team && !u.dead) { const k = 1 - 0.55 * Math.sqrt(d2) / R; this.damageUnit(u, p.dmg * 0.8 * k * 30 / (30 + u.armor), src, 'stone'); u.kx += (u.x - p.x) * 1.2; u.kz += (u.z - p.z) * 1.2; } });
      this.buildingsNear(p.x, p.z, R * 0.6, (b, d) => { if (b.team !== p.team) this.damageBuilding(b, p.dmg * p.bld * (1 - 0.5 * d / (R * 0.6)), src, 'stone'); });
      return;
    }
    // arrows & bolts: hit nearest enemy unit near the landing spot
    let best = null, bd = 1e9;
    const R = p.type === 'bolt' ? 2.0 : 1.25;
    this.unitsNear(p.x, p.z, R, (u, d2) => { if (u.team !== p.team && !u.dead && d2 < bd) { bd = d2; best = u; } });
    if (best) {
      let dmg = p.dmg * 30 / (30 + Math.max(0, best.armor * (1 - p.pierce)));
      if (best.blockStat > 0) dmg *= 1 - best.blockStat * 0.55 * (1 - p.pierce);
      if (best.garrisonOf) dmg *= 0.55;
      this.emit('impact', { x: p.x, y: p.y, z: p.z, type: 'arrowhit' });
      this.emit('sfx', { s: 'arrowhit', x: p.x, z: p.z });
      this.damageUnit(best, dmg, src, 'arrow');
    } else {
      if (p.tgtB) { const b = this.byId.get(p.tgtB); if (b && b.team !== p.team) this.damageBuilding(b, p.dmg * 0.05, src, 'arrow'); }
      this.emit('impact', { x: p.x, y: p.y, z: p.z, type: 'arrowmiss' });
    }
  };
}
