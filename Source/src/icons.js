// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// UI icons: inline SVG glyphs and 3D-rendered thumbnails of every building and unit (generated at start-up).
import * as THREE from 'three';
import * as M from './models.js';
import { BUILDINGS, UNITS, TEAM_COLORS } from './data.js';

const S = (inner, vb = 24) => `<svg viewBox="0 0 ${vb} ${vb}" width="1em" height="1em" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
export const ICONS = {
  wood: S('<rect x="3" y="14" width="18" height="5" rx="2.5" fill="#a8794a" stroke="#4a2c14"/><rect x="5" y="8" width="14" height="5" rx="2.5" fill="#8a5a33" stroke="#4a2c14"/><circle cx="19" cy="16.5" r="1.4" fill="#d9b27a"/><circle cx="17" cy="10.5" r="1.3" fill="#d9b27a"/>'),
  stone: S('<path d="M3 18l3-8 5-4 6 2 4 6-3 5H6z" fill="#a9a59a" stroke="#4a4740" stroke-width="1.2"/><path d="M8 11l4 2 5-1" stroke="#6d6a62"/>'),
  iron: S('<path d="M3 15l4-6h11l3 4-3 4H6z" fill="#7f8a99" stroke="#2c3440" stroke-width="1.2"/><path d="M7 9l-1 6M18 9l1 4" stroke="#c5cfdd"/>'),
  gold: S('<circle cx="12" cy="12" r="8.5" fill="#e6b930" stroke="#7a5a10" stroke-width="1.5"/><circle cx="12" cy="12" r="5.5" stroke="#a37a14"/><path d="M12 8v8M9.5 10.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" stroke="#7a5a10" stroke-width="1.1"/>'),
  food: S('<path d="M7 20c-3-2-3-7 1-9 2-1 3-4 3-6 2 1 3 2 3 4 3 0 5 3 4 6-1 3-4 5-8 5z" fill="#c9503a" stroke="#5a1c10" stroke-width="1.2"/><path d="M11 5c0-2 1-3 3-3" stroke="#3f7a2c" stroke-width="1.5"/>'),
  wheat: S('<path d="M12 22V6" stroke="#9a7a2a" stroke-width="1.4"/><g fill="#e0bb4a" stroke="#8a6a1c"><ellipse cx="9" cy="8" rx="2" ry="3.2" transform="rotate(-25 9 8)"/><ellipse cx="15" cy="8" rx="2" ry="3.2" transform="rotate(25 15 8)"/><ellipse cx="9" cy="13" rx="2" ry="3.2" transform="rotate(-25 9 13)"/><ellipse cx="15" cy="13" rx="2" ry="3.2" transform="rotate(25 15 13)"/><ellipse cx="12" cy="4.5" rx="1.8" ry="3"/></g>'),
  flour: S('<path d="M7 5h10l2 4v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9z" fill="#efe6d0" stroke="#6a5a3a" stroke-width="1.2"/><path d="M7 5c2 2 8 2 10 0" stroke="#6a5a3a"/><path d="M9 13h6M9 16h4" stroke="#b9ab88"/>'),
  bread: S('<path d="M3 14c0-4 4-7 9-7s9 3 9 7c0 2-1 3-3 3H6c-2 0-3-1-3-3z" fill="#d79a4a" stroke="#6a3f12" stroke-width="1.2"/><path d="M8 10l1 3M12 9l1 3M16 10l1 3" stroke="#8a5a1e" stroke-width="1.2"/>'),
  pop: S('<circle cx="12" cy="7" r="3.5" fill="#e0b48e" stroke="#5a3a20"/><path d="M5 21c0-5 3-8 7-8s7 3 7 8z" fill="#6a8aa8" stroke="#2a3a4a" stroke-width="1.2"/>'),
  sword: S('<path d="M5 19l10-10 4-5 1 1-5 4L5 19z" fill="#cfd6df" stroke="#444" stroke-width="1"/><path d="M4 16l4 4M3 21l2-2" stroke="#8a6a2a" stroke-width="2"/>'),
  happy: S('<circle cx="12" cy="12" r="9" fill="#f0c94a" stroke="#7a5a10" stroke-width="1.3"/><circle cx="9" cy="10" r="1.2" fill="#3a2a10"/><circle cx="15" cy="10" r="1.2" fill="#3a2a10"/><path d="M8 14c2 3 6 3 8 0" stroke="#3a2a10" stroke-width="1.5" stroke-linecap="round"/>'),
  clock: S('<circle cx="12" cy="12" r="9" fill="#e8d9b0" stroke="#5a3a14" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="#3a2410" stroke-width="1.6" stroke-linecap="round"/>'),
  tax: S('<circle cx="9" cy="10" r="6" fill="#e6b930" stroke="#7a5a10"/><circle cx="15" cy="15" r="6" fill="#f0cc50" stroke="#7a5a10"/>'),
  menu: S('<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  pause: S('<path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
  play: S('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  check: S('<path d="M5 12l5 5 9-10" stroke="#5fd36e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  lock: S('<rect x="5" y="11" width="14" height="10" rx="2" fill="#7a6a4a" stroke="#2a2010"/><path d="M8 11V8a4 4 0 018 0v3" stroke="#2a2010" stroke-width="2"/>'),
  stop: S('<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/>'),
  patrol: S('<path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  attack: S('<path d="M4 20L16 8l4-4v4l-4 4L4 20zM3 15l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'),
  retreat: S('<path d="M20 12H5m0 0l6-6m-6 6l6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  tower: S('<path d="M7 21V9h10v12M6 9V5h2v2h2V5h4v2h2V5h2v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  up: S('<path d="M12 20V5m0 0l-6 6m6-6l6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  trash: S('<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  flag: S('<path d="M6 21V3M6 4h12l-3 4 3 4H6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  plus: S('<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'),
  minus: S('<path d="M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'),
  x: S('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'),
  hammer: S('<path d="M14 4l6 6-3 3-6-6zM12 10L4 18l2 2 8-8" fill="#9aa0a8" stroke="currentColor" stroke-width="1.5"/>'),
  book: S('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" fill="#7a3a28" stroke="#2a1008" stroke-width="1.2"/><path d="M8 4v16M10 8h6M10 11h6" stroke="#e8d9b0"/>'),
  crown: S('<path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z" fill="#e6b930" stroke="#7a5a10" stroke-width="1.3"/>'),
  shield: S('<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" fill="#3a5a98" stroke="#1a2a4a" stroke-width="1.4"/><path d="M12 6v12" stroke="#e6b930" stroke-width="1.6"/>'),
};
export const resIcon = (r) => ICONS[r] || '';

// ---------------------------------------------------------------- 3D thumbnails
export function makeThumbs(size = 96) {
  const out = { b: {}, u: {} };
  let gl;
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    gl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (e) { return out; }
  gl.setPixelRatio(1); gl.setSize(size, size, false); gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.15; gl.setClearColor(0x000000, 0);
  const tex = M.makeTextures();
  const matS = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.stone, roughness: 0.92 }), matW = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.wood, roughness: 0.9 });
  const matG = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xaaaaaa });
  const flagM = new THREE.MeshStandardMaterial({ color: TEAM_COLORS[0], side: THREE.DoubleSide });
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x665540, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.2); sun.position.set(-8, 14, 10); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  const snap = (grp, dist = 1, elev = 0.55, yaw = 0.7) => {
    scene.add(grp);
    const box = new THREE.Box3().setFromObject(grp); const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const r = Math.max(sz.x, sz.y, sz.z) * 0.62 * dist + 0.01;
    const d = r / Math.tan(cam.fov * Math.PI / 360);
    cam.position.set(c.x + Math.sin(yaw) * Math.cos(elev) * d, c.y + Math.sin(elev) * d, c.z + Math.cos(yaw) * Math.cos(elev) * d); cam.lookAt(c);
    gl.render(scene, cam);
    const url = gl.domElement.toDataURL('image/png');
    scene.remove(grp);
    return url;
  };
  const meshOf = (G, mats) => { const grp = new THREE.Group(); for (const k of ['s', 'w', 'g', 'f']) if (G[k]) grp.add(new THREE.Mesh(G[k], k === 'f' ? flagM : mats[k])); for (const pk in G.parts) { const pg = new THREE.Group(); pg.position.set(...G.parts[pk].pos); for (const k of ['s', 'w', 'g']) if (G.parts[pk][k]) pg.add(new THREE.Mesh(G.parts[pk][k], mats[k])); grp.add(pg); } return grp; };
  const mats = { s: matS, w: matW, g: matG };
  for (const key in BUILDINGS) {
    const def = BUILDINGS[key];
    try {
      let grp;
      if (key === 'wallw' || key === 'walls') { const w = M.wallGeos(key === 'walls' ? 'stone' : 'wood'); grp = new THREE.Group(); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(w.post, key === 'walls' ? matS : matW); p.position.x = i * 2; grp.add(p); if (i < 2) { const a = new THREE.Mesh(w.arm, key === 'walls' ? matS : matW); a.position.x = i * 2; grp.add(a); } } }
      else if (key === 'bridge') { grp = new THREE.Group(); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(M.bridgeGeo(), matW); p.position.x = i * 2; grp.add(p); } }
      else if (key === 'moat') { grp = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 2), new THREE.MeshStandardMaterial({ color: 0x2a6a96, roughness: 0.2 })); grp.add(m); const b = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.5, 2.6), new THREE.MeshStandardMaterial({ color: 0x6b5a3a })); b.position.y = -0.1; grp.add(b); }
      else grp = meshOf(M.buildBuilding(key, def.w, def.d, 1, 7), mats);
      out.b[key] = snap(grp, 1.02);
    } catch (e) { /* thumbnails are optional */ }
  }
  // units
  const parts = M.buildUnitParts();
  const pm = (c) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, color: c });
  const white = pm(0xffffff);
  for (const key in UNITS) {
    try {
      const grp = new THREE.Group();
      const tab = new THREE.Color(TEAM_COLORS[0]); if (key === 'villager') tab.lerp(new THREE.Color(0xcdb894), 0.62);
      const cav = UNITS[key].cls === 'cav';
      const add = (name, mat, x, y, z, rx = 0, rz = 0) => { if (!parts[name]) return; const m = new THREE.Mesh(parts[name], mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); grp.add(m); return m; };
      if (UNITS[key].cls === 'siege') {
        const G = M.buildSiege(key); const g2 = meshOf(G, mats); scene.add(g2); out.u[key] = snap(g2, 1.05, 0.4, 0.8); continue;
      }
      const ry = cav ? 0.72 : 0;
      const root = new THREE.Group(); root.position.y = ry; grp.add(root);
      const place = (name, mat, x, y, z, rx = 0, rz = 0) => { if (!parts[name]) return; const m = new THREE.Mesh(parts[name], mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); root.add(m); };
      place('body_' + key, white, 0, 0, 0); place('tab_' + key, pm(tab), 0, 0, 0);
      const sleeve = key === 'villager' ? pm(tab) : white;
      place(key === 'villager' ? 'armR_villager' : 'armR_' + key, sleeve, -0.34, 1.38, 0, -0.45, 0.05);
      place(key === 'villager' ? 'armL_villager' : 'armL_' + key, sleeve, 0.34, 1.38, 0, -0.3, -0.05);
      const pants = pm(0x5c4630);
      if (!cav) { place('leg', pants, 0.13, 0.8, 0); place('leg', pants, -0.13, 0.8, 0); }
      else {
        const horse = pm(0x7a4a28);
        for (const [x, z] of [[0.2, 0.55], [-0.2, 0.55], [0.2, -0.6], [-0.2, -0.6]]) { const m = new THREE.Mesh(parts.horseLeg, horse); m.position.set(x, 0.95, z); grp.add(m); }
        const h = new THREE.Mesh(parts.horse, horse); grp.add(h);
        const sd = new THREE.Mesh(parts.saddle, pm(tab)); grp.add(sd);
      }
      if (key === 'archer') { /* bow sits in the left hand */ }
      out.u[key] = snap(grp, cav ? 1.0 : 0.95, 0.25, 0.65);
    } catch (e) { /* ignore */ }
  }
  gl.dispose();
  return out;
}
