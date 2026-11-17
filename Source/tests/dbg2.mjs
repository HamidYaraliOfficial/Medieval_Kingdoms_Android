import { createGame } from '../src/setup.js';
const g = createGame({ mode: 'skirmish', mapId: 'greenvalley', size: 'medium', seed: 5, enemies: 1, difficulty: 'normal', army: 8 });
for (let t = 0; t < 500; t += 0.1) g.update(0.1);
const ai = g.teams[1].ai;
console.log('nextWave', ai.nextWave, 'waveSize', ai.waveSize, 'intel', ai.intel, 'state', ai.wave.state, 'time', g.time.toFixed(0));
const s = ai.c.soldiers; const by = {}; for (const u of s) { const k = u.key + ':' + u.order.type + (u.garrisonOf ? ':g' : ''); by[k] = (by[k] || 0) + 1; }
console.log(JSON.stringify(by));
