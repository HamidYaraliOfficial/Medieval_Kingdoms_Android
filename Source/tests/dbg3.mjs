import { createGame } from '../src/setup.js';
const g = createGame({ mode: 'custom', role: 'defend', fort: 'light', armySize: 'medium', size: 'small', seed: 5, difficulty: 'normal' });
let u = null;
for (let t = 0; t < 70; t += 0.1) {
  g.update(0.1);
  if (!u) u = g.units.find((x) => x.team === 1 && x.key === 'shield' && x.order.type === 'attackmove');
  if (u && Math.abs(g.time % 5) < 0.05) console.log(g.time.toFixed(0), 'pos', u.x.toFixed(1), u.z.toFixed(1), 'order', u.order.x.toFixed(0), u.order.z.toFixed(0), 'path', u.path ? u.path.length + ' pi ' + u.pi + ' wp ' + (u.path[u.pi] ? u.path[u.pi].x.toFixed(0) + ',' + u.path[u.pi].z.toFixed(0) : '-') : null, 'partial', u.partialPath, 'stuck', u.stuckT.toFixed(2), 'fail', u.navFail, 'tgt', u.target, 'blk', u.blockBid, u.state);
}
