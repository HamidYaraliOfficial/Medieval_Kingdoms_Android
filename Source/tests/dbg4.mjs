import { createGame } from '../src/setup.js';
const g = createGame({ mode: 'custom', role: 'attack', fort: 'castle', armySize: 'large', size: 'small', seed: 5, difficulty: 'hard' });
const ek = g.byId.get(g.teams[1].capitalId);
g.orderAttackMove(g.units.filter((u) => u.team === 0 && u.key !== 'siegetower'), ek.cx, ek.cz, { formation: 'wedge' });
for (let t = 0; t < 400; t += 0.1) g.update(0.1);
const u = g.units.find((x) => x.team === 0 && !x.dead && x.key === 'heavy');
console.log('unit', u.x.toFixed(1), u.z.toFixed(1), 'tile', u.tx, u.tz, 'order', JSON.stringify(u.order), 'path', u.path && u.path.length, 'pi', u.pi, 'wp', u.path && u.path[u.pi], 'blk', u.blockBid, 'stuck', u.stuckT, 'fail', u.navFail, 'target', u.target, 'pathDone', u.pathDone);
const b = g.byId.get(u.blockBid); console.log('blocker', b && b.key, b && b.team);
for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const x = u.tx+dx, z=u.tz+dz; console.log(dx,dz,'cost',g.nav.cost(x,z,0,false), 'breach', g.nav.cost(x,z,0,true), 'occ', g.nav.occ[z*g.N+x], 'nocc', g.nav.nocc[z*g.N+x], 'stat', g.nav.stat[z*g.N+x]); }
console.log('enemy keep', ek.cx, ek.cz);
console.log('x,z exact', u.x, u.z);
console.log('path', JSON.stringify(u.path.slice(0,5)));
const r = g.nav.findPath(u.x, u.z, { x: ek.cx, z: ek.cz }, 0, { breach: true });
console.log('fresh', JSON.stringify(r.path.slice(0, 5)), r.partial);
for (let z = 68; z <= 74; z++) { let row = ''; for (let x = 36; x <= 46; x++) row += (g.nav.nocc[z*g.N+x] ? 'T' : g.nav.occ[z*g.N+x] ? 'B' : g.nav.stat[z*g.N+x] ? '~' : '.') + (x===u.tx&&z===u.tz?'*':' '); console.log(z, row); }
