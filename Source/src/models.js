// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Procedural 3D models: every building, prop and unit part is generated in code (no third-party assets).
import * as THREE from 'three';
import { mulberry32 } from './util.js';

export const PAL = {
  stone: 0x9b978c, stoneD: 0x6c6964, stoneL: 0xb9b4a6, wood: 0x8a5a33, woodD: 0x58391f, woodL: 0xa8794a, plaster: 0xdccfae, plasterD: 0xc4b48e,
  thatch: 0xc9a650, tile: 0xa6402d, tileD: 0x7d2f22, slate: 0x56606b, slateD: 0x3d454e, gold: 0xe2b232, iron: 0x5d6269, dirt: 0x7b5d3b, hay: 0xd9b95a,
  green: 0x4f8038, greenD: 0x3a6a2c, red: 0xb03030, blue: 0x2f55a0, white: 0xf0ead8, black: 0x222222, skin: 0xe0b48e, leather: 0x6b4426,
};

const baseGeos = {};
function bg(name, make) { return baseGeos[name] || (baseGeos[name] = make()); }
const unitBox = () => bg('box', () => new THREE.BoxGeometry(1, 1, 1).toNonIndexed());
const unitCyl = (seg) => bg('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg, 1).toNonIndexed());
const unitCone = (seg) => bg('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg, 1).toNonIndexed());
const unitIco = () => bg('ico', () => new THREE.IcosahedronGeometry(1, 1));

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
const _col = new THREE.Color();
const colCache = {};
function lin(hex) { return colCache[hex] || (colCache[hex] = (() => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; })()); }

function mkSet() { return { p: [], n: [], u: [], c: [], w: [] }; }

export class GeoBuilder {
  constructor(seed = 1, origin = [0, 0, 0]) {
    this.sets = { s: mkSet(), w: mkSet(), g: mkSet(), f: mkSet() };
    this.rng = mulberry32(seed);
    this.parts = {};
    this.origin = origin;
  }
  sub(name, px, py, pz) {
    const b = new GeoBuilder(Math.floor(this.rng() * 1e6), [px, py, pz]);
    b.isSub = true;
    this.parts[name] = { pos: [px, py, pz], b };
    return b;
  }
  add(geo, m, color, set = 's', o = {}) {
    const S = this.sets[set];
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const cnt = pos.count;
    _nm.getNormalMatrix(m);
    const jit = o.jit != null ? o.jit : 0.06;
    const c0 = lin(color);
    const wind = o.wind || 0;
    const [ox, oy, oz] = this.origin;
    for (let i = 0; i < cnt; i += 3) {
      const j = 1 + (this.rng() - 0.5) * jit * 2;
      for (let k = 0; k < 3; k++) {
        _v.fromBufferAttribute(pos, i + k).applyMatrix4(m);
        _n.fromBufferAttribute(nor, i + k).applyMatrix3(_nm).normalize();
        const wx = _v.x, wy = _v.y, wz = _v.z;
        S.p.push(wx - ox, wy - oy, wz - oz);
        S.n.push(_n.x, _n.y, _n.z);
        const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
        let u, v;
        if (ay >= ax && ay >= az) { u = wx; v = wz; } else if (ax >= az) { u = wz; v = wy; } else { u = wx; v = wy; }
        S.u.push(u * 0.5, v * 0.5);
        let sh = 1;
        if (set === 's' || set === 'w') sh = 0.78 + 0.22 * Math.min(1, Math.max(0, (wy + 0.2) / 1.6));
        S.c.push(c0[0] * j * sh, c0[1] * j * sh, c0[2] * j * sh);
        S.w.push(wind * (o.windFn ? o.windFn(wx, wy, wz) : 1));
      }
    }
  }
  _mat(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
    _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
    return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  }
  // axis aligned box centred at (x,y,z)
  box(x, y, z, w, h, d, color, o = {}) { this.add(unitBox(), this._mat(x, y, z, w, h, d, o.ry, o.rx, o.rz), color, o.set || (this.def || 's'), o); return this; }
  cyl(x, y, z, rt, rb, h, color, o = {}) {
    // unit cylinder has radius 1: build with custom radius via non-uniform scale (rt==rb) or dedicated geometry
    if (Math.abs(rt - rb) < 1e-4) this.add(unitCyl(o.seg || 10), this._mat(x, y, z, rt, h, rt, o.ry, o.rx, o.rz), color, o.set || (this.def || 's'), o);
    else { const g = new THREE.CylinderGeometry(rt, rb, 1, o.seg || 10, 1).toNonIndexed(); this.add(g, this._mat(x, y, z, 1, h, 1, o.ry, o.rx, o.rz), color, o.set || (this.def || 's'), o); g.dispose(); }
    return this;
  }
  cone(x, y, z, r, h, color, o = {}) { this.add(unitCone(o.seg || 8), this._mat(x, y + h / 2, z, r, h, o.rz != null ? o.rz : r, o.ry, o.rx, 0), color, o.set || (this.def || 'w'), o); return this; }
  sphere(x, y, z, r, color, o = {}) { this.add(unitIco(), this._mat(x, y, z, r, o.sy != null ? o.sy : r, r, o.ry), color, o.set || (this.def || 's'), o); return this; }
  // gable roof: base at y, width w (x), ridge height h, length d (z)
  prism(x, y, z, w, h, d, color, o = {}) {
    const g = bg('prism', () => {
      const a = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5];
      const idx = [0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5];
      const geo = new THREE.BufferGeometry();
      const pos = []; for (const i of idx) pos.push(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); return geo;
    });
    this.add(g, this._mat(x, y, z, w, h, d, o.ry, o.rx, o.rz), color, o.set || 'w', o); return this;
  }
  // pyramid (hip) roof
  hip(x, y, z, w, h, d, color, o = {}) { this.add(unitCone(4), this._mat(x, y + h / 2, z, w * 0.7071, h, d * 0.7071, (o.ry || 0) + Math.PI / 4), color, o.set || 'w', o); return this; }
  flag(x, y, z, w, h, o = {}) {
    const g = bg('flagq', () => { const geo = new THREE.PlaneGeometry(1, 1, 1, 1).toNonIndexed(); return geo; });
    this.add(g, this._mat(x + w / 2, y, z, w, h, 1, o.ry || 0), 0xffffff, 'f', { jit: 0, wind: 1, windFn: (wx, wy, wz) => Math.min(1, Math.max(0, (wx - x) / Math.max(w, 0.01))) });
    this.box(x, y - 0.95, z, 0.09, h + 2.1, 0.09, P.woodD, { set: 'w', jit: 0 });
    return this;
  }
  // crenellations along a rectangle
  crenel(cx, y, cz, W, D, color, o = {}) {
    const step = o.step || 0.95, h = o.h || 0.55, t = o.t || 0.45;
    for (let x = -W / 2 + 0.3; x <= W / 2 - 0.2; x += step) { this.box(cx + x, y + h / 2, cz - D / 2 + t / 2, 0.5, h, t, color, o); this.box(cx + x, y + h / 2, cz + D / 2 - t / 2, 0.5, h, t, color, o); }
    for (let z = -D / 2 + step; z <= D / 2 - step + 0.1; z += step) { this.box(cx - W / 2 + t / 2, y + h / 2, cz + z, t, h, 0.5, color, o); this.box(cx + W / 2 - t / 2, y + h / 2, cz + z, t, h, 0.5, color, o); }
    return this;
  }
  crenelRound(cx, y, cz, r, color, n = 10) {
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; this.box(cx + Math.cos(a) * r, y + 0.28, cz + Math.sin(a) * r, 0.5, 0.56, 0.5, color, { ry: -a }); }
    return this;
  }
  windows(list, color = 0xffc866) { for (const [x, y, z, ry] of list) this.box(x, y, z, 0.5, 0.7, 0.12, color, { set: 'g', ry: ry || 0, jit: 0 }); return this; }
  build() {
    const mk = (S) => {
      if (!S.p.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(S.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(S.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(S.u, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(S.c, 3));
      g.setAttribute('wind', new THREE.Float32BufferAttribute(S.w, 1));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    };
    const out = { s: mk(this.sets.s), w: mk(this.sets.w), g: mk(this.sets.g), f: mk(this.sets.f), parts: {} };
    for (const k in this.parts) { const p = this.parts[k]; out.parts[k] = Object.assign({ pos: p.pos }, p.b.build()); }
    return out;
  }
}

// ---------------------------------------------------------------- textures & materials
function canvasTex(draw, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'); draw(x, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function noiseSpeckle(x, s, amt, n) {
  const r = mulberry32(7);
  for (let i = 0; i < n; i++) { const v = 128 + (r() - 0.5) * amt * 2; x.fillStyle = `rgba(${v},${v},${v},0.35)`; x.fillRect(r() * s, r() * s, 1 + r() * 3, 1 + r() * 3); }
}
export function makeTextures() {
  const stone = canvasTex((x, s) => {
    x.fillStyle = '#d2d2d2'; x.fillRect(0, 0, s, s);
    const rh = 32, r = mulberry32(3);
    for (let row = 0; row < s / rh; row++) {
      const off = (row % 2) * 32; const bw = 64;
      for (let col = -1; col < s / bw + 1; col++) {
        const v = 196 + Math.floor(r() * 44); x.fillStyle = `rgb(${v},${v},${v})`;
        x.fillRect(col * bw + off + 2, row * rh + 2, bw - 3, rh - 3);
      }
    }
    noiseSpeckle(x, s, 40, 1400);
    x.strokeStyle = 'rgba(70,70,70,0.55)'; x.lineWidth = 2;
    for (let row = 0; row <= s / rh; row++) { x.beginPath(); x.moveTo(0, row * rh); x.lineTo(s, row * rh); x.stroke(); }
    for (let row = 0; row < s / rh; row++) { const off = (row % 2) * 32; for (let col = 0; col <= s / 64; col++) { x.beginPath(); x.moveTo(col * 64 + off, row * rh); x.lineTo(col * 64 + off, row * rh + rh); x.stroke(); } }
  });
  const wood = canvasTex((x, s) => {
    x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, s, s);
    const r = mulberry32(5);
    for (let i = 0; i < s / 16; i++) { const v = 200 + Math.floor(r() * 40); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i * 16 + 1, 0, 14, s); x.fillStyle = 'rgba(60,60,60,0.5)'; x.fillRect(i * 16, 0, 2, s); }
    for (let i = 0; i < 160; i++) { const v = 150 + r() * 70; x.fillStyle = `rgba(${v},${v},${v},0.3)`; x.fillRect(r() * s, r() * s, 1, 8 + r() * 30); }
    x.fillStyle = 'rgba(60,60,60,0.25)'; for (let i = 0; i < 30; i++) x.fillRect(0, r() * s, s, 1);
  });
  const terrain = canvasTex((x, s) => {
    x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, s, s);
    const r = mulberry32(11);
    for (let i = 0; i < 4000; i++) { const v = 160 + r() * 90; x.fillStyle = `rgba(${v},${v},${v},0.5)`; x.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 3); }
    for (let i = 0; i < 400; i++) { const v = 120 + r() * 60; x.fillStyle = `rgba(${v},${v},${v},0.25)`; const w = 4 + r() * 10; x.fillRect(r() * s, r() * s, w, w * 0.5); }
  }, 512);
  const waterN = canvasTex((x, s) => {
    const img = x.createImageData(s, s); const r = mulberry32(21);
    const h = new Float32Array(s * s);
    for (let o = 1; o <= 4; o++) { const f = 2 ** o, a = 1 / f; const g = []; for (let i = 0; i < (f + 1) * (f + 1); i++) g.push(r()); for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { const gx = xx / s * f, gy = yy / s * f; const x0 = Math.floor(gx), y0 = Math.floor(gy); const fx = gx - x0, fy = gy - y0; const ix = (a2, b2) => g[((b2 % f)) * (f + 1) + (a2 % f)]; const v = (ix(x0, y0) * (1 - fx) + ix(x0 + 1, y0) * fx) * (1 - fy) + (ix(x0, y0 + 1) * (1 - fx) + ix(x0 + 1, y0 + 1) * fx) * fy; h[yy * s + xx] += v * a; } }
    for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
      const hx = h[yy * s + ((xx + 1) % s)] - h[yy * s + ((xx + s - 1) % s)], hy = h[((yy + 1) % s) * s + xx] - h[((yy + s - 1) % s) * s + xx];
      const i = (yy * s + xx) * 4; img.data[i] = 128 + hx * 300; img.data[i + 1] = 128 + hy * 300; img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }, 256);
  waterN.colorSpace = THREE.NoColorSpace;
  return { stone, wood, terrain, waterN };
}

export const windUniform = { value: 0 };
export function patchWind(mat, strength = 0.12, mode = 'attr') {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniform;
    sh.vertexShader = 'uniform float uTime;\n' + (mode === 'attr' ? 'attribute float wind;\n' : '') + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      ${mode === 'attr'
        ? `float ww = wind * ${strength.toFixed(3)}; transformed.z += sin(uTime * 3.0 + position.x * 2.0) * ww; transformed.y += cos(uTime * 2.3 + position.x * 1.7) * ww * 0.4;`
        : `#ifdef USE_INSTANCING
          vec3 ip = (instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
          #else
          vec3 ip = vec3(0.0);
          #endif
          float ph = uTime * 1.6 + ip.x * 0.35 + ip.z * 0.27;
          float hh = max(position.y, 0.0);
          transformed.x += sin(ph) * ${strength.toFixed(3)} * hh * hh * 0.35;
          transformed.z += cos(ph * 0.8) * ${strength.toFixed(3)} * hh * hh * 0.25;`}`);
  };
}

// ---------------------------------------------------------------- building models
const P = PAL;
function plinth(B, W, D, h = 2.0) { B.box(0, -h / 2 + 0.25, 0, W + 0.25, h, D + 0.25, P.stoneD, { set: 's' }); }

function door(B, x, z, w, h, ry = 0, col = P.woodD) { B.box(x, h / 2, z, w, h, 0.18, col, { set: 'w', ry }); B.box(x, h / 2, z, w + 0.3, 0.2, 0.22, P.stoneD, { ry }); }

const MODELS = {
  house(B, w, d, lv) {
    const W = 4, D = 4; plinth(B, W, D);
    B.box(0, 1.1, 0, 3.3, 2.2, 3.3, P.plaster, { set: 's' });
    for (const sx of [-1.65, 1.65]) for (const sz of [-1.65, 1.65]) B.box(sx, 1.1, sz, 0.25, 2.3, 0.25, P.woodD, { set: 'w' });
    B.box(0, 2.0, 1.66, 3.4, 0.2, 0.12, P.woodD, { set: 'w' }); B.box(0, 1.0, 1.66, 3.4, 0.14, 0.12, P.woodD, { set: 'w' });
    B.prism(0, 2.2, 0, 4.3, 1.7, 3.9, P.tile);
    door(B, -0.7, 1.7, 0.7, 1.4);
    B.windows([[0.9, 1.3, 1.72], [1.67, 1.3, 0.2, Math.PI / 2], [-1.67, 1.3, -0.4, Math.PI / 2]]);
    B.box(1.2, 3.2, -0.9, 0.5, 1.4, 0.5, P.stoneD);
    if (lv >= 2) { B.box(0, 3.1, 0.9, 1.4, 0.8, 1.2, P.plaster, { set: 's' }); B.prism(0, 3.5, 0.9, 1.7, 0.9, 1.5, P.tileD); }
    if (lv >= 3) B.flag(-1.9, 4.2, 1.5, 0.9, 0.55);
  },
  farm(B, w, d, lv) {
    const W = 8, D = 8; plinth(B, W, D, 1.2);
    B.box(0, 1.4, -1.8, 5.0, 2.8, 3.6, P.wood, { set: 'w' });
    B.prism(0, 2.8, -1.8, 5.6, 2.1, 4.2, P.thatch);
    B.box(0, 1.2, 0.02, 2.0, 2.4, 0.2, P.woodD, { set: 'w' }); B.box(0, 1.2, 0.03, 0.15, 2.4, 0.25, P.woodL, { set: 'w' });
    B.box(-2.4, 0.15, 2.5, 3.0, 0.3, 3.0, P.dirt, { set: 'w' });
    for (let i = -3.4; i <= 3.5; i += 1.1) { B.box(i, 0.5, 3.6, 0.18, 1.0, 0.18, P.woodD, { set: 'w' }); B.box(i, 0.5, -3.6 + 0.0, 0.01, 0.01, 0.01, P.woodD, { set: 'w' }); }
    B.box(0, 0.6, 3.6, 7.0, 0.14, 0.12, P.woodL, { set: 'w' }); B.box(0, 0.9, 3.6, 7.0, 0.14, 0.12, P.woodL, { set: 'w' });
    for (const s of [-3.5, 3.5]) { B.box(s, 0.5, 2.0, 0.12, 0.14, 3.2, P.woodL, { set: 'w' }); B.box(s, 0.5, 2.0, 0.12, 0.14, 3.2, P.woodL, { set: 'w' }); }
    B.cone(3.0, 0, 1.6, 0.9, 1.5, P.hay, { seg: 7 }); B.cone(2.6, 0, 2.8, 0.7, 1.1, P.hay, { seg: 7 });
    B.cyl(-3.2, 0.5, -0.4 + 4, 0.35, 0.35, 0.8, P.woodD, { set: 'w' });
    for (let i = 0; i < 4; i++) B.box(-1.6 + i * 0.6, 0.18, 2.6, 0.35, 0.36, 2.2, i % 2 ? P.green : P.greenD, { set: 'w', jit: 0.15 });
    B.flag(-2.4, 4.8, -3.4, 0.9, 0.5);
    if (lv >= 2) B.box(3.5, 1.2, -2.0, 1.6, 2.4, 1.6, P.woodL, { set: 'w' });
    if (lv >= 2) B.prism(3.5, 2.4, -2.0, 2.1, 1.1, 2.0, P.tile);
  },
  wheatfield(B, w, d, lv) {
    const W = 8, D = 8;
    B.box(0, 0.05, 0, W - 0.1, 0.12, D - 0.1, P.dirt, { set: 'w', jit: 0.1 });
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 14; j++) { B.box(-3.3 + i * 0.95, 0.38, -3.4 + j * 0.5, 0.22, 0.7, 0.3, (i + j) % 3 ? P.hay : 0xc9a238, { set: 'w', jit: 0.12, wind: 0.5, windFn: (x, y) => y > 0.2 ? 1 : 0 }); }
    }
    // scarecrow
    B.box(3.2, 1.0, 3.0, 0.1, 2.0, 0.1, P.woodD, { set: 'w' }); B.box(3.2, 1.6, 3.0, 1.2, 0.1, 0.1, P.woodD, { set: 'w' }); B.sphere(3.2, 2.1, 3.0, 0.28, P.hay, { set: 'w' }); B.cone(3.2, 2.3, 3.0, 0.4, 0.35, P.leather, { seg: 8 });
    for (const [x, z] of [[-3.9, -3.9], [3.9, -3.9], [-3.9, 3.9], [3.9, 3.9]]) B.box(x, 0.4, z, 0.14, 0.8, 0.14, P.woodD, { set: 'w' });
  },
  mill(B, w, d, lv) {
    const W = 6, D = 6; plinth(B, W, D);
    B.cyl(0, 2.5, 0, 1.45, 2.0, 5.0, P.stoneL, { seg: 12 });
    B.cone(0, 5.0, 0, 1.9, 1.9, P.woodD, { seg: 12 });
    B.box(0, 0.9, 2.0, 1.0, 1.8, 0.2, P.woodD, { set: 'w' });
    B.windows([[0, 3.2, 1.4], [1.3, 3.2, 0], [-1.3, 3.2, 0]]);
    B.box(0, 4.1, 1.55, 0.35, 0.35, 1.0, P.woodD, { set: 'w' });
    const r = B.sub('rotor', 0, 4.1, 2.15);
    r.def = 'w'; r.box(0, 0, 0, 0.45, 0.45, 0.5, P.woodD, { set: 'w' });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; r.box(Math.cos(a) * 1.85, Math.sin(a) * 1.85, 0, 0.2, 3.5, 0.12, P.woodD, { set: 'w', rz: a + Math.PI / 2 + 0 }); r.box(Math.cos(a) * 2.5 + Math.cos(a + 1.57) * 0.45, Math.sin(a) * 2.5 + Math.sin(a + 1.57) * 0.45, 0.02, 1.9, 0.9, 0.05, P.plasterD, { set: 'w', rz: a }); }
    B.cyl(2.0, 0.4, 1.8, 0.4, 0.4, 0.8, P.woodD, { set: 'w' }); B.cyl(2.3, 0.4, 2.3, 0.4, 0.4, 0.8, P.woodL, { set: 'w' });
    B.flag(-1.4, 6.6, 0, 1.0, 0.6);
  },
  bakery(B, w, d, lv) {
    const W = 6, D = 6; plinth(B, W, D);
    B.box(0, 1.3, 0, 5.0, 2.6, 4.6, P.plaster, { set: 's' });
    for (const sx of [-2.45, 2.45]) for (const sz of [-2.25, 2.25]) B.box(sx, 1.3, sz, 0.3, 2.7, 0.3, P.woodD, { set: 'w' });
    B.box(0, 2.35, 2.3, 5.1, 0.2, 0.14, P.woodD, { set: 'w' });
    B.prism(0, 2.6, 0, 5.8, 2.0, 5.2, P.tile);
    B.box(-1.6, 3.6, -1.2, 1.1, 4.0, 1.1, P.stoneD); B.box(-1.6, 5.7, -1.2, 1.3, 0.3, 1.3, P.stone);
    door(B, 0.4, 2.35, 1.1, 1.8);
    B.windows([[-1.5, 1.5, 2.35], [2.0, 1.5, 2.35], [2.52, 1.5, 0, Math.PI / 2]]);
    B.box(2.1, 1.0, 3.2, 1.6, 0.9, 0.8, P.wood, { set: 'w' }); for (let i = 0; i < 4; i++) B.box(1.6 + i * 0.35, 1.55, 3.2, 0.3, 0.22, 0.3, P.hay, { set: 'w' });
    B.flag(2.4, 4.4, -2.0, 0.9, 0.55);
  },
  woodcutter(B, w, d, lv) {
    const W = 4, D = 4; plinth(B, W, D, 1.0);
    B.box(-0.3, 1.0, -0.2, 2.8, 2.0, 2.6, P.wood, { set: 'w' });
    for (let y = 0.2; y < 2; y += 0.4) { B.cyl(-0.3, y, 1.15, 0.2, 0.2, 2.8, P.woodL, { set: 'w', rz: Math.PI / 2 }); }
    B.prism(-0.3, 2.0, -0.2, 3.5, 1.3, 3.2, P.thatch);
    door(B, -0.3, 1.1, 0.8, 1.4);
    for (let i = 0; i < 3; i++) for (let j = 0; j <= i; j++) B.cyl(1.4 + j * 0.4, 0.2 + (2 - i) * 0.0 + (i) * 0.34 * 0.0, -1.6 + i * 0.35, 0.18, 0.18, 1.3, P.woodL, { set: 'w', rx: Math.PI / 2 });
    B.cyl(1.4, 0.25, 1.4, 0.35, 0.35, 0.5, P.woodD, { set: 'w' }); B.box(1.5, 0.7, 1.4, 0.7, 0.1, 0.1, P.iron, { rz: 0.6, set: 'g' });
  },
  quarry(B, w, d, lv) {
    const W = 6, D = 6;
    B.box(0, -0.4, 0.3, 5.4, 0.9, 4.6, 0x6a5d4e, { set: 's', jit: 0.12 });
    for (let i = 0; i < 6; i++) B.box(-2 + i * 0.8, 0.3 + (i % 3) * 0.12, 0.8, 0.7, 0.5 + (i % 2) * 0.3, 0.7, i % 2 ? P.stoneL : P.stone, { set: 's', jit: 0.12 });
    B.box(-2.2, 2.0, -2.0, 0.25, 4.0, 0.25, P.woodD, { set: 'w' }); B.box(-0.8, 2.0, -2.0, 0.25, 4.0, 0.25, P.woodD, { set: 'w' }); B.box(-1.5, 4.0, -2.0, 1.7, 0.25, 0.25, P.woodD, { set: 'w' });
    B.box(-1.5, 2.6, -2.0, 0.05, 2.8, 0.05, P.leather, { set: 'w' }); B.box(-1.5, 1.2, -2.0, 0.7, 0.55, 0.7, P.stoneL, { set: 's' });
    B.box(2.0, 1.0, -1.8, 1.8, 2.0, 1.8, P.wood, { set: 'w' }); B.prism(2.0, 2.0, -1.8, 2.3, 1.0, 2.1, P.thatch);
    for (let i = 0; i < 4; i++) B.box(2.2 + (i % 2) * 0.9, 0.35 + Math.floor(i / 2) * 0.7, 2.2, 0.8, 0.7, 0.8, P.stoneL, { set: 's' });
  },
  mine(B, w, d, lv) {
    const W = 6, D = 6;
    B.sphere(0, 1.2, -1.2, 3.0, 0x787068, { sy: 2.5, jit: 0.1 }); B.box(0, 0.7, -2.4, 5.0, 1.8, 3.0, 0x6f675f, { jit: 0.1 });
    B.box(0, 1.0, 0.4, 2.0, 2.0, 0.4, 0x15100c, { set: 's', jit: 0 });
    B.box(-1.15, 1.1, 0.5, 0.3, 2.3, 0.5, P.woodD, { set: 'w' }); B.box(1.15, 1.1, 0.5, 0.3, 2.3, 0.5, P.woodD, { set: 'w' }); B.box(0, 2.25, 0.5, 2.8, 0.3, 0.5, P.woodD, { set: 'w' });
    B.box(0, 0.08, 2.0, 0.12, 0.08, 3.0, P.iron, { set: 'w' }); B.box(0.5, 0.08, 2.0, 0.12, 0.08, 3.0, P.iron, { set: 'w' });
    B.box(0.25, 0.55, 2.3, 0.9, 0.55, 0.7, P.woodL, { set: 'w' }); B.box(0.25, 0.9, 2.3, 0.7, 0.2, 0.5, 0x3a3a3a, { set: 's' });
    B.box(-1.5, 2.0, 0.8, 0.2, 0.3, 0.2, 0xffa030, { set: 'g', jit: 0 });
    B.flag(1.8, 4.2, -1.0, 0.9, 0.5);
  },
  market(B, w, d, lv) {
    const W = 8, D = 6; plinth(B, W, D, 1.0);
    const cols = [P.red, P.white, P.blue];
    for (let i = 0; i < 3; i++) {
      const x = -2.5 + i * 2.5;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(x + sx * 1.0, 1.2, -1.0 + sz * 0.9, 0.14, 2.4, 0.14, P.woodD, { set: 'w' });
      B.prism(x, 2.4, -1.0, 2.5, 0.9, 2.3, cols[i], { ry: 0 });
      B.box(x, 0.55, -0.4, 1.9, 0.9, 0.9, P.woodL, { set: 'w' });
      for (let k = 0; k < 4; k++) B.sphere(x - 0.6 + k * 0.4, 1.1, -0.4, 0.17, [0xd04030, 0xe0b030, 0x70a030, 0xd07030][k], { set: 'w' });
    }
    for (let i = 0; i < 3; i++) B.box(-3 + i * 1.0, 0.3, 2.0, 0.7, 0.6, 0.7, P.woodL, { set: 'w', ry: i * 0.4 });
    B.cyl(3.0, 0.5, 2.0, 0.45, 0.45, 1.0, P.woodD, { set: 'w' }); B.cyl(3.0, 0.5, 2.0, 0.47, 0.47, 0.1, P.iron, { set: 'w' });
    B.flag(0, 5.2, -2.2, 1.0, 0.6);
    B.box(0, 3.2, -2.2, 0.1, 4.2, 0.1, P.woodD, { set: 'w' });
  },
  warehouse(B, w, d, lv) {
    const W = 6, D = 6; plinth(B, W, D);
    B.box(0, 1.5, -0.2, 5.0, 3.0, 4.6, P.wood, { set: 'w' });
    B.prism(0, 3.0, -0.2, 5.8, 2.0, 5.0, P.slate);
    door(B, 0, 2.15, 2.0, 2.2); B.box(0, 1.1, 2.12, 0.12, 2.2, 0.12, P.woodL, { set: 'w' });
    for (let i = 0; i < 4; i++) B.box(-2.6 + (i % 2) * 0.9, 0.35 + Math.floor(i / 2) * 0.7, 3.0, 0.8, 0.7, 0.8, P.woodL, { set: 'w', ry: i * 0.3 });
    B.cyl(2.4, 0.5, 3.0, 0.45, 0.45, 1.0, P.woodD, { set: 'w' });
    B.windows([[-1.7, 2.2, 2.12]]); B.flag(2.4, 5.4, -2.2, 0.9, 0.55);
  },
  hunter(B, w, d, lv) {
    const W = 4, D = 4; plinth(B, W, D, 1.0);
    B.box(0, 0.95, -0.2, 2.8, 1.9, 2.4, P.woodD, { set: 'w' }); B.prism(0, 1.9, -0.2, 3.4, 1.2, 3.0, P.leather);
    door(B, 0, 1.0, 0.8, 1.5);
    B.box(-1.6, 1.0, 1.4, 0.1, 2.0, 0.1, P.woodD, { set: 'w' }); B.box(-0.6, 1.0, 1.4, 0.1, 2.0, 0.1, P.woodD, { set: 'w' }); B.box(-1.1, 1.9, 1.4, 1.2, 0.1, 0.1, P.woodD, { set: 'w' });
    for (let i = 0; i < 3; i++) B.box(-1.4 + i * 0.3, 1.45, 1.4, 0.2, 0.6, 0.06, P.leather, { set: 'w' });
    B.box(0, 2.4, 1.2, 0.05, 0.5, 0.05, P.hay, { set: 'w', rz: 0.5 }); B.box(0.3, 2.4, 1.2, 0.05, 0.5, 0.05, P.hay, { set: 'w', rz: -0.5 });
  },
  barracks(B, w, d, lv) {
    const W = 8, D = 6; plinth(B, W, D);
    B.box(0, 1.8, 0, 7.0, 3.6, 4.8, P.stone, { set: 's' });
    B.prism(0, 3.6, 0, 7.6, 2.3, 5.4, P.tile, { ry: 0 });
    B.crenel(0, 3.6, 0, 7.0, 4.8, P.stoneL, { h: 0.0 });
    door(B, 0, 2.5, 1.7, 2.6);
    B.windows([[-2.4, 2.3, 2.42], [2.4, 2.3, 2.42], [-1.2, 2.3, 2.42], [1.2, 2.3, 2.42]]);
    for (const sx of [-3.9, 3.9]) { B.box(sx, 2.2, 2.5, 0.6, 4.4, 0.6, P.stoneL, { set: 's' }); B.box(sx, 4.6, 2.5, 0.8, 0.3, 0.8, P.stoneD); }
    B.flag(-3.9, 5.6, 2.5, 1.1, 0.7); B.box(-3.9, 5.2, 2.5, 0.1, 1.6, 0.1, P.woodD, { set: 'w' });
    for (let i = 0; i < 3; i++) { B.box(-2.2 + i * 0.5, 0.9, 3.4, 0.08, 1.8, 0.08, P.woodD, { set: 'w', rz: 0.12 * (i - 1) }); }
    B.box(-1.7, 0.4, 3.4, 1.4, 0.8, 0.6, P.wood, { set: 'w' });
    if (lv >= 2) B.box(3.0, 4.4, -1.5, 1.4, 1.6, 1.4, P.stoneL);
  },
  archery(B, w, d, lv) {
    const W = 8, D = 6; plinth(B, W, D);
    B.box(0, 1.5, -1.0, 7.0, 3.0, 3.2, P.wood, { set: 'w' }); B.prism(0, 3.0, -1.0, 7.6, 1.9, 3.6, P.tileD);
    for (const sx of [-3.2, 3.2]) B.box(sx, 1.3, 1.2, 0.3, 2.6, 0.3, P.woodD, { set: 'w' });
    B.box(0, 2.7, 1.2, 6.8, 0.3, 0.3, P.woodD, { set: 'w' });
    B.box(0, 2.9, 0.6, 6.8, 0.15, 1.8, P.tileD, { set: 'w' });
    for (let i = 0; i < 3; i++) { const x = -2.4 + i * 2.4; B.cyl(x, 1.3, 3.2, 0.7, 0.7, 0.12, P.white, { set: 'w', rx: Math.PI / 2 }); B.cyl(x, 1.3, 3.27, 0.45, 0.45, 0.06, P.red, { set: 'w', rx: Math.PI / 2 }); B.cyl(x, 1.3, 3.3, 0.18, 0.18, 0.06, P.gold, { set: 'w', rx: Math.PI / 2 }); B.box(x - 0.6, 0.55, 3.2, 0.12, 1.1, 0.12, P.woodD, { set: 'w', rz: 0.25 }); B.box(x + 0.6, 0.55, 3.2, 0.12, 1.1, 0.12, P.woodD, { set: 'w', rz: -0.25 }); }
    B.box(-3.2, 0.5, -2.6, 0.9, 1.0, 0.5, P.woodL, { set: 'w' });
    B.flag(3.4, 5.2, -1.4, 1.0, 0.6); B.box(3.4, 3.6, -1.4, 0.1, 3.2, 0.1, P.woodD, { set: 'w' });
  },
  stable(B, w, d, lv) {
    const W = 10, D = 6; plinth(B, W, D, 1.0);
    B.box(0, 1.5, -1.0, 9.0, 3.0, 3.0, P.woodL, { set: 'w' }); B.prism(0, 3.0, -1.0, 9.8, 2.0, 3.8, P.thatch);
    for (let i = 0; i < 4; i++) { const x = -3.4 + i * 2.3; B.box(x, 1.0, 0.5, 0.2, 2.0, 0.2, P.woodD, { set: 'w' }); B.box(x + 1.1, 0.7, 0.55, 2.0, 0.12, 0.12, P.woodD, { set: 'w' }); B.box(x + 1.1, 1.2, 0.55, 2.0, 0.12, 0.12, P.woodD, { set: 'w' }); B.box(x + 1.1, 0.2, -0.2, 1.4, 0.4, 1.0, P.hay, { set: 'w' }); }
    B.box(0, 2.6, 0.5, 9.2, 0.25, 0.25, P.woodD, { set: 'w' });
    B.box(0, 0.35, 3.0, 8.0, 0.7, 0.14, P.woodD, { set: 'w' });
    B.cone(4.4, 0, 2.4, 0.8, 1.3, P.hay, { seg: 7 });
    B.flag(-4.4, 5.2, -2.4, 1.0, 0.6); B.box(-4.4, 3.6, -2.4, 0.1, 3.2, 0.1, P.woodD, { set: 'w' });
  },
  blacksmith(B, w, d, lv) {
    const W = 6, D = 6; plinth(B, W, D);
    B.box(0, 1.5, -0.6, 4.6, 3.0, 3.8, P.stone, { set: 's' }); B.prism(0, 3.0, -0.6, 5.2, 1.6, 4.4, P.slate);
    B.box(-1.4, 3.6, -1.6, 1.2, 4.6, 1.2, P.stoneD); B.box(-1.4, 6.0, -1.6, 1.5, 0.3, 1.5, P.stoneL);
    B.box(-1.4, 0.9, 0.4, 1.2, 1.2, 0.6, 0xff7a20, { set: 'g', jit: 0.1 });
    door(B, 1.1, 1.3, 1.0, 2.2);
    B.box(1.5, 0.45, 2.7, 0.9, 0.9, 0.5, P.stoneD, { set: 's' }); B.box(1.5, 1.0, 2.7, 1.3, 0.25, 0.45, P.iron, { set: 's' });
    B.box(-1.4, 0.4, 2.7, 0.8, 0.8, 0.8, P.woodD, { set: 'w' });
    for (let i = 0; i < 3; i++) B.box(-0.3 + i * 0.4, 0.8, 2.9, 0.08, 1.4, 0.08, P.iron, { set: 's', rz: 0.15 * (i - 1) });
    B.flag(2.3, 4.6, -2.2, 0.9, 0.55);
  },
  siegeworks(B, w, d, lv) {
    const W = 8, D = 8; plinth(B, W, D);
    B.box(0, 1.8, -1.6, 7.0, 3.6, 4.0, P.wood, { set: 'w' }); B.prism(0, 3.6, -1.6, 7.8, 2.2, 4.6, P.slateD);
    B.box(0, 1.5, 0.45, 3.0, 3.0, 0.2, P.woodD, { set: 'w' });
    // unfinished catapult frame & ram log
    for (const sx of [-1, 1]) B.box(-1.6 + 0, 0.7, 2.8 + sx * 0.8, 3.0, 0.2, 0.2, P.woodL, { set: 'w' });
    B.box(-1.6, 1.4, 2.0, 0.2, 1.4, 0.2, P.woodL, { set: 'w', rz: 0.5 }); B.box(-1.6, 1.4, 3.6, 0.2, 1.4, 0.2, P.woodL, { set: 'w', rz: 0.5 });
    B.cyl(2.4, 0.5, 2.8, 0.45, 0.45, 3.2, P.woodD, { set: 'w', rx: Math.PI / 2 });
    B.cyl(2.4, 0.5, 4.5, 0.5, 0.5, 0.4, P.iron, { set: 'w', rx: Math.PI / 2 });
    B.cyl(-3.0, 0.5, 3.0, 0.5, 0.5, 0.2, P.woodD, { set: 'w', rz: Math.PI / 2 });
    B.box(3.2, 4.4, -3.2, 0.14, 2.0, 0.14, P.woodD, { set: 'w' }); B.flag(3.2, 5.0, -3.2, 1.0, 0.6);
  },
  training(B, w, d, lv) {
    const W = 10, D = 10;
    B.box(0, 0.05, 0, 9.6, 0.1, 9.6, P.dirt, { set: 'w', jit: 0.1 });
    for (let i = -4.5; i <= 4.5; i += 1.5) for (const z of [-4.6, 4.6]) { B.box(i, 0.55, z, 0.18, 1.1, 0.18, P.woodD, { set: 'w' }); B.box(z, 0.55, i, 0.18, 1.1, 0.18, P.woodD, { set: 'w' }); }
    B.box(0, 0.7, -4.6, 9.2, 0.12, 0.12, P.woodL, { set: 'w' }); B.box(0, 0.7, 4.6, 9.2, 0.12, 0.12, P.woodL, { set: 'w' }); B.box(-4.6, 0.7, 0, 0.12, 0.12, 9.2, P.woodL, { set: 'w' }); B.box(4.6, 0.7, 0, 0.12, 0.12, 9.2, P.woodL, { set: 'w' });
    for (let i = 0; i < 3; i++) { const x = -2.5 + i * 2.5; B.box(x, 0.9, -1, 0.14, 1.8, 0.14, P.woodD, { set: 'w' }); B.box(x, 1.4, -1, 1.1, 0.12, 0.12, P.woodD, { set: 'w' }); B.sphere(x, 1.9, -1, 0.26, P.hay, { set: 'w' }); B.box(x, 0.9, -0.9, 0.7, 0.9, 0.12, P.leather, { set: 'w' }); }
    B.box(3.2, 0.9, 2.8, 2.2, 1.8, 1.5, P.white, { set: 'w' }); B.prism(3.2, 1.8, 2.8, 2.5, 1.0, 1.6, P.red);
    for (let i = 0; i < 4; i++) B.box(-3.5 + i * 0.35, 0.8, 3.2, 0.07, 1.6, 0.07, P.iron, { set: 's', rz: 0.12 * (i - 1.5) });
    B.flag(-4.6, 3.4, -4.6, 1.0, 0.6); B.box(-4.6, 1.8, -4.6, 0.1, 3.6, 0.1, P.woodD, { set: 'w' });
  },
  keep(B, w, d, lv) {
    const W = 12, D = 12; plinth(B, W, D, 2.4);
    B.box(0, 3.4, 0, 9.4, 6.8, 9.4, P.stone, { set: 's' });
    B.crenel(0, 6.8, 0, 9.6, 9.6, P.stoneL, { h: 0.8, step: 1.2, t: 0.6 });
    B.box(0, 8.0, -0.6, 5.4, 9.0, 5.4, P.stoneL, { set: 's' });
    B.crenel(0, 12.5, -0.6, 5.6, 5.6, P.stone, { h: 0.8, step: 1.1, t: 0.55 });
    B.hip(0, 12.5, -0.6, 3.6, 2.8, 3.6, P.slate);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      B.cyl(sx * 4.8, 5.0, sz * 4.8, 1.55, 1.7, 10.0, P.stone, { seg: 12 });
      B.crenelRound(sx * 4.8, 10.0, sz * 4.8, 1.5, P.stoneL, 9);
      B.cone(sx * 4.8, 10.0, sz * 4.8, 1.8, 2.8, P.tile, { seg: 12 });
    }
    B.box(0, 1.6, 4.75, 2.6, 3.2, 0.5, 0x2a1d12, { set: 'w' }); B.box(0, 3.4, 4.8, 3.2, 0.6, 0.6, P.stoneD);
    for (let i = 0; i < 5; i++) B.box(-1.0 + i * 0.5, 1.4, 4.95, 0.12, 2.6, 0.08, P.iron, { set: 's' });
    B.windows([[-2.6, 4.4, 4.72], [2.6, 4.4, 4.72], [-1.0, 8.8, 2.15], [1.0, 8.8, 2.15], [0, 8.8, -3.4], [-2.2, 9.5, -0.6, Math.PI / 2]]);
    B.box(0, 14.0, -0.6, 0.12, 3.6, 0.12, P.woodD, { set: 'w' }); B.flag(0, 15.2, -0.6, 2.2, 1.4);
    if (lv >= 2) for (const sx of [-1, 1]) B.flag(sx * 4.8, 12.6, 4.8, 1.2, 0.8);
    if (lv >= 3) B.sphere(0, 15.2, -0.6, 0.35, P.gold, { set: 'w' });
  },
  townhall(B, w, d, lv) {
    const W = 8, D = 8; plinth(B, W, D);
    B.box(0, 1.6, 0, 7.0, 3.2, 5.4, P.plaster, { set: 's' });
    for (let x = -3.4; x <= 3.5; x += 1.7) B.box(x, 1.6, 2.72, 0.3, 3.3, 0.12, P.woodD, { set: 'w' });
    B.box(0, 3.1, 2.72, 7.1, 0.25, 0.14, P.woodD, { set: 'w' }); B.box(0, 1.2, 2.72, 7.1, 0.16, 0.14, P.woodD, { set: 'w' });
    B.prism(0, 3.2, 0, 7.8, 2.4, 6.0, P.tile);
    B.box(0, 5.2, -1.4, 2.2, 3.8, 2.2, P.stoneL, { set: 's' }); B.hip(0, 7.1, -1.4, 3.0, 2.2, 3.0, P.slateD);
    B.box(0, 6.4, -0.28, 0.9, 0.9, 0.1, 0x151515, { set: 's' }); B.sphere(0, 6.4, -0.3, 0.22, P.gold, { set: 'w' });
    door(B, 0, 1.7, 1.6, 2.4);
    for (let i = 0; i < 3; i++) B.box(0, 0.12 + i * 0.12, 3.4 - i * 0.3, 3.2 - i * 0.2, 0.24, 0.5, P.stone, { set: 's' });
    B.windows([[-2.4, 2.0, 2.76], [2.4, 2.0, 2.76], [-1.2, 2.0, 2.76], [1.2, 2.0, 2.76]]);
    B.box(3.2, 4.0, 2.6, 0.1, 3.0, 0.1, P.woodD, { set: 'w' }); B.flag(3.2, 5.0, 2.6, 1.2, 0.8);
  },
  treasury(B, w, d, lv) {
    const W = 6, D = 6; plinth(B, W, D);
    B.box(0, 1.8, 0, 5.0, 3.6, 5.0, P.stoneL, { set: 's' });
    B.crenel(0, 3.6, 0, 5.2, 5.2, P.stone, { h: 0.5 });
    B.sphere(0, 4.0, 0, 2.2, P.gold, { set: 'w', sy: 1.3, jit: 0.04 }); B.box(0, 6.0, 0, 0.12, 1.0, 0.12, P.gold, { set: 'w' });
    B.box(0, 1.3, 2.55, 1.6, 2.6, 0.2, P.iron, { set: 's' }); B.box(0, 2.8, 2.58, 2.0, 0.3, 0.3, P.gold, { set: 'w' });
    for (const sx of [-2.4, 2.4]) { B.cyl(sx, 2.0, 2.55, 0.35, 0.35, 4.0, P.stone, { seg: 10 }); }
    B.windows([[-1.9, 2.4, 2.54], [1.9, 2.4, 2.54]], 0xffd070);
    B.flag(2.5, 6.0, -2.3, 0.9, 0.55); B.box(2.5, 4.6, -2.3, 0.1, 2.8, 0.1, P.woodD, { set: 'w' });
  },
  storage(B, w, d, lv) {
    const W = 8, D = 8; plinth(B, W, D);
    B.box(0, 2.0, -0.4, 7.0, 4.0, 6.4, P.woodL, { set: 'w' });
    B.prism(0, 4.0, -0.4, 7.8, 2.8, 7.0, P.tileD);
    for (const x of [-1.8, 1.8]) door(B, x, 2.2, 2.2, 2.6);
    for (let i = 0; i < 6; i++) B.box(-3 + (i % 3) * 1.0, 0.4 + Math.floor(i / 3) * 0.8, 3.7, 0.9, 0.8, 0.9, P.woodD, { set: 'w', ry: i * 0.2 });
    B.cyl(3.0, 0.5, 3.7, 0.5, 0.5, 1.0, P.wood, { set: 'w' }); B.cyl(3.7, 0.5, 3.4, 0.5, 0.5, 1.0, P.woodL, { set: 'w' });
    B.windows([[-3.0, 3.0, 2.8], [3.0, 3.0, 2.8]]);
    B.flag(3.6, 6.6, -3.2, 1.0, 0.6);
  },
  church(B, w, d, lv) {
    const W = 8, D = 6; plinth(B, W, D);
    B.box(0.6, 2.0, 0, 5.6, 4.0, 4.6, P.stoneL, { set: 's' }); B.prism(0.6, 4.0, 0, 6.4, 2.6, 5.2, P.slate);
    B.box(-2.6, 3.6, 0, 2.2, 7.2, 2.2, P.stoneL, { set: 's' }); B.cone(-2.6, 7.2, 0, 1.7, 4.2, P.slateD, { seg: 4, ry: Math.PI / 4 });
    B.box(-2.6, 11.7, 0, 0.1, 1.2, 0.1, P.gold, { set: 'w' }); B.box(-2.6, 11.9, 0, 0.6, 0.1, 0.1, P.gold, { set: 'w' });
    B.windows([[-2.6, 6.3, 1.15], [2.1, 2.6, 2.32], [0.6, 2.6, 2.32], [-0.9, 2.6, 2.32]], 0x80b8ff);
    door(B, 1.8, 1.3, 1.1, 2.2, 0, P.woodD);
    B.box(3.6, 0.4, 0, 0.3, 0.8, 4.8, P.stoneD, { set: 's' });
  },
  guardtower(B, w, d, lv) {
    const W = 4, D = 4;
    B.box(0, 1.6, 0, 3.2, 4.4, 3.2, P.stone, { set: 's', jit: 0.08 }); B.box(0, -0.6, 0, 3.6, 2.0, 3.6, P.stoneD);
    B.box(0, 4.0, 0, 3.8, 0.4, 3.8, P.woodD, { set: 'w' });
    B.crenel(0, 4.2, 0, 3.8, 3.8, P.stoneL, { h: 0.5, step: 0.95 });
    for (const sx of [-1.6, 1.6]) for (const sz of [-1.6, 1.6]) B.box(sx, 5.6, sz, 0.18, 2.4, 0.18, P.woodD, { set: 'w' });
    B.hip(0, 6.7, 0, 4.0, 1.9, 4.0, P.tile);
    B.box(0, 2.6, 1.62, 0.25, 0.9, 0.1, 0x101010, { set: 's' }); B.box(1.62, 2.6, 0, 0.1, 0.9, 0.25, 0x101010, { set: 's' });
    B.box(0, 0.9, 1.62, 0.9, 1.5, 0.1, P.woodD, { set: 'w' });
    B.flag(0, 8.9, 0, 1.0, 0.65); B.box(0, 8.0, 0, 0.1, 1.8, 0.1, P.woodD, { set: 'w' });
    if (lv >= 2) B.box(0, 5.8, 0, 3.0, 0.2, 3.0, P.woodL, { set: 'w' });
  },
  archertower(B, w, d, lv) {
    const W = 6, D = 6;
    B.cyl(0, 3.2, 0, 2.0, 2.5, 8.0, P.stone, { seg: 14, jit: 0.07 }); B.cyl(0, -0.6, 0, 2.7, 2.7, 2.0, P.stoneD, { seg: 14 });
    B.cyl(0, 7.4, 0, 2.5, 2.2, 1.0, P.stoneL, { seg: 14 });
    B.crenelRound(0, 7.9, 0, 2.35, P.stoneL, 12);
    B.cyl(0, 8.2, 0, 1.2, 1.2, 0.4, P.woodD, { set: 'w' });
    B.cone(0, 8.3, 0, 1.9, 2.4, P.tile, { seg: 14 });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; B.box(Math.cos(a) * 2.2, 5.0, Math.sin(a) * 2.2, 0.22, 1.0, 0.22, 0x101010, { set: 's', ry: -a }); }
    B.box(0, 1.0, 2.5, 1.0, 1.7, 0.2, P.woodD, { set: 'w' });
    B.windows([[0, 6.4, 2.28]]);
    B.flag(0, 11.6, 0, 1.2, 0.8); B.box(0, 10.4, 0, 0.12, 2.4, 0.12, P.woodD, { set: 'w' });
    if (lv >= 2) B.cyl(0, 6.6, 0, 2.7, 2.7, 0.3, P.stoneD, { seg: 14 });
  },
  deftower(B, w, d, lv) {
    const W = 8, D = 8; plinth(B, W, D, 2.4);
    B.box(0, 4.4, 0, 6.6, 9.4, 6.6, P.stone, { set: 's', jit: 0.08 });
    B.box(0, 9.4, 0, 7.6, 1.0, 7.6, P.stoneL, { set: 's' });
    B.crenel(0, 9.9, 0, 7.6, 7.6, P.stoneL, { h: 0.7, step: 1.1, t: 0.55 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B.cyl(sx * 3.5, 10.7, sz * 3.5, 0.9, 0.9, 1.6, P.stoneL, { seg: 10 }); B.cone(sx * 3.5, 11.5, sz * 3.5, 1.1, 1.4, P.slateD, { seg: 10 }); }
    B.box(0, 10.5, 0, 1.6, 0.6, 1.6, P.woodD, { set: 'w' }); B.box(0, 11.2, 0.3, 0.2, 0.2, 2.4, P.woodL, { set: 'w' }); B.box(0, 11.2, 1.3, 1.8, 0.14, 0.14, P.woodL, { set: 'w' });
    for (let i = 0; i < 6; i++) B.box(-2.5 + i * 1.0, 6.0, 3.34, 0.25, 1.1, 0.1, 0x101010, { set: 's' });
    B.box(0, 1.6, 3.35, 2.0, 3.2, 0.2, P.woodD, { set: 'w' });
    B.box(0, 3.4, 3.4, 2.6, 0.4, 0.4, P.iron, { set: 's' });
    B.windows([[-2.2, 4.0, 3.36], [2.2, 4.0, 3.36]]);
    B.flag(0, 14.0, -1.6, 1.4, 0.9); B.box(0, 12.0, -1.6, 0.12, 4.0, 0.12, P.woodD, { set: 'w' });
  },
  gate(B, w, d, lv, key) {
    const W = 6, D = 2; const reinforced = key === 'rgate';
    const hw = 1.1;
    for (const sx of [-1, 1]) {
      B.box(sx * 2.5, 2.4, 0, 1.9, 5.0, 2.0, P.stone, { set: 's' });
      B.crenel(sx * 2.5, 4.9, 0, 1.9, 2.0, P.stoneL, { h: 0.55, step: 0.9, t: 0.5 });
      B.box(sx * 2.5, 3.5, 1.02, 0.25, 0.9, 0.08, 0x101010, { set: 's' });
    }
    B.box(0, 4.1, 0, 3.2, 1.8, 2.0, P.stone, { set: 's' }); B.crenel(0, 5.0, 0, 3.2, 2.0, P.stoneL, { h: 0.55, step: 0.9, t: 0.5 });
    B.box(0, 3.1, 1.02, 3.0, 0.25, 0.2, P.stoneD, { set: 's' });
    B.flag(0, 6.4, 0, 1.1, 0.7); B.box(0, 5.9, 0, 0.1, 1.8, 0.1, P.woodD, { set: 'w' });
    const col = reinforced ? P.iron : P.woodD;
    const L = B.sub('doorL', -1.55, 0, 0.1); L.def = 'w';
    L.box(0.775, 1.4, 0, 1.55, 2.8, 0.22, col, { set: 'w' }); L.box(0.775, 0.9, 0.14, 1.45, 0.14, 0.1, P.iron, { set: 's' }); L.box(0.775, 2.0, 0.14, 1.45, 0.14, 0.1, P.iron, { set: 's' });
    const R = B.sub('doorR', 1.55, 0, 0.1); R.def = 'w';
    R.box(-0.775, 1.4, 0, 1.55, 2.8, 0.22, col, { set: 'w' }); R.box(-0.775, 0.9, 0.14, 1.45, 0.14, 0.1, P.iron, { set: 's' }); R.box(-0.775, 2.0, 0.14, 1.45, 0.14, 0.1, P.iron, { set: 's' });
    if (reinforced) for (let i = 0; i < 7; i++) B.box(-1.5 + i * 0.5, 1.6, -0.1, 0.1, 3.0, 0.1, P.iron, { set: 's' });
  },
  rgate(B, w, d, lv) { MODELS.gate(B, w, d, lv, 'rgate'); },
};

export const BUILDING_HEIGHT_CLIP = { default: 12 };

// ------------------------------------------------------------- scaffolding (shown while building)
export function buildScaffold(w, d, h) {
  const B = new GeoBuilder(9);
  const W = w * 2, D = d * 2;
  const hh = Math.min(h, 9);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(sx * (W / 2 + 0.15), hh / 2, sz * (D / 2 + 0.15), 0.18, hh, 0.18, P.woodD, { set: 'w' });
  for (let y = 1.2; y < hh; y += 1.6) {
    B.box(0, y, D / 2 + 0.15, W + 0.5, 0.12, 0.12, P.woodL, { set: 'w' }); B.box(0, y, -D / 2 - 0.15, W + 0.5, 0.12, 0.12, P.woodL, { set: 'w' });
    B.box(W / 2 + 0.15, y, 0, 0.12, 0.12, D + 0.5, P.woodL, { set: 'w' }); B.box(-W / 2 - 0.15, y, 0, 0.12, 0.12, D + 0.5, P.woodL, { set: 'w' });
    B.box(0, y + 0.1, D / 2 + 0.5, W + 0.3, 0.1, 0.8, P.wood, { set: 'w' });
  }
  B.box(W / 2 + 0.6, 0.4, D / 2 + 0.6, 0.9, 0.8, 0.9, P.woodL, { set: 'w' }); B.box(-W / 2 - 0.6, 0.35, D / 2 + 0.2, 1.2, 0.2, 0.4, P.stoneL, { set: 's' });
  return B.build();
}

export function buildRubble(w, d, seed = 3) {
  const B = new GeoBuilder(seed);
  const W = w * 2, D = d * 2; const r = mulberry32(seed);
  const n = Math.min(40, 10 + w * d * 2);
  for (let i = 0; i < n; i++) {
    const s = 0.3 + r() * 0.9;
    B.box((r() - 0.5) * W * 0.9, s * 0.35, (r() - 0.5) * D * 0.9, s, s * 0.7, s * (0.7 + r() * 0.6), [P.stoneD, P.stone, P.woodD, P.stoneL][Math.floor(r() * 4)], { ry: r() * 3, rx: (r() - 0.5) * 0.4, rz: (r() - 0.5) * 0.4, jit: 0.12, set: r() < 0.3 ? 'w' : 's' });
  }
  return B.build();
}

export function buildBuilding(key, w, d, level = 1, seed = 1) {
  const fn = MODELS[key];
  const B = new GeoBuilder(seed + level * 17);
  if (!fn) { B.box(0, 1, 0, w * 2 - 0.4, 2, d * 2 - 0.4, P.stone, {}); return B.build(); }
  fn(B, w, d, level, key);
  return B.build();
}

// wall piece geometries (instanced): post, arm along +x, plus palisade variants
export function wallGeos(kind) {
  const out = {};
  if (kind === 'stone') {
    let B = new GeoBuilder(31); B.box(0, 1.6, 0, 1.6, 3.2, 1.6, P.stone, { set: 's' }); B.box(0, -0.4, 0, 1.9, 1.4, 1.9, P.stoneD, { set: 's' }); B.box(0, 3.3, 0, 1.8, 0.28, 1.8, P.stoneL, { set: 's' });
    for (const sx of [-0.6, 0.6]) for (const sz of [-0.6, 0.6]) B.box(sx, 3.75, sz, 0.5, 0.6, 0.5, P.stoneL, { set: 's' });
    out.post = B.build().s;
    B = new GeoBuilder(32); B.box(1.0, 1.5, 0, 2.0, 3.0, 1.3, P.stone, { set: 's' }); B.box(1.0, -0.4, 0, 2.0, 1.2, 1.5, P.stoneD, { set: 's' }); B.box(1.0, 3.15, 0, 2.0, 0.26, 1.6, P.stoneL, { set: 's' });
    B.box(1.0, 3.75, 0.6, 0.55, 0.6, 0.4, P.stoneL, { set: 's' }); B.box(1.0, 3.75, -0.6, 0.55, 0.6, 0.4, P.stoneL, { set: 's' });
    out.arm = B.build().s;
  } else {
    let B = new GeoBuilder(33);
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0]]) { B.cyl(x, 1.1, z, 0.28, 0.28, 2.2, P.woodL, { set: 'w', seg: 6 }); B.cone(x, 2.2, z, 0.28, 0.6, P.woodL, { set: 'w', seg: 6 }); }
    out.post = B.build().w;
    B = new GeoBuilder(34);
    for (const z of [-0.5, 0, 0.5]) for (const x of [0.4, 1.0, 1.6]) { B.cyl(x, 1.0, z, 0.26, 0.26, 2.0, P.wood, { set: 'w', seg: 6 }); B.cone(x, 2.0, z, 0.26, 0.55, P.woodL, { set: 'w', seg: 6 }); }
    B.box(1.0, 1.1, 0, 2.0, 0.14, 1.4, P.woodD, { set: 'w' });
    out.arm = B.build().w;
  }
  return out;
}

export function bridgeGeo() {
  const B = new GeoBuilder(41);
  B.box(0, 0.12, 0, 2.0, 0.24, 2.0, P.woodL, { set: 'w' });
  for (let i = -0.8; i <= 0.9; i += 0.4) B.box(i, 0.26, 0, 0.34, 0.06, 2.1, P.wood, { set: 'w' });
  B.box(0, 0.3, 0.95, 2.0, 0.1, 0.1, P.woodD, { set: 'w' }); B.box(0, 0.3, -0.95, 2.0, 0.1, 0.1, P.woodD, { set: 'w' });
  for (const x of [-0.9, 0.9]) for (const z of [-0.95, 0.95]) B.box(x, 0.55, z, 0.12, 0.7, 0.12, P.woodD, { set: 'w' });
  return B.build().w;
}

// ---------------------------------------------------------------- props: trees, rocks, ore, gold, deer
export function treeGeo(kind, theme) {
  const B = new GeoBuilder(kind * 13 + 5);
  const trunk = theme === 'desert' ? 0x8a6a40 : P.woodD;
  if (theme === 'desert') {
    B.cyl(0, 1.0, 0, 0.2, 0.28, 2.0, trunk, { set: 'w', seg: 6 });
    for (const a of [0, 2.1, 4.2]) B.cone(Math.cos(a) * 0.5, 1.6, Math.sin(a) * 0.5, 0.5, 1.1, 0x8a9a4a, { set: 'w', seg: 6, jit: 0.15 });
    return B.build().w;
  }
  if (theme === 'snow' || theme === 'forest' || kind === 0) {
    const g = theme === 'snow' ? 0x3d6b52 : theme === 'forest' ? 0x2f5f36 : 0x3f7a3a;
    B.cyl(0, 0.7, 0, 0.18, 0.28, 1.4, trunk, { set: 'w', seg: 6 });
    B.cone(0, 0.9, 0, 1.25, 1.9, g, { set: 'w', seg: 7, jit: 0.1 }); B.cone(0, 1.9, 0, 0.98, 1.7, g, { set: 'w', seg: 7, jit: 0.1 }); B.cone(0, 2.8, 0, 0.7, 1.5, g, { set: 'w', seg: 7, jit: 0.1 });
    if (theme === 'snow') { B.cone(0, 3.5, 0, 0.35, 0.8, 0xf0f4f8, { set: 'w', seg: 7 }); B.cone(0, 2.55, 0, 0.55, 0.5, 0xf0f4f8, { set: 'w', seg: 7 }); }
  } else {
    const g = kind === 1 ? 0x58903c : 0x6aa044;
    B.cyl(0, 0.9, 0, 0.2, 0.32, 1.8, trunk, { set: 'w', seg: 6 });
    B.sphere(0, 2.5, 0, 1.25, g, { set: 'w', sy: 1.05, jit: 0.12 }); B.sphere(0.6, 2.1, 0.3, 0.8, g, { set: 'w', jit: 0.12 }); B.sphere(-0.55, 2.2, -0.3, 0.85, 0x4a8434, { set: 'w', jit: 0.12 });
  }
  return B.build().w;
}
export function rockGeo(seed, color) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const r = mulberry32(seed + 100);
  const pos = g.attributes.position; const cache = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getX(i).toFixed(3) + pos.getY(i).toFixed(3) + pos.getZ(i).toFixed(3);
    if (!cache.has(k)) cache.set(k, 0.75 + r() * 0.5);
    const f = cache.get(k); pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f * 0.8, pos.getZ(i) * f);
  }
  const ng = g; ng.computeVertexNormals();
  const B = new GeoBuilder(seed); B.add(ng, new THREE.Matrix4().makeTranslation(0, 0.5, 0), color, 's', { jit: 0.1 });
  return B.build().s;
}
export function oreGeo(seed, base, fleck) {
  const B = new GeoBuilder(seed);
  B.add(rockGeo(seed, base), new THREE.Matrix4(), 0xffffff, 's', { jit: 0 });
  return B.build().s;
}
export function deerGeo() {
  const B = new GeoBuilder(77);
  const c = 0x9a6a3a;
  B.box(0, 0.85, 0, 0.45, 0.5, 1.1, c, { set: 'w' });
  for (const [x, z] of [[-0.14, 0.4], [0.14, 0.4], [-0.14, -0.4], [0.14, -0.4]]) B.box(x, 0.35, z, 0.1, 0.7, 0.1, 0x6a4a28, { set: 'w' });
  B.box(0, 1.25, 0.6, 0.18, 0.5, 0.2, c, { set: 'w', rx: -0.5 }); B.box(0, 1.55, 0.75, 0.2, 0.2, 0.34, c, { set: 'w' });
  B.box(-0.1, 1.8, 0.7, 0.04, 0.4, 0.04, 0xd8c8a0, { set: 'w', rz: 0.4 }); B.box(0.1, 1.8, 0.7, 0.04, 0.4, 0.04, 0xd8c8a0, { set: 'w', rz: -0.4 });
  B.box(0, 0.95, -0.6, 0.12, 0.12, 0.2, 0xf0e8d8, { set: 'w' });
  return B.build().w;
}

// ---------------------------------------------------------------- unit part geometries
// Local space: facing +z, feet at y=0, hips y~0.8, shoulders y~1.38.
const U = {};
function unitBuilder() { return new GeoBuilder(Math.floor(Math.random() * 1e5)); }

export function buildUnitParts() {
  const parts = {};
  const mk = (fn, seed = 1) => { const B = new GeoBuilder(seed); fn(B); const r = B.build(); return r.w || r.s; };
  const limb = (B, len, w, col, y0 = 0) => B.box(0, y0 - len / 2, 0, w, len, w, col, { set: 'w', jit: 0.03 });
  // shared legs (tinted by instance colour) – origin at hip
  parts.leg = mk((B) => { B.box(0, -0.38, 0, 0.17, 0.76, 0.19, 0xffffff, { set: 'w', jit: 0.02 }); B.box(0, -0.74, 0.05, 0.2, 0.1, 0.3, 0x3a2a1c, { set: 'w' }); });
  // villager
  parts.body_villager = mk((B) => { B.box(0, 1.1, 0, 0.5, 0.62, 0.3, P.skin, { set: 'w' }); B.sphere(0, 1.62, 0, 0.17, P.skin, { set: 'w' }); B.box(0, 1.8, 0, 0.36, 0.1, 0.34, 0x5a3c22, { set: 'w' }); B.box(0, 1.9, -0.01, 0.24, 0.14, 0.24, 0x5a3c22, { set: 'w' }); });
  parts.tab_villager = mk((B) => { B.box(0, 1.1, 0, 0.54, 0.6, 0.34, 0xffffff, { set: 'w', jit: 0.04 }); B.box(0, 0.78, 0, 0.56, 0.2, 0.36, 0xffffff, { set: 'w' }); });
  parts.armR_villager = mk((B) => { B.box(0, -0.28, 0, 0.14, 0.56, 0.14, 0xffffff, { set: 'w', jit: 0.02 }); B.sphere(0, -0.6, 0, 0.09, P.skin, { set: 'w' }); });
  parts.armL_villager = parts.armR_villager;
  // soldier helper builders
  const soldier = (key, o) => {
    parts['body_' + key] = mk((B) => {
      B.box(0, 1.1, 0, 0.54, 0.66, 0.32, o.armor, { set: 'w', jit: 0.04 });
      B.box(0, 0.78, 0, 0.5, 0.14, 0.32, P.leather, { set: 'w' });
      B.sphere(0, 1.64, 0, 0.18, P.skin, { set: 'w' });
      o.head(B);
      if (o.pads) for (const sx of [-0.33, 0.33]) B.sphere(sx, 1.38, 0, 0.14, o.padCol || o.armor, { set: 'w' });
    }, o.seed || 1);
    parts['tab_' + key] = mk((B) => { B.box(0, 1.1, 0.0, 0.57, 0.46, 0.35, 0xffffff, { set: 'w', jit: 0.03 }); B.box(0, 0.68, 0.13, 0.32, 0.46, 0.06, 0xffffff, { set: 'w' }); B.box(0, 0.68, -0.13, 0.32, 0.46, 0.06, 0xffffff, { set: 'w' }); });
    parts['armR_' + key] = mk((B) => { B.box(0, -0.27, 0, 0.14, 0.54, 0.14, o.armor, { set: 'w', jit: 0.03 }); B.sphere(0, -0.56, 0, 0.09, 0x8a8a8a, { set: 'w' }); o.weapon(B); });
    parts['armL_' + key] = mk((B) => { B.box(0, -0.27, 0, 0.14, 0.54, 0.14, o.armor, { set: 'w', jit: 0.03 }); B.sphere(0, -0.56, 0, 0.09, 0x8a8a8a, { set: 'w' }); o.offhand(B); });
  };
  const helmetBasic = (B) => { B.cyl(0, 1.78, 0, 0.19, 0.19, 0.18, 0x8e949b, { set: 'w', seg: 8 }); B.cone(0, 1.84, 0, 0.19, 0.18, 0x8e949b, { set: 'w', seg: 8 }); B.box(0, 1.66, 0.17, 0.07, 0.22, 0.04, 0x8e949b, { set: 'w' }); };
  const helmetGreat = (B) => { B.cyl(0, 1.74, 0, 0.21, 0.21, 0.36, 0x9aa0a8, { set: 'w', seg: 8 }); B.box(0, 1.72, 0.2, 0.28, 0.05, 0.03, 0x15151a, { set: 'w' }); B.box(0, 1.98, 0, 0.06, 0.16, 0.34, 0xb03030, { set: 'w' }); };
  const sword = (B) => { B.box(0, -0.6, 0.35, 0.05, 0.05, 0.7, 0xd5dbe2, { set: 'w' }); B.box(0, -0.6, 0.02, 0.22, 0.05, 0.05, 0x7a6a3a, { set: 'w' }); B.box(0, -0.6, -0.08, 0.06, 0.06, 0.14, 0x4a3320, { set: 'w' }); };
  const bigSword = (B) => { B.box(0, -0.6, 0.5, 0.08, 0.06, 1.0, 0xe2e6ec, { set: 'w' }); B.box(0, -0.6, 0.02, 0.3, 0.06, 0.06, 0xd4a830, { set: 'w' }); B.box(0, -0.6, -0.1, 0.07, 0.07, 0.2, 0x4a3320, { set: 'w' }); };
  const roundShield = (B, col = 0x6a4a2a, r = 0.34) => { B.cyl(0, -0.45, 0.2, r, r, 0.07, col, { set: 'w', seg: 12, rz: Math.PI / 2 }); B.cyl(0, -0.45, 0.24, 0.09, 0.09, 0.07, 0x9a9a9a, { set: 'w', seg: 8, rz: Math.PI / 2 }); };
  const kiteShield = (B, col = 0x3a4a6a) => { B.box(0.09, -0.42, 0.24, 0.07, 0.8, 0.5, col, { set: 'w' }); B.box(0.13, -0.42, 0.24, 0.04, 0.6, 0.3, 0xc8b060, { set: 'w' }); };
  const towerShield = (B) => { B.box(0.1, -0.44, 0.26, 0.09, 0.95, 0.62, 0x5a4a3a, { set: 'w' }); B.box(0.15, -0.44, 0.26, 0.05, 0.75, 0.42, 0x9a9a9a, { set: 'w' }); };
  const none = () => {};
  soldier('sword', { armor: 0x8a6a4a, head: helmetBasic, weapon: sword, offhand: (B) => roundShield(B, 0x6a4a2a, 0.3), pads: false, seed: 2 });
  soldier('heavy', { armor: 0x8f959d, head: helmetGreat, weapon: bigSword, offhand: none, pads: true, padCol: 0x9aa0a8, seed: 3 });
  soldier('shield', { armor: 0x6a7a8a, head: helmetBasic, weapon: sword, offhand: towerShield, pads: true, padCol: 0x7a8a98, seed: 4 });
  soldier('spear', { armor: 0x7a6a4a, head: (B) => { B.cone(0, 1.78, 0, 0.19, 0.2, 0x5a4a30, { set: 'w', seg: 8 }); }, weapon: (B) => { B.box(0, -0.56, 0.5, 0.05, 0.05, 2.4, 0x7a5430, { set: 'w' }); B.cone(0, -0.56, 1.75, 0.07, 0.3, 0xd5dbe2, { set: 'w', seg: 4, rx: Math.PI / 2 }); B.cone(0, -0.56, 1.7, 0.01, 0.01, 0xd5dbe2, { set: 'w' }); }, offhand: none, seed: 5 });
  soldier('guard', { armor: 0xcfc8a8, head: (B) => { B.cyl(0, 1.76, 0, 0.21, 0.21, 0.3, 0xd6b040, { set: 'w', seg: 8 }); B.box(0, 2.02, 0, 0.06, 0.2, 0.3, 0xb02020, { set: 'w' }); B.box(0, 1.7, 0.2, 0.26, 0.05, 0.03, 0x15151a, { set: 'w' }); }, weapon: bigSword, offhand: (B) => kiteShield(B, 0x802020), pads: true, padCol: 0xd6b040, seed: 6 });
  soldier('archer', { armor: 0x5a7a4a, head: (B) => { B.cone(0, 1.8, 0, 0.2, 0.28, 0x4a6a3a, { set: 'w', seg: 8 }); B.box(0, 1.78, 0, 0.36, 0.04, 0.36, 0x4a6a3a, { set: 'w' }); }, weapon: (B) => { B.box(0, -0.56, 0.0, 0.05, 0.05, 0.12, 0x4a3320, { set: 'w' }); }, offhand: (B) => { B.box(0, -0.56, 0.05, 0.06, 0.06, 0.95, 0x7a5430, { set: 'w' }); B.box(0, -0.42, 0.05, 0.015, 0.015, 0.9, 0xe8e0c0, { set: 'w' }); }, seed: 7 });
  soldier('crossbow', { armor: 0x4a5a6a, head: helmetBasic, weapon: (B) => { B.box(0, -0.56, 0.3, 0.07, 0.09, 0.6, 0x6a4424, { set: 'w' }); B.box(0, -0.56, 0.52, 0.5, 0.05, 0.05, 0x5a3a20, { set: 'w' }); }, offhand: none, pads: true, seed: 8 });
  soldier('lightcav', { armor: 0x8a6a4a, head: helmetBasic, weapon: (B) => { B.box(0, -0.56, 0.9, 0.05, 0.05, 2.0, 0x7a5430, { set: 'w' }); B.cone(0, -0.56, 1.95, 0.06, 0.28, 0xd5dbe2, { set: 'w', seg: 4, rx: Math.PI / 2 }); }, offhand: (B) => roundShield(B, 0x6a4a2a, 0.26), seed: 9 });
  soldier('heavycav', { armor: 0x8f959d, head: helmetGreat, weapon: (B) => { B.box(0, -0.56, 1.0, 0.07, 0.07, 2.4, 0x7a5430, { set: 'w' }); B.cone(0, -0.56, 2.3, 0.08, 0.34, 0xe0e4ea, { set: 'w', seg: 4, rx: Math.PI / 2 }); B.box(0, -0.56, 0.7, 0.3, 0.3, 0.05, 0xc0a030, { set: 'w' }); }, offhand: (B) => kiteShield(B, 0x2a3a6a), pads: true, padCol: 0x9aa0a8, seed: 10 });
  // horse
  parts.horse = mk((B) => {
    B.box(0, 1.05, 0, 0.62, 0.7, 1.7, 0xffffff, { set: 'w', jit: 0.05 });
    B.box(0, 1.5, 0.95, 0.3, 0.7, 0.36, 0xffffff, { set: 'w', rx: 0.5 });
    B.box(0, 1.85, 1.2, 0.26, 0.3, 0.55, 0xffffff, { set: 'w', rx: 0.15 });
    B.box(0, 1.52, 0.66, 0.1, 0.55, 0.5, 0x2a1f16, { set: 'w', rx: 0.5 });
    B.box(0, 1.1, -1.0, 0.1, 0.1, 0.8, 0x2a1f16, { set: 'w', rx: -0.5 });
  }, 12);
  parts.horseLeg = mk((B) => { B.box(0, -0.45, 0, 0.14, 0.9, 0.16, 0xffffff, { set: 'w', jit: 0.03 }); B.box(0, -0.88, 0, 0.17, 0.12, 0.2, 0x2a1f16, { set: 'w' }); });
  parts.saddle = mk((B) => { B.box(0, 1.46, 0, 0.7, 0.07, 1.0, 0xffffff, { set: 'w' }); B.box(0, 1.2, 0.0, 0.76, 0.5, 0.7, 0xffffff, { set: 'w', jit: 0.03 }); });
  // tools & carry
  parts.tool_axe = mk((B) => { B.box(0, -0.55, 0.3, 0.05, 0.05, 0.7, 0x7a5430, { set: 'w' }); B.box(0, -0.55, 0.62, 0.05, 0.22, 0.2, 0x9aa0a8, { set: 'w' }); });
  parts.tool_pick = mk((B) => { B.box(0, -0.55, 0.3, 0.05, 0.05, 0.7, 0x7a5430, { set: 'w' }); B.box(0, -0.55, 0.62, 0.05, 0.05, 0.5, 0x6a7078, { set: 'w' }); });
  parts.tool_hammer = mk((B) => { B.box(0, -0.55, 0.2, 0.05, 0.05, 0.45, 0x7a5430, { set: 'w' }); B.box(0, -0.55, 0.45, 0.12, 0.12, 0.2, 0x6a7078, { set: 'w' }); });
  parts.tool_hoe = mk((B) => { B.box(0, -0.55, 0.35, 0.05, 0.05, 0.9, 0x7a5430, { set: 'w' }); B.box(0, -0.55, 0.8, 0.05, 0.2, 0.12, 0x6a7078, { set: 'w' }); });
  parts.carry = mk((B) => { B.box(0, 1.1, -0.28, 0.4, 0.4, 0.26, 0xffffff, { set: 'w', jit: 0.05 }); });
  return parts;
}

// siege machine models (static groups + animated parts)
export function buildSiege(key) {
  const B = new GeoBuilder(60 + key.length);
  if (key === 'catapult') {
    B.box(0, 0.5, 0, 2.2, 0.25, 3.4, P.woodD, { set: 'w' });
    for (const sx of [-1, 1]) { B.cyl(sx * 1.3, 0.55, 0.9, 0.55, 0.55, 0.25, P.wood, { set: 'w', rz: Math.PI / 2 }); B.cyl(sx * 1.3, 0.55, -0.9, 0.55, 0.55, 0.25, P.wood, { set: 'w', rz: Math.PI / 2 }); B.box(sx * 0.8, 1.35, 0, 0.25, 1.7, 0.4, P.woodL, { set: 'w' }); }
    B.box(0, 2.1, 0, 1.9, 0.25, 0.3, P.woodD, { set: 'w' });
    B.box(0, 1.0, -1.3, 1.3, 0.6, 0.7, P.woodL, { set: 'w' });
    const A = B.sub('arm', 0, 1.9, 0); A.def = 'w';
    A.box(0, 0.4, -0.4, 0.22, 0.2, 2.8, P.woodL, { set: 'w' }); A.box(0, 0.4, 0.9, 0.7, 0.5, 0.7, P.woodD, { set: 'w' });
    A.sphere(0, 0.8, 1.0, 0.35, P.stoneD, { set: 's' });
    return B.build();
  }
  if (key === 'ram') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B.box(sx * 1.0, 0.9, sz * 1.5, 0.2, 1.8, 0.2, P.woodD, { set: 'w' }); B.cyl(sx * 1.15, 0.35, sz * 1.5, 0.35, 0.35, 0.2, P.wood, { set: 'w', rz: Math.PI / 2 }); }
    B.box(0, 2.0, 0, 2.5, 0.2, 3.8, P.woodD, { set: 'w' }); B.prism(0, 2.1, 0, 3.0, 1.2, 4.2, P.leather);
    B.box(0, 1.9, 0, 0.1, 0.1, 3.0, P.iron, { set: 's' });
    const R = B.sub('log', 0, 1.4, 0); R.def = 'w';
    R.cyl(0, 0, 0.2, 0.32, 0.32, 3.8, P.woodD, { set: 'w', rx: Math.PI / 2 }); R.cyl(0, 0, 2.2, 0.4, 0.32, 0.5, P.iron, { set: 's', rx: Math.PI / 2 });
    R.box(0, 0.5, 0.4, 0.04, 0.9, 0.04, P.iron, { set: 's' });
    return B.build();
  }
  // siege tower
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.cyl(sx * 1.6, 0.5, sz * 1.5, 0.5, 0.5, 0.3, P.wood, { set: 'w', rz: Math.PI / 2 });
  B.box(0, 0.9, 0, 3.6, 0.3, 3.4, P.woodD, { set: 'w' });
  B.box(0, 4.5, 0, 3.2, 7.2, 3.0, P.wood, { set: 'w' });
  for (let y = 1.6; y < 8; y += 1.6) { B.box(0, y, 1.52, 3.3, 0.18, 0.1, P.woodD, { set: 'w' }); B.box(0, y, -1.52, 3.3, 0.18, 0.1, P.woodD, { set: 'w' }); }
  for (const x of [-1.5, 0, 1.5]) B.box(x, 4.5, 1.54, 0.16, 7.2, 0.1, P.woodD, { set: 'w' });
  B.box(0, 8.3, 0, 3.4, 0.3, 3.2, P.woodD, { set: 'w' }); B.crenel(0, 8.5, 0, 3.4, 3.2, P.woodL, { h: 0.7, step: 0.8, t: 0.3 });
  B.box(0, 3.0, 1.62, 1.2, 2.0, 0.1, P.leather, { set: 'w' });
  B.box(0, 6.0, 1.65, 1.6, 1.2, 0.05, P.hay, { set: 'w' });
  B.box(0, 9.4, 0, 0.1, 2.4, 0.1, P.woodD, { set: 'w' }); B.flag(0, 10.3, 0, 1.0, 0.7);
  return B.build();
}

export function terrainTheme(theme) {
  switch (theme) {
    case 'snow': return { low: 0x5d7c5a, mid: 0x8d9a86, high: 0xf0f4f8, rock: 0x8a8a90, sand: 0xa8a090, fog: 0xc8d4e0, sky: 0x9ab8d8 };
    case 'forest': return { low: 0x3f6a34, mid: 0x4f7a3e, high: 0x6d8a55, rock: 0x7a766c, sand: 0x9c8a60, fog: 0xa6bfa0, sky: 0x88aacb };
    case 'rock': return { low: 0x7b7a58, mid: 0x8f8a74, high: 0xa09c92, rock: 0x7c786f, sand: 0x9a8e70, fog: 0xc4bcae, sky: 0x9ab0c8 };
    case 'desert': return { low: 0xc8a86a, mid: 0xd4b478, high: 0xb89a62, rock: 0x9a7e5a, sand: 0xe0c68a, fog: 0xe6d2a8, sky: 0xa8c4e0 };
    default: return { low: 0x5a9438, mid: 0x74a54a, high: 0x8c9d62, rock: 0x82806f, sand: 0xc4b070, fog: 0xb8d0e0, sky: 0x86b4e0 };
  }
}
