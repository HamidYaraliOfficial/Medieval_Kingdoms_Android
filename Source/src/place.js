// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Placement search helper shared by AI and scenario setup.
import { BUILDINGS, TILE } from './data.js';
import { KIND } from './terrain.js';

// Search outwards from tile (cx,cz) for a legal spot. Returns {tx,tz,rot} or null.
export function findSpot(g, teamId, key, cx, cz, o = {}) {
  const def = BUILDINGS[key];
  const rmin = o.rmin || 0, rmax = o.rmax || 18;
  const margin = o.margin != null ? o.margin : (def.line ? 0 : 1);
  const rots = def.w === def.d ? [0] : [0, 1];
  const N = g.N;
  const pref = o.pref || null;
  let best = null, bs = 1e9;
  const test = (tx, tz, rot) => {
    const { w, d } = g.footprint(key, rot);
    if (o.bounds) { const b = o.bounds; if (tx < b.x0 || tz < b.z0 || tx + w - 1 > b.x1 || tz + d - 1 > b.z1) return; }
    if (tx - margin < 3 || tz - margin < 3 || tx + w + margin > N - 3 || tz + d + margin > N - 3) return;
    for (let z = tz - margin; z < tz + d + margin; z++) for (let x = tx - margin; x < tx + w + margin; x++) {
      const idx = z * N + x;
      if (g.nav.occ[idx] || g.nav.nocc[idx]) return;
      if (g.T.kind[idx] === KIND.DEEP) return;
    }
    const chk = g.canPlace(key, teamId, tx, tz, rot, { free: o.free, ignoreTech: o.ignoreTech, skipCost: true, ignoreTerritory: o.ignoreTerritory });
    if (!chk.ok) return;
    let s = Math.hypot(tx + w / 2 - cx, tz + d / 2 - cz);
    if (pref) s -= ((tx + w / 2 - cx) * pref.x + (tz + d / 2 - cz) * pref.z) * 0.35;
    s += g.rng() * 0.6;
    if (s < bs) { bs = s; best = { tx, tz, rot }; }
  };
  for (let r = rmin; r <= rmax; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        for (const rot of rots) {
          const { w, d } = g.footprint(key, rot);
          test(Math.round(cx + dx - w / 2), Math.round(cz + dz - d / 2), rot);
        }
      }
    }
    if (best && r >= (o.minRing != null ? o.minRing : 0) && !pref) return best;
    if (best && pref && r > rmin + 3) return best;
  }
  return best;
}
