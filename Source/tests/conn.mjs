import { Terrain, KIND } from '../src/terrain.js';
import { Nav } from '../src/nav.js';
import { MAPS, MAP_SIZES } from '../src/data.js';
for (const id of Object.keys(MAPS)) for (const [sn, N] of Object.entries(MAP_SIZES)) {
  const T = new Terrain(id, N);
  const nav = new Nav(T, () => null);
  const seen = new Uint8Array(N * N); const s = T.starts[0]; const q = [s.tz * N + s.tx]; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) { const c = q[i]; const x = c % N, z = (c / N) | 0; for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue; const k = nz * N + nx; if (seen[k] || nav.cost(nx, nz, 0, false) >= 1e9) continue; seen[k] = 1; q.push(k); } }
  const reach = T.starts.map((st) => seen[st.tz * N + st.tx] ? 'ok' : 'NO');
  let land = 0; for (let i = 0; i < N * N; i++) if (nav.stat[i] !== 1 && !nav.nocc[i]) land++;
  console.log(id.padEnd(15), sn.padEnd(7), 'starts', reach.join(','), 'reach', (q.length / land * 100).toFixed(0) + '%', 'trees', T.nodes.filter((n) => n.type === 'tree').length);
}
