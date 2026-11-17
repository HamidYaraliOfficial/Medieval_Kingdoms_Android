// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Enemy kingdom AI: economy, building, research, army production, scouting, waves, defence, retreat, rebuild.
import { BUILDINGS, UNITS, TECH_BY_ID, DIFFICULTY, TILE } from './data.js';
import { findSpot } from './place.js';
import { dist, dist2 } from './util.js';

const COMP = {
  easy: { sword: 50, spear: 20, archer: 30 },
  normal: { sword: 32, shield: 10, spear: 14, archer: 26, lightcav: 10, crossbow: 8 },
  hard: { sword: 26, shield: 10, heavy: 8, spear: 10, archer: 20, crossbow: 10, lightcav: 8, heavycav: 8 },
  expert: { sword: 22, shield: 10, heavy: 10, spear: 8, archer: 16, crossbow: 14, lightcav: 6, heavycav: 10, guard: 6 },
};
const TECH_ORDER = ['weapons1', 'armor1', 'tools1', 'plow1', 'fletching', 'horses1', 'train1', 'masonry1', 'taxes1', 'weapons2', 'armor2', 'plate', 'crossbow', 'engineering', 'fletching2', 'barding', 'train2', 'weapons3', 'armor3', 'royalguard', 'masonry2', 'siege2'];

export class AI {
  constructor(g, team, diff, o = {}) {
    this.g = g; this.t = team; this.diff = diff; this.p = DIFFICULTY[diff] || DIFFICULTY.normal;
    this.o = o;
    this.thinkT = 1 + g.rng() * 2;
    this.fastT = 0.5;
    this.blueprint = o.blueprint || [];
    this.wave = { state: 'idle', units: [], start: 0, target: null, number: 0, size0: 0, stage: null };
    this.nextWave = o.immediate ? 5 : this.p.firstWave * (o.waveScale || 1);
    this.waveSize = Math.round(this.p.wave * (o.sizeScale || 1));
    this.intel = diff === 'hard' || diff === 'expert' || !!o.immediate;
    this.scout = 0; this.scoutSent = 0;
    this.passive = !!o.passive;
    this.rally = null;
    this.lastPlace = 0;
    this.threat = null; this.threatT = 0;
    this.staging = null;
  }

  get cap() { return this.g.byId.get(this.t.capitalId); }

  update(dt) {
    this.fastT -= dt;
    if (this.fastT <= 0) { this.fastT = 1.5; this.watch(); }
    this.thinkT -= dt;
    if (this.thinkT > 0) return;
    this.thinkT = this.p.think * (0.8 + this.g.rng() * 0.4);
    const g = this.g, t = this.t;
    if (t.defeated) return;
    if (!this.cap) return;
    this.scan();
    if (!this.o.noEconomy) { this.economy(); this.defense(); this.military(); this.research(); this.rebuild(); }
    this.army();
  }

  // ------------------------------------------------------------- bookkeeping
  scan() {
    const g = this.g, t = this.t;
    const c = { built: {}, all: {}, sites: 0 };
    for (const b of g.buildings) {
      if (b.team !== t.id) continue;
      c.all[b.key] = (c.all[b.key] || 0) + 1;
      if (b.built) c.built[b.key] = (c.built[b.key] || 0) + 1; else c.sites++;
    }
    c.units = {}; c.soldiers = []; c.vill = 0; c.queuedVill = 0;
    for (const u of g.units) {
      if (u.team !== t.id || u.dead) continue;
      c.units[u.key] = (c.units[u.key] || 0) + 1;
      if (u.cls === 'work') c.vill++; else c.soldiers.push(u);
    }
    for (const b of g.buildings) if (b.team === t.id) for (const q of b.queue) if (q.type === 'unit' && q.id === 'villager') c.queuedVill++;
    this.c = c;
  }

  count(key) { return this.c.all[key] || 0; }

  tryBuild(key, cx, cz, o = {}) {
    const g = this.g, t = this.t;
    const d = BUILDINGS[key];
    if (!d) return false;
    if (d.tech && !t.techs.has(d.tech)) return false;
    if (d.limit && this.count(key) >= d.limit) return false;
    if (!g.canAfford(t, d.cost)) return false;
    const spot = findSpot(g, t.id, key, cx, cz, Object.assign({ rmax: 22 }, o));
    if (!spot) return false;
    const r = g.placeBuilding(t.id, key, spot.tx, spot.tz, spot.rot);
    if (r.ok) { this.c.all[key] = (this.c.all[key] || 0) + 1; this.c.sites++; this.lastPlace = g.time; }
    return r.ok;
  }

  // gatherer buildings go close to resource clusters
  tryBuildAtNodes(key, types) {
    const g = this.g, t = this.t, cap = this.cap;
    const d = BUILDINGS[key];
    if (d.tech && !t.techs.has(d.tech)) return false;
    if (!g.canAfford(t, d.cost)) return false;
    const existing = g.buildings.filter((b) => b.team === t.id && b.key === key);
    let best = null, bd = 1e9;
    g.nodesNear(cap.cx, cap.cz, 62, (n, d2) => {
      if (!types.includes(n.type) || n.amount <= 0) return;
      // skip clusters already served
      for (const e of existing) if (Math.hypot(e.cx - n.x, e.cz - n.z) < 16) return;
      let near = 0; g.nodesNear(n.x, n.z, 10, (m) => { if (types.includes(m.type)) near++; });
      if (near < (key === 'woodcutter' ? 6 : 3)) return;
      if (d2 < bd) { bd = d2; best = n; }
    });
    if (!best) return false;
    return this.tryBuild(key, best.tx, best.tz, { rmax: 10 });
  }

  // ------------------------------------------------------------- economy
  economy() {
    const g = this.g, t = this.t, c = this.c, cap = this.cap, p = this.p;
    const ctx = Math.floor(cap.cx / TILE), ctz = Math.floor(cap.cz / TILE);
    // villagers
    let slots = 0; for (const b of g.buildings) if (b.team === t.id && b.def.workers) slots += b.want;
    const wantV = Math.min(70, Math.max(p.workers, slots + 5));
    if (c.vill + c.queuedVill < wantV && t.pop < t.popCap && !t.starving) {
      const th = g.buildings.find((b) => b.team === t.id && b.built && b.def.trains && b.def.trains.includes('villager') && b.queue.length < 2);
      if (th) g.queueUnit(th, 'villager');
    }
    if (c.sites >= 2 + (this.diff === 'expert' ? 2 : this.diff === 'hard' ? 1 : 0)) return;
    // housing
    if (t.popCap - t.pop < 6 && !(c.sites && this.g.time - this.lastPlace < 20)) { if (this.tryBuild('house', ctx, ctz, { rmin: 5, rmax: 24 })) return; }
    // food
    const foodSources = (c.all.farm || 0) + 1.2 * Math.min(c.all.bakery || 0, c.all.mill || 0, c.all.wheatfield || 0);
    const needFood = Math.max(1, Math.ceil(t.pop / 10));
    if (foodSources < needFood && this.tryBuild('farm', ctx, ctz, { rmin: 6, rmax: 24 })) return;
    // wood, stone, iron
    if ((c.all.woodcutter || 0) < 1 + Math.floor(t.pop / 24) && this.tryBuildAtNodes('woodcutter', ['tree'])) return;
    if ((c.all.quarry || 0) < (t.pop > 10 ? 1 : 0) + (this.diff === 'hard' || this.diff === 'expert' ? Math.floor(t.pop / 30) : 0) && this.tryBuildAtNodes('quarry', ['stone'])) return;
    if ((c.all.mine || 0) < (t.pop > 14 ? 1 : 0) + (t.pop > 34 ? 1 : 0) && this.tryBuildAtNodes('mine', ['ore', 'gold'])) return;
    if ((c.all.warehouse || 0) < 1 && t.pop > 18 && this.tryBuild('warehouse', ctx, ctz, { rmin: 5, rmax: 22 })) return;
    if (this.diff !== 'easy' && t.pop > 24 && (c.all.market || 0) < 1 && this.tryBuild('market', ctx, ctz, { rmin: 5, rmax: 22 })) return;
    if (this.diff !== 'easy' && t.pop > 30 && !(c.all.wheatfield) && this.tryBuild('wheatfield', ctx, ctz, { rmin: 7, rmax: 26 })) return;
    if (c.all.wheatfield && !c.all.mill && this.tryBuild('mill', ctx, ctz, { rmin: 5, rmax: 24 })) return;
    if (c.all.mill && !c.all.bakery && this.tryBuild('bakery', ctx, ctz, { rmin: 5, rmax: 24 })) return;
    if (this.diff === 'expert' && t.pop > 40 && !(c.all.church) && this.tryBuild('church', ctx, ctz, { rmin: 5, rmax: 22 })) return;
    // storage pressure
    if (t.res.wood > t.cap.wood * 0.92 || t.res.stone > t.cap.stone * 0.92) { if (this.tryBuild('storage', ctx, ctz, { rmin: 5, rmax: 22 })) return; }
    // taxes
    t.tax = t.starving ? 1 : t.happiness > 65 ? 3 : 2;
  }

  // ------------------------------------------------------------- military infrastructure
  military() {
    const g = this.g, t = this.t, c = this.c, cap = this.cap, p = this.p;
    const ctx = Math.floor(cap.cx / TILE), ctz = Math.floor(cap.cz / TILE);
    if (c.sites < 3) {
      const need = [];
      if (!(c.all.barracks)) need.push('barracks');
      if (t.pop > 14 && !(c.all.archery)) need.push('archery');
      if (this.diff !== 'easy' && t.pop > 22 && !(c.all.stable)) need.push('stable');
      if (this.diff !== 'easy' && t.pop > 26 && !(c.all.blacksmith)) need.push('blacksmith');
      if (p.siege && t.techs.has('engineering') && !(c.all.siegeworks)) need.push('siegeworks');
      if ((this.diff === 'hard' || this.diff === 'expert') && t.pop > 36 && !(c.all.training)) need.push('training');
      if (this.diff === 'expert' && (c.all.barracks || 0) < 2 && t.pop > 44) need.push('barracks');
      for (const k of need) { if (this.tryBuild(k, ctx, ctz, { rmin: 5, rmax: 24 })) break; }
    }
    // train soldiers
    const target = Math.min(120, this.waveSize * 1.5 + this.g.time / 70);
    const army = c.soldiers.filter((u) => !u.garrisonOf).length;
    const queued = g.buildings.reduce((s, b) => s + (b.team === t.id ? b.queue.filter((q) => q.type === 'unit' && q.id !== 'villager').length : 0), 0);
    if (army + queued >= target || t.starving) return;
    for (const b of g.buildings) {
      if (b.team !== t.id || !b.built || !b.def.trains || b.def.trains[0] === 'villager' || b.queue.length >= 2) continue;
      const comp = COMP[this.diff];
      const opts = b.def.trains.filter((k) => comp[k] && g.unitAvailable(t, k) && !(k === 'catapult' || k === 'ram' || k === 'siegetower'));
      // siege units
      if (b.def.trains.includes('ram') && p.siege) {
        const rams = (c.units.ram || 0), cats = (c.units.catapult || 0), tws = (c.units.siegetower || 0);
        if (rams < Math.ceil(this.waveSize / 12) && g.queueUnit(b, 'ram')) continue;
        if (cats < Math.floor(this.waveSize / 14) && g.queueUnit(b, 'catapult')) continue;
        if (this.diff === 'expert' && tws < 1 && g.unitAvailable(t, 'siegetower') && g.queueUnit(b, 'siegetower')) continue;
      }
      if (!opts.length) continue;
      let sum = 0; for (const k of opts) sum += comp[k];
      let r = g.rng() * sum, pick = opts[0];
      for (const k of opts) { r -= comp[k]; if (r <= 0) { pick = k; break; } }
      if (!g.canAfford(t, UNITS[pick].cost)) { // try the cheapest alternative
        const alt = opts.filter((k) => g.canAfford(t, UNITS[k].cost)); if (!alt.length) continue; pick = alt[0];
      }
      g.queueUnit(b, pick);
    }
  }

  research() {
    if (this.diff === 'easy' && this.g.time < 400) return;
    const g = this.g, t = this.t;
    for (const id of TECH_ORDER) {
      const tech = TECH_BY_ID[id];
      if (!tech || t.techs.has(id)) continue;
      if (id === 'engineering' && !this.p.siege) continue;
      if (id === 'royalguard' && this.diff !== 'expert') continue;
      if (!g.researchAvailable(t, tech)) continue;
      // keep a reserve for troops
      const cost = tech.cost; let ok = true;
      for (const k in cost) if (t.res[k] < cost[k] + 80) ok = false;
      if (!ok) continue;
      const b = g.buildings.find((o) => o.team === t.id && o.built && o.def.research === tech.bld && o.queue.length < 1);
      if (b && g.queueResearch(b, id)) return;
    }
  }

  // ------------------------------------------------------------- defence & rebuilding
  defense() {
    const g = this.g, t = this.t, c = this.c, cap = this.cap, p = this.p;
    if (c.sites >= 3) return;
    const ctx = Math.floor(cap.cx / TILE), ctz = Math.floor(cap.cz / TILE);
    const towers = (c.all.guardtower || 0) + (c.all.archertower || 0) + (c.all.deftower || 0);
    const enemy = this.enemyDir();
    if (towers < p.towers + (this.blueprint.filter((b) => BUILDINGS[b.key].tower).length)) {
      const key = this.diff === 'expert' && t.techs.has('bastions') ? 'deftower' : t.res.stone > 200 && this.diff !== 'easy' ? 'archertower' : 'guardtower';
      if (this.tryBuild(key, ctx + enemy.x * 12, ctz + enemy.z * 12, { rmin: 0, rmax: 12, ignoreTerritory: false })) return;
    }
    // garrison archers in empty towers
    const freeArchers = c.soldiers.filter((s) => s.cls === 'rng' && !s.garrisonOf).length;
    if (freeArchers > 8) for (const b of g.buildings) {
      if (b.team !== t.id || !b.built || !b.def.tower || b.garrison.length >= Math.min(2, b.def.tower.slots)) continue;
      const u = c.soldiers.find((s) => s.cls === 'rng' && !s.garrisonOf && s.order.type === 'idle' && (!this.wave.units.includes(s.id)));
      if (u) { g.orderGarrison([u], b); break; }
    }
  }

  // re-place destroyed parts of the original castle (rebuild after defeat)
  rebuild() {
    const g = this.g, t = this.t;
    if (!this.blueprint.length || this.c.sites >= 6) return;
    let placed = 0;
    const missing = [];
    for (const bp of this.blueprint) {
      const idx = bp.tz * g.N + bp.tx;
      const occ = g.nav.occ[idx];
      const ob = occ ? g.byId.get(occ) : null;
      if (ob && ob.team === t.id) continue;
      if (ob) continue;
      missing.push(bp);
    }
    missing.sort((a, b) => this.prio(a.key) - this.prio(b.key));
    for (const bp of missing) {
      if (placed >= 3) break;
      if (BUILDINGS[bp.key].tech && !t.techs.has(BUILDINGS[bp.key].tech)) continue;
      if (!g.canAfford(t, BUILDINGS[bp.key].cost)) continue;
      const r = g.placeBuilding(t.id, bp.key, bp.tx, bp.tz, bp.rot, {});
      if (r.ok) placed++;
    }
  }
  prio(k) { const d = BUILDINGS[k]; return d.territory ? 0 : d.tower ? 1 : d.gate ? 2 : d.trains ? 3 : d.wall ? 5 : 4; }

  enemyDir() {
    const cap = this.cap; const e = this.nearestEnemy();
    if (!e) return { x: 0, z: 1 };
    const l = Math.hypot(e.cx - cap.cx, e.cz - cap.cz) || 1;
    return { x: (e.cx - cap.cx) / l, z: (e.cz - cap.cz) / l };
  }
  nearestEnemy() {
    const g = this.g, cap = this.cap; let best = null, bd = 1e12;
    for (const b of g.buildings) {
      if (b.team === this.t.id || !b.def.territory || g.teams[b.team].defeated) continue;
      const d = dist2(cap.cx, cap.cz, b.cx, b.cz); if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // ------------------------------------------------------------- army management
  soldiers() { return this.g.units.filter((u) => u.team === this.t.id && !u.dead && u.cls !== 'work'); }

  // fast loop: respond to threats, monitor the wave
  watch() {
    const g = this.g, t = this.t, cap = this.cap;
    if (t.defeated || !cap) return;
    // threat detection around base
    let threat = null;
    for (const b of g.buildings) {
      if (b.team !== t.id || (!b.def.territory && !b.def.trains && !b.def.tower && !b.def.gate)) continue;
      g.unitsNear(b.cx, b.cz, 30, (u) => { if (u.team !== t.id && !u.dead && u.cls !== 'work') threat = u; });
      if (threat) break;
    }
    if (threat) {
      this.threat = { x: threat.x, z: threat.z }; this.threatT = g.time;
      const defenders = this.soldiers().filter((u) => !this.wave.units.includes(u.id) || this.wave.state === 'staging').filter((u) => !u.garrisonOf && !u.inside && u.order.type !== 'attack');
      const far = defenders.filter((u) => u.order.type === 'idle' || u.order.type === 'patrol' || u.order.type === 'move');
      if (far.length) g.orderAttackMove(far.filter((u) => u.key !== 'siegetower'), threat.x, threat.z, { formation: null });
    } else if (this.threat && g.time - this.threatT > 6) {
      this.threat = null;
      // return defenders to the rally point
      const home = this.homePoint();
      const idle = this.soldiers().filter((u) => !this.wave.units.includes(u.id) && (u.order.type === 'idle') && dist(u.x, u.z, home.x, home.z) > 22 && !u.garrisonOf);
      if (idle.length) g.orderMove(idle, home.x, home.z, { formation: 'line' });
    }
    this.watchWave();
  }

  homePoint() {
    const cap = this.cap; const d = this.enemyDir();
    return { x: cap.cx + d.x * 16, z: cap.cz + d.z * 16 };
  }

  army() {
    const g = this.g, t = this.t, cap = this.cap, c = this.c;
    const soldiers = c.soldiers.filter((u) => !u.dead);
    const home = this.homePoint();
    this.rallyBuildings(home);
    // keep idle soldiers near home; a few patrol
    const idle = soldiers.filter((u) => u.order.type === 'idle' && !u.garrisonOf && !this.wave.units.includes(u.id) && u.cls !== 'siege');
    const away = idle.filter((u) => dist(u.x, u.z, cap.cx, cap.cz) > 40);
    if (away.length && !this.threat) g.orderMove(away, home.x, home.z, { formation: 'line' });
    if (idle.length > 10 && this.diff !== 'easy' && !this.patrolSet) {
      const squad = idle.filter((u) => u.cls === 'inf' || u.cls === 'cav').slice(0, 3);
      if (squad.length >= 2) {
        const a = { x: cap.cx - 14 + g.rng() * 8, z: cap.cz - 14 }, b2 = { x: cap.cx + 14, z: cap.cz + 14 };
        g.orderMove(squad, a.x, a.z, { formation: null });
        for (const u of squad) { u.order = { type: 'patrol', a: { x: a.x, z: a.z }, b: { x: b2.x, z: b2.z }, to: 'b', key: 'ap' + u.id }; }
        this.patrolSet = true; this.patrolIds = squad.map((u) => u.id);
      }
    }
    if (this.patrolSet && this.patrolIds.every((id) => { const u = g.byId.get(id); return !u || u.dead; })) this.patrolSet = false;
    // scouting
    if (!this.intel && g.time > 90 && g.time - this.scoutSent > 120) {
      const sc = soldiers.find((u) => (u.cls === 'cav' || u.cls === 'rng') && u.order.type === 'idle' && !u.garrisonOf);
      const e = this.nearestEnemy();
      if (sc && e) {
        this.scoutSent = g.time; this.scoutId = sc.id;
        const l = Math.hypot(e.cx - cap.cx, e.cz - cap.cz) || 1;
        g.orderMove([sc], e.cx - (e.cx - cap.cx) / l * 26, e.cz - (e.cz - cap.cz) / l * 26, { formation: null });
      }
    }
    if (this.scoutId) {
      const sc = g.byId.get(this.scoutId);
      const e = this.nearestEnemy();
      if (sc && !sc.dead && e && dist(sc.x, sc.z, e.cx, e.cz) < 40) {
        this.intel = true; this.scoutId = 0;
        g.orderMove([sc], cap.cx, cap.cz, { formation: null });
      }
      if (!sc || sc.dead) this.scoutId = 0;
    }
    // launch waves
    if (this.passive || this.wave.state !== 'idle') return;
    if (g.time < this.nextWave) return;
    if (!this.intel && g.time < this.nextWave + 90) return;
    const ready = soldiers.filter((u) => !u.garrisonOf && !u.inside && u.cls !== 'work' && !this.patrolIds?.includes(u.id));
    if (ready.length >= this.waveSize) this.launchWave(ready);
  }

  rallyBuildings(home) {
    for (const b of this.g.buildings) if (b.team === this.t.id && b.def.trains && !b.rally) b.rally = { x: home.x + (this.g.rng() - 0.5) * 10, z: home.z + (this.g.rng() - 0.5) * 10 };
  }

  launchWave(ready) {
    const g = this.g, t = this.t, cap = this.cap;
    const targetB = this.pickTarget();
    if (!targetB) return;
    // keep a home guard on harder levels
    const guard = this.diff === 'expert' ? 0.2 : this.diff === 'hard' ? 0.15 : 0.1;
    ready.sort((a, b) => a.id - b.id);
    const keep = Math.floor(ready.length * guard);
    const go = ready.slice(keep);
    const staging = this.stagePoint(targetB);
    this.wave = { state: 'staging', units: go.map((u) => u.id), start: g.time, target: targetB.id, number: this.wave.number + 1, size0: go.length, stage: staging };
    this.nextWave = g.time + this.p.waveEvery;
    const towers = go.filter((u) => u.key === 'siegetower');
    const rest = go.filter((u) => u.key !== 'siegetower');
    g.orderMove(rest, staging.x, staging.z, { formation: 'line' });
    // load siege towers
    const inf = rest.filter((u) => u.cls === 'inf').sort((a, b) => dist2(a.x, a.z, towers[0] ? towers[0].x : 0, towers[0] ? towers[0].z : 0) - dist2(b.x, b.z, towers[0] ? towers[0].x : 0, towers[0] ? towers[0].z : 0));
    towers.forEach((tw, i) => { g.orderMove([tw], staging.x, staging.z, { formation: null }); const crew = inf.slice(i * 8, i * 8 + 8); g.orderBoard(crew, tw); });
    g.notify(-1, 'n.wave', { name: t.name }, 'bad');
  }

  stagePoint(targetB) {
    const cap = this.cap; const l = Math.hypot(targetB.cx - cap.cx, targetB.cz - cap.cz) || 1;
    const dx = (targetB.cx - cap.cx) / l, dz = (targetB.cz - cap.cz) / l;
    const d = Math.max(20, l - 70);
    return { x: cap.cx + dx * d, z: cap.cz + dz * d };
  }

  pickTarget() {
    const g = this.g, cap = this.cap;
    let best = null, bs = 1e12;
    for (const b of g.buildings) {
      if (b.team === this.t.id || !b.def.territory || g.teams[b.team].defeated) continue;
      // players are preferred to other AIs
      let s = dist2(cap.cx, cap.cz, b.cx, b.cz);
      if (g.teams[b.team].kind === 'player') s *= 0.5;
      if (s < bs) { bs = s; best = b; }
    }
    return best;
  }

  watchWave() {
    const g = this.g, w = this.wave;
    if (w.state === 'idle') return;
    const alive = w.units.map((id) => g.byId.get(id)).filter((u) => u && !u.dead);
    w.units = alive.map((u) => u.id);
    const strength = alive.length / Math.max(1, w.size0);
    const tgt = g.byId.get(w.target);
    if (w.state === 'staging') {
      const near = alive.filter((u) => dist(u.x, u.z, w.stage.x, w.stage.z) < 24).length;
      const loaded = alive.filter((u) => u.key === 'siegetower').every((tw) => tw.passengers && tw.passengers.length >= 4 || g.time - w.start > 80);
      if ((near >= alive.length * 0.75 && loaded) || g.time - w.start > 75 || (this.o.immediate && g.time - w.start > 4)) this.attackNow(alive, tgt);
      if (alive.length === 0) { w.state = 'idle'; }
      return;
    }
    if (w.state === 'attack') {
      if (!alive.length) { w.state = 'idle'; this.waveSize = Math.round(this.waveSize * 1.15) + 1; return; }
      if (strength < this.p.retreat && g.time - w.start > 25) {
        g.orderRetreat(alive.filter((u) => u.key !== 'siegetower'));
        w.state = 'idle'; this.waveSize = Math.round(this.waveSize * 1.2) + 2; this.nextWave = g.time + this.p.waveEvery * 0.8;
        g.notify(-1, 'n.retreat', { name: this.t.name }, 'good');
        return;
      }
      if (!tgt || tgt.dead) {
        const nt = this.pickTarget();
        if (!nt) { w.state = 'idle'; return; }
        w.target = nt.id;
        g.orderAttackMove(alive.filter((u) => u.key !== 'siegetower'), nt.cx, nt.cz, { formation: null });
      }
      // idle wave members keep pushing
      const lazy = alive.filter((u) => u.order.type === 'idle' && u.key !== 'siegetower' && !u.garrisonOf && !u.target);
      if (lazy.length && tgt) g.orderAttackMove(lazy, tgt.cx, tgt.cz, { formation: null });
    }
  }

  attackNow(alive, tgt) {
    const g = this.g, w = this.wave;
    if (!tgt || tgt.dead) { tgt = this.pickTarget(); if (!tgt) { w.state = 'idle'; return; } w.target = tgt.id; }
    w.state = 'attack'; w.start = g.time; w.size0 = alive.length;
    const siege = alive.filter((u) => u.cls === 'siege');
    const cav = alive.filter((u) => u.cls === 'cav');
    const main = alive.filter((u) => u.cls !== 'siege' && !(this.p.flank && u.cls === 'cav'));
    g.orderAttackMove(main, tgt.cx, tgt.cz, { formation: 'wedge' });
    for (const u of siege) { u.order = { type: 'attackmove', x: tgt.cx, z: tgt.cz, key: 'sw' + u.id }; u.stance = 'aggressive'; }
    if (this.p.flank && cav.length) {
      // flank: strike a production / ranged building from the side
      let fb = null;
      for (const b of g.buildings) if (b.team === tgt.team && b.def.trains && (!fb || g.rng() < 0.3)) fb = b;
      const ft = fb || tgt;
      g.orderAttackMove(cav, ft.cx + 14, ft.cz + 14, { formation: 'charge' });
    }
  }
}
