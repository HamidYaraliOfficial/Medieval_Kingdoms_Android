import { createGame } from '../src/setup.js';
const g = createGame({ mode: 'custom', role: 'attack', fort: 'castle', armySize: 'large', size: 'small', seed: 5, difficulty: 'hard' });
const ek = g.byId.get(g.teams[1].capitalId);
g.orderAttackMove(g.units.filter((u) => u.team === 0 && u.key !== 'siegetower'), ek.cx, ek.cz, { formation: 'wedge' });
let tr = null;
for (let t = 0; t < 400; t += 0.1) {
  g.update(0.1);
  if (t > 300) { if (!tr) { tr = g.units.find((x) => x.team === 0 && !x.dead && x.key === 'heavy'); } if (Math.abs(t % 1) < 0.05) console.log(t.toFixed(0), tr.x.toFixed(2), tr.z.toFixed(2), 'pi', tr.pi, 'stuck', tr.stuckT.toFixed(2), 'fail', tr.navFail, 'key', tr.navKey, 'pathDone', tr.pathDone, tr.path && JSON.stringify(tr.path[tr.pi])); }
  if (t > 310) break;
}
