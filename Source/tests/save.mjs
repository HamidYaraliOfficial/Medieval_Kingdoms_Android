import { createGame } from '../src/setup.js';
import { serialize, deserialize } from '../src/save.js';
const g = createGame({ mode: 'skirmish', mapId: 'random', seed: 91, size: 'small', enemies: 1, difficulty: 'normal', army: 8 });
for (let t = 0; t < 200; t += 0.1) g.update(0.1);
const text = serialize(g, { cam: { x: 1 } });
console.log('save bytes', text.length);
const { g: h } = deserialize(text);
const sig = (x) => JSON.stringify([x.buildings.length, x.units.filter((u) => !u.dead).length, x.teams.map((t) => [Math.round(t.res.wood), Math.round(t.res.gold), t.techs.size, t.pop]), x.nodes.length, Math.round(x.time)]);
console.log(sig(g)); console.log(sig(h));
for (let t = 0; t < 120; t += 0.1) { g.update(0.1); h.update(0.1); }
console.log(sig(g)); console.log(sig(h));
try { deserialize('{"broken"'); } catch (e) { console.log('corrupt handled:', e.message); }
try { deserialize(JSON.stringify({ magic: 'IRONCROWN', version: 99 })); } catch (e) { console.log('newer handled:', e.message); }
