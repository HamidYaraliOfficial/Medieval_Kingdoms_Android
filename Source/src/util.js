// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Small shared helpers: seeded RNG, noise, math, binary heap.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));
export const angDiff = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

// 2D gradient noise
export class Noise {
  constructor(seed = 1) {
    const r = mulberry32(seed);
    this.p = new Uint8Array(512);
    const perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }
  _g(h, x, y) {
    switch (h & 7) {
      case 0: return x + y; case 1: return x - y; case 2: return -x + y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  }
  noise(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
    const p = this.p;
    const a = p[X] + Y, b = p[X + 1] + Y;
    return lerp(
      lerp(this._g(p[a], x, y), this._g(p[b], x - 1, y), u),
      lerp(this._g(p[a + 1], x, y - 1), this._g(p[b + 1], x - 1, y - 1), u), v) * 0.9;
  }
  fbm(x, y, oct = 4) {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += a * this.noise(x * f, y * f); f *= 2; a *= 0.5; }
    return s;
  }
}

// Binary min-heap keyed by priority, storing integer ids
export class MinHeap {
  constructor(cap = 4096) { this.ids = new Int32Array(cap); this.pr = new Float32Array(cap); this.n = 0; }
  clear() { this.n = 0; }
  push(id, p) {
    if (this.n >= this.ids.length) {
      const ni = new Int32Array(this.ids.length * 2); ni.set(this.ids); this.ids = ni;
      const np = new Float32Array(this.pr.length * 2); np.set(this.pr); this.pr = np;
    }
    let i = this.n++;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.pr[par] <= p) break;
      this.ids[i] = this.ids[par]; this.pr[i] = this.pr[par]; i = par;
    }
    this.ids[i] = id; this.pr[i] = p;
  }
  pop() {
    const top = this.ids[0];
    const id = this.ids[--this.n], p = this.pr[this.n];
    let i = 0;
    const n = this.n;
    while (true) {
      let c = i * 2 + 1;
      if (c >= n) break;
      if (c + 1 < n && this.pr[c + 1] < this.pr[c]) c++;
      if (this.pr[c] >= p) break;
      this.ids[i] = this.ids[c]; this.pr[i] = this.pr[c]; i = c;
    }
    this.ids[i] = id; this.pr[i] = p;
    return top;
  }
}

export function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16);
}

export const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : Math.floor(n).toString());
export const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
};
export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
