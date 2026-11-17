import { createGame } from '../src/setup.js';
const g = createGame({ mode: 'skirmish', mapId: 'greenvalley', size: 'medium', seed: 5, enemies: 1, difficulty: process.argv[2] || 'hard', army: 8 });
const T = +process.argv[3] || 240;
for (let t = 0; t < T; t += 0.1) g.update(0.1);
for (const tm of g.teams) {
  const c = {}; for (const b of g.buildings) if (b.team === tm.id && !b.def.line) c[b.key + (b.built ? '' : '*')] = (c[b.key + (b.built ? '' : '*')] || 0) + 1;
  console.log('team', tm.id, JSON.stringify(c));
  const jobs = {}; for (const u of g.units) if (u.team === tm.id && u.cls === 'work' && !u.dead) { const k = u.job ? u.job.type + ':' + (u.job.res || (g.byId.get(u.job.bid)?.key) || '') : 'idle'; jobs[k] = (jobs[k] || 0) + 1; }
  console.log('  jobs', JSON.stringify(jobs), 'food flow', tm.flow.food.rin.toFixed(2), tm.flow.food.rout.toFixed(2), 'starving', tm.starving, 'ai sites', tm.ai?.c?.sites);
}
for (const b of g.buildings) if (b.team === 1 && (b.key === 'farm' || b.key==='woodcutter')) console.log(b.key, b.built, 'want', b.want, 'workers', b.workers.length, 'wk', b.wk, 'prog', b.prog.toFixed(2));
