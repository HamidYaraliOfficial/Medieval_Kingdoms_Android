import { createGame } from '../src/setup.js';
import { findSpot } from '../src/place.js';
import { BUILDINGS, UNITS } from '../src/data.js';
const cfg = JSON.parse(process.argv[2] || '{}');
const secs = +process.argv[3] || 900;
const g = createGame(Object.assign({ mode: 'skirmish', mapId: 'greenvalley', size: 'medium', seed: 5, enemies: 1, difficulty: 'normal', army: 8 }, cfg));
const me = g.teams[0];
const cap = g.byId.get(me.capitalId);
const ctx = Math.floor(cap.cx / 2), ctz = Math.floor(cap.cz / 2);
const dirE = (() => { const e = g.teams[1].ai?.cap; const l = Math.hypot(e.cx - cap.cx, e.cz - cap.cz); return { x: (e.cx - cap.cx) / l, z: (e.cz - cap.cz) / l }; })();
const count = (k) => g.buildings.filter((b) => b.team === 0 && b.key === k).length;
const build = (k, o = {}) => { if (!g.canAfford(me, BUILDINGS[k].cost)) return false; const s = findSpot(g, 0, k, ctx + (o.dx || 0), ctz + (o.dz || 0), Object.assign({ rmax: 22 }, o)); if (!s) return false; return g.placeBuilding(0, k, s.tx, s.tz, s.rot).ok; };
let botT = 0, log = 0;
g.on('notify', (n) => { if (n.team === 0 && n.key !== 'n.attack' && log++ < 25) console.log('  notify', g.time.toFixed(0), n.key, JSON.stringify(n.params)); });
for (let t = 0; t < secs; t += 0.1) {
  g.update(0.1);
  botT -= 0.1;
  if (botT <= 0) {
    botT = 4;
    const sites = g.buildings.filter((b) => b.team === 0 && !b.built).length;
    if (sites < 2) {
      if (me.popCap - me.pop < 6) build('house');
      else if (count('farm') < Math.ceil(me.pop / 14)) build('farm');
      else if (count('woodcutter') < 2) build('woodcutter', { rmax: 22 });
      else if (!count('barracks')) build('barracks');
      else if (!count('archery')) build('archery');
      else if (count('guardtower') < 3) build('guardtower', { dx: dirE.x * 8, dz: dirE.z * 8, rmax: 6 });
      else if (!count('mine')) build('mine');
      else if (count('quarry') < 1) build('quarry');
      else if (!count('blacksmith')) build('blacksmith');
    }
    for (const b of g.buildings) if (b.team === 0 && b.built && b.def.trains && b.def.trains[0] !== 'villager' && b.queue.length < 2) {
      const k = b.def.trains.filter((x) => g.unitAvailable(me, x))[Math.floor(g.rng() * 2) % b.def.trains.length] || b.def.trains[0];
      if (g.unitAvailable(me, k)) g.queueUnit(b, k);
    }
    const th = g.buildings.find((b) => b.team === 0 && b.def.trains && b.def.trains.includes('villager') && b.queue.length < 1);
    if (th && me.vill < 26) g.queueUnit(th, 'villager');
    const idle = g.units.filter((u) => u.team === 0 && !u.dead && u.cls !== 'work' && u.order.type === 'idle' && Math.hypot(u.x - cap.cx - dirE.x * 24, u.z - cap.cz - dirE.z * 24) > 18 && !u.target);
    if (idle.length) g.orderMove(idle, cap.cx + dirE.x * 24, cap.cz + dirE.z * 24, { formation: 'line' });
    const b0 = g.buildings.find((b) => b.team === 0 && b.def.tower && b.garrison.length < 2);
    const ar = g.units.find((u) => u.team === 0 && u.cls === 'rng' && !u.dead && !u.garrisonOf && u.order.type === 'idle');
    if (b0 && ar) g.orderGarrison([ar], b0);
  }
  if (g.sec % 60 === 0 && Math.abs(g.secT) < 0.11 && g.sec !== log2) { log2 = g.sec; rep(); }
  if (g.over) { console.log('OVER', JSON.stringify(g.over)); break; }
}
var log2 = -1;
function rep() { console.log(`t=${g.sec}`, g.teams.map((tm) => `T${tm.id} pop ${tm.pop} vill ${tm.vill} army ${tm.army} hap ${tm.happiness | 0} g${tm.res.gold | 0} w${tm.res.wood | 0} f${tm.res.food | 0} bld ${g.buildings.filter((b) => b.team === tm.id && !b.def.line).length} kills ${tm.stats.kills} lost ${tm.stats.lost}${tm.defeated ? ' DEFEATED' : ''}${tm.ai ? ' ' + tm.ai.wave.state : ''}`).join(' | ')); }
rep();
