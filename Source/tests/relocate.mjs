import { createGame } from '../src/setup.js';
const g = createGame({ mode: 'skirmish', mapId: 'greenvalley', size: 'medium', seed: 5, enemies: 1, difficulty: 'normal', army: 8, bonus: { wood: 2000, stone: 1000, iron: 500, gold: 800 } });
const cap = g.byId.get(g.teams[0].capitalId);
const sp = (key, from) => { for (let r = 2; r < 30; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const x = from.tx + dx, z = from.tz + dz; if (g.canPlace(key, 0, x, z, 0, {}).ok) return { x, z }; } };
const s1 = sp('house', cap); const r1 = g.placeBuilding(0, 'house', s1.x, s1.z, 0, { complete: true });
console.log('placed house', r1.ok);
const h = r1.b; console.log('canRelocate house', g.canRelocate(h), 'town hall', g.canRelocate(cap));
const before = Object.assign({}, g.teams[0].res), n0 = g.buildings.length;
const s2 = sp('house', { tx: s1.x + 12, tz: s1.z }); const rr = g.relocateBuilding(h, s2.x, s2.z, 0);
console.log('relocate', rr.ok, 'cost', JSON.stringify(g.relocateCost(h)), 'old dead', h.dead, 'new built', rr.b.built, 'progress', rr.b.progress, 'buildings', n0, '->', g.buildings.length);
console.log('wood spent', before.wood - g.teams[0].res.wood);
// let villagers finish it
for (let i = 0; i < 1800 && !rr.b.built; i++) g.update(0.1);
console.log('rebuilt', rr.b.built, 'after', g.time.toFixed(0), 's; hp', Math.round(rr.b.hp), '/', Math.round(rr.b.maxHp));
// overlapping the old spot is rejected
const rej = g.relocateBuilding(rr.b, rr.b.tx + 1, rr.b.tz, 0); console.log('overlap rejected', !rej.ok, rej.reason);
// barracks (training building) with queue
const s3 = sp('barracks', cap); const bk = g.placeBuilding(0, 'barracks', s3.x, s3.z, 0, { complete: true }).b;
g.queueUnit(bk, 'sword'); const w = g.teams[0].res.wood; const s4 = sp('barracks', { tx: s3.x + 14, tz: s3.z });
const r4 = g.relocateBuilding(bk, s4.x, s4.z, 1); console.log('barracks relocate', r4.ok, 'rot', r4.b.rot);
process.exit(0);
