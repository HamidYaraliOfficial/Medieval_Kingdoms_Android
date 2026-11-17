import * as THREE from 'three';
import { createGame } from '../src/setup.js';
import { Renderer } from '../src/render.js';
window.THREE = THREE;
window.boot = (cfg, q) => {
  const canvas = document.getElementById('c');
  const r = new Renderer(canvas, q || {}, { preserve: true });
  const g = createGame(cfg);
  r.setGame(g);
  const cam = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  const T = { r, g, cam, yaw: 0.6, pitch: 0.7, dist: 60 };
  T.look = (x, z, dist, yaw, pitch) => { T.dist = dist; T.yaw = yaw; T.pitch = pitch; const y = g.T.heightAt(x, z); cam.target.set(x, y, z); cam.position.set(x + Math.sin(yaw) * Math.cos(pitch) * dist, y + Math.sin(pitch) * dist, z + Math.cos(yaw) * Math.cos(pitch) * dist); };
  T.step = (s, dt = 0.1) => { for (let t = 0; t < s; t += dt) g.update(dt); };
  T.draw = (n = 2, dt = 0.016) => { for (let i = 0; i < n; i++) r.frame(dt, cam); };
  window.T = T;
  return { units: g.units.length, buildings: g.buildings.length, nodes: g.nodes.length, start: g.teams[0].start };
};
