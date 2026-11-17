// Screenshot gallery:  node tests/gallery.cjs <scene> [outDir]
// scenes: menu construction village selection battle siege resources campaign
// Runs the real game page in headless Chromium (software WebGL) and stages each scene through the game's own API.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const scene = process.argv[2];
const outDir = path.resolve(process.argv[3] || path.join(__dirname, '..', 'gallery'));
fs.mkdirSync(outDir, { recursive: true });
const W = +(process.env.W || 1600), H = +(process.env.H || 900), DSF = +(process.env.DSF || 2);

// ---- page-side helpers (serialised into the page) -------------------------------------------
function installHelpers() {
  const a = window.__app;
  const G = {};
  G.noWeather = () => { const w = a.renderer.weather; w.kind = 'clear'; w.w = 0; w.target = 0; w.next = 1e9; w.flash = 0; };
  G.tod = (v) => { a.renderer.q.dayNight = false; a.renderer.fixedTod = v; };
  G.clean = () => { document.querySelectorAll('#notes > *, #hint > *, #hint').forEach((e) => { if (/paused|right-click|under attack/i.test(e.textContent || '')) e.remove(); }); };
  G.pause = () => { a.setSpeed(0); G.clean(); };
  G.run = (secs) => { for (let i = 0; i < secs * 10 && !a.g.over; i++) a.g.update(0.1); };
  G.look = (x, z, dist, yaw) => { a.cam.jump(x, z, dist); a.cam.tyaw = a.cam.yaw = yaw; if (a.cam.apply) a.cam.apply(); };
  G.taken = () => a.g.buildings.filter((b) => !b.dead).map((b) => ({ tx: b.tx, tz: b.tz, w: b.w, d: b.d }));
  G.place = (team, key, cx, cz, o = {}) => {
    const g = a.g, taken = G._taken || (G._taken = G.taken()), m = o.margin != null ? o.margin : 1;
    const free = (tx, tz, w, d) => !taken.some((q) => tx < q.tx + q.w + m && tx + w + m > q.tx && tz < q.tz + q.d + m && tz + d + m > q.tz);
    for (let r = o.rmin || 0; r <= (o.rmax || 22); r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      for (const rot of [0, 1]) {
        const tx = Math.round(cx + dx), tz = Math.round(cz + dz), f = g.footprint(key, rot);
        if (!free(tx, tz, f.w, f.d)) continue;
        const res = g.placeBuilding(team, key, tx, tz, rot, { complete: o.complete !== false, free: true });
        if (res.ok) { taken.push({ tx, tz, w: f.w, d: f.d }); return res.b; }
      }
    }
    return null;
  };
  G.at = (b) => ({ x: b.cx, z: b.cz });
  window.__gal = G;
  return true;
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 600)));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
  await page.addInitScript(() => { try { localStorage.setItem('ic_settings', JSON.stringify({ quality: 'ultra', fpsLimit: 0, autosave: 0, edgeScroll: false, volMaster: 0 })); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '../UI/index.html'));
  await page.waitForFunction(() => window.__app && !document.getElementById('boot'), null, { timeout: 120000 });
  const ev = (f, arg) => page.evaluate(f, arg);
  const sleep = (ms) => page.waitForTimeout(ms);
  const start = async (cfg) => { await ev((c) => window.__app.startGame(c), cfg); for (let i = 0; i < 200 && !(await ev(() => window.__app.playing)); i++) await sleep(300); await ev(installHelpers); await sleep(500); };
  const shot = async (name) => { const t0 = Date.now(); await page.screenshot({ path: path.join(outDir, name + '.png'), timeout: 420000 }); console.log('shot', name, Date.now() - t0, 'ms'); };
  const boxSelect = async (pred) => {
    const pts = await ev((p) => { const a = window.__app; return a.g.units.filter((u) => !u.dead && u.team === 0 && u.cls !== 'work').map((u) => a.renderer.worldToScreen(u.x, u.y + 1, u.z)); });
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs) - 25, x1 = Math.max(...xs) + 25, y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 25;
    await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up();
    return ev(() => window.__app.input.selUnits.length);
  };
  const BASE = { mode: 'skirmish', mapId: 'greenvalley', size: 'medium', seed: 5, enemies: 1, difficulty: 'normal', army: 8, playerName: 'Hamid' };

  if (scene === 'menu') {
    await sleep(7000); await shot('01_main_menu');
  } else if (scene === 'construction') {
    await start(Object.assign({}, BASE, { seed: 11, bonus: { wood: 2500, stone: 2500, iron: 800, gold: 1500 } }));
    const info = await ev(() => {
      const a = window.__app, g = a.g, G = window.__gal; G.noWeather(); G.tod(0.4);
      const cap = g.byId.get(g.teams[0].capitalId), S = 17;
      // find an open S x S patch near the town hall
      const okAt = (key, x, z, rot) => g.canPlace(key, 0, x, z, rot || 0, { free: true }).ok;
      const score = (ox, oz) => {
        if (!okAt('keep', ox + 6, oz + 5)) return -1;
        let bad = 0;
        for (let i = 0; i <= S; i++) for (const [x, z] of [[ox + i, oz], [ox + i, oz + S], [ox, oz + i], [ox + S, oz + i]]) if (!okAt('walls', x, z)) bad++;
        for (const [x, z] of [[ox - 1, oz - 1], [ox + S - 1, oz - 1], [ox - 1, oz + S - 1], [ox + S - 1, oz + S - 1]]) if (!okAt('guardtower', x, z)) bad += 4;
        return 80 - bad;
      };
      let spot = null, best = -1;
      for (let r = 6; r < 50; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const sc = score(cap.tx + dx, cap.tz + dz); if (sc > best) { best = sc; spot = { x: cap.tx + dx, z: cap.tz + dz }; } }
      if (!spot || best < 60) return { err: 'no open patch', best };
      const cx = spot.x, cz = spot.z, sites = [];
      const prog = (b, p) => { b.progress = p; b.built = false; b.hp = Math.max(1, b.maxHp * p * 0.6); sites.push(b); return b; };
      const put = (key, x, z, rot, p) => { const r = g.placeBuilding(0, key, x, z, rot, { complete: false, free: true }); if (r.ok) prog(r.b, p); return r.ok; };
      const keep = put('keep', cx + 6, cz + 5, 0, 0.5);
      let nT = 0; for (const [x, z, p] of [[cx - 1, cz - 1, 0.85], [cx + S - 1, cz - 1, 0.55], [cx - 1, cz + S - 1, 0.4], [cx + S - 1, cz + S - 1, 0.7]]) if (put('guardtower', x, z, 0, p)) nT++;
      const gate = put('gate', cx + 7, cz + S, 0, 0.45);
      let nW = 0;
      for (let i = 0; i <= S; i++) {
        for (const [x, z] of [[cx + i, cz], [cx + i, cz + S], [cx, cz + i], [cx + S, cz + i]]) {
          if (put('walls', x, z, 0, 0.3 + ((x * 7 + z * 13) % 10) / 13)) nW++;
        }
      }
      const vill = g.units.filter((u) => u.team === 0 && u.cls === 'work');
      const order = sites.slice().sort((p, q) => (q.key === 'keep') - (p.key === 'keep')).filter((b) => b.key !== 'walls' || b.tx % 3 === 0);
      vill.forEach((u, i) => { const s2 = order[i % Math.min(order.length, 8)]; g.orderVillagers([u], s2, s2.cx, s2.cz); });
      g.teams[0].res.wood = 9999; g.teams[0].res.stone = 9999;
      G.look((cx + 9) * 2, (cz + 10) * 2, 40, 0.5);
      return { spot, best, nW, nT, gate, keep };
    });
    console.log(JSON.stringify(info));
    await sleep(1500); await ev(() => window.__gal.run(16)); await sleep(1500);
    await ev(() => window.__gal.pause());
    await sleep(1500); await shot('02_castle_construction');
  } else if (scene === 'village') {
    await start(Object.assign({}, BASE, { seed: 5, enemies: 1, difficulty: 'hard' }));
    await ev(() => { const G = window.__gal; G.noWeather(); G.tod(0.4); G.run(330); const g = window.__app.g; const cap = g.byId.get(g.teams[1].capitalId); G.look(cap.cx, cap.cz, 58, 0.7); window.__gal.pause(); });
    await sleep(2500); await shot('03_medieval_village');
  } else if (scene === 'selection') {
    await start({ mode: 'custom', mapId: 'plains', size: 'medium', role: 'attack', fort: 'castle', armySize: 'large', difficulty: 'normal', seed: 777, playerName: 'Hamid' });
    await ev(() => {
      const a = window.__app, g = a.g, G = window.__gal; G.noWeather(); G.tod(0.4);
      const us = g.units.filter((u) => u.team === 0 && !u.dead); let x = 0, z = 0; for (const u of us) { x += u.x; z += u.z; }
      G.look(x / us.length, z / us.length, 42, 0.5); G.pause();
    });
    await sleep(1500);
    const n = await boxSelect(); console.log('selected', n);
    await sleep(2000); await shot('04_army_selection');
  } else if (scene === 'battle') {
    await start({ mode: 'custom', mapId: 'plains', size: 'medium', role: 'attack', fort: 'none', armySize: 'large', difficulty: 'normal', seed: 777, playerName: 'Hamid' });
    const info = await ev(() => {
      const a = window.__app, g = a.g, G = window.__gal; G.noWeather(); G.tod(0.4);
      const mine = g.units.filter((u) => u.team === 0 && !u.dead && u.cls !== 'work'), foe = g.units.filter((u) => u.team !== 0 && !u.dead);
      let ex = 0, ez = 0; for (const u of foe) { ex += u.x; ez += u.z; } ex /= foe.length; ez /= foe.length;
      g.orderAttackMove(mine, ex, ez, { formation: null });
      let guard = 0, d = 1e9;
      while (guard++ < 1200 && d > 3) { g.update(0.1); d = 1e9; for (const m of mine) { if (m.dead) continue; for (const f of foe) { if (f.dead) continue; const dd = Math.hypot(m.x - f.x, m.z - f.z); if (dd < d) d = dd; } } }
      G.run(9);
      const act = g.units.filter((u) => !u.dead && u.cls !== 'work'); let cx = 0, cz = 0, n = 0;
      for (const u of act) { const near = act.some((o) => o.team !== u.team && Math.hypot(o.x - u.x, o.z - u.z) < 3); if (near) { cx += u.x; cz += u.z; n++; } }
      if (!n) return { err: 'no melee', d };
      G.look(cx / n, cz / n, 17, 0.9); G.pause(); return { n, t: g.time, left: [g.units.filter((u) => !u.dead && u.team === 0).length, g.units.filter((u) => !u.dead && u.team !== 0).length] };
    });
    console.log(JSON.stringify(info)); await sleep(2500); await shot('05_sword_battle');
  } else if (scene === 'siege') {
    await start({ mode: 'custom', mapId: 'plains', size: 'medium', role: 'attack', fort: 'castle', armySize: 'large', difficulty: 'normal', seed: 777, playerName: 'Hamid' });
    const info = await ev(() => {
      const a = window.__app, g = a.g, G = window.__gal; G.noWeather(); G.tod(0.4);
      const mine = g.units.filter((u) => u.team === 0 && !u.dead && u.cls !== 'work');
      const keep = g.byId.get(g.teams[1].capitalId);
      g.orderAttackMove(mine.filter((u) => u.key !== 'siegetower'), keep.cx, keep.cz, { formation: null });
      const defs = () => g.buildings.filter((b) => b.team !== 0 && !b.dead && ['walls', 'gate', 'guardtower', 'archertower'].includes(b.key));
      const engaged = () => { const D = defs(); return g.units.filter((u) => u.team === 0 && !u.dead && D.some((b) => Math.hypot(b.cx - u.x, b.cz - u.z) < 7)); };
      let hit = 0, guard = 0;
      while (guard++ < 4000) { g.update(0.1); if (guard % 20 === 0 && engaged().length >= 8) { hit++; if (hit >= 1) break; } }
      G.run(14);
      const eng = engaged(); let cx = 0, cz = 0; for (const u of eng) { cx += u.x; cz += u.z; } cx /= (eng.length || 1); cz /= (eng.length || 1);
      const D = defs().filter((b) => Math.hypot(b.cx - cx, b.cz - cz) < 14); let wx = 0, wz = 0; for (const b of D) { wx += b.cx; wz += b.cz; }
      if (D.length) { cx = (cx * 2 + wx / D.length) / 3; cz = (cz * 2 + wz / D.length) / 3; }
      G.look(cx, cz, 30, +window.__YAW || 0.35); G.pause();
      return { t: g.time, engaged: eng.length, walls: D.length, mine: g.units.filter((u) => u.team === 0 && !u.dead).length, foe: g.units.filter((u) => u.team !== 0 && !u.dead).length };
    });
    console.log(JSON.stringify(info)); await sleep(2500); await shot('06_castle_siege');
  } else if (scene === 'resources') {
    await start(Object.assign({}, BASE, { seed: 21, bonus: { wood: 1200, stone: 900, iron: 500, gold: 800 } }));
    await ev(() => {
      const a = window.__app, g = a.g, G = window.__gal; G.noWeather(); G.tod(0.4);
      const cap = g.byId.get(g.teams[0].capitalId), cx = cap.tx, cz = cap.tz;
      const mk = (k, n, o) => { for (let i = 0; i < n; i++) G.place(0, k, cx, cz, Object.assign({ rmax: 24 }, o || {})); };
      mk('house', 6); mk('farm', 3); mk('wheatfield', 3); mk('mill', 1); mk('bakery', 1); mk('woodcutter', 2); mk('quarry', 1); mk('mine', 1); mk('market', 1); mk('storage', 1); mk('barracks', 1); mk('church', 1);
      g.recalcTeam(g.teams[0]);
      for (let i = 0; i < 14; i++) { const p = g.spawnPos(cap); g.addUnit('villager', 0, p.x, p.z); }
      g.assignWorkers(g.teams[0]);
      G.run(95);
      G.look(cap.cx, cap.cz, 52, 0.6);
    });
    await sleep(1200);
    await ev(() => { const a = window.__app; a.ui.togglePanel('kingdom'); window.__gal.pause(); });
    await sleep(2500); await shot('07_resource_management');
  } else if (scene === 'campaign') {
    await start({ mode: 'campaign', mission: 1, bonus: undefined, playerName: 'Hamid' });
    await ev(() => {
      const a = window.__app, g = a.g, G = window.__gal; G.noWeather(); G.tod(0.38);
      const mine = g.units.filter((u) => u.team === 0 && !u.dead && u.cls !== 'work');
      let x = 0, z = 0; for (const u of mine) { x += u.x; z += u.z; } x /= (mine.length || 1); z /= (mine.length || 1);
      G.look(x, z, 48, 0.45); G.run(3);
    });
    await sleep(1500);
    await boxSelect();
    await sleep(1000);
    await ev(() => window.__gal.pause()); await sleep(2000); await shot('08_campaign_gameplay');
  } else { console.log('unknown scene'); }
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
