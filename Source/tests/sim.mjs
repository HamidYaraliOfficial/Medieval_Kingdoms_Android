import { createGame } from '../src/setup.js';
const cfg = JSON.parse(process.argv[2] || '{}');
const secs = +process.argv[3] || 300;
const t0 = Date.now();
const g = createGame(Object.assign({ mode: 'skirmish', mapId: 'greenvalley', size: 'medium', seed: 5, enemies: 1, difficulty: 'normal', army: 8 }, cfg));
console.log('created in', Date.now() - t0, 'ms; nodes', g.nodes.length, 'buildings', g.buildings.length, 'units', g.units.length);
let msgs = 0;
g.on('notify', (n) => { if (n.team === 0 || n.team === -1) { if (msgs++ < 40) console.log('  notify', g.time.toFixed(0), n.key, JSON.stringify(n.params)); } });
const dt = 0.1;
let last = 0;
const t1 = Date.now();
for (let t = 0; t < secs; t += dt) {
  g.update(dt);
  if (g.sec !== last && g.sec % 30 === 0) {
    last = g.sec;
    const rep = g.teams.map((tm) => `T${tm.id}[${tm.kind[0]}] pop ${tm.pop}/${tm.popCap} vill ${tm.vill} army ${tm.army} hap ${tm.happiness.toFixed(0)} res w${tm.res.wood | 0} s${tm.res.stone | 0} i${tm.res.iron | 0} g${tm.res.gold | 0} f${tm.res.food | 0} b${tm.res.bread | 0} bld ${g.buildings.filter((b) => b.team === tm.id).length}${tm.defeated ? ' DEFEATED' : ''}${tm.ai ? ' wave:' + tm.ai.wave.state + '#' + tm.ai.wave.number : ''}`);
    console.log(`t=${g.sec}s`, rep.join(' | '));
  }
  if (g.over) { console.log('OVER', JSON.stringify(g.over)); break; }
}
console.log('sim wall time', Date.now() - t1, 'ms');
