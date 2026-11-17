// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Three.js renderer: terrain, water, sky, props, buildings, walls, units, effects, picking.
import * as THREE from 'three';
import { TILE, BUILDINGS, TEAM_COLORS } from './data.js';
import { KIND } from './terrain.js';
import * as M from './models.js';
import { FX, Rain } from './fx.js';
import { Sky, dayState } from './sky.js';
import { UnitView, Inst, loc } from './unitview.js';
import { clamp, lerp, mulberry32, smoothstep } from './util.js';

export const DAY_LEN = 840;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const LINE_KEYS = new Set(['wallw', 'walls', 'moat', 'bridge']);

export class Renderer {
  constructor(canvas, quality = {}, opts = {}) {
    this.canvas = canvas;
    this.q = Object.assign({ shadow: 2048, dpr: 1.5, particles: 1, weather: true, rain: 1, far: 700, aa: true, dayNight: true }, quality);
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: !!this.q.aa, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    const gl = this.gl;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05;
    gl.localClippingEnabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, 1.6, 0.5, 1800);
    this.camera.position.set(0, 60, 60);
    this.frustum = new THREE.Frustum(); this.pv = new THREE.Matrix4();
    this.tex = M.makeTextures();
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.35;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x405030, 1);
    this.scene.add(this.hemi);
    this.fog = new THREE.Fog(0xb8d0e0, 150, 700); this.scene.fog = this.fog;
    this.sky = new Sky(this.scene);
    this.fx = new FX(this.scene, this.q.particles);
    this.rain = new Rain(this.scene, 2000);
    this.matS = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.tex.stone, roughness: 0.92, metalness: 0.02 });
    this.matW = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.tex.wood, roughness: 0.88, metalness: 0.02 });
    this.matG = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x888888 });
    this.matProp = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    M.patchWind(this.matProp, 0.07, 'instance');
    this.flagMats = {};
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.units = new UnitView(this.scene, { matS: this.matS, matW: this.matW, flagMat: (t) => this.flagMat(t) });
    this.views = new Map(); this.dying = []; this.rubbles = [];
    this.sel = { units: new Set(), buildings: new Set(), hover: null };
    this.t = 0; this.tod = 0.38; this.weather = { kind: 'clear', w: 0, target: 0, next: 120, flash: 0, thunder: 0 };
    this.shake = 0; this.stats = { draw: 0, tri: 0 };
    this.markers = []; this.markerPool = [];
    this.ghost = null; this.ghostKey = null; this.ghostTiles = null; this.territory = null; this.terrOn = false; this.terrKey = '';
    this.rally = null; this.outlines = new Map();
    this.wallsDirty = true; this.camFocus = new THREE.Vector3();
    this.geoCache = {}; this.scafCache = {};
    this.onThunder = null;
    this.applyQuality(this.q);
  }

  // ---------------------------------------------------------------- settings
  applyQuality(q) {
    this.q = Object.assign(this.q, q);
    const gl = this.gl;
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.dpr));
    const on = this.q.shadow > 0;
    gl.shadowMap.enabled = on; this.sun.castShadow = on;
    if (on && this.sun.shadow.mapSize.x !== this.q.shadow) { this.sun.shadow.mapSize.set(this.q.shadow, this.q.shadow); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    this.shadowHalf = this.q.shadow >= 4096 ? 110 : this.q.shadow >= 2048 ? 90 : 70;
    const sc = this.sun.shadow.camera; sc.left = -this.shadowHalf; sc.right = this.shadowHalf; sc.top = this.shadowHalf; sc.bottom = -this.shadowHalf; sc.near = 10; sc.far = 420; sc.updateProjectionMatrix();
    this.fx.setQuality(this.q.particles);
    this.camera.far = this.q.far * 2.4; this.camera.updateProjectionMatrix();
    this.resize();
    for (const mat of [this.matS, this.matW, this.matProp]) mat.needsUpdate = true;
    if (this.terrain) this.terrain.receiveShadow = on;
  }
  resize(w, h) {
    const c = this.canvas;
    w = w || c.clientWidth || c.width || 1280; h = h || c.clientHeight || c.height || 720;
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.fx.setScale(h * this.gl.getPixelRatio(), this.camera.fov);
    this.W = w; this.H = h;
  }
  flagMat(team) {
    if (!this.flagMats[team]) {
      const m = new THREE.MeshStandardMaterial({ color: TEAM_COLORS[team % TEAM_COLORS.length], side: THREE.DoubleSide, roughness: 0.75, vertexColors: false });
      M.patchWind(m, 0.35, 'attr'); this.flagMats[team] = m;
    }
    return this.flagMats[team];
  }

  // ---------------------------------------------------------------- game binding
  setGame(g) {
    this.clearGame();
    this.g = g;
    this.theme = M.terrainTheme(g.T.theme);
    this.units.setGame(g);
    this.buildTerrain();
    this.buildWater();
    this.buildProps();
    this.linesInit();
    for (const b of g.buildings) this.addView(b);
    this.wallsDirty = true;
    this.weather = { kind: 'clear', w: 0, target: 0, next: 90 + (g.T.seed % 60), flash: 0, thunder: 0 };
    this.rng = mulberry32((g.T.seed || 1) + 17);
    const L = (ev, fn) => g.on(ev, fn);
    L('buildingAdded', (b) => { this.addView(b); if (LINE_KEYS.has(b.key)) this.wallsDirty = true; this.terrKey = ''; });
    L('buildingRemoved', ({ b, how }) => this.removeView(b, how));
    L('buildingDone', (b) => { this.finishView(b); if (LINE_KEYS.has(b.key)) this.wallsDirty = true; });
    L('buildingLevel', (b) => { this.rebuildView(b); });
    L('captured', (b) => { this.rebuildView(b); this.terrKey = ''; });
    L('nodeRemoved', (n) => this.hideNode(n));
    L('unitRemoved', (u) => this.units.forget(u));
    L('unitDied', ({ u }) => { if (u.cls === 'siege') this.fx.spawn('debris', u.x, u.y + 1, u.z, 10, 1.4), this.fx.spawn('dust', u.x, u.y + 0.5, u.z, 8, 1.6); });
    L('impact', (e) => this.impactFx(e));
    L('sfx', (e) => this.sfxFx(e));
    L('bhit', ({ b, dmg, kind }) => { if (kind === 'melee' || kind === 'stone') this.fx.spawn('debris', b.cx + (this.rng() - 0.5) * b.w, b.y + 1.5 + this.rng() * 2, b.cz + (this.rng() - 0.5) * b.d, 2, 0.8); });
    L('collect', (e) => this.fx.spawn('glow', e.x, this.g.T.heightAt(e.x, e.z) + 1.7, e.z, 2, 0.5));
    L('deploy', ({ tw }) => this.fx.spawn('dust', tw.x, tw.y + 1, tw.z, 14, 1.6));
    L('unitTrained', ({ u }) => this.fx.spawn('puff', u.x, u.y + 0.8, u.z, 6, 1));
    L('produce', ({ b }) => { if (b.key === 'bakery' || b.key === 'blacksmith') this.fx.spawn('puff', b.cx, b.y + 4, b.cz, 2, 1); });
    this.sel.units.clear(); this.sel.buildings.clear(); this.sel.hover = null;
    this.fx.clear();
  }
  clearGame() {
    if (!this.g) return;
    for (const v of this.views.values()) this.disposeView(v);
    this.views.clear();
    for (const d of this.dying) this.disposeView(d.v); this.dying.length = 0;
    for (const r of this.rubbles) { this.world.remove(r.group); } this.rubbles.length = 0;
    for (const k of ['terrain', 'waterMesh', 'outerWater']) if (this[k]) { this.world.remove(this[k]); this[k].geometry.dispose(); this[k] = null; }
    if (this.propMeshes) for (const m of this.propMeshes) { this.world.remove(m); m.geometry.dispose && 0; m.dispose(); }
    this.propMeshes = []; this.propIdx = new Map();
    if (this.lineSets) for (const s of this.lineSets) { this.world.remove(s.mesh); s.mesh.dispose(); }
    this.lineSets = [];
    this.g = null;
  }

  // ---------------------------------------------------------------- terrain
  buildTerrain() {
    const g = this.g, T = g.T, N = T.N, V = N + 1, th = this.theme, wl = T.wl;
    const pos = new Float32Array(V * V * 3), col = new Float32Array(V * V * 3), uv = new Float32Array(V * V * 2);
    const rnd = mulberry32(T.seed + 3);
    const cl = (h) => new THREE.Color(h);
    const low = cl(th.low), mid = cl(th.mid), high = cl(th.high), rock = cl(th.rock), sand = cl(th.sand), snow = cl(0xf2f5f8), under = cl(0x3b5648), c = new THREE.Color();
    const H = T.H;
    for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
      const h = H[j * V + i], k = j * V + i;
      pos[k * 3] = i * TILE; pos[k * 3 + 1] = h; pos[k * 3 + 2] = j * TILE;
      uv[k * 2] = i * TILE / 9; uv[k * 2 + 1] = j * TILE / 9;
      const dx = H[j * V + Math.min(i + 1, N)] - H[j * V + Math.max(i - 1, 0)], dz = H[Math.min(j + 1, N) * V + i] - H[Math.max(j - 1, 0) * V + i];
      const slope = Math.hypot(dx, dz) / (2 * TILE) * 1.6;
      c.copy(low).lerp(mid, smoothstep(wl + 0.2, wl + 3.0, h)).lerp(high, smoothstep(wl + 3.5, wl + 8, h));
      c.lerp(sand, 1 - smoothstep(wl - 0.1, wl + 0.8, h));
      if (h < wl) c.lerp(under, smoothstep(0, 2.2, wl - h));
      const r = smoothstep(0.42, 0.95, slope); c.lerp(rock, r);
      if (th.high === 0xf0f4f8) c.lerp(snow, smoothstep(wl + 5.5, wl + 8.5, h) * (1 - r * 0.5));
      const edge = Math.min(i, j, N - i, N - j); if (edge < 4) c.lerp(rock, 1 - edge / 4);
      const n = 0.92 + rnd() * 0.16; const tint = (rnd() - 0.5) * 0.04;
      col[k * 3] = clamp(c.r * n + tint, 0, 1.4); col[k * 3 + 1] = clamp(c.g * n, 0, 1.4); col[k * 3 + 2] = clamp(c.b * n - tint, 0, 1.4);
    }
    const idx = new Uint32Array(N * N * 6);
    let o = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = j * V + i, b = a + 1, c2 = a + V, d = c2 + 1;
      if ((i + j) & 1) { idx[o++] = a; idx[o++] = c2; idx[o++] = b; idx[o++] = b; idx[o++] = c2; idx[o++] = d; }
      else { idx[o++] = a; idx[o++] = c2; idx[o++] = d; idx[o++] = a; idx[o++] = d; idx[o++] = b; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals(); geo.computeBoundingSphere();
    this.tex.terrain.repeat.set(1, 1);
    const mat = this.terrainMat || (this.terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: this.tex.terrain, roughness: 1, metalness: 0 }));
    this.terrain = new THREE.Mesh(geo, mat); this.terrain.receiveShadow = this.q.shadow > 0; this.terrain.castShadow = false;
    this.world.add(this.terrain);
  }
  buildWater() {
    const g = this.g, T = g.T, N = T.N, V = N + 1, wl = T.wl;
    const pos = [], col = [], uv = [], idx = [];
    const shallow = new THREE.Color(0x4aa0b0), deep = new THREE.Color(0x1d5282), foam = new THREE.Color(0xe8f4f6), c = new THREE.Color();
    const map = new Int32Array(V * V).fill(-1);
    let n = 0;
    const vtx = (i, j) => {
      const k = j * V + i; if (map[k] >= 0) return map[k];
      const h = T.H[k], d = wl - h;
      pos.push(i * TILE, wl, j * TILE); uv.push(i * TILE * 0.07, j * TILE * 0.07);
      c.copy(shallow).lerp(deep, smoothstep(0, 4.5, d)).lerp(foam, d < 0.25 ? (0.25 - d) / 0.25 * 0.7 : 0);
      col.push(c.r, c.g, c.b, clamp(0.3 + d * 0.28, 0.0, 0.93) * (d < -0.5 ? 0 : 1));
      map[k] = n++; return map[k];
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const H = T.H; const a = j * V + i;
      if (H[a] >= wl + 0.2 && H[a + 1] >= wl + 0.2 && H[a + V] >= wl + 0.2 && H[a + V + 1] >= wl + 0.2) continue;
      const A = vtx(i, j), B = vtx(i + 1, j), C = vtx(i, j + 1), D = vtx(i + 1, j + 1);
      idx.push(A, C, B, B, C, D);
    }
    if (!idx.length) { this.waterMesh = null; return; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mat = this.waterMat || (this.waterMat = new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, depthWrite: false, shininess: 70, specular: 0x556070, normalMap: this.tex.waterN, normalScale: new THREE.Vector2(0.55, 0.55) }));
    this.waterMesh = new THREE.Mesh(geo, mat); this.waterMesh.renderOrder = 3; this.world.add(this.waterMesh);
    // outer ocean (opaque ring) so the world has no visible edge
    const S = T.size, E = 2400;
    const og = new THREE.BufferGeometry();
    const ring = [-E, -E, S + E, -E, S + E, 0, -E, 0, -E, S, S + E, S, S + E, S + E, -E, S + E, -E, 0, 0, 0, 0, S, -E, S, S, 0, S + E, 0, S + E, S, S, S];
    const p2 = [], i2 = [];
    const rect = (x0, z0, x1, z1) => { const b = p2.length / 3; p2.push(x0, wl - 0.25, z0, x1, wl - 0.25, z0, x1, wl - 0.25, z1, x0, wl - 0.25, z1); i2.push(b, b + 2, b + 1, b, b + 3, b + 2); };
    rect(-E, -E, S + E, 0); rect(-E, S, S + E, S + E); rect(-E, 0, 0, S); rect(S, 0, S + E, S);
    og.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3)); og.setIndex(i2); og.computeVertexNormals();
    this.outerWater = new THREE.Mesh(og, new THREE.MeshPhongMaterial({ color: 0x2a6896, shininess: 60, specular: 0x445566 }));
    this.world.add(this.outerWater);
  }

  // ---------------------------------------------------------------- props (trees, rocks, ore)
  buildProps() {
    const g = this.g, T = g.T, theme = T.theme;
    this.propMeshes = []; this.propIdx = new Map();
    const CH = 64;
    const geos = {};
    const oreG = (seed, base, fleck, nf) => {
      const B = new M.GeoBuilder(seed); const r = mulberry32(seed);
      B.sphere(0, 0.55, 0, 1.15, base, { sy: 0.78, jit: 0.1 }); B.sphere(0.7, 0.4, 0.3, 0.65, base, { sy: 0.6, jit: 0.1 }); B.sphere(-0.6, 0.35, -0.5, 0.55, base, { sy: 0.6, jit: 0.1 });
      for (let i = 0; i < nf; i++) { const a = r() * 6.28, e = 0.2 + r() * 0.6; B.box(Math.cos(a) * 1.0 * Math.cos(e), 0.55 + Math.sin(e) * 0.8, Math.sin(a) * 1.0 * Math.cos(e), 0.28, 0.28, 0.28, fleck, { ry: r() * 3, rx: r(), jit: 0.05 }); }
      return B.build().s;
    };
    const get = (type, v) => {
      const k = type + v;
      if (geos[k]) return geos[k];
      let geo;
      if (type === 'tree') geo = M.treeGeo(v % 3, theme);
      else if (type === 'rock') geo = M.rockGeo(v + 4, [0x85827a, 0x76736b, 0x9a968c][v % 3]);
      else if (type === 'stone') geo = oreG(11 + v, [0x9b978c, 0x8e8a80, 0xa6a296][v % 3], 0xcfcabc, 4);
      else if (type === 'ore') geo = oreG(21 + v, 0x5a504a, 0xb5651d, 7);
      else geo = oreG(31 + v, 0x726848, 0xffd23a, 8);
      return geos[k] = geo;
    };
    const buckets = new Map();
    for (const n of g.nodes) {
      if (n.type === 'deer') continue;
      const cx = Math.floor(n.x / CH), cz = Math.floor(n.z / CH);
      const key = n.type + (n.v % 3) + '_' + cx + '_' + cz;
      let b = buckets.get(key); if (!b) { b = { type: n.type, v: n.v % 3, list: [] }; buckets.set(key, b); }
      b.list.push(n);
    }
    const SZ = { tree: 1.25, rock: 1.1, stone: 1.45, ore: 1.3, gold: 1.3 };
    for (const b of buckets.values()) {
      const geo = get(b.type, b.v);
      const mesh = new THREE.InstancedMesh(geo, this.matProp, b.list.length);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(b.list.length * 3), 3);
      b.list.forEach((n, i) => {
        const y = g.T.heightAt(n.x, n.z) - 0.05;
        loc(_m, n.x, y, n.z, 0, n.rot, 0, n.scale * (SZ[n.type] || 1));
        mesh.setMatrixAt(i, _m);
        const j = 0.88 + ((n.rot * 7.3) % 1) * 0.22;
        mesh.setColorAt(i, _c.setRGB(j, j, j));
        this.propIdx.set(n.id, { mesh, i, n, base: n.scale * (SZ[n.type] || 1), last: 1 });
      });
      mesh.castShadow = b.type === 'tree' || b.type === 'stone'; mesh.receiveShadow = false;
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere(); mesh.frustumCulled = true;
      this.world.add(mesh); this.propMeshes.push(mesh);
    }
  }
  hideNode(n) {
    const p = this.propIdx.get(n.id); if (!p) return;
    _m.makeScale(0, 0, 0); p.mesh.setMatrixAt(p.i, _m); p.mesh.instanceMatrix.needsUpdate = true;
    if (n.type === 'tree') this.fx.spawn('puff', n.x, this.g.T.heightAt(n.x, n.z) + 1, n.z, 4, 1);
    this.propIdx.delete(n.id);
  }
  tickProps() {
    for (const p of this.propIdx.values()) {
      const n = p.n; if (n.type === 'tree' || n.type === 'rock' || n.max <= 0) continue;
      const f = Math.round(clamp(n.amount / n.max, 0, 1) * 10) / 10; if (f === p.last) continue;
      p.last = f;
      const s = p.base * (0.55 + 0.45 * f);
      loc(_m, n.x, this.g.T.heightAt(n.x, n.z) - 0.05, n.z, 0, n.rot, 0, s);
      p.mesh.setMatrixAt(p.i, _m); p.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- building views
  bGeo(b) {
    const key = b.key + '|' + b.level + '|' + (b.key === 'house' ? b.id % 3 : 0);
    let g = this.geoCache[key];
    if (!g) {
      g = this.geoCache[key] = M.buildBuilding(b.key, b.def.w, b.def.d, b.level, 7 + (b.key === 'house' ? b.id % 3 : 0) * 5);
      let top = 0; for (const k of ['s', 'w', 'g']) if (g[k]) top = Math.max(top, g[k].boundingBox.max.y);
      g.top = top;
    }
    return g;
  }
  addView(b) {
    if (LINE_KEYS.has(b.key)) return; // instanced separately
    const geo = this.bGeo(b);
    const group = new THREE.Group();
    group.position.set(b.cx, b.y, b.cz); group.rotation.y = b.rot ? Math.PI / 2 : 0;
    const v = { b, group, geo, meshes: {}, parts: {}, team: b.team, level: b.level, built: b.built, clones: null, plane: null, scaf: null, fireT: Math.random(), smokeT: Math.random(), workT: 0, chimneys: this.chimneys(b) };
    const addSet = (G, parent, mats) => {
      const out = {};
      for (const k of ['s', 'w', 'g', 'f']) {
        if (!G[k]) continue;
        const mat = k === 'f' ? this.flagMat(b.team) : mats[k];
        const m = new THREE.Mesh(G[k], mat);
        m.castShadow = k === 's' || k === 'w'; m.receiveShadow = k === 's' || k === 'w';
        parent.add(m); out[k] = m;
      }
      return out;
    };
    v.matSet = { s: this.matS, w: this.matW, g: this.matG };
    if (!b.built) {
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), b.y);
      v.plane = plane;
      v.clones = { s: this.matS.clone(), w: this.matW.clone(), g: this.matG.clone() };
      for (const k in v.clones) { v.clones[k].clippingPlanes = [plane]; v.clones[k].clipShadows = true; }
      v.matSet = v.clones;
    }
    v.meshes = addSet(geo, group, v.matSet);
    for (const k in geo.parts) { const pg = new THREE.Group(); pg.position.set(...geo.parts[k].pos); group.add(pg); v.parts[k] = { g: pg, meshes: addSet(geo.parts[k], pg, v.matSet) }; }
    if (!b.built && v.meshes.f) v.meshes.f.visible = false;
    for (const k in v.parts) if (!b.built && v.parts[k].meshes.f) v.parts[k].meshes.f.visible = false;
    if (!b.built || b.upg) this.addScaffold(v);
    this.world.add(group);
    this.views.set(b.id, v);
    if (b.built && b.age < 0.5 && this.g.time > 1) this.fx.spawn('dust', b.cx, b.y + 0.5, b.cz, 6, b.w);
    return v;
  }
  chimneys(b) {
    const C = { house: [[1.2, 3.8, -0.9]], bakery: [[-1.6, 5.9, -1.2]], blacksmith: [[-1.4, 6.3, -1.6]], townhall: [], church: [] }[b.key];
    return C || [];
  }
  addScaffold(v) {
    const b = v.b, def = b.def;
    const h = Math.min(v.geo.top, 9);
    const key = def.w + 'x' + def.d + 'x' + Math.round(h);
    let sg = this.scafCache[key]; if (!sg) sg = this.scafCache[key] = M.buildScaffold(def.w, def.d, h).w;
    const m = new THREE.Mesh(sg, this.matW); m.castShadow = true; m.receiveShadow = true;
    v.group.add(m); v.scaf = m;
  }
  finishView(b) {
    const v = this.views.get(b.id); if (!v) return;
    v.built = true;
    this.swapShared(v);
    if (v.scaf && !b.upg) { v.group.remove(v.scaf); v.scaf = null; }
    if (v.meshes.f) v.meshes.f.visible = true;
    for (const k in v.parts) if (v.parts[k].meshes.f) v.parts[k].meshes.f.visible = true;
    this.fx.spawn('dust', b.cx, b.y + 1, b.cz, 14, Math.max(b.w, b.d) * 0.8);
    this.fx.spawn('puff', b.cx, b.y + 2, b.cz, 8, 1.2);
  }
  swapShared(v) {
    if (!v.clones) return;
    const all = [v.meshes, ...Object.values(v.parts).map((p) => p.meshes)];
    for (const ms of all) { if (ms.s) ms.s.material = this.matS; if (ms.w) ms.w.material = this.matW; if (ms.g) ms.g.material = this.matG; }
    for (const k in v.clones) v.clones[k].dispose();
    v.clones = null; v.plane = null;
  }
  rebuildView(b) {
    const old = this.views.get(b.id); if (!old) return;
    this.disposeView(old); this.views.delete(b.id);
    const v = this.addView(b);
    if (b.built && v.clones) this.swapShared(v);
  }
  disposeView(v) {
    this.world.remove(v.group);
    if (v.clones) for (const k in v.clones) v.clones[k].dispose();
    const o = this.outlines.get(v.b.id); if (o) { this.world.remove(o); this.outlines.delete(v.b.id); }
  }
  removeView(b, how) {
    if (LINE_KEYS.has(b.key)) {
      this.wallsDirty = true; this.terrKey = '';
      if (how === 'destroyed') { this.fx.spawn('debris', b.cx, b.y + 1.2, b.cz, 10, 1.2); this.fx.spawn('dust', b.cx, b.y + 1, b.cz, 7, 1.5); }
      return;
    }
    const v = this.views.get(b.id); this.views.delete(b.id); this.terrKey = '';
    if (!v) return;
    if (how === 'destroyed') { this.dying.push({ v, t: 0 }); this.fx.spawn('dust', b.cx, b.y + 1, b.cz, 18, Math.max(b.w, b.d)); this.fx.spawn('debris', b.cx, b.y + 2, b.cz, 14, Math.max(b.w, b.d) * 0.5); this.shakeNear(b.cx, b.cz, 0.5); }
    else { this.disposeView(v); this.fx.spawn('puff', b.cx, b.y + 1, b.cz, 8, 1.4); }
  }
  shakeNear(x, z, a) { const d = Math.hypot(x - this.camFocus.x, z - this.camFocus.z); if (d < 70) this.shake = Math.max(this.shake, a * (1 - d / 70)); }

  // ---------------------------------------------------------------- walls / moat / bridge (instanced)
  linesInit() {
    this.lineSets = [];
    const mk = (geo, mat, cap, shadow = true, colored = true) => {
      const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = shadow;
      if (colored) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      this.world.add(m); const s = { mesh: m, cap, n: 0 }; this.lineSets.push(s); return s;
    };
    const stone = M.wallGeos('stone'), wood = M.wallGeos('wood');
    const cap = 6000;
    this.L = {
      sPost: mk(stone.post, this.matS, cap), sArm: mk(stone.arm, this.matS, cap), wPost: mk(wood.post, this.matW, cap), wArm: mk(wood.arm, this.matW, cap),
      bridge: mk(M.bridgeGeo(), this.matW, 800),
    };
    const flat = new THREE.PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2);
    const mm = new THREE.MeshPhongMaterial({ color: 0x2a6a96, transparent: true, opacity: 0.88, shininess: 90, specular: 0x99aabb, normalMap: this.tex.waterN, normalScale: new THREE.Vector2(0.5, 0.5) });
    mm.map = null;
    this.L.moat = mk(flat, mm, 3000, false, false);
    this.L.moat.mesh.receiveShadow = true;
  }
  rebuildLines() {
    this.wallsDirty = false;
    const g = this.g, L = this.L;
    for (const k in L) L[k].n = 0;
    const lineAt = (tx, tz) => { const id = g.nav.occ[tz * g.N + tx]; if (!id) return null; const b = g.byId.get(id); return b && (b.key === 'walls' || b.key === 'wallw') ? b : null; };
    const push = (S, m, r = 1, gg = 1, bb = 1) => { if (S.n >= S.cap) return; S.mesh.setMatrixAt(S.n, m); if (S.mesh.instanceColor) S.mesh.setColorAt(S.n, _c.setRGB(r, gg, bb)); S.n++; };
    for (const b of g.buildings) {
      if (b.dead) continue;
      if (b.key === 'moat') { loc(_m, b.cx, this.tileTop(b.tx, b.tz) + 0.14, b.cz, 0, 0, 0, 1); push(L.moat, _m); continue; }
      if (b.key === 'bridge') {
        const T = g.T; const wat = (tx, tz) => { if (tx < 0 || tz < 0 || tx >= g.N || tz >= g.N) return false; const k = T.kind[tz * g.N + tx]; return k === KIND.DEEP || k === KIND.SHALLOW || k === KIND.CLIFF || !!(g.byId.get(g.nav.occ[tz * g.N + tx]) || {}).def && g.byId.get(g.nav.occ[tz * g.N + tx]).def.moat; };
        const isB = (tx, tz) => { const o = g.byId.get(g.nav.occ[tz * g.N + tx]); return o && o.key === 'bridge'; };
        let rot = 0;
        const ns = wat(b.tx, b.tz - 1) && wat(b.tx, b.tz + 1), ew = wat(b.tx - 1, b.tz) && wat(b.tx + 1, b.tz);
        if (ew && !ns) rot = Math.PI / 2; else if (!ns && !ew && (isB(b.tx, b.tz - 1) || isB(b.tx, b.tz + 1)) && !(isB(b.tx - 1, b.tz) || isB(b.tx + 1, b.tz))) rot = Math.PI / 2;
        loc(_m, b.cx, Math.max(g.T.heightAt(b.cx, b.cz), g.T.wl) + 0.06, b.cz, 0, rot, 0, 1); push(L.bridge, _m, 1, 1, 1);
        continue;
      }
      if (b.key !== 'walls' && b.key !== 'wallw') continue;
      const stone = b.key === 'walls', Post = stone ? L.sPost : L.wPost, Arm = stone ? L.sArm : L.wArm;
      const f = clamp(b.hp / b.maxHp, 0.3, 1) * 0.5 + 0.5;
      const prog = b.built ? 1 : Math.max(0.12, b.progress);
      const y = b.y - 0.02 + (stone ? 0 : 0);
      _q.identity(); _m.compose(_v.set(b.cx, y, b.cz), _q, _s.set(1, prog, 1)); push(Post, _m, f, f, f);
      if (!b.built) continue;
      for (const [dx, dz] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const o = lineAt(b.tx + dx, b.tz + dz); if (!o || o.key !== b.key || !o.built) continue;
        if (dx && dz && (lineAt(b.tx + dx, b.tz) || lineAt(b.tx, b.tz + dz) || lineAt(b.tx + dx, b.tz) )) continue;
        const ang = -Math.atan2(dz, dx), len = Math.hypot(dx, dz);
        const yy = Math.max(b.y, o.y);
        _e3.set(0, ang, 0, 'YXZ'); _q.setFromEuler(_e3); _m.compose(_v.set(b.cx, yy - 0.02, b.cz), _q, _s.set(len, 1, 1)); push(Arm, _m, f, f, f);
      }
    }
    for (const k in L) { const S = L[k]; S.mesh.count = S.n; S.mesh.instanceMatrix.needsUpdate = true; if (S.mesh.instanceColor) S.mesh.instanceColor.needsUpdate = true; S.mesh.visible = S.n > 0; }
  }
  tileTop(tx, tz) { const T = this.g.T, V = T.N + 1; return Math.max(T.H[tz * V + tx], T.H[tz * V + tx + 1], T.H[(tz + 1) * V + tx], T.H[(tz + 1) * V + tx + 1]); }

  // ---------------------------------------------------------------- effects from simulation events
  impactFx(e) {
    const fx = this.fx;
    switch (e.type) {
      case 'boom': fx.spawn('fire', e.x, e.y + 0.4, e.z, 14, 1.8); fx.spawn('dust', e.x, e.y + 0.4, e.z, 18, 2.4); fx.spawn('debris', e.x, e.y + 0.5, e.z, 14, 1.3); fx.spawn('smoke', e.x, e.y + 1, e.z, 4, 1.1); this.shakeNear(e.x, e.z, 0.5); break;
      case 'arrowhit': fx.spawn('puff', e.x, e.y, e.z, 2, 0.6); fx.spawn('spark', e.x, e.y, e.z, 2, 0.5); break;
      case 'arrowmiss': fx.spawn('dust', e.x, e.y, e.z, 2, 0.5); break;
      case 'ram': fx.spawn('dust', e.x, e.y, e.z, 10, 1.4); fx.spawn('debris', e.x, e.y, e.z, 6, 0.9); this.shakeNear(e.x, e.z, 0.22); break;
      case 'wall': fx.spawn('dust', e.x, e.y, e.z, 2, 0.6); break;
    }
  }
  sfxFx(e) {
    const g = this.g; if (e.x == null) return;
    const y = g.T.heightAt(e.x, e.z), fx = this.fx;
    switch (e.s) {
      case 'chop': fx.spawn('chip', e.x, y + 1.2, e.z, 2, 0.7); break;
      case 'pick': fx.spawn('spark', e.x, y + 1.0, e.z, 2, 0.5); fx.spawn('dust', e.x, y + 0.5, e.z, 1, 0.5); break;
      case 'hammer': fx.spawn('spark', e.x, y + 1.0, e.z, 1, 0.4); break;
      case 'clash': fx.spawn('spark', e.x, y + 1.4, e.z, 4, 0.6); break;
      case 'hit': case 'charge': fx.spawn('puff', e.x, y + 1.2, e.z, 1, 0.5); break;
      case 'collapse': fx.spawn('dust', e.x, y + 1, e.z, 24, 3); fx.spawn('debris', e.x, y + 2, e.z, 12, 1.5); this.shakeNear(e.x, e.z, 0.6); break;
      case 'spawn': break;
    }
  }

  // ---------------------------------------------------------------- picking helpers
  setPointer(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return [((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1)];
  }
  ray(nx, ny) {
    const cam = this.camera; cam.updateMatrixWorld();
    const o = _v.setFromMatrixPosition(cam.matrixWorld).clone();
    const d = _v2.set(nx, ny, 0.5).unproject(cam).sub(o).normalize().clone();
    return new THREE.Ray(o, d);
  }
  groundPoint(nx, ny) {
    const g = this.g; if (!g) return null;
    const ray = this.ray(nx, ny), T = g.T, S = T.size;
    const o = ray.origin, d = ray.direction;
    if (d.y >= -1e-4) return null;
    let t = 0, step = 3, prevT = 0;
    const H = (x, z) => (x < 0 || z < 0 || x > S || z > S) ? T.wl - 2 : T.heightAt(x, z);
    for (let i = 0; i < 900; i++) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < H(x, z)) {
        let a = prevT, b = t;
        for (let k = 0; k < 10; k++) { const mid = (a + b) / 2; if (o.y + d.y * mid < H(o.x + d.x * mid, o.z + d.z * mid)) b = mid; else a = mid; }
        const px = o.x + d.x * b, pz = o.z + d.z * b;
        if (px < 0 || pz < 0 || px > S || pz > S) return null;
        return { x: px, z: pz, y: T.heightAt(px, pz) };
      }
      prevT = t; t += step; if (t > 1600) break;
      step = Math.min(8, step * 1.03);
    }
    return null;
  }
  worldToScreen(x, y, z) {
    _v.set(x, y, z).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: (_v.x * 0.5 + 0.5) * r.width + r.left, y: (-_v.y * 0.5 + 0.5) * r.height + r.top, vis: _v.z > -1 && _v.z < 1 };
  }
  // Returns { kind:'u'|'b', ent } nearest under the pointer (units take priority).
  pick(clientX, clientY, filter = {}) {
    const g = this.g; if (!g) return null;
    const rc = this.canvas.getBoundingClientRect();
    const px = clientX - rc.left, py = clientY - rc.top;
    const proj = rc.height / (2 * Math.tan(this.camera.fov * Math.PI / 360));
    let best = null, bd = 1e9;
    const cam = this.camera.position;
    for (const u of g.units) {
      if (u.dead || u.inside) continue;
      if (filter.team != null && u.team !== filter.team) continue;
      if (filter.notTeam != null && u.team === filter.notTeam) continue;
      const hgt = u.cls === 'siege' ? 3 : u.cls === 'cav' ? 1.6 : 1.0;
      _v.set(u.x, u.y + hgt, u.z);
      const dist = _v.distanceTo(cam);
      _v.project(this.camera);
      if (_v.z < -1 || _v.z > 1) continue;
      const sx = (_v.x * 0.5 + 0.5) * rc.width, sy = (-_v.y * 0.5 + 0.5) * rc.height;
      const rad = Math.max(11, (u.cls === 'siege' ? 3.4 : u.cls === 'cav' ? 1.5 : 0.95) * proj / dist);
      const d = Math.hypot(sx - px, sy - py);
      if (d < rad && d < bd) { bd = d; best = u; }
    }
    if (best && !filter.buildingsOnly) return { kind: 'u', ent: best };
    if (filter.unitsOnly) return null;
    const [nx, ny] = [(px / rc.width) * 2 - 1, -((py / rc.height) * 2 - 1)];
    const ray = this.ray(nx, ny); const box = new THREE.Box3(); let hit = null, ht = 1e9; const out = new THREE.Vector3();
    for (const b of g.buildings) {
      if (b.dead) continue;
      if (filter.team != null && b.team !== filter.team) continue;
      box.min.set(b.tx * TILE, b.y - 0.5, b.tz * TILE); box.max.set((b.tx + b.w) * TILE, b.y + (b.height || 5), (b.tz + b.d) * TILE);
      if (ray.intersectBox(box, out)) { const d = out.distanceTo(ray.origin); if (d < ht) { ht = d; hit = b; } }
    }
    return hit ? { kind: 'b', ent: hit } : null;
  }

  // ---------------------------------------------------------------- UI helpers: ghost, markers, rally, territory
  clearGhost() { if (this.ghost) this.ghost.visible = false; if (this.ghostPlane) this.ghostPlane.visible = false; if (this.ghostTiles) this.ghostTiles.mesh.visible = false; this.terrOn = false; if (this.territory) this.territory.visible = false; }
  setGhost(key, rot, tx, tz, ok) {
    const g = this.g; if (!g) return;
    const def = BUILDINGS[key];
    if (this.ghostTiles) this.ghostTiles.mesh.visible = false;
    if (def.line) { this.setGhostTiles([{ tx, tz, ok }]); return; }
    if (this.ghostKey !== key + (rot & 1)) {
      if (this.ghost) { this.world.remove(this.ghost); }
      const geo = M.buildBuilding(key, def.w, def.d, 1, 5);
      const grp = new THREE.Group();
      const mk = (G, k) => { if (!G[k]) return; const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false }); const m = new THREE.Mesh(G[k], mat); m.renderOrder = 8; grp.add(m); };
      for (const k of ['s', 'w', 'g', 'f']) mk(geo, k);
      for (const pk in geo.parts) { const pg = new THREE.Group(); pg.position.set(...geo.parts[pk].pos); for (const k of ['s', 'w', 'g']) { const G = geo.parts[pk]; if (G[k]) { const m = new THREE.Mesh(G[k], new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false })); pg.add(m); } } grp.add(pg); }
      this.ghost = grp; this.ghostKey = key + (rot & 1); this.world.add(grp);
      if (!this.ghostPlane) { this.ghostPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); this.ghostPlane.renderOrder = 7; this.world.add(this.ghostPlane); }
    }
    const { w, d } = g.footprint(key, rot);
    const y = g._footY(tx, tz, w, d);
    this.ghost.visible = true; this.ghost.position.set((tx + w / 2) * TILE, y, (tz + d / 2) * TILE); this.ghost.rotation.y = rot & 1 ? Math.PI / 2 : 0;
    const col = ok ? 0x70ff90 : 0xff5a5a;
    this.ghost.traverse((o) => { if (o.material && o.material.color) { o.material.color.setHex(ok ? 0xbfffc8 : 0xffa0a0); } });
    this.ghostPlane.visible = true; this.ghostPlane.position.set((tx + w / 2) * TILE, y + 0.15, (tz + d / 2) * TILE); this.ghostPlane.scale.set(w * TILE, 1, d * TILE); this.ghostPlane.material.color.setHex(col);
  }
  setGhostTiles(list) {
    if (this.ghost) this.ghost.visible = false; if (this.ghostPlane) this.ghostPlane.visible = false;
    if (!this.ghostTiles) {
      const geo = new THREE.PlaneGeometry(TILE * 0.96, TILE * 0.96).rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      const mesh = new THREE.InstancedMesh(geo, mat, 600); mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(600 * 3), 3); mesh.frustumCulled = false; mesh.renderOrder = 7;
      this.world.add(mesh); this.ghostTiles = { mesh };
    }
    const T = this.g.T; let n = 0;
    for (const t of list) { if (n >= 600) break; loc(_m, (t.tx + 0.5) * TILE, this.tileTop(t.tx, t.tz) + 0.2, (t.tz + 0.5) * TILE); this.ghostTiles.mesh.setMatrixAt(n, _m); this.ghostTiles.mesh.setColorAt(n, t.ok ? _c.setHex(0x70ff90) : _c.setHex(0xff5a5a)); n++; }
    this.ghostTiles.mesh.count = n; this.ghostTiles.mesh.instanceMatrix.needsUpdate = true; this.ghostTiles.mesh.instanceColor.needsUpdate = true; this.ghostTiles.mesh.visible = n > 0;
  }
  showTerritory(teamId) { this.terrOn = true; this.terrTeam = teamId; }
  updateTerritory() {
    const g = this.g;
    if (!this.territory) { this.territory = new THREE.Group(); this.world.add(this.territory); }
    this.territory.visible = this.terrOn;
    if (!this.terrOn) return;
    const key = this.terrTeam + ':' + g.buildings.length + ':' + g.buildings.filter((b) => b.def.territory).length;
    if (key === this.terrKey) return; this.terrKey = key;
    while (this.territory.children.length) { const c = this.territory.children.pop(); c.geometry.dispose(); c.material.dispose(); }
    for (const b of g.buildings) {
      if (b.team !== this.terrTeam || !b.built || !b.def.territory) continue;
      const R = b.def.territory * TILE, pts = [];
      for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; const x = clamp(b.cx + Math.cos(a) * R, 1, g.T.size - 1), z = clamp(b.cz + Math.sin(a) * R, 1, g.T.size - 1); pts.push(x, Math.max(g.T.heightAt(x, z), g.T.wl) + 0.35, z); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.8, depthTest: false })); line.renderOrder = 9; this.territory.add(line);
    }
  }
  marker(x, z, type = 'move') {
    let m = this.markerPool.pop();
    if (!m) { m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide })); m.renderOrder = 12; this.scene.add(m); }
    m.material.color.setHex(type === 'attack' ? 0xff4040 : type === 'build' ? 0xffe070 : 0x50ff80);
    m.position.set(x, Math.max(this.g.T.heightAt(x, z), this.g.T.wl) + 0.3, z);
    this.markers.push({ m, t: 0 });
  }
  setRally(p) {
    if (!p) { if (this.rally) this.rally.visible = false; return; }
    if (!this.rally) {
      const B = new M.GeoBuilder(3); B.box(0, 1.2, 0, 0.12, 2.4, 0.12, 0x58391f, { set: 'w' }); B.flag(0, 2.2, 0, 1.2, 0.7);
      const G = B.build(); const grp = new THREE.Group(); grp.add(new THREE.Mesh(G.w, this.matW)); grp.add(new THREE.Mesh(G.f, new THREE.MeshStandardMaterial({ color: 0xffd040, side: THREE.DoubleSide }))); this.rally = grp; this.world.add(grp);
    }
    this.rally.visible = true; this.rally.position.set(p.x, this.g.T.heightAt(p.x, p.z), p.z);
  }
  outline(b) {
    let o = this.outlines.get(b.id);
    if (!o) {
      const x0 = b.tx * TILE - 0.3, x1 = (b.tx + b.w) * TILE + 0.3, z0 = b.tz * TILE - 0.3, z1 = (b.tz + b.d) * TILE + 0.3, pts = [];
      const seg = (ax, az, bx, bz) => { const n = 10; for (let i = 0; i < n; i++) { const t = i / n; const x = ax + (bx - ax) * t, z = az + (bz - az) * t; pts.push(x, Math.max(this.g.T.heightAt(x, z), this.g.T.wl) + 0.3, z); } };
      seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0); pts.push(pts[0], pts[1], pts[2]);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      o = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x70ff90, depthTest: false, transparent: true })); o.renderOrder = 11; this.world.add(o); this.outlines.set(b.id, o);
    }
    return o;
  }

  // ---------------------------------------------------------------- environment
  setWeather(kind) { const w = this.weather; w.kind = kind; w.target = kind === 'clear' ? 0 : kind === 'rain' ? 0.65 : 1; w.next = 120 + 80 * Math.random(); }
  updateWeather(dt) {
    const w = this.weather;
    if (!this.q.weather) { w.target = 0; }
    else { w.next -= dt; if (w.next <= 0) { const r = this.rng(); this.setWeather(r < 0.55 ? 'clear' : r < 0.85 ? 'rain' : 'storm'); w.next = 70 + this.rng() * 110; } }
    w.w += (w.target - w.w) * Math.min(1, dt * 0.25);
    if (w.kind === 'storm' && w.w > 0.6 && this.rng() < dt * 0.12) { w.flash = 1; w.thunder = 0.5 + this.rng() * 1.5; }
    if (w.thunder > 0) { w.thunder -= dt; if (w.thunder <= 0 && this.onThunder) this.onThunder(); }
    w.flash = Math.max(0, w.flash - dt * 3.2);
  }
  updateEnv(dt, target) {
    const w = this.weather;
    const tod = this.q.dayNight ? (0.34 + (this.g ? this.g.time : 0) / DAY_LEN + (this.todBias || 0)) % 1 : (this.fixedTod != null ? this.fixedTod : 0.42);
    this.tod = tod;
    const S = dayState(tod, this.theme || M.terrainTheme('green'), w.w);
    this.env = S;
    const sun = this.sun;
    // snap shadow target to a coarse grid to reduce shimmer
    const gx = Math.round(target.x / 4) * 4, gz = Math.round(target.z / 4) * 4;
    sun.target.position.set(gx, target.y, gz);
    sun.position.set(gx + S.lightDir.x * 200, target.y + S.lightDir.y * 200, gz + S.lightDir.z * 200);
    sun.color.copy(S.lightCol); sun.intensity = S.sunI * (1 + w.flash * 0.2);
    this.hemi.color.copy(S.hemiSky); this.hemi.groundColor.copy(S.hemiGround); this.hemi.intensity = S.hemiI * (1 + w.flash * 2.2);
    this.fog.color.copy(S.fog).lerp(_c.setRGB(1, 1, 1), w.flash * 0.5);
    this.fog.near = lerp(this.q.far * 0.22, this.q.far * 0.05, w.w); this.fog.far = lerp(this.q.far, this.q.far * 0.45, w.w);
    const u = this.sky.mat.uniforms;
    u.uTop.value.copy(S.top).lerp(_c.setRGB(1, 1, 1), w.flash * 0.6); u.uHor.value.copy(S.hor).lerp(_c.setRGB(1, 1, 1), w.flash * 0.6); u.uSunDir.value.copy(S.sunDir); u.uSunCol.value.copy(S.sunCol).multiplyScalar(S.day * (1 - w.w));
    u.uNight.value = S.night * (1 - w.w); u.uTime.value = this.t; u.uCloud.value = 0.25 + w.w * 0.75;
    u.uCloudCol.value.setRGB(1, 1, 1).lerp(_c.setRGB(0.45, 0.48, 0.52), w.w).multiplyScalar(0.35 + 0.65 * S.day);
    this.matG.color.setScalar(0.45 + S.night * 1.0);
    this.gl.toneMappingExposure = 1.0 + S.night * 0.18;
  }

  // ---------------------------------------------------------------- per-frame
  frame(dt, cam) {
    dt = Math.min(dt, 0.1);
    const g = this.g; if (!g) { this.gl.render(this.scene, this.camera); return; }
    this.t += dt; M.windUniform.value = this.t;
    const camera = this.camera;
    if (cam) {
      camera.position.copy(cam.position);
      if (this.shake > 0.001) { const s = this.shake; camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s; camera.position.z += (Math.random() - 0.5) * s; this.shake *= Math.pow(0.02, dt); }
      camera.lookAt(cam.target);
      this.camFocus.copy(cam.target);
    }
    camera.updateMatrixWorld();
    this.pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.pv);
    this.updateWeather(dt);
    this.updateEnv(dt, this.camFocus);
    this.sky.follow(camera);
    if (this.waterMesh) { const n = this.waterMat.normalMap; n.offset.x = (this.t * 0.012) % 1; n.offset.y = (this.t * 0.009) % 1; }
    if (this.L && this.L.moat.mesh.material.normalMap) { this.L.moat.mesh.material.normalMap.offset.x = (this.t * 0.012) % 1; }
    if (this.wallsDirty) this.rebuildLines();
    this.tickT = (this.tickT || 0) + dt; if (this.tickT > 1) { this.tickT = 0; this.tickProps(); }
    this.updateViews(dt);
    this.updateDying(dt);
    const extra = (bars) => this.buildingBars(bars);
    this.units.update(dt, this.t, camera, this.frustum, this.sel, extra);
    // stone trails
    for (const p of g.projs) if (p.type === 'stone' && this.rng() < 0.6) this.fx.spawn('smokeW', p.x, p.y, p.z, 1, 0.4);
    this.updateOutlines();
    this.updateTerritory();
    for (let i = this.markers.length - 1; i >= 0; i--) { const k = this.markers[i]; k.t += dt; const s = 0.6 + k.t * 2.6; k.m.scale.set(s, 1, s); k.m.material.opacity = Math.max(0, 1 - k.t / 0.8); if (k.t > 0.8) { this.scene.remove(k.m); this.markerPool.push(k.m); this.markers.splice(i, 1); } else if (!k.m.parent) this.scene.add(k.m); }
    for (const k of this.markers) if (!k.m.parent) this.scene.add(k.m);
    this.fx.update(dt);
    this.rain.update(dt, camera.position, this.q.weather ? this.weather.w * this.q.rain : 0, 0.8 + this.weather.w);
    this.gl.render(this.scene, camera);
    this.stats.draw = this.gl.info.render.calls; this.stats.tri = this.gl.info.render.triangles;
  }

  updateViews(dt) {
    const g = this.g, cam = this.camera.position, fx = this.fx;
    const night = this.env ? this.env.night : 0;
    for (const v of this.views.values()) {
      const b = v.b;
      if (b.team !== v.team) { v.team = b.team; }
      const near = Math.hypot(b.cx - cam.x, b.cz - cam.z) < 150;
      // construction progress (clip plane) – building rises from the ground
      if (!b.built && v.plane) { const h = v.geo.top * 1.02; v.plane.constant = b.y + 0.2 + h * clamp(b.progress, 0, 1); }
      if (!b.built && near && b.builders > 0) { v.workT -= dt; if (v.workT <= 0) { v.workT = 0.22; const x = b.cx + (Math.random() - 0.5) * b.w * TILE * 0.8, z = b.cz + (Math.random() - 0.5) * b.d * TILE * 0.8; fx.spawn('dust', x, b.y + 0.4, z, 1, 0.8); if (Math.random() < 0.5) fx.spawn('chip', x, b.y + 1.5, z, 1, 0.6); } }
      if (b.built && v.scaf && !b.upg) { v.group.remove(v.scaf); v.scaf = null; }
      if (b.built && b.upg && !v.scaf) this.addScaffold(v);
      if (!b.built) continue;
      // gates
      if (b.gate) {
        const o = clamp(b.gateOpen, 0, 1), L = v.parts.doorL, R = v.parts.doorR;
        if (L) L.g.rotation.y = o * 1.45; if (R) R.g.rotation.y = -o * 1.45;
      }
      if (v.parts.rotor) v.parts.rotor.g.rotation.z = this.t * (0.5 + 0.8 * this.weather.w);
      if (!near) continue;
      // chimney smoke
      if (v.chimneys.length && (b.key === 'house' ? b.id % 2 === 0 : b.workers.length > 0 || b.key === 'bakery')) {
        v.smokeT -= dt;
        if (v.smokeT <= 0) { v.smokeT = 0.55 + Math.random() * 0.5; const c = v.chimneys[0]; const ca = Math.cos(v.group.rotation.y), sa = Math.sin(v.group.rotation.y); fx.spawn('smokeW', b.cx + c[0] * ca + c[2] * sa, b.y + c[1], b.cz - c[0] * sa + c[2] * ca, 1, 0.8); }
      }
      // damage smoke & fire
      const f = b.hp / b.maxHp;
      if (f < 0.62 && !b.def.moat) {
        v.fireT -= dt;
        if (v.fireT <= 0) {
          v.fireT = f < 0.3 ? 0.07 : 0.22;
          const x = b.cx + (Math.random() - 0.5) * b.w * TILE * 0.7, z = b.cz + (Math.random() - 0.5) * b.d * TILE * 0.7, y = b.y + (b.height || 5) * (0.5 + Math.random() * 0.5);
          if (f < 0.3) fx.spawn('fire', x, y * 0.9, z, 1, 1.1);
          fx.spawn('smoke', x, y, z, 1, 1.0);
        }
      }
    }
  }
  updateDying(dt) {
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i]; d.t += dt; const v = d.v, b = v.b;
      const k = Math.min(1, d.t / 0.9);
      v.group.scale.y = Math.max(0.1, 1 - k * 0.9); v.group.rotation.z = Math.sin(d.t * 30) * 0.015 * (1 - k);
      if (Math.random() < dt * 14) this.fx.spawn('dust', b.cx + (Math.random() - 0.5) * b.w * TILE, b.y + 1, b.cz + (Math.random() - 0.5) * b.d * TILE, 2, 1.4);
      if (d.t > 0.9) {
        this.disposeView(v); this.dying.splice(i, 1);
        if (b.def.w * b.def.d >= 4 || b.def.tower) this.addRubble(b);
      }
    }
    for (let i = this.rubbles.length - 1; i >= 0; i--) {
      const r = this.rubbles[i]; r.t += dt;
      if (r.t > 30) r.group.position.y -= dt * 0.12;
      if (r.t > 50) { this.world.remove(r.group); this.rubbles.splice(i, 1); }
    }
  }
  addRubble(b) {
    const G = M.buildRubble(b.def.w, b.def.d, b.id);
    const grp = new THREE.Group();
    if (G.s) { const m = new THREE.Mesh(G.s, this.matS); m.castShadow = m.receiveShadow = true; grp.add(m); }
    if (G.w) { const m = new THREE.Mesh(G.w, this.matW); m.castShadow = m.receiveShadow = true; grp.add(m); }
    grp.position.set(b.cx, b.y, b.cz); grp.rotation.y = b.rot ? Math.PI / 2 : 0; this.world.add(grp); this.rubbles.push({ group: grp, t: 0 });
  }
  buildingBars(bars) {
    const g = this.g, cam = this.camera.position;
    for (const v of this.views.values()) {
      const b = v.b, sel = this.sel.buildings.has(b.id) || (this.sel.hover && this.sel.hover.id === b.id);
      const dx = b.cx - cam.x, dz = b.cz - cam.z; if (dx * dx + dz * dz > 140 * 140) continue;
      const w = Math.max(2.6, Math.max(b.w, b.d) * TILE * 0.7), y = b.y + (b.height || 5) + 1.2;
      if (!b.built) { if (!this.frustum.containsPoint(_v.set(b.cx, b.y + 3, b.cz))) continue; bars.add(b.cx, y, b.cz, w, b.progress, 1, 0.75, 0.15); }
      else if (b.upg) bars.add(b.cx, y, b.cz, w, b.upg.t / b.upg.total, 0.35, 0.7, 1);
      else if (sel || (b.hp < b.maxHp * 0.999 && g.time - b.lastHit < 8)) { const f = b.hp / b.maxHp; bars.add(b.cx, y, b.cz, w, f, f < 0.35 ? 0.9 : 0.3 + (1 - f), f < 0.35 ? 0.2 : 0.85, 0.2); }
      else if (b.queue.length && sel) bars.add(b.cx, y + 0.5, b.cz, w, 1 - b.queue[0].left / b.queue[0].total, 0.9, 0.9, 0.4, 0.2);
    }
    for (const b of g.buildings) {
      if (!LINE_KEYS.has(b.key) || b.dead) continue;
      if (!(b.hp < b.maxHp * 0.999 && g.time - b.lastHit < 8) && !b.built) continue;
      if (b.hp < b.maxHp * 0.999 && g.time - b.lastHit < 8) bars.add(b.cx, b.y + 3.6, b.cz, 2.2, b.hp / b.maxHp, 0.85, 0.5, 0.2);
    }
  }
  updateOutlines() {
    const g = this.g;
    for (const [id, o] of this.outlines) if (!this.sel.buildings.has(id)) o.visible = false;
    for (const id of this.sel.buildings) { const b = g.byId.get(id); if (b && !b.dead && b.kind === 'b') this.outline(b).visible = true; }
  }

  dispose() {
    this.clearGame();
    this.fx.dispose(); this.rain.dispose(); this.sky.dispose(); this.gl.dispose();
  }
}
const _e3 = new THREE.Euler();
