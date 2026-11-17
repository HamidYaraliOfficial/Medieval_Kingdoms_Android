// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Terrain generation: height field, tile kinds, resource nodes (trees, rock, ore, gold, deer).
import { Noise, mulberry32, clamp, smoothstep, lerp, MinHeap } from './util.js';
import { TILE, MAPS } from './data.js';

export const KIND = { LAND: 0, DEEP: 1, SHALLOW: 2, CLIFF: 3 };

export class Terrain {
  constructor(mapId, N, seedOverride, defOverride) {
    const def = defOverride || MAPS[mapId] || MAPS.greenvalley;
    this.def = def; this.mapId = defOverride ? mapId : (mapId in MAPS ? mapId : 'greenvalley');
    this.N = N; this.size = N * TILE;
    this.seed = seedOverride != null ? seedOverride : def.seed;
    this.wl = def.water;
    this.theme = def.theme;
    this.H = new Float32Array((N + 1) * (N + 1));
    this.kind = new Uint8Array(N * N);
    this.slope = new Float32Array(N * N);
    this.starts = def.starts.map(([u, v]) => ({ tx: Math.round(u * N), tz: Math.round(v * N) }));
    this.nodes = [];
    this.scale = N / 112;
    this._gen();
  }

  _gen() {
    const { N, def, wl } = this;
    const sc = this.scale;
    const nz = new Noise(this.seed), nz2 = new Noise(this.seed + 99);
    const V = N + 1;
    // river polylines in tile coordinates with cumulative lengths
    const rivers = def.rivers.map((r) => {
      const pts = r.pts.map(([u, v]) => [u * N, v * N]);
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, cum, total: cum[cum.length - 1], w: r.w * sc, fords: r.fords || [] };
    });
    const flatTarget = Math.max(def.base + 0.3, wl + 0.9);
    for (let j = 0; j < V; j++) {
      for (let i = 0; i < V; i++) {
        let h = def.base + nz.fbm(i * 0.04 * def.freq + 3.1, j * 0.04 * def.freq + 1.7, 5) * def.amp * 1.7;
        h += nz2.fbm(i * 0.14, j * 0.14, 2) * 0.35;
        for (const m of def.mountains) {
          const mx = m.x * N, mz = m.z * N, r = m.r * sc;
          const d = Math.hypot(i - mx, j - mz) / (r * 0.75);
          const rough = 0.8 + 0.5 * nz2.fbm(i * 0.09, j * 0.09, 3);
          h += m.h * Math.exp(-d * d) * rough * 1.25;
        }
        for (const l of def.lakes) {
          const lx = l.x * N, lz = l.z * N, r = l.r * sc;
          const d = Math.hypot(i - lx, j - lz);
          const c = 1 - smoothstep(r * 0.55, r * 1.25, d);
          h = lerp(h, wl - 1.5, c);
        }
        for (const rv of rivers) {
          let best = 1e9, bt = 0;
          for (let s = 1; s < rv.pts.length; s++) {
            const [ax, az] = rv.pts[s - 1], [bx, bz] = rv.pts[s];
            const dx = bx - ax, dz = bz - az;
            const l2 = dx * dx + dz * dz;
            const t = l2 ? clamp(((i - ax) * dx + (j - az) * dz) / l2, 0, 1) : 0;
            const px = ax + dx * t, pz = az + dz * t;
            const d = Math.hypot(i - px, j - pz);
            if (d < best) { best = d; bt = (rv.cum[s - 1] + Math.sqrt(l2) * t) / rv.total; }
          }
          let target = wl - 1.4;
          for (const f of rv.fords) if (Math.abs(bt - f) < 0.045) target = Math.max(target, wl - 0.2);
          const hw = rv.w * 0.5;
          const c = 1 - smoothstep(hw * 0.7, hw + 2.5, best);
          h = lerp(h, Math.min(h, target + 0.0) , c);
          if (c > 0.02) h = lerp(h, target, c * 0.9);
        }
        for (const s of this.starts) {
          const d = Math.hypot(i - s.tx, j - s.tz);
          const f = 1 - smoothstep(20 * sc, 34 * sc, d);
          if (f > 0) h = lerp(h, flatTarget + nz2.fbm(i * 0.2, j * 0.2, 2) * 0.12, f);
        }
        const edge = Math.min(i, j, N - i, N - j);
        h += smoothstep(7, 0, edge) * 7.0;
        this.H[j * V + i] = h;
      }
    }
    // tile classification
    for (let tz = 0; tz < N; tz++) for (let tx = 0; tx < N; tx++) this._classify(tx, tz);
    this._ensureConnectivity();
    this._genNodes();
  }


  _classify(tx, tz) {
    const { N, wl } = this; const V = N + 1;
    const a = this.H[tz * V + tx], b = this.H[tz * V + tx + 1], c = this.H[(tz + 1) * V + tx], d = this.H[(tz + 1) * V + tx + 1];
    const mx = Math.max(a, b, c, d), mn = Math.min(a, b, c, d), avg = (a + b + c + d) / 4;
    const idx = tz * N + tx;
    this.slope[idx] = mx - mn;
    let k = KIND.LAND;
    const depth = wl - avg;
    if (depth > 0.5) k = KIND.DEEP;
    else if (depth > -0.08) k = KIND.SHALLOW;
    if (k === KIND.LAND && mx - mn > 1.55) k = KIND.CLIFF;
    if (tx < 2 || tz < 2 || tx >= N - 2 || tz >= N - 2) k = KIND.CLIFF;
    this.kind[idx] = k;
  }

  // guarantee every start position can reach every other one (carves fords / ramps where needed)
  _ensureConnectivity() {
    const { N } = this; const V = N + 1;
    const blocked = (i) => this.kind[i] === KIND.DEEP || this.kind[i] === KIND.CLIFF;
    const flood = (s) => {
      const seen = new Uint8Array(N * N); const q = [s.tz * N + s.tx]; seen[q[0]] = 1;
      for (let i = 0; i < q.length; i++) {
        const c = q[i]; const x = c % N, z = (c / N) | 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
          const k = nz * N + nx; if (seen[k] || blocked(k)) continue; seen[k] = 1; q.push(k);
        }
      }
      return seen;
    };
    const carve = (tx, tz) => {
      if (tx < 3 || tz < 3 || tx >= N - 3 || tz >= N - 3) return;
      const k = this.kind[tz * N + tx];
      if (k !== KIND.DEEP && k !== KIND.CLIFF) return;
      const ids = [tz * V + tx, tz * V + tx + 1, (tz + 1) * V + tx, (tz + 1) * V + tx + 1];
      if (k === KIND.DEEP) { for (const i of ids) this.H[i] = Math.max(this.H[i], this.wl - 0.25); }
      else { let m = 0; for (const i of ids) m += this.H[i]; m /= 4; for (const i of ids) this.H[i] = m; }
      for (let z = tz - 1; z <= tz + 1; z++) for (let x = tx - 1; x <= tx + 1; x++) if (x >= 0 && z >= 0 && x < N && z < N) this._classify(x, z);
    };
    for (let guard = 0; guard < 6; guard++) {
      const reached = flood(this.starts[0]);
      const miss = this.starts.findIndex((s, i) => i > 0 && !reached[s.tz * N + s.tx]);
      if (miss < 0) break;
      const s = this.starts[miss];
      const dist = new Float32Array(N * N).fill(1e9); const par = new Int32Array(N * N).fill(-1);
      const heap = new MinHeap(4096); const s0 = s.tz * N + s.tx; dist[s0] = 0; heap.push(s0, 0);
      let goal = -1;
      while (heap.n) {
        const c = heap.pop(); const x = c % N, z = (c / N) | 0;
        if (reached[c]) { goal = c; break; }
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz; if (nx < 2 || nz < 2 || nx >= N - 2 || nz >= N - 2) continue;
          const k = nz * N + nx; const nd = dist[c] + (blocked(k) ? 8 : 1);
          if (nd < dist[k]) { dist[k] = nd; par[k] = c; heap.push(k, nd); }
        }
      }
      if (goal < 0) break;
      for (let c = goal; c >= 0; c = par[c]) { const x = c % N, z = (c / N) | 0; carve(x, z); carve(x + 1, z); carve(x - 1, z); carve(x, z + 1); carve(x, z - 1); }
    }
  }

  _genNodes() {
    const { N, def } = this;
    const sc = this.scale;
    const rnd = mulberry32(this.seed + 7);
    const fn = new Noise(this.seed + 3);
    const occ = new Uint8Array(N * N);
    const add = (type, tx, tz, amount, extra) => {
      const idx = tz * N + tx;
      if (tx < 3 || tz < 3 || tx >= N - 3 || tz >= N - 3) return false;
      if (occ[idx] || this.kind[idx] !== KIND.LAND || this.slope[idx] > 1.0) return false;
      occ[idx] = 1;
      this.nodes.push(Object.assign({ type, tx, tz, x: (tx + 0.5 + (rnd() - 0.5) * 0.5) * TILE, z: (tz + 0.5 + (rnd() - 0.5) * 0.5) * TILE, amount, max: amount, rot: rnd() * Math.PI * 2, scale: 0.85 + rnd() * 0.5, v: Math.floor(rnd() * 3) }, extra));
      return true;
    };
    const nearStart = (tx, tz, r) => this.starts.some((s) => Math.hypot(tx - s.tx, tz - s.tz) < r);
    const startClear = 11 * sc;
    // keep a ring of sensible resources near each start first
    const cluster = (type, cx, cz, count, amount, spread) => {
      let placed = 0, guard = 0;
      while (placed < count && guard++ < count * 40) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * spread;
        const tx = Math.round(cx + Math.cos(a) * r), tz = Math.round(cz + Math.sin(a) * r);
        if (nearStart(tx, tz, startClear * 0.8)) continue;
        if (add(type, tx, tz, amount)) placed++;
      }
      return placed;
    };
    const angleToCenter = (s) => Math.atan2(N / 2 - s.tz, N / 2 - s.tx);
    this.starts.forEach((s, si) => {
      const base = angleToCenter(s);
      const ring = (ang, dist) => [s.tx + Math.cos(ang) * dist * sc, s.tz + Math.sin(ang) * dist * sc];
      // groves, stone, iron, gold around each start (never toward the map centre so the front stays open)
      const aWood = base + Math.PI * 0.75 + rnd() * 0.5;
      const aStone = base - Math.PI * 0.6 + rnd() * 0.4;
      const aIron = base + Math.PI * 0.4 + rnd() * 0.3;
      const aGold = base - Math.PI * 0.95;
      let [cx, cz] = ring(aWood, 17); cluster('tree', cx, cz, 70, 70, 8 * sc);
      [cx, cz] = ring(aWood + 0.8, 23); cluster('tree', cx, cz, 45, 70, 6 * sc);
      [cx, cz] = ring(aStone, 19); cluster('stone', cx, cz, 9, 450, 3.4 * sc);
      [cx, cz] = ring(aIron, 22); cluster('ore', cx, cz, 8, 500, 3.2 * sc);
      [cx, cz] = ring(aGold, 25); cluster('gold', cx, cz, 6, 520, 2.8 * sc);
    });
    // forests
    const fdens = def.forest;
    for (let tz = 3; tz < N - 3; tz++) {
      for (let tx = 3; tx < N - 3; tx++) {
        if (nearStart(tx, tz, startClear)) continue;
        const f = fn.fbm(tx * 0.065 + 11, tz * 0.065 + 7, 3);
        const p = smoothstep(-0.02 - fdens * 0.22, 0.2, f) * (0.18 + 0.5 * fdens);
        if (rnd() < p * 0.62) add('tree', tx, tz, 70);
      }
    }
    // neutral resource clusters
    const placeNeutral = (type, count, amount, n) => {
      let guard = 0, placed = 0;
      while (placed < count && guard++ < count * 60) {
        const tx = 8 + Math.floor(rnd() * (N - 16)), tz = 8 + Math.floor(rnd() * (N - 16));
        if (nearStart(tx, tz, 24 * sc)) continue;
        if (this.kind[tz * N + tx] !== KIND.LAND) continue;
        if (cluster(type, tx, tz, n, amount, 3 * sc) >= Math.max(3, n - 3)) placed++;
      }
    };
    placeNeutral('stone', Math.ceil(def.stone * 0.6), 450, 8);
    placeNeutral('ore', Math.ceil(def.iron * 0.6), 500, 7);
    placeNeutral('gold', Math.ceil(def.gold * 0.6), 520, 6);
    // decorative boulders (not blocking resources, blocking movement)
    for (let k = 0; k < Math.floor(N * 0.9); k++) {
      const tx = 4 + Math.floor(rnd() * (N - 8)), tz = 4 + Math.floor(rnd() * (N - 8));
      if (nearStart(tx, tz, startClear + 3)) continue;
      add('rock', tx, tz, 0);
    }
    // deer herds
    let herds = Math.ceil(def.deer / 3), guard = 0;
    while (herds > 0 && guard++ < 400) {
      const tx = 8 + Math.floor(rnd() * (N - 16)), tz = 8 + Math.floor(rnd() * (N - 16));
      if (this.kind[tz * N + tx] !== KIND.LAND) continue;
      let c = 0;
      for (let k = 0; k < 3; k++) {
        const ex = tx + Math.round((rnd() - 0.5) * 4), ez = tz + Math.round((rnd() - 0.5) * 4);
        if (ex >= 3 && ez >= 3 && ex < N - 3 && ez < N - 3 && this.kind[ez * N + ex] === KIND.LAND && !occ[ez * N + ex]) {
          occ[ez * N + ex] = 1;
          this.nodes.push({ type: 'deer', tx: ex, tz: ez, x: (ex + 0.5) * TILE, z: (ez + 0.5) * TILE, amount: 80, max: 80, rot: rnd() * 6.28, scale: 1, v: 0, ox: (ex + 0.5) * TILE, oz: (ez + 0.5) * TILE });
          c++;
        }
      }
      if (c) herds--;
    }
  }

  heightAt(x, z) {
    const N = this.N, V = N + 1;
    let gx = x / TILE, gz = z / TILE;
    gx = clamp(gx, 0, N - 0.0001); gz = clamp(gz, 0, N - 0.0001);
    const i = Math.floor(gx), j = Math.floor(gz);
    const fx = gx - i, fz = gz - j;
    const a = this.H[j * V + i], b = this.H[j * V + i + 1], c = this.H[(j + 1) * V + i], d = this.H[(j + 1) * V + i + 1];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
  }
  tileHeight(tx, tz) {
    const V = this.N + 1;
    return (this.H[tz * V + tx] + this.H[tz * V + tx + 1] + this.H[(tz + 1) * V + tx] + this.H[(tz + 1) * V + tx + 1]) / 4;
  }
  kindAt(tx, tz) { return tx < 0 || tz < 0 || tx >= this.N || tz >= this.N ? KIND.CLIFF : this.kind[tz * this.N + tx]; }
  isWater(x, z) { return this.heightAt(x, z) < this.wl; }
}
