// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Versioned save / load of the complete simulation state.
import { SAVE_VERSION, VERSION } from './data.js';
import { Game } from './game.js';
import { AI } from './ai.js';

export class SaveError extends Error {}

export function serialize(g, extra = {}) {
  const o = g.opts;
  const data = {
    magic: 'IRONCROWN', version: SAVE_VERSION, game: VERSION, saved: Date.now(),
    meta: { mode: g.mode, map: g.T.mapId, time: Math.floor(g.time), mission: o.missionIndex != null ? o.missionIndex : null, pop: g.teams[0] ? g.teams[0].pop : 0, name: g.cfg && g.cfg.playerName || '' },
    opts: { mapId: o.mapId, N: g.N, seed: g.T.seed, def: g.T.def && g.T.def.name === 'map.random' ? g.T.def : undefined, mode: g.mode, victory: o.victory, timeLimit: o.timeLimit, role: o.role, missionIndex: o.missionIndex },
    cfg: g.cfg || {},
    time: g.time, sec: g.sec, nextId: g.nextId, over: g.over, objectives: g.objectives, stats: g.stats,
    rng: Math.floor(g.rng() * 4294967296),
    teams: g.teams.map((t) => ({
      id: t.id, kind: t.kind, name: t.name, diff: t.diff, res: t.res, techs: [...t.techs], happiness: t.happiness, tax: t.tax, stats: t.stats, defeated: t.defeated,
      start: t.start, ecoMul: t.ecoMul, capitalId: t.capitalId, formation: t.formation || null, groups: t.groups || {}, growT: t.growT, unpaid: !!t.unpaid,
      ai: t.ai ? { diff: t.ai.diff, o: Object.assign({}, t.ai.o, { blueprint: undefined }), blueprint: t.ai.blueprint, wave: t.ai.wave, nextWave: t.ai.nextWave, waveSize: t.ai.waveSize, intel: t.ai.intel, scoutSent: t.ai.scoutSent } : null,
    })),
    buildings: g.buildings.map((b) => ({
      id: b.id, key: b.key, team: b.team, tx: b.tx, tz: b.tz, rot: b.rot, level: b.level, hp: b.hp, progress: b.progress, built: b.built,
      queue: b.queue, rally: b.rally, want: b.want, prog: b.prog, upg: b.upg, garrison: b.garrison, gateOpen: b.gateOpen, passengers: b.passengers || null,
    })),
    units: g.units.filter((u) => !u.dead).map((u) => ({
      id: u.id, key: u.key, team: u.team, x: u.x, z: u.z, ry: u.ry, hp: u.hp, order: u.order, stance: u.stance, carry: u.carry, job: u.job, anchor: u.anchor,
      form: u.form, faceAngle: u.faceAngle, garrisonOf: u.garrisonOf, inside: u.inside, passengers: u.passengers, target: u.target,
    })),
    nodes: g.nodes.filter((n) => n.amount < n.max).map((n) => [n.id, n.amount]),
    nodeIds: g.nodes.map((n) => n.id),
    extra,
  };
  return JSON.stringify(data);
}

export function deserialize(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { throw new SaveError('corrupt'); }
  if (!d || d.magic !== 'IRONCROWN' || typeof d.version !== 'number') throw new SaveError('corrupt');
  if (d.version > SAVE_VERSION) throw new SaveError('newer');
  if (!Array.isArray(d.teams) || !Array.isArray(d.buildings) || !Array.isArray(d.units) || !d.opts) throw new SaveError('corrupt');
  const g = new Game(Object.assign({}, d.opts, { objectives: null }));
  g.cfg = d.cfg;
  // nodes (ids are deterministic for a given seed): remove vanished, restore amounts
  const alive = new Set(d.nodeIds);
  for (const n of g.nodes.slice()) if (!alive.has(n.id)) g.removeNode(n);
  for (const [id, a] of d.nodes) { const n = g.byId.get(id); if (n) n.amount = a; }
  for (const td of d.teams) {
    const t = g.addTeam({ kind: td.kind, name: td.name, diff: td.diff, start: td.start, ecoMul: td.ecoMul });
    t.res = td.res; t.techs = new Set(td.techs); t.happiness = td.happiness; t.tax = td.tax; t.stats = td.stats; t.defeated = td.defeated;
    t.capitalId = td.capitalId; t.formation = td.formation; t.groups = td.groups || {}; t.growT = td.growT || 8; t.unpaid = td.unpaid;
    g.recalcMods(t);
  }
  g.nextId = Math.max(g.nextId, d.nextId || 1);
  for (const bd of d.buildings) {
    if (!(bd.key in (g.constructor.BUILDINGS || {})) && false) continue;
    const b = g.addBuilding(bd.key, bd.team, bd.tx, bd.tz, bd.rot, { complete: false, id: bd.id });
    b.level = bd.level; b.progress = bd.progress; b.built = bd.built; b.queue = bd.queue || []; b.rally = bd.rally; b.want = bd.want; b.prog = bd.prog || 0; b.upg = bd.upg; b.garrison = bd.garrison || []; b.gateOpen = bd.gateOpen || 0; b.passengers = bd.passengers;
    b.maxHp = b.def.hp * g.hpMult(b, g.teams[b.team]); b.hp = bd.hp;
  }
  for (const ud of d.units) {
    const u = g.addUnit(ud.key, ud.team, ud.x, ud.z, { id: ud.id, ry: ud.ry });
    u.hp = ud.hp; u.order = ud.order || { type: 'idle' }; u.stance = ud.stance; u.carry = ud.carry; u.job = ud.job; u.anchor = ud.anchor || { x: ud.x, z: ud.z };
    u.form = ud.form; u.faceAngle = ud.faceAngle; u.garrisonOf = ud.garrisonOf || 0; u.inside = ud.inside || 0; u.passengers = ud.passengers || null; u.target = ud.target || null;
    if (u.garrisonOf) { const b = g.byId.get(u.garrisonOf); if (b) { u.y = b.y + b.height - 0.2; u.gy = u.y; } else u.garrisonOf = 0; }
    if (u.job && u.job.bid) { const b = g.byId.get(u.job.bid); if (b && (u.job.type === 'work' || u.job.type === 'gather') && !b.workers.includes(u.id)) b.workers.push(u.id); }
    if (u.job && u.job.nodeId) { u.job.stage = 'find'; u.job.nodeId = 0; }
  }
  g.nextId = Math.max(g.nextId, d.nextId || 1);
  g.time = d.time; g.sec = d.sec; g.over = d.over; g.stats = d.stats || g.stats;
  if (d.objectives) g.objectives = d.objectives;
  for (const td of d.teams) {
    const t = g.teams[td.id];
    if (td.ai) { t.ai = new AI(g, t, td.ai.diff, Object.assign({}, td.ai.o, { blueprint: td.ai.blueprint })); t.ai.wave = td.ai.wave; t.ai.nextWave = td.ai.nextWave; t.ai.waveSize = td.ai.waveSize; t.ai.intel = td.ai.intel; t.ai.scoutSent = td.ai.scoutSent; }
  }
  g.recalcAll();
  g.emit('ready', g);
  return { g, extra: d.extra || {}, meta: d.meta };
}
