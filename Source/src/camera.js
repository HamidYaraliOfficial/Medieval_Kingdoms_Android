// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// RTS camera rig: pan, rotate, zoom with smoothing, terrain following and map bounds.
import * as THREE from 'three';
import { clamp, lerp } from './util.js';

export class RTSCamera {
  constructor() {
    this.x = 100; this.z = 100; this.yaw = 0.0; this.dist = 70;
    this.tx = 100; this.tz = 100; this.tyaw = 0; this.tdist = 70;
    this.ty = 0; this.minD = 14; this.maxD = 170;
    this.position = new THREE.Vector3(); this.target = new THREE.Vector3();
    this.size = 224; this.g = null; this.pitch = 0.9;
  }
  setGame(g) { this.g = g; this.size = g.T.size; }
  jump(x, z, dist) { this.x = this.tx = x; this.z = this.tz = z; if (dist) this.dist = this.tdist = dist; this.ty = this.g ? this.g.T.heightAt(x, z) : 0; this.apply(); }
  move(dx, dz) { // camera-relative pan, units/sec scaled by distance
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this.tx += dx * c + dz * s; this.tz += -dx * s + dz * c;
  }
  rotate(d) { this.tyaw += d; }
  zoom(f) { this.tdist = clamp(this.tdist * f, this.minD, this.maxD); }
  update(dt) {
    const k = 1 - Math.pow(0.0004, dt);
    this.tx = clamp(this.tx, 6, this.size - 6); this.tz = clamp(this.tz, 6, this.size - 6);
    this.x += (this.tx - this.x) * k; this.z += (this.tz - this.z) * k;
    this.yaw += (this.tyaw - this.yaw) * k; this.dist += (this.tdist - this.dist) * (1 - Math.pow(0.0001, dt));
    this.apply(dt);
  }
  apply(dt = 1) {
    const g = this.g;
    const gy = g ? Math.max(g.T.heightAt(this.x, this.z), g.T.wl) : 0;
    this.ty += (gy - this.ty) * Math.min(1, dt * 4 + (dt >= 1 ? 1 : 0));
    const f = clamp((this.dist - this.minD) / (this.maxD - this.minD), 0, 1);
    this.pitch = lerp(0.42, 1.18, Math.pow(f, 0.75));
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.target.set(this.x, this.ty, this.z);
    let px = this.x + Math.sin(this.yaw) * cp * this.dist, pz = this.z + Math.cos(this.yaw) * cp * this.dist, py = this.ty + sp * this.dist;
    if (g) { const gh = g.T.heightAt(clamp(px, 0, this.size), clamp(pz, 0, this.size)); py = Math.max(py, gh + 3); }
    this.position.set(px, py, pz);
  }
  // screen-forward direction on the ground plane
  forward() { return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }; }
}
