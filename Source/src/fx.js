// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Particle effects (dust, smoke, fire, sparks, debris, splashes) and rain streaks.
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const VS = `
attribute vec4 color; attribute float size; varying vec4 vC; uniform float scale;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(size * scale / max(0.5,-mv.z), 1.0, 96.0); gl_Position = projectionMatrix * mv; vC = color; }`;
const FS = `
varying vec4 vC;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d); gl_FragColor = vec4(vC.rgb, vC.a * a); if (gl_FragColor.a < 0.01) discard;
#include <colorspace_fragment>
}`;

// c0,c1: start/end colour; a0,a1: alpha; s0,s1: size; life: seconds; vy: initial upward speed; sp: horizontal spread; g: gravity; drag
const PRESET = {
  dust:   { c0: 0xb8a67e, c1: 0x8d7f60, a0: 0.55, a1: 0, s0: 1.4, s1: 3.4, life: 1.1, vy: 0.7, sp: 1.2, g: -0.3, drag: 1.5, add: false },
  smoke:  { c0: 0x6a6a6a, c1: 0x2c2c2c, a0: 0.5, a1: 0, s0: 1.4, s1: 5.0, life: 3.2, vy: 1.8, sp: 0.35, g: -0.4, drag: 0.4, add: false },
  smokeW: { c0: 0xd8d8d8, c1: 0xa0a0a0, a0: 0.38, a1: 0, s0: 1.0, s1: 3.6, life: 3.4, vy: 1.4, sp: 0.25, g: -0.3, drag: 0.4, add: false },
  fire:   { c0: 0xffc040, c1: 0xd02010, a0: 0.95, a1: 0, s0: 1.8, s1: 0.5, life: 0.75, vy: 2.4, sp: 0.5, g: -0.5, drag: 0.8, add: true },
  spark:  { c0: 0xfff0a0, c1: 0xff8020, a0: 1, a1: 0, s0: 0.5, s1: 0.2, life: 0.45, vy: 3.2, sp: 4.0, g: 14, drag: 0.5, add: true },
  chip:   { c0: 0xa5784a, c1: 0x6b4426, a0: 1, a1: 0.2, s0: 0.45, s1: 0.35, life: 0.8, vy: 3.5, sp: 2.4, g: 16, drag: 0.3, add: false },
  debris: { c0: 0x8d8a82, c1: 0x5b5953, a0: 1, a1: 0.3, s0: 0.9, s1: 0.8, life: 1.3, vy: 6.0, sp: 4.5, g: 18, drag: 0.2, add: false },
  splash: { c0: 0xcfe8f5, c1: 0x7fb0d0, a0: 0.85, a1: 0, s0: 0.8, s1: 0.4, life: 0.7, vy: 4.0, sp: 1.6, g: 14, drag: 0.4, add: false },
  puff:   { c0: 0xcfc6ae, c1: 0x998f78, a0: 0.5, a1: 0, s0: 0.8, s1: 2.0, life: 0.5, vy: 0.5, sp: 0.9, g: -0.2, drag: 2.0, add: false },
  glow:   { c0: 0xffd870, c1: 0xffa020, a0: 0.8, a1: 0, s0: 0.5, s1: 1.1, life: 0.6, vy: 1.2, sp: 0.3, g: -0.1, drag: 0.5, add: true },
};

class Layer {
  constructor(parent, cap, additive) {
    this.cap = cap; this.head = 0;
    this.pos = new Float32Array(cap * 3); this.vel = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4); this.size = new Float32Array(cap);
    this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.pid = new Uint8Array(cap); this.sr = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('color', this.aCol); g.setAttribute('size', this.aSize);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { scale: { value: 600 } } });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5;
    parent.add(this.pts);
    this.active = 0;
  }
}

export class FX {
  constructor(scene, quality = 1, seed = 5) {
    this.q = quality;
    this.rng = mulberry32(seed);
    this.layers = { n: new Layer(scene, 4500, false), a: new Layer(scene, 2500, true) };
    this.presets = [];
    this.pnames = Object.keys(PRESET);
    for (const k of this.pnames) { const p = PRESET[k]; this.presets.push({ c0: new THREE.Color(p.c0), c1: new THREE.Color(p.c1), p }); }
  }
  setQuality(q) { this.q = q; }
  setScale(h, fov) { const s = h / (2 * Math.tan(fov * Math.PI / 360)); this.layers.n.mat.uniforms.scale.value = s; this.layers.a.mat.uniforms.scale.value = s; }
  spawn(type, x, y, z, n = 1, k = 1) {
    const pi = this.pnames.indexOf(type); if (pi < 0) return;
    const pr = this.presets[pi], p = pr.p;
    const L = p.add ? this.layers.a : this.layers.n;
    let cnt = Math.floor(n * this.q); if (this.rng() < n * this.q - cnt) cnt++;
    const r = this.rng;
    for (let c = 0; c < cnt; c++) {
      const i = L.head; L.head = (L.head + 1) % L.cap;
      const a = r() * 6.2832, sp = p.sp * k * (0.3 + r() * 0.7);
      L.pos[i * 3] = x + (r() - 0.5) * 0.4 * k; L.pos[i * 3 + 1] = y + (r() - 0.5) * 0.2; L.pos[i * 3 + 2] = z + (r() - 0.5) * 0.4 * k;
      L.vel[i * 3] = Math.cos(a) * sp; L.vel[i * 3 + 1] = p.vy * (0.55 + r() * 0.7) * (type === 'debris' || type === 'spark' || type === 'chip' ? 1 : Math.sqrt(k)); L.vel[i * 3 + 2] = Math.sin(a) * sp;
      L.life[i] = L.max[i] = p.life * (0.7 + r() * 0.6); L.pid[i] = pi; L.sr[i] = k * (0.8 + r() * 0.5);
      L.col[i * 4] = pr.c0.r; L.col[i * 4 + 1] = pr.c0.g; L.col[i * 4 + 2] = pr.c0.b; L.col[i * 4 + 3] = p.a0;
      L.size[i] = p.s0 * L.sr[i];
    }
  }
  update(dt) {
    for (const key of ['n', 'a']) {
      const L = this.layers[key]; let any = 0;
      for (let i = 0; i < L.cap; i++) {
        if (L.life[i] <= 0) { if (L.col[i * 4 + 3] !== 0) { L.col[i * 4 + 3] = 0; L.size[i] = 0; } continue; }
        any++;
        L.life[i] -= dt;
        const pr = this.presets[L.pid[i]], p = pr.p;
        const t = 1 - Math.max(0, L.life[i]) / L.max[i];
        const dr = Math.max(0, 1 - p.drag * dt);
        L.vel[i * 3] *= dr; L.vel[i * 3 + 2] *= dr; L.vel[i * 3 + 1] = L.vel[i * 3 + 1] * (p.g < 0 ? dr : 1) - p.g * dt;
        L.pos[i * 3] += L.vel[i * 3] * dt; L.pos[i * 3 + 1] += L.vel[i * 3 + 1] * dt; L.pos[i * 3 + 2] += L.vel[i * 3 + 2] * dt;
        L.col[i * 4] = pr.c0.r + (pr.c1.r - pr.c0.r) * t; L.col[i * 4 + 1] = pr.c0.g + (pr.c1.g - pr.c0.g) * t; L.col[i * 4 + 2] = pr.c0.b + (pr.c1.b - pr.c0.b) * t;
        const fadeIn = Math.min(1, t * 8);
        L.col[i * 4 + 3] = (p.a0 + (p.a1 - p.a0) * t) * fadeIn;
        L.size[i] = (p.s0 + (p.s1 - p.s0) * t) * L.sr[i];
        if (L.life[i] <= 0) { L.col[i * 4 + 3] = 0; L.size[i] = 0; }
      }
      L.aPos.needsUpdate = L.aCol.needsUpdate = L.aSize.needsUpdate = true;
      L.pts.visible = true;
      L.active = any;
    }
  }
  clear() { for (const key of ['n', 'a']) { const L = this.layers[key]; L.life.fill(0); L.col.fill(0); L.size.fill(0); } }
  dispose() { for (const key of ['n', 'a']) { const L = this.layers[key]; L.pts.parent && L.pts.parent.remove(L.pts); L.pts.geometry.dispose(); L.mat.dispose(); } }
}

// Rain: line streaks wrapping around the camera
export class Rain {
  constructor(scene, count = 1800) {
    this.count = count; this.box = 70;
    this.p = new Float32Array(count * 3);
    const r = mulberry32(99);
    for (let i = 0; i < count; i++) { this.p[i * 3] = (r() - 0.5) * this.box; this.p[i * 3 + 1] = r() * 50; this.p[i * 3 + 2] = (r() - 0.5) * this.box; }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.LineBasicMaterial({ color: 0xb8c8d8, transparent: true, opacity: 0.0, depthWrite: false });
    this.mesh = new THREE.LineSegments(this.geo, this.mat); this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.renderOrder = 6;
    scene.add(this.mesh);
  }
  update(dt, cam, intensity, wind) {
    this.mesh.visible = intensity > 0.02;
    if (!this.mesh.visible) return;
    this.mat.opacity = Math.min(0.55, intensity * 0.55);
    const a = this.geo.attributes.position.array, p = this.p, B = this.box;
    const n = Math.floor(this.count * Math.min(1, 0.25 + intensity));
    const fall = 38 + intensity * 14;
    for (let i = 0; i < n; i++) {
      p[i * 3 + 1] -= fall * dt; p[i * 3] += wind * dt * 6;
      if (p[i * 3 + 1] < -4) { p[i * 3 + 1] += 54; }
      if (p[i * 3] > B / 2) p[i * 3] -= B; else if (p[i * 3] < -B / 2) p[i * 3] += B;
      const x = cam.x + p[i * 3], y = cam.y - 6 + p[i * 3 + 1], z = cam.z + p[i * 3 + 2];
      a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x + wind * 0.05; a[i * 6 + 4] = y + 1.1; a[i * 6 + 5] = z;
    }
    for (let i = n; i < this.count; i++) { a[i * 6] = a[i * 6 + 3] = 0; a[i * 6 + 1] = a[i * 6 + 4] = -999; a[i * 6 + 2] = a[i * 6 + 5] = 0; }
    this.geo.attributes.position.needsUpdate = true;
  }
  dispose() { this.mesh.parent && this.mesh.parent.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
}
