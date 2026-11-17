import { createGame } from '../src/setup.js';
const size = process.argv[2] || 'large', fort = process.argv[3] || 'castle';
const g = createGame({ mode: 'custom', role: 'attack', fort, armySize: size, size: 'small', seed: 5, difficulty: 'hard' });
const me = g.teams[0], en = g.teams[1];
const ek = g.byId.get(en.capitalId);
const mine = () => g.units.filter((u) => u.team === 0 && !u.dead);
g.orderAttackMove(mine().filter((u) => u.key !== 'siegetower'), ek.cx, ek.cz, { formation: 'wedge' });
// load towers
const tws = mine().filter((u) => u.key === 'siegetower'); const inf = mine().filter((u) => u.cls === 'inf');
tws.forEach((tw, i) => { g.orderBoard(inf.slice(i * 8, i * 8 + 8), tw); g.orderMove([tw], ek.cx, ek.cz, { formation: null }); tw.order = { type: 'attackmove', x: ek.cx, z: ek.cz, key: 'tt' }; });
const t0 = Date.now();
const evs = {}; for (const e of ['unitDied', 'buildingRemoved', 'captured', 'deploy']) g.on(e, () => { evs[e] = (evs[e] || 0) + 1; });
for (let t = 0; t < 600; t += 0.1) {
  g.update(0.1);
  if (Math.abs(g.time % 30) < 0.05) console.log(g.time.toFixed(0), 'P army', me.army, 'E army', en.army, 'E bld', g.buildings.filter((b) => b.team === 1).length, 'keep hp', ek && !ek.dead ? ek.hp.toFixed(0) + '/' + ek.maxHp.toFixed(0) : 'gone', JSON.stringify(evs));
  if (g.over) { console.log('OVER', JSON.stringify(g.over), g.time.toFixed(0)); break; }
}
console.log('wall ms', Date.now() - t0);
for (const tm of g.teams) { const by = {}; for (const u of g.units) if (u.team === tm.id && !u.dead) { const k = u.key + ':' + u.order.type + ':' + u.state + (u.garrisonOf ? ':G' : ''); by[k] = (by[k] || 0) + 1; } console.log('T' + tm.id, JSON.stringify(by)); }
