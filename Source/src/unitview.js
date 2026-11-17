// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Instanced rendering and procedural animation of units, siege machines, deer, projectiles, rings and health bars.
import * as THREE from 'three';
import * as M from './models.js';
import { TEAM_COLORS, UNITS } from './data.js';
import { clamp, lerp } from './util.js';

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _s = new THREE.Vector3();
export function loc(out, px, py, pz, rx = 0, ry = 0, rz = 0, s = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  return out.compose(_p.set(px, py, pz), _q, s === 1 ? _one : _s.setScalar(s));
}
const ease = (k) => k * k * (3 - 2 * k);
const lerpA = (a, b, k) => a + (b - a) * k;

export class Inst {
  constructor(parent, geo, mat, cap = 64, shadow = true, colored = true) {
    this.parent = parent; this.geo = geo; this.mat = mat; this.cap = cap; this.shadow = shadow; this.colored = colored;
    this.n = 0; this._make();
  }
  _make(old) {
    const m = new THREE.InstancedMesh(this.geo, this.mat, this.cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.colored) { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 3), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); }
    m.castShadow = this.shadow; m.receiveShadow = false; m.frustumCulled = false; m.count = 0;
    if (old) {
      m.renderOrder = old.renderOrder; m.castShadow = old.castShadow; m.material = old.material;
      m.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, this.n * 16));
      if (this.colored) m.instanceColor.array.set(old.instanceColor.array.subarray(0, this.n * 3));
      this.parent.remove(old); old.dispose();
    }
    this.mesh = m; this.parent.add(m);
  }
  begin() { this.n = 0; }
  add(mat, r = 1, g = 1, b = 1) {
    if (this.n >= this.cap) { this.cap *= 2; this._make(this.mesh); }
    mat.toArray(this.mesh.instanceMatrix.array, this.n * 16);
    if (this.colored) { const a = this.mesh.instanceColor.array, i = this.n * 3; a[i] = r; a[i + 1] = g; a[i + 2] = b; }
    this.n++;
  }
  end() {
    const m = this.mesh; m.count = this.n; m.visible = this.n > 0;
    m.instanceMatrix.needsUpdate = true; if (this.colored) m.instanceColor.needsUpdate = true;
  }
  dispose() { this.parent.remove(this.mesh); this.mesh.dispose(); }
}

// ------------------------------------------------------------------ health / progress bars (billboards)
export class Bars {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mk = (order) => { const mat = new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, fog: false }); const I = new Inst(scene, geo, mat, 64, false, true); I.mesh.renderOrder = order; return I; };
    this.bg = mk(20); this.fg = mk(21);
    this.m = new THREE.Matrix4(); this.right = new THREE.Vector3();
    this.cq = new THREE.Quaternion();
  }
  begin(cam) { this.bg.begin(); this.fg.begin(); this.cq.copy(cam.quaternion); this.right.set(1, 0, 0).applyQuaternion(this.cq); }
  add(x, y, z, w, frac, r, g, b, h = 0.17) {
    frac = clamp(frac, 0, 1);
    this.m.compose(_p.set(x, y, z), this.cq, _s.set(w + 0.1, h + 0.07, 1)); this.bg.add(this.m, 0.01, 0.01, 0.012);
    const fw = Math.max(0.001, w * frac), off = -w / 2 + fw / 2;
    // instance colours are linear: convert the sRGB-style values the callers use so the bars keep their saturation
    this.m.compose(_p.set(x + this.right.x * off, y + this.right.y * off, z + this.right.z * off), this.cq, _s.set(fw, h, 1)); this.fg.add(this.m, r * r * r, g * g * g, b * b * b);
  }
  end() { this.bg.end(); this.fg.end(); }
}

const SCALE = { villager: 0.92, sword: 1, heavy: 1.07, shield: 1.03, spear: 1, guard: 1.1, archer: 0.97, crossbow: 1, lightcav: 1, heavycav: 1.04 };
const STYLE = { villager: 'slash', sword: 'slash', heavy: 'slash', shield: 'slash', guard: 'slash', spear: 'thrust', lightcav: 'lance', heavycav: 'lance', archer: 'bow', crossbow: 'xbow' };
const REST = { slash: [-0.55, -0.22], thrust: [-0.55, -0.2], lance: [-0.9, -0.3], bow: [-0.4, -0.3], xbow: [-0.7, -0.8] };
const WORK = { wood: { tool: 'tool_axe', per: 1.05, lean: 0.25 }, mine: { tool: 'tool_pick', per: 1.3, lean: 0.3 }, build: { tool: 'tool_hammer', per: 0.7, lean: 0.2 }, farm: { tool: 'tool_hoe', per: 1.6, lean: 0.5 }, craft: { tool: 'tool_hammer', per: 1.0, lean: 0.15 }, hunt: { tool: null, per: 1.4, lean: 0.1 } };
const PANTS = [0x6b5a44, 0x4a4a52, 0x5c4630, 0x3f4a3a, 0x55483a, 0x6a5e50];
const HORSES = [0x8a5a35, 0x3a2a20, 0xd9d2c4, 0x5a4030, 0x9a7a52, 0x2a2a2e];
const CARRY = { wood: 0x8a5a33, stone: 0x9b978c, iron: 0x6a7280, gold: 0xe2b232, food: 0xc9b04a };
const MAIL = new Set(['heavy', 'guard', 'shield']);

const col = (hex) => new THREE.Color(hex);

export class UnitView {
  constructor(scene, ctx) {
    this.scene = scene; this.ctx = ctx; // ctx: { matS, matW } optional siege materials; flagMat(team)
    this.root = new THREE.Group(); scene.add(this.root);
    this.parts = M.buildUnitParts();
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.06 });
    this.insts = {};
    this.st = new Map();
    this.siege = new Map();
    this.siegeGeo = {};
    this.teamCol = TEAM_COLORS.map(col);
    this.tabCol = [];
    this.pantsC = PANTS.map(col); this.horseC = HORSES.map(col); this.carryC = {}; for (const k in CARRY) this.carryC[k] = col(CARRY[k]);
    const flat = (g) => g.rotateX(-Math.PI / 2);
    this.discs = new Inst(this.root, flat(new THREE.CircleGeometry(1, 20)), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 128, false, true);
    this.rings = new Inst(this.root, flat(new THREE.RingGeometry(0.82, 1, 28)), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }), 64, false, true);
    this.discs.mesh.renderOrder = 1; this.rings.mesh.renderOrder = 2;
    // projectiles
    const ab = new M.GeoBuilder(1);
    ab.box(0, 0, 0, 0.05, 0.05, 1.1, 0x9a7a4a, { set: 'w', jit: 0 }); ab.box(0, 0, 0.6, 0.06, 0.06, 0.22, 0xd8d8d8, { set: 'w', jit: 0 }); ab.box(0, 0, -0.52, 0.09, 0.09, 0.14, 0xf0ead8, { set: 'w', jit: 0 });
    this.arrow = new Inst(this.root, ab.build().w, this.mat, 64, true, false);
    const bb = new M.GeoBuilder(2); bb.box(0, 0, 0, 0.09, 0.09, 1.2, 0x5a4028, { set: 'w', jit: 0 }); bb.box(0, 0, 0.65, 0.12, 0.12, 0.3, 0xc0c4cc, { set: 'w', jit: 0 });
    this.bolt = new Inst(this.root, bb.build().w, this.mat, 16, true, false);
    const sb = new M.GeoBuilder(3); sb.sphere(0, 0, 0, 0.5, 0x6e6a64, { set: 's', jit: 0.12 });
    this.stone = new Inst(this.root, sb.build().s, this.mat, 16, true, false);
    // deer
    this.deer = new Inst(this.root, M.deerGeo(), this.mat, 32, true, false);
    this.deerSt = new Map();
    this.bars = new Bars(this.root);
    this.m1 = new THREE.Matrix4(); this.m2 = new THREE.Matrix4(); this.m3 = new THREE.Matrix4(); this.m4 = new THREE.Matrix4(); this.tm = new THREE.Matrix4().makeTranslation(0, -0.8, 0);
    this.sph = new THREE.Sphere(); this.c = new THREE.Color();
    this.P = {};
  }
  inst(name, shadow = true) {
    return this.insts[name] || (this.insts[name] = new Inst(this.root, this.parts[name], this.mat, 64, shadow, true));
  }
  setGame(g) { this.g = g; this.st.clear(); for (const [, v] of this.siege) this.root.remove(v.group); this.siege.clear(); this.deerSt.clear(); }
  teamTab(team, key) {
    const id = team + key;
    if (!this.tabCol[id]) { const c = this.teamCol[team % this.teamCol.length].clone(); if (key === 'villager') c.lerp(col(0xcdb894), 0.62); this.tabCol[id] = c; }
    return this.tabCol[id];
  }
  state(u) { let s = this.st.get(u.id); if (!s) { s = { ph: u.seed * 6, side: u.seed < 0.5 ? -1 : 1, gal: 0 }; this.st.set(u.id, s); } return s; }
  forget(u) { this.st.delete(u.id); const sv = this.siege.get(u.id); if (sv) { this.root.remove(sv.group); this.siege.delete(u.id); } }

  // ---------------------------------------------------------------- siege machine views
  siegeView(u) {
    let v = this.siege.get(u.id); if (v) return v;
    const key = u.key;
    let geo = this.siegeGeo[key]; if (!geo) geo = this.siegeGeo[key] = M.buildSiege(key);
    const group = new THREE.Group();
    const mk = (G, parent) => { for (const k of ['s', 'w']) if (G[k]) { const m = new THREE.Mesh(G[k], k === 's' ? this.ctx.matS : this.ctx.matW); m.castShadow = true; m.receiveShadow = true; parent.add(m); } if (G.f) { const m = new THREE.Mesh(G.f, this.ctx.flagMat(u.team)); m.castShadow = false; parent.add(m); } };
    mk(geo, group);
    const parts = {};
    for (const k in geo.parts) { const pg = new THREE.Group(); pg.position.set(...geo.parts[k].pos); mk(geo.parts[k], pg); group.add(pg); parts[k] = pg; }
    this.root.add(group);
    v = { group, parts, team: u.team }; this.siege.set(u.id, v);
    return v;
  }
  updateSiege(u, vis) {
    const v = this.siegeView(u);
    v.group.visible = vis;
    if (!vis) return;
    const g = v.group;
    if (v.team !== u.team) { v.team = u.team; this.root.remove(g); this.siege.delete(u.id); return this.updateSiege(u, vis); }
    const p = u.atkPhase || 0;
    g.position.set(u.x, u.y + (u.dead ? -Math.max(0, u.deadT - 4) * 0.25 : 0), u.z);
    g.rotation.set(0, u.ry, 0);
    if (u.dead) { const k = ease(clamp(u.deadT / 1.2, 0, 1)); g.rotation.z = k * 0.35; g.rotation.x = k * 0.12; g.position.y -= k * 0.3; }
    if (v.parts.arm) {
      let a = -0.3;
      if (p > 0 && p < 0.38) a = lerpA(-0.3, 0.95, ease(p / 0.38));
      else if (p >= 0.38 && p < 0.5) a = lerpA(0.95, -1.15, ease((p - 0.38) / 0.12));
      else if (p >= 0.5) a = lerpA(-1.15, -0.3, ease((p - 0.5) / 0.5));
      v.parts.arm.rotation.x = a;
    }
    if (v.parts.log) {
      let z = 0;
      if (p > 0 && p < 0.35) z = lerpA(0, -1.0, ease(p / 0.35));
      else if (p >= 0.35 && p < 0.5) z = lerpA(-1.0, 0.8, ease((p - 0.35) / 0.15));
      else if (p >= 0.5) z = lerpA(0.8, 0, ease((p - 0.5) / 0.5));
      v.parts.log.position.z = z;
    }
  }

  // ---------------------------------------------------------------- per-frame
  update(dt, time, cam, frustum, sel, extra) {
    const g = this.g; if (!g) return;
    for (const k in this.insts) this.insts[k].begin();
    this.discs.begin(); this.rings.begin(); this.arrow.begin(); this.bolt.begin(); this.stone.begin(); this.deer.begin();
    this.bars.begin(cam);
    const camp = cam.position;
    const selU = sel && sel.units, hoverId = sel && sel.hover ? sel.hover.id : 0;
    const m1 = this.m1, m2 = this.m2, m3 = this.m3, m4 = this.m4;
    const c = this.c;
    const barMax2 = 130 * 130;
    for (const u of g.units) {
      if (u.inside) continue;
      const vis = frustum.intersectsSphere(this.sph.set(_p.set(u.x, u.y + 1.2, u.z), u.cls === 'siege' ? 6 : u.cls === 'cav' ? 3.2 : 2.4));
      if (u.cls === 'siege') this.updateSiege(u, vis);
      if (!vis) continue;
      const selected = selU && selU.has(u.id);
      const tc = this.teamCol[u.team % this.teamCol.length];
      if (!u.dead) {
        m1.compose(_p.set(u.x, u.y + 0.07, u.z), _q.identity(), _s.setScalar(u.cls === 'siege' ? u.rad * 1.05 : u.cls === 'cav' ? 1.1 : 0.62));
        this.discs.add(m1, tc.r, tc.g, tc.b);
        if (selected || u.id === hoverId) {
          const own = selected;
          m1.compose(_p.set(u.x, u.y + 0.1, u.z), _q.identity(), _s.setScalar(u.cls === 'siege' ? u.rad * 1.25 : u.cls === 'cav' ? 1.35 : 0.9));
          this.rings.add(m1, own ? 0.35 : 1, own ? 1 : 0.3, own ? 0.45 : 0.3);
        }
        const dx = u.x - camp.x, dz = u.z - camp.z;
        if (((selected || (u.hp < u.maxHp && g.time - (u.lastHurt || -99) < 5)) && dx * dx + dz * dz < barMax2) || u.id === hoverId) {
          const f = u.hp / u.maxHp;
          this.bars.add(u.x, u.y + (u.cls === 'siege' ? 5.5 : u.cls === 'cav' ? 3.4 : 2.45), u.z, u.cls === 'siege' ? 2.6 : 1.3, f, f < 0.35 ? 0.9 : 0.3 + (1 - f) * 1.0, f < 0.35 ? 0.2 : 0.85, 0.2);
        }
      }
      if (u.cls === 'siege') continue;
      this.drawUnit(u, dt, time, tc);
    }
    // deer
    for (const n of g.nodes) {
      if (n.type !== 'deer' || n.dead) continue;
      if (!frustum.intersectsSphere(this.sph.set(_p.set(n.x, 1, n.z), 2.5))) continue;
      let s = this.deerSt.get(n.id); if (!s) { s = { x: n.x, z: n.z, ry: n.rot || 0, ph: 0 }; this.deerSt.set(n.id, s); }
      const dx = n.x - s.x, dz = n.z - s.z; const sp = Math.hypot(dx, dz) / Math.max(dt, 1e-3);
      if (sp > 0.2 && dt > 0) { const a = Math.atan2(dx, dz); let d = a - s.ry; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; s.ry += d * Math.min(1, dt * 8); s.ph += sp * dt * 3; }
      s.x = n.x; s.z = n.z;
      loc(m1, n.x, g.T.heightAt(n.x, n.z) + Math.abs(Math.sin(s.ph)) * 0.06 * Math.min(1, sp), n.z, 0, s.ry, 0, 1.15);
      this.deer.add(m1);
    }
    // projectiles
    for (const p of g.projs) {
      const I = p.type === 'stone' ? this.stone : p.type === 'bolt' ? this.bolt : this.arrow;
      if (p.type === 'stone') { loc(m1, p.x, p.y, p.z, 0, 0, 0, 1); I.add(m1); continue; }
      _p.set(p.vx, p.vy, p.vz).normalize();
      _q.setFromUnitVectors(_s.set(0, 0, 1), _p);
      m1.compose(_e2.set(p.x, p.y, p.z), _q, _one); I.add(m1);
    }
    for (const k in this.insts) this.insts[k].end();
    this.discs.end(); this.rings.end(); this.arrow.end(); this.bolt.end(); this.stone.end(); this.deer.end();
    if (extra) extra(this.bars);
    this.bars.end();
    // prune per-unit state occasionally
    if (this.st.size > g.units.length * 2 + 50) for (const id of this.st.keys()) if (!g.byId.has(id)) this.st.delete(id);
  }

  // Compose and submit all parts of one soldier / villager (with horse for cavalry).
  drawUnit(u, dt, time, tc) {
    const key = u.key, S = this.state(u), P = this.P;
    const style = STYLE[key] || 'slash';
    const cav = u.cls === 'cav', work = u.cls === 'work';
    const sc = (SCALE[key] || 1) * (0.97 + u.seed * 0.06);
    const speed = u.speedNow || 0;
    S.ph += speed * dt * 3.3;
    const ph = S.ph;
    const amp = clamp(speed / 2.4, 0, 1.2);
    const r0 = REST[style] || REST.slash;
    let legA = Math.sin(ph) * 0.8 * Math.min(1, amp);
    let aR = r0[0], aL = r0[1], lean = 0, twist = 0, bob = speed > 0.3 ? Math.abs(Math.sin(ph)) * 0.06 * Math.min(1, amp) : Math.sin(time * 1.6 + u.seed * 9) * 0.012;
    let lat = 0, roll = 0, fwd = 0, fall = 0, lift = 0, flash = 0, spreadR = 0.05, spreadL = -0.05;
    let showTool = null, pitch = 0, gait = 0;
    if (speed > 0.3 && !cav) { aR += Math.sin(ph + Math.PI) * 0.45 * Math.min(1, amp) * (style === 'bow' || style === 'xbow' ? 0.3 : 1); aL += Math.sin(ph) * 0.45 * Math.min(1, amp) * 0.8; }
    if (cav) { legA = 0; const gs = clamp(speed / 6, 0, 1.2); gait = gs; bob = Math.abs(Math.sin(ph * 0.7)) * 0.09 * gs; }
    const p = u.atkPhase || 0;
    const dead = u.dead;
    if (dead) {
      const t = u.deadT || 0, k = ease(clamp(t / 0.55, 0, 1));
      fall = k * (S.side * 1.45); lift = 0.18 * k; aR = lerpA(aR, -2.2 + S.side * 0.4, k); aL = lerpA(aL, -1.6, k); legA = k * 0.3; bob = 0; spreadR = 0.5 * k; spreadL = -0.5 * k;
      if (t > 9) lift -= (t - 9) * 0.28;
      flash = -0.35;
    } else if (u.cheer || u.state === 'cheer') {
      const w = Math.sin(time * 7 + u.seed * 10);
      aR = -2.7 + w * 0.35; aL = -2.7 - w * 0.35; spreadR = 0.35; spreadL = -0.35; bob = Math.abs(w) * 0.22; lean = -0.1;
    } else if (u.state === 'work' && work) {
      const w = WORK[u.workKind] || WORK.craft; showTool = w.tool;
      const k = 0.5 + 0.5 * Math.cos(u.workPhase * (6.283 / w.per));
      if (u.workKind === 'farm') { aR = lerpA(-0.35, -1.0, k); aL = aR + 0.15; lean = w.lean + 0.1 * k; }
      else if (u.workKind === 'hunt') { aR = lerpA(-0.5, -1.5, k); lean = 0.1; }
      else { aR = lerpA(-2.3, -0.3, 1 - k * k); aL = -0.5; lean = lerpA(-0.05, w.lean, 1 - k); fwd = 0.08 * (1 - k); }
      twist = (1 - k) * 0.2;
    } else if (p > 0) {
      if (style === 'slash' || (work && style === 'slash')) {
        if (p < 0.4) { const k = ease(p / 0.4); aR = lerpA(r0[0], -2.75, k); twist = -0.5 * k; lean = -0.1 * k; fwd = -0.08 * k; }
        else if (p < 0.55) { const k = (p - 0.4) / 0.15; aR = lerpA(-2.75, -0.25, k * k * (3 - 2 * k)); twist = lerpA(-0.5, 0.55, k); lean = lerpA(-0.1, 0.32, k); fwd = lerpA(-0.08, 0.42, k); }
        else { const k = ease((p - 0.55) / 0.45); aR = lerpA(-0.25, r0[0], k); twist = lerpA(0.55, 0, k); lean = lerpA(0.32, 0, k); fwd = lerpA(0.42, 0, k); }
        aL = -0.5 + (p < 0.5 ? -0.3 : 0);
      } else if (style === 'thrust' || style === 'lance') {
        const rest = r0[0], ext = style === 'lance' ? -0.04 : -0.1;
        if (p < 0.4) { const k = ease(p / 0.4); aR = lerpA(rest, rest - 0.3, k); fwd = -0.2 * k; lean = -0.1 * k; twist = -0.2 * k; }
        else if (p < 0.55) { const k = (p - 0.4) / 0.15; aR = lerpA(rest - 0.3, ext, k); fwd = lerpA(-0.2, 0.62, k); lean = lerpA(-0.1, 0.3, k); twist = lerpA(-0.2, 0.2, k); }
        else { const k = ease((p - 0.55) / 0.45); aR = lerpA(ext, rest, k); fwd = lerpA(0.62, 0, k); lean = lerpA(0.3, 0, k); twist = lerpA(0.2, 0, k); }
      } else if (style === 'bow') {
        aL = -1.45; spreadL = 0;
        if (p < 0.45) { const k = ease(p / 0.45); aR = lerpA(-0.95, -1.05, k); twist = -0.4 * k; spreadR = lerpA(0.2, 0.9, k); lean = 0.04; }
        else { const k = clamp((p - 0.45) / 0.35, 0, 1); aR = lerpA(-1.05, -1.4, ease(k)); spreadR = lerpA(0.9, 0.2, k); twist = lerpA(-0.4, -0.15, k); if (p > 0.75) { const e2 = ease((p - 0.75) / 0.25); aL = lerpA(-1.45, r0[1], e2); aR = lerpA(aR, r0[0], e2); twist *= 1 - e2; } }
      } else if (style === 'xbow') {
        aR = -0.55; aL = -0.75; lean = 0.03; if (p > 0.45 && p < 0.6) { lean = -0.08; fwd = -0.1; }
      }
    }
    if (!dead && !(p > 0)) {
      if (u.blockT > 0) { aL = -1.3; aR = -0.95; spreadL = 0.05; lean = -0.08; twist = 0.15; }
      if (u.dodgeT > 0) { const k = clamp(u.dodgeT / 0.35, 0, 1); const w = Math.sin(k * Math.PI); lat = w * 0.55 * S.side; roll = w * 0.35 * S.side; lean = 0.15 * w; }
    }
    if (!dead && u.hurtT > 0) { const k = u.hurtT / 0.25; lean -= 0.22 * k; flash = k * 0.9; }
    // carry
    const carrying = !dead && u.carry && u.carry.n > 0;
    if (carrying) { lean += 0.14; if (!showTool) { aR = Math.max(aR, -0.35); aL = Math.max(aL, -0.35); } }

    // roots
    const m1 = this.m1, m2 = this.m2, m3 = this.m3, m4 = this.m4;
    const sx = Math.sin(u.ry), sz = Math.cos(u.ry);
    const px = u.x + sx * fwd * 0.5 + sz * lat, pz = u.z + sz * fwd * 0.5 - sx * lat;
    const R = this.R || (this.R = new THREE.Matrix4());
    if (dead) loc(R, px, u.y + lift, pz, 0, u.ry, 0, sc), R.multiply(loc(m1, 0, 0, 0, fall * 0.0 + (S.side < 0 ? -1.5 : 1.5) * clamp((u.deadT || 0) / 0.55, 0, 1) * 1.0, 0, 0));
    else loc(R, px, u.y + bob + lift, pz, 0, u.ry, roll, sc);
    const fl = 1 + flash;
    const tab = this.teamTab(u.team, key);
    // mount
    let riderR = R;
    if (cav) {
      const H = this.H || (this.H = new THREE.Matrix4());
      const gal = Math.sin(ph * 0.7 * 1.0);
      let hp = -0.04 * gait * gal; if (!dead && p > 0) hp = -0.35 * Math.sin(clamp(p / 0.55, 0, 1) * Math.PI);
      H.copy(R); H.multiply(loc(m1, 0, 0, 0, hp, 0, 0, key === 'heavycav' ? 1.07 : 1));
      const hc = this.horseC[Math.floor(u.seed * 997) % this.horseC.length];
      this.inst('horse').add(H, hc.r * fl, hc.g * fl, hc.b * fl);
      this.inst('saddle', false).add(H, tab.r * fl, tab.g * fl, tab.b * fl);
      const amp2 = gait > 0.05 ? 0.35 + gait * 0.55 : 0, sw = amp2 * (dead ? 0 : 1);
      const legs = [[0.2, 0.55, 0], [-0.2, 0.55, 0.9], [0.2, -0.6, Math.PI], [-0.2, -0.6, Math.PI + 0.9]];
      for (const [lx, lz, off] of legs) {
        const rear = !dead && p > 0 && lz > 0 ? -0.9 * Math.sin(clamp(p / 0.55, 0, 1) * Math.PI) : 0;
        H.copy(R); H.multiply(loc(m2, lx, 0.95 + bob * 0, lz, Math.sin(ph * 0.7 * 1.0 * 1.6 + off) * sw + rear, 0, 0, key === 'heavycav' ? 1.07 : 1));
        this.inst('horseLeg', false).add(H, hc.r * fl, hc.g * fl, hc.b * fl);
      }
      riderR = m3.copy(R).multiply(loc(m4, 0, 0.72 * (key === 'heavycav' ? 1.05 : 1), -0.05, hp * 0.6, 0, 0));
      if (dead) riderR = m3.copy(R).multiply(loc(m4, 0, 0.72, -0.05, 0, 0, 0));
      if (gait > 0.7 && !dead && !(p > 0)) { aR = -0.12; lean += 0.15; }
    }
    // upper body
    const U = this.U || (this.U = new THREE.Matrix4());
    const base = riderR === R ? R : riderR;
    U.copy(base).multiply(loc(m1, 0, 0.8, 0, lean + (cav ? 0 : 0), twist, 0)).multiply(this.tm);
    const A = this.A || (this.A = new THREE.Matrix4());
    this.inst('body_' + key).add(U, fl, fl, fl);
    this.inst('tab_' + key, false).add(U, tab.r * fl, tab.g * fl, tab.b * fl);
    if (key === 'villager') {
      // shared arm geometry, sleeves tinted like the tunic
      A.copy(U).multiply(loc(m2, -0.34, 1.38, 0, aR, 0, spreadR)); this.inst('armR_villager', false).add(A, tab.r * fl, tab.g * fl, tab.b * fl);
      if (showTool) this.inst(showTool, false).add(A, 1, 1, 1);
      A.copy(U).multiply(loc(m2, 0.34, 1.38, 0, aL, 0, spreadL)); this.inst('armL_villager', false).add(A, tab.r * fl, tab.g * fl, tab.b * fl);
    } else {
      A.copy(U).multiply(loc(m2, -0.34, 1.38, 0, aR, 0, spreadR)); this.inst('armR_' + key, false).add(A, fl, fl, fl);
      A.copy(U).multiply(loc(m2, 0.34, 1.38, 0, aL, 0, spreadL)); this.inst('armL_' + key, false).add(A, fl, fl, fl);
    }
    if (carrying) {
      const cc = this.carryC[u.carry.res] || this.carryC.wood;
      A.copy(U); this.inst('carry', false).add(A, cc.r, cc.g, cc.b);
    }
    // legs
    const pc = MAIL.has(key) ? this.pantsC[5] : this.pantsC[Math.floor(u.seed * 31) % 5];
    if (cav) {
      for (const sxl of [-1, 1]) { A.copy(riderR).multiply(loc(m2, sxl * 0.4, 0.8, 0.05, -0.55 + (dead ? 0.5 : 0), 0, sxl * -0.12)); this.inst('leg', false).add(A, pc.r * fl, pc.g * fl, pc.b * fl); }
    } else {
      for (const sxl of [-1, 1]) {
        let a = legA * (sxl < 0 ? 1 : -1);
        if (!dead && p > 0) a = sxl < 0 ? 0.35 * Math.min(1, p * 3) : -0.25 * Math.min(1, p * 3);
        if (!dead && u.state === 'work') a = sxl < 0 ? 0.12 : -0.1;
        A.copy(R).multiply(loc(m2, sxl * 0.13, 0.8, 0, a, 0, 0)); this.inst('leg', false).add(A, pc.r * fl, pc.g * fl, pc.b * fl);
      }
    }
  }
}
const _e2 = new THREE.Vector3();
