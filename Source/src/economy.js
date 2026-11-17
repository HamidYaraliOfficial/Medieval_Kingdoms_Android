// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Economy: food, taxes, upkeep, happiness, population growth, production chains, queues, worker assignment, towers.
import { BUILDINGS, UNITS, TECH_BY_ID, TILE, TAX_RATES, BUILDER_CAP, POP_EAT, RES } from './data.js';
import { dist, dist2, clamp } from './util.js';

const WORK_PRIO = ['farm', 'woodcutter', 'quarry', 'wheatfield', 'mill', 'bakery', 'mine', 'hunter', 'church', 'market', 'blacksmith'];

export function installEconomy(Game) {
  const P = Game.prototype;

  P.productivity = function (t) { return (0.6 + 0.4 * clamp(t.happiness, 0, 100) / 100) * t.ecoMul; };

  P.updateEconomy = function (dt) {
    for (const t of this.teams) {
      if (t.defeated) continue;
      if (this.mode === 'custom') { t.happiness = 60; t.starving = false; continue; }
      // ---- food consumption (every 5 s window)
      t.eatT += dt;
      if (t.eatT >= 5) {
        const need = t.pop * POP_EAT * t.eatT; t.eatT = 0;
        let rem = need;
        const bu = Math.min(t.res.bread, rem / 2); t.res.bread -= bu; t.acc.bread.o += bu; rem -= bu * 2;
        const fu = Math.min(t.res.food, rem); t.res.food -= fu; t.acc.food.o += fu; rem -= fu;
        const was = t.starving;
        t.starving = need > 0.01 && rem > 0.05;
        if (t.starving && !was) this.notify(t.id, 'n.starving', {}, 'bad', null, 30);
      }
      // ---- taxes & upkeep (every 10 s)
      t.upkeepT += dt;
      if (t.upkeepT >= 10) {
        const span = t.upkeepT; t.upkeepT = 0;
        let bonus = 1 + t.mods.tax;
        let upkeep = 0;
        for (const b of this.buildings) {
          if (b.team !== t.id || !b.built) continue;
          if (b.def.taxBonus && (b.def.workers ? b.wk > 0 : true)) bonus += b.def.taxBonus;
          upkeep += (b.def.upkeep || 0) * (span / 10);
        }
        upkeep += t.army * 0.15 * (span / 10);
        if (t.kind === 'ai') upkeep *= 0.5;
        const tax = t.pop * POP_EAT * span * TAX_RATES[t.tax] * (0.4 + 0.8 * t.happiness / 100) * bonus * (t.kind === 'ai' ? t.ecoMul : 1);
        this.addRes(t, 'gold', tax);
        if (t.res.gold >= upkeep) { t.res.gold -= upkeep; t.acc.gold.o += upkeep; t.unpaid = false; }
        else { t.acc.gold.o += t.res.gold; t.res.gold = 0; if (!t.unpaid) this.notify(t.id, 'n.unpaid', {}, 'bad', null, 40); t.unpaid = true; }
        t.income = tax; t.upkeepNow = upkeep;
      }
      // ---- happiness
      let target = 52;
      target += t.starving ? -35 : t.res.bread > 5 ? 8 : 3;
      target += [10, 4, 0, -12][t.tax];
      let churches = 0; for (const b of this.buildings) if (b.team === t.id && b.built && b.def.happy && b.wk > 0) churches++;
      target += Math.min(2, churches) * 8;
      if (t.unpaid) target -= 8;
      t.happyTarget = clamp(target, 0, 100);
      t.happiness += (t.happyTarget - t.happiness) * Math.min(1, dt * 0.25);
      // ---- growth / desertion
      t.growT -= dt;
      if (t.growT <= 0) {
        t.growT = clamp(16 - t.happiness / 10, 5, 16);
        if (t.happiness >= 35 && !t.starving && t.pop < t.popCap && t.vill < 80 && t.capitalId) {
          const cap = this.byId.get(t.capitalId);
          if (cap && (t.res.food + t.res.bread * 2 > 10)) { const p = this.spawnPos(cap); this.addUnit('villager', t.id, p.x, p.z); this.emit('sfx', { s: 'ui', x: p.x, z: p.z }); }
        }
      }
      t.deserterT += dt;
      if (t.deserterT > 15) {
        t.deserterT = 0;
        if (t.happiness < 15 && t.vill > 3) {
          const v = this.units.find((u) => u.team === t.id && u.cls === 'work' && !u.dead);
          if (v) { this.killUnit(v, null, true); this.notify(t.id, 'n.leaving', {}, 'bad', null, 30); }
        }
      }
      // ---- worker assignment
      t.assignT = (t.assignT || 0) - dt;
      if (t.assignT <= 0) { t.assignT = 1; this.assignWorkers(t); }
    }
  };

  // ------------------------------------------------------------- spawn position near a building
  P.spawnPos = function (b) {
    const tx0 = b.tx - 1, tz0 = b.tz - 1, tx1 = b.tx + b.w, tz1 = b.tz + b.d;
    const cands = [];
    for (let x = tx0; x <= tx1; x++) { cands.push([x, tz1]); cands.push([x, tz0]); }
    for (let z = tz0 + 1; z < tz1; z++) { cands.push([tx0, z]); cands.push([tx1, z]); }
    const pref = b.rally ? [b.rally.x / TILE, b.rally.z / TILE] : [b.tx + b.w / 2, b.tz + b.d + 6];
    let best = null, bd = 1e9;
    for (const [x, z] of cands) {
      if (!this.nav.free(x, z, b.team)) continue;
      const d = (x - pref[0]) ** 2 + (z - pref[1]) ** 2 + Math.random() * 3;
      if (d < bd) { bd = d; best = [x, z]; }
    }
    if (!best) best = this.nav.nearestFree(tx1, tz1, b.team, 8) || [tx1, tz1];
    return { x: (best[0] + 0.5) * TILE, z: (best[1] + 0.5) * TILE };
  };

  // ------------------------------------------------------------- buildings update
  P.updateBuildings = function (dt) {
    const list = this.buildings.slice();
    for (const b of list) {
      if (b.dead) continue;
      const t = this.teams[b.team];
      b.wk = b._w; b._w = 0; b.age += dt;
      b.bd = b._bd || 0; b._bd = 0;
      if (!b.built) continue;
      const def = b.def;
      // gate opening animation state
      if (def.gate) {
        let near = false;
        this.unitsNear(b.cx, b.cz, 5.5, (u) => { if (u.team === b.team && !u.dead) near = true; });
        b.gateOpen += ((near ? 1 : 0) - b.gateOpen) * Math.min(1, dt * 3);
        if (near && !b._gateSnd && b.gateOpen < 0.1) { b._gateSnd = true; this.emit('sfx', { s: 'gate', x: b.cx, z: b.cz }); }
        if (!near) b._gateSnd = false;
      }
      // upgrade timer
      if (b.upg) { b.upg.t += dt; if (b.upg.t >= b.upg.total) this.levelUp(b); }
      // production chain
      const p = def.prod;
      if (p && b.wk > 0) {
        const lvl = 1 + (b.level - 1) * 0.2;
        let eff = (b.wk / def.workers) * this.productivity(t) * lvl;
        const hasIn = !p.inp || Object.keys(p.inp).every((k) => t.res[k] >= p.inp[k]);
        b.noRes = hasIn ? 0 : 1;
        if (hasIn) {
          b.prog += dt * eff / p.cycle;
          if (b.prog >= 1) {
            b.prog -= 1;
            if (p.inp) for (const k in p.inp) { t.res[k] -= p.inp[k]; t.acc[k].o += p.inp[k]; }
            const mul = (def.prod.out.food || def.prod.out.wheat) ? 1 + t.mods.farm : 1;
            for (const k in p.out) this.addRes(t, k, p.out[k] * mul);
            this.emit('produce', { b });
          }
        }
      }
      // queue
      if (b.queue.length) {
        const q = b.queue[0];
        let sp = 1;
        if (def.research) sp += 0.25 * b.wk;
        q.left -= dt * sp;
        if (q.left <= 0) {
          if (q.type === 'unit') {
            const ud = UNITS[q.id];
            if (t.pop + ud.pop <= t.popCap) {
              b.queue.shift();
              const pos = this.spawnPos(b);
              const u = this.addUnit(q.id, b.team, pos.x, pos.z);
              if (b.rally) this.orderMove([u], b.rally.x, b.rally.z, { formation: null });
              this.emit('sfx', { s: 'spawn', x: pos.x, z: pos.z });
              this.emit('unitTrained', { b, u });
              this.recalcTeam(t);
            } else { q.left = 0; this.notify(b.team, 'n.popfull', {}, 'bad', null, 20); }
          } else {
            b.queue.shift();
            t.techs.add(q.id);
            this.recalcMods(t); this.refreshBuildingStats(t);
            for (const u of this.units) if (u.team === t.id) this.refreshUnitStats(u);
            this.notify(b.team, 'n.techdone', { tech: q.id }, 'good');
            this.emit('techDone', { team: t.id, tech: q.id });
          }
        }
      }
      // towers
      if (def.tower) this.updateTower(b, t, dt);
      // capture of capitals
      if (def.territory && b.hp < b.maxHp * 0.4) this.updateCapture(b, dt);
      // slow self repair for walls when team has Masonry
      if (b.hp < b.maxHp && this.time - b.lastHit > 20 && def.wall && t.techs.has('masonry1')) b.hp = Math.min(b.maxHp, b.hp + dt * 2);
    }
  };

  P.updateTower = function (b, t, dt) {
    const tw = b.def.tower;
    b.cd -= dt;
    if (b.cd > 0) return;
    const range = tw.range + (b.garrison.length ? 3 : 0) + (b.level - 1) * 2;
    const ox = b.cx, oz = b.cz;
    let best = null, bd = 1e9;
    this.unitsNear(ox, oz, range, (u, d2) => {
      if (u.team === b.team || u.dead || u.inside) return;
      if (u.garrisonOf) return;
      let w = d2; if (u.cls === 'siege') w *= 0.4;
      if (w < bd) { bd = w; best = u; }
    });
    if (!best) { b.cd = 0.25; return; }
    b.cd = tw.cd * 0.95;
    let dmg = tw.dmg * (1 + t.mods.towerDmg) * (1 + (b.level - 1) * 0.25);
    if (tw.bolt) this.shoot({ x: ox, y: b.y + b.height, z: oz, team: b.team }, best, dmg, { type: 'bolt', speed: 60, srcB: b.id });
    else this.shoot({ x: ox, y: b.y + b.height, z: oz, team: b.team }, best, dmg, { type: 'arrow', speed: 40, srcB: b.id });
  };

  P.updateCapture = function (b, dt) {
    let att = 0, def = 0, who = -1; const counts = {};
    this.unitsNear(b.cx, b.cz, 14, (u) => {
      if (u.dead || u.cls === 'work' || u.cls === 'siege') return;
      if (u.team === b.team) { def++; return; }
      att++; counts[u.team] = (counts[u.team] || 0) + 1;
    });
    let bc = 0; for (const k in counts) if (counts[k] > bc) { bc = counts[k]; who = +k; }
    if (att >= 3 && def === 0 && who >= 0) {
      b.captureT += dt;
      if (b.captureT >= 6) {
        if (this.mode === 'custom' || true) this.captureBuilding(b, who);
      }
    } else b.captureT = Math.max(0, b.captureT - dt * 2);
  };

  // ------------------------------------------------------------- worker assignment
  P.clearJob = function (u) {
    const j = u.job;
    if (j && j.bid) { const b = this.byId.get(j.bid); if (b) { const i = b.workers.indexOf(u.id); if (i >= 0) b.workers.splice(i, 1); } }
    if (j && j.nodeId) { const n = this.byId.get(j.nodeId); if (n) n.claims = Math.max(0, n.claims - 1); }
    u.job = null; u.carryDrop = null; u.navKey = null; u.path = null;
  };
  P.assignJob = function (u, job) {
    this.clearJob(u);
    u.job = job; u.navKey = null; u.path = null;
    if (job.bid && (job.type === 'work' || job.type === 'gather')) { const b = this.byId.get(job.bid); if (b && !b.workers.includes(u.id)) b.workers.push(u.id); }
  };

  P.assignWorkers = function (t) {
    const vs = [];
    for (const u of this.units) if (u.team === t.id && u.cls === 'work' && !u.dead && !u.inside) vs.push(u);
    if (!vs.length) return;
    // validate current jobs
    for (const u of vs) {
      const j = u.job; if (!j) continue;
      if (j.bid) { const b = this.byId.get(j.bid); if (!b || b.dead || b.team !== t.id) { this.clearJob(u); continue; } if ((j.type === 'work' || j.type === 'gather') && j.bid && !b.built) this.clearJob(u); }
    }
    const free = vs.filter((u) => !u.job);
    const take = (x, z) => {
      let bi = -1, bd = 1e12;
      for (let i = 0; i < free.length; i++) { const d = dist2(x, z, free[i].x, free[i].z); if (d < bd) { bd = d; bi = i; } }
      return bi >= 0 ? free.splice(bi, 1)[0] : null;
    };
    // 1. construction sites
    const counts = {};
    for (const u of vs) if (u.job && u.job.type === 'build') counts[u.job.bid] = (counts[u.job.bid] || 0) + 1;
    const sites = this.buildings.filter((b) => b.team === t.id && !b.built);
    for (const b of sites) {
      const need = Math.min(BUILDER_CAP, Math.ceil(b.def.time / 14)) - (counts[b.id] || 0);
      for (let k = 0; k < need; k++) {
        let u = take(b.cx, b.cz);
        if (!u && !(counts[b.id] || k)) {
          // steal one villager from the least valuable workplace
          const cands = vs.filter((v) => v.job && (v.job.type === 'gather' || v.job.type === 'work') && !v.job.manual);
          cands.sort((a, c) => this._jobValue(a) - this._jobValue(c));
          if (cands.length > 1) u = cands[0];
        }
        if (!u) break;
        this.assignJob(u, { type: 'build', bid: b.id });
        counts[b.id] = (counts[b.id] || 0) + 1;
      }
    }
    // 2. workplaces
    const places = this.buildings.filter((b) => b.team === t.id && b.built && b.def.workers > 0);
    const foodLow = t.res.food + t.res.bread * 2 < t.pop * 4;
    places.sort((a, c) => {
      let pa = WORK_PRIO.indexOf(a.key), pc = WORK_PRIO.indexOf(c.key);
      if (foodLow) { if (a.key === 'farm') pa = -2; if (c.key === 'farm') pc = -2; }
      return pa - pc;
    });
    for (const b of places) {
      while (b.workers.length > b.want) { const id = b.workers.pop(); const u = this.byId.get(id); if (u) { u.job = { type: 'x' }; this.clearJob(u); } }
      let guard = 0;
      while (b.workers.length < b.want && free.length && guard++ < 8) {
        const u = take(b.cx, b.cz); if (!u) break;
        if (b.def.gather) this.assignJob(u, { type: 'gather', res: b.def.gather, bid: b.id, nodeId: 0 });
        else this.assignJob(u, { type: 'work', bid: b.id });
      }
    }
    // 3. repairs
    if (free.length) {
      const dmg = this.buildings.filter((b) => b.team === t.id && b.built && b.hp < b.maxHp * 0.85 && this.time - b.lastHit > 6 && !b.def.moat);
      for (const b of dmg) {
        const have = vs.filter((u) => u.job && u.job.type === 'repair' && u.job.bid === b.id).length;
        if (have >= 2) continue;
        const u = take(b.cx, b.cz); if (!u) break;
        this.assignJob(u, { type: 'repair', bid: b.id });
      }
    }
  };
  P._jobValue = function (u) {
    const j = u.job; if (!j) return 0;
    const b = this.byId.get(j.bid);
    if (!b) return 0;
    const i = WORK_PRIO.indexOf(b.key); return 20 - i;
  };
}
