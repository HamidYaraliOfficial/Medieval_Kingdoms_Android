// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Grid navigation: occupancy, A* path finding with optional "breach" mode (paths through hostile walls).
import { MinHeap } from './util.js';
import { TILE } from './data.js';
import { KIND } from './terrain.js';

const INF = 1e9;
const SQ2 = 1.41421356;

export class Nav {
  constructor(T, getB) {
    this.T = T; this.N = T.N; this.getB = getB;
    const n = this.N * this.N;
    this.stat = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const k = T.kind[i];
      this.stat[i] = k === KIND.CLIFF || k === KIND.DEEP ? 1 : k === KIND.SHALLOW ? 2 : 0;
    }
    this.occ = new Int32Array(n);
    this.nocc = new Int32Array(n);
    this.version = 0;
    this.gS = new Float32Array(n); this.parent = new Int32Array(n);
    this.seen = new Int32Array(n); this.closed = new Int32Array(n); this.stamp = 0;
    this.heap = new MinHeap(8192);
  }

  inb(tx, tz) { return tx >= 0 && tz >= 0 && tx < this.N && tz < this.N; }

  // movement cost of a tile for a team; INF when impassable. breach = may pass through hostile structures at a premium.
  cost(tx, tz, team, breach) {
    if (tx < 0 || tz < 0 || tx >= this.N || tz >= this.N) return INF;
    const idx = tz * this.N + tx;
    if (this.nocc[idx]) return INF;
    const bid = this.occ[idx];
    if (bid) {
      const b = this.getB(bid);
      if (b) {
        if (b.passable) return 1;
        if (b.gate) {
          if (b.team === team && b.built) return 1.4;
          return breach ? 9 + b.hp / 90 : INF;
        }
        if (b.team === team) return INF;
        return breach ? 7 + b.hp / 70 : INF;
      }
    }
    const s = this.stat[idx];
    if (s === 1) return INF;
    return s === 2 ? 1.8 : 1;
  }

  free(tx, tz, team) { return this.cost(tx, tz, team, false) < INF; }

  nearestFree(tx, tz, team, maxR = 14) {
    tx = Math.max(0, Math.min(this.N - 1, tx)); tz = Math.max(0, Math.min(this.N - 1, tz));
    if (this.free(tx, tz, team)) return [tx, tz];
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = 1e9;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (this.free(tx + dx, tz + dz, team)) {
            const d = dx * dx + dz * dz;
            if (d < bd) { bd = d; best = [tx + dx, tz + dz]; }
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  // Line of sight over tiles (supercover). Only ordinary tiles (cost <= 2) are allowed.
  los(ax, az, bx, bz, team) {
    let x0 = ax / TILE, z0 = az / TILE;
    const x1 = bx / TILE, z1 = bz / TILE;
    const dx = x1 - x0, dz = z1 - z0;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2.2) + 1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const tx = Math.floor(x0 + dx * t), tz = Math.floor(z0 + dz * t);
      if (this.cost(tx, tz, team, false) > 2) return false;
      // keep clear of corners: also test neighbours on diagonal moves
      const nx = Math.floor(x0 + dx * Math.min(1, t + 0.45 / steps)), nz = Math.floor(z0 + dz * Math.min(1, t + 0.45 / steps));
      if ((nx !== tx && nz !== tz) && (this.cost(nx, tz, team, false) > 2 || this.cost(tx, nz, team, false) > 2)) return false;
    }
    return true;
  }

  // goal: {x,z} world point, or rect {x0,z0,x1,z1} (inclusive tiles) to reach adjacency to. returns {path:[{x,z}], partial}
  findPath(sx, sz, goal, team, opt = {}) {
    const N = this.N;
    const breach = !!opt.breach;
    let stx = Math.floor(sx / TILE), stz = Math.floor(sz / TILE);
    if (!this.inb(stx, stz)) { stx = Math.max(0, Math.min(N - 1, stx)); stz = Math.max(0, Math.min(N - 1, stz)); }
    if (this.cost(stx, stz, team, true) >= INF) {
      const f = this.nearestFree(stx, stz, team, 6);
      if (f) { stx = f[0]; stz = f[1]; } else return null;
    }
    let rect = goal.x0 != null ? goal : null;
    let gtx, gtz;
    if (!rect) {
      gtx = Math.max(0, Math.min(N - 1, Math.floor(goal.x / TILE))); gtz = Math.max(0, Math.min(N - 1, Math.floor(goal.z / TILE)));
      if (this.cost(gtx, gtz, team, breach) >= INF) {
        const f = this.nearestFree(gtx, gtz, team, 10);
        if (!f) return null;
        gtx = f[0]; gtz = f[1];
      }
    }
    const reach = opt.reach != null ? opt.reach : 1;
    const isGoal = rect
      ? (tx, tz) => { const dx = tx < rect.x0 ? rect.x0 - tx : tx > rect.x1 ? tx - rect.x1 : 0; const dz = tz < rect.z0 ? rect.z0 - tz : tz > rect.z1 ? tz - rect.z1 : 0; return Math.max(dx, dz) <= reach && !(dx === 0 && dz === 0); }
      : (tx, tz) => tx === gtx && tz === gtz;
    const hfn = rect
      ? (tx, tz) => { const dx = tx < rect.x0 ? rect.x0 - tx : tx > rect.x1 ? tx - rect.x1 : 0; const dz = tz < rect.z0 ? rect.z0 - tz : tz > rect.z1 ? tz - rect.z1 : 0; const a = Math.max(dx, dz), b = Math.min(dx, dz); return a + (SQ2 - 1) * b; }
      : (tx, tz) => { const dx = Math.abs(tx - gtx), dz = Math.abs(tz - gtz); return Math.max(dx, dz) + (SQ2 - 1) * Math.min(dx, dz); };

    const stamp = ++this.stamp;
    const heap = this.heap; heap.clear();
    const sIdx = stz * N + stx;
    this.gS[sIdx] = 0; this.parent[sIdx] = -1; this.seen[sIdx] = stamp;
    heap.push(sIdx, hfn(stx, stz));
    let found = -1, best = sIdx, bestH = hfn(stx, stz), exp = 0;
    const maxExp = opt.maxExp || 16000;
    while (heap.n > 0) {
      const cur = heap.pop();
      if (this.closed[cur] === stamp) continue;
      this.closed[cur] = stamp;
      const cx = cur % N, cz = (cur / N) | 0;
      if (isGoal(cx, cz)) { found = cur; break; }
      const ch = hfn(cx, cz);
      if (ch < bestH) { bestH = ch; best = cur; }
      if (++exp > maxExp) break;
      const g0 = this.gS[cur];
      for (let d = 0; d < 8; d++) {
        const dx = DX[d], dz = DZ[d];
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
        const nIdx = nz * N + nx;
        if (this.closed[nIdx] === stamp) continue;
        let c = this.cost(nx, nz, team, breach);
        if (c >= INF) continue;
        if (dx !== 0 && dz !== 0) {
          const c1 = this.cost(cx + dx, cz, team, breach), c2 = this.cost(cx, cz + dz, team, breach);
          if (c1 >= INF || c2 >= INF) continue;
          if (c1 > 2 || c2 > 2) continue;
          c *= SQ2;
        }
        const ng = g0 + c;
        if (this.seen[nIdx] !== stamp || ng < this.gS[nIdx]) {
          this.seen[nIdx] = stamp; this.gS[nIdx] = ng; this.parent[nIdx] = cur;
          heap.push(nIdx, ng + hfn(nx, nz) * 1.001);
        }
      }
    }
    let partial = false;
    if (found < 0) { found = best; partial = true; }
    // rebuild
    const tiles = [];
    for (let c = found; c >= 0; c = this.parent[c]) tiles.push(c);
    tiles.reverse();
    // tiles[0] is start. smooth by line of sight
    const pts = tiles.map((c) => ({ x: ((c % N) + 0.5) * TILE, z: (((c / N) | 0) + 0.5) * TILE, c }));
    const out = [];
    let anchor = { x: sx, z: sz };
    let i = 0;
    while (i < pts.length) {
      let j = Math.min(pts.length - 1, i + 28);
      while (j > i && !this.los(anchor.x, anchor.z, pts[j].x, pts[j].z, team)) j--;
      out.push(pts[j]); anchor = pts[j]; i = j + 1;
    }
    // dedupe & drop the first node if identical to start tile
    const res = [];
    for (const p of out) { if (!res.length || res[res.length - 1].c !== p.c) res.push(p); }
    if (res.length && res[0].c === sIdx && res.length > 1) res.shift();
    return { path: res.map((p) => ({ x: p.x, z: p.z })), partial };
  }
}
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DZ = [0, 0, 1, -1, 1, -1, 1, -1];
