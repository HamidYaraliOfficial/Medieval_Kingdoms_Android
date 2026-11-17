// Touch / phone test: runs the real game in a phone-sized touch-emulating Chromium and drives it with real touch events (CDP).
//   node tests/mobile.cjs [outDir]        env: W=851 H=393 DSF=1 LANG_UI=en|fa  PAYLOAD=1 (serve android/app/src/main/assets/www from https://appassets.androidplatform.net like the app does)
// Prints PASS/FAIL lines; screenshots go to tests/out/mobile/ (or outDir).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const W = +(process.env.W || 851), H = +(process.env.H || 393), DSF = +(process.env.DSF || 1);
const OUT = process.argv[2] || path.resolve(__dirname, 'out', 'mobile');
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: DSF, hasTouch: true, isMobile: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|swiftshader|WebGL/i.test(t))) console.log('[page]', m.type(), t.slice(0, 400)); });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 600)));
  await page.addInitScript((lang) => { try { if (!localStorage.getItem('ic_settings')) localStorage.setItem('ic_settings', JSON.stringify({ quality: 'low', fpsLimit: 0, autosave: 0, lang })); } catch (e) { /* ignore */ } }, process.env.LANG_UI || 'en');
  const cdp = await ctx.newCDPSession(page);
  // events carry explicit timestamps from a virtual clock, so the (very slow, software-rendered) test run still sees realistic finger timing
  let clock = Date.now() / 1000;
  const touch = (type, pts, dt = 0.03) => { clock += dt; return cdp.send('Input.dispatchTouchEvent', { type, timestamp: clock, touchPoints: pts.map(([x, y, id]) => ({ x, y, id: id || 0 })) }); };
  const tap = async (x, y) => { await touch('touchStart', [[x, y]]); await page.waitForTimeout(40); await touch('touchEnd', []); await page.waitForTimeout(120); };
  const drag = async (x0, y0, x1, y1, steps = 6) => { await touch('touchStart', [[x0, y0]]); for (let i = 1; i <= steps; i++) { await touch('touchMove', [[x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps]]); await page.waitForTimeout(25); } await touch('touchEnd', []); await page.waitForTimeout(150); };
  const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);

  const externals = [];
  if (process.env.PAYLOAD === '1') {
    const www = path.resolve(__dirname, '../android/app/src/main/assets/www');
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.txt': 'text/plain' };
    await ctx.route('https://appassets.androidplatform.net/**', (route) => {
      const u = new URL(route.request().url()); const f = path.join(www, u.pathname === '/' ? '/index.html' : u.pathname);
      if (!f.startsWith(www) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, headers: { 'Cache-Control': 'no-cache', 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }, body: fs.readFileSync(f) });
    });
    page.on('request', (r) => { const u = r.url(); if (!/^(https:\/\/appassets\.androidplatform\.net|data:|blob:)/.test(u)) externals.push(u); });
    await page.goto('https://appassets.androidplatform.net/index.html');
  } else await page.goto('file://' + path.resolve(__dirname, '../UI/index.html') + '?preserve=1');
  await page.waitForFunction(() => window.__app && !document.getElementById('boot'), null, { timeout: 120000 }).catch((e) => console.log('BOOT FAIL', e.message));
  ok(await ev(() => document.body.classList.contains('touch') && document.body.classList.contains('android')), 'platform detected as Android touch');
  ok(await ev(() => !!window.__ic && typeof window.__ic.back === 'function'), 'back hook present');
  ok(await ev(() => !Array.from(document.querySelectorAll('.mbtn')).some((b) => /exit/i.test(b.textContent))), 'no Exit button in the Android main menu');
  await page.waitForTimeout(1500); await shot('01_main');

  for (const [name, args] of [['new'], ['campaign'], ['setup', { mode: 'skirmish' }], ['settings'], ['slots', { mode: 'load' }], ['credits']]) {
    await ev(([n, a]) => window.__app.menus.go(n, a, true), [name, args || null]); await page.waitForTimeout(500); await shot('02_' + name);
    const r = await ev(() => { const p = document.querySelector('.page'); if (!p) return null; const b = p.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: window.innerHeight, foot: (document.querySelector('.pfoot') || {}).getBoundingClientRect ? document.querySelector('.pfoot').getBoundingClientRect().bottom : 0 }; });
    if (r) ok(r.bottom <= r.h + 1 && r.top >= -1 && r.foot <= r.h + 1, 'page "' + name + '" fits the screen (' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + r.h + ')');
  }
  await ev(() => window.__app.menus.go('main', null, true));

  // ---- start a game
  await ev(() => window.__app.startGame({ mode: 'skirmish', mapId: 'greenvalley', size: 'small', enemies: 1, difficulty: 'easy', res: 'normal', victory: 'conquest', playerName: 'Tester', seed: 4242 }));
  await page.waitForFunction(() => window.__app.playing, null, { timeout: 120000 });
  await ev(() => { window.__app.setSpeed(0); }); await page.waitForTimeout(2500); await shot('03_game_start');
  const hud = await ev(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; }; return { top: r('#topbar'), mm: r('#mmwrap'), rail: r('.pbtns'), sel: r('#selpanel'), obj: r('#objectives') }; });
  console.log('hud', JSON.stringify(hud));
  ok(hud.top && hud.top[3] <= 44, 'top bar is slim (' + (hud.top && hud.top[3]) + 'px)');
  ok(await ev(() => document.querySelector('#selpanel').classList.contains('empty')), 'selection panel hidden when nothing is selected');

  // ---- build sheet
  await tap(...(await ev(() => { const b = document.querySelector('.pbtn[data-p=build]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })));
  await page.waitForTimeout(400); ok(await ev(() => !document.querySelector('#buildpanel').classList.contains('hidden')), 'build sheet opens from the rail button'); await shot('04_build_sheet');
  const nb0 = await ev(() => window.__app.g.buildings.filter((b) => b.team === 0).length);
  // choose the first affordable building
  await tap(...(await ev(() => { const it = document.querySelector('.bitem:not(.locked):not(.poor)'); const b = it.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })));
  await page.waitForTimeout(500);
  ok(await ev(() => window.__app.input.mode === 'place'), 'tapping a building enters placement mode');
  ok(await ev(() => document.querySelector('#buildpanel').classList.contains('hidden') && !document.querySelector('#tbar').classList.contains('hidden')), 'sheet closes and the confirm / cancel buttons appear');
  await shot('05_placing');
  const p0 = await ev(() => { const p = window.__app.input.place; return [p.tx, p.tz]; });
  await drag(430, 250, 330, 230);
  const p1 = await ev(() => { const p = window.__app.input.place; return [p.tx, p.tz]; });
  ok(p0[0] !== p1[0] || p0[1] !== p1[1], 'dragging moves the ghost (' + p0 + ' -> ' + p1 + ')');
  await shot('06_placing_moved');
  const okState = await ev(() => window.__app.input.place.ok);
  if (!okState) { // find a free spot by scanning a few screen positions
    for (const [x, y] of [[300, 200], [380, 220], [450, 200], [250, 230], [500, 240], [350, 150]]) { await drag(x, y + 4, x, y); if (await ev(() => window.__app.input.place.ok)) break; }
  }
  const nowOk = await ev(() => window.__app.input.place.ok);
  ok(nowOk, 'a valid building spot was found');
  if (nowOk) {
    await tap(...(await ev(() => { const b = document.querySelector('#tbar .tbb.ok').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })));
    await page.waitForTimeout(400);
    ok(await ev((n) => window.__app.g.buildings.filter((b) => b.team === 0).length === n + 1, nb0), 'the confirm button builds the building');
    ok(await ev(() => window.__app.input.mode === null && !!window.__app.input.selBuilding), 'placement ends and the new building is selected');
    await shot('07_building_selected');
  }
  await ev(() => window.__app.input.clearSel());
  // cancel path
  await ev(() => window.__app.ui.togglePanel('build')); await page.waitForTimeout(200);
  await tap(...(await ev(() => { const it = document.querySelector('.bitem:not(.locked)'); const b = it.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })));
  await page.waitForTimeout(300);
  await tap(...(await ev(() => { const b = document.querySelector('#tbar .tbb.cancel').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })));
  ok(await ev(() => window.__app.input.mode === null && document.querySelector('#tbar').classList.contains('hidden')), 'cancel button leaves placement mode');

  // ---- selecting and commanding units
  const vill = await ev(() => { const a = window.__app, g = a.g; const u = g.units.find((x) => x.team === 0 && x.cls === 'work'); a.cam.jump(u.x, u.z, 40); return { id: u.id, x: u.x, z: u.z }; });
  await page.waitForTimeout(1200);
  const sp = await ev((id) => { const a = window.__app; const u = a.g.byId.get(id); const p = a.renderer.worldToScreen(u.x, u.y + 1, u.z); return [p.x, p.y]; }, vill.id);
  await tap(sp[0], sp[1]); await page.waitForTimeout(300);
  ok(await ev((id) => window.__app.input.selUnits.some((u) => u.id === id), vill.id), 'tap on a unit selects it');
  ok(await page.waitForFunction(() => !document.querySelector('#selpanel').classList.contains('empty'), null, { timeout: 15000 }).then(() => true, () => false), 'selection panel shows'); await shot('08_unit_selected');
  const before = await ev((id) => { const u = window.__app.g.byId.get(id); return { x: u.x, z: u.z }; }, vill.id);
  const tgt = await ev(() => { const a = window.__app; const gp = a.renderer.groundPoint(0.45, -0.15) || a.renderer.groundPoint(0, 0); const p = a.renderer.worldToScreen(gp.x, a.g.T.heightAt(gp.x, gp.z), gp.z); return [p.x, p.y, gp.x, gp.z]; });
  await tap(tgt[0], tgt[1]); await ev(() => window.__app.setSpeed(1)); await page.waitForTimeout(1800); await ev(() => window.__app.setSpeed(0));
  const after = await ev((id) => { const u = window.__app.g.byId.get(id); return { x: u.x, z: u.z, st: u.state }; }, vill.id);
  ok(Math.hypot(after.x - before.x, after.z - before.z) > 0.3 || after.st !== 'idle', 'tapping the ground with a unit selected gives it an order (state ' + after.st + ')');
  await shot('09_unit_ordered');
  ok(await ev(() => !!document.querySelector('.selx')), 'there is a deselect button'); await tap(...(await ev(() => { const b = document.querySelector('.selx').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })));
  ok(await ev(() => window.__app.input.selUnits.length === 0), 'the deselect button clears the selection');

  // ---- camera gestures
  await ev(() => { const a = window.__app; a.cam.jump(a.cam.tx, a.cam.tz, 60); }); await page.waitForTimeout(500);
  const c0 = await ev(() => { const c = window.__app.cam; return { x: c.tx, z: c.tz, d: c.tdist, yaw: c.tyaw }; });
  await drag(300, 200, 400, 200, 8);
  const c1 = await ev(() => { const c = window.__app.cam; return { x: c.tx, z: c.tz }; });
  ok(Math.hypot(c1.x - c0.x, c1.z - c0.z) > 3, 'one-finger drag pans the camera (' + Math.hypot(c1.x - c0.x, c1.z - c0.z).toFixed(1) + ' units)');
  const c2a = await ev(() => { const c = window.__app.cam; return { d: c.tdist, yaw: c.tyaw }; });
  await touch('touchStart', [[350, 200, 1], [450, 200, 2]]);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', [[350 - i * 12, 200, 1], [450 + i * 12, 200, 2]]); await page.waitForTimeout(25); }
  await touch('touchEnd', []); await page.waitForTimeout(150);
  const c2b = await ev(() => { const c = window.__app.cam; return { d: c.tdist, yaw: c.tyaw }; });
  ok(c2b.d < c2a.d - 3, 'pinch out zooms in (' + c2a.d.toFixed(1) + ' -> ' + c2b.d.toFixed(1) + ')');
  // twist clockwise: rotate the finger pair 30 degrees clockwise about (400,200)
  const ang = 30 * Math.PI / 180;
  await touch('touchStart', [[350, 200, 1], [450, 200, 2]]);
  for (let i = 1; i <= 6; i++) { const a = ang * i / 6, dx = 50 * Math.cos(a), dy = 50 * Math.sin(a); await touch('touchMove', [[400 - dx, 200 - dy, 1], [400 + dx, 200 + dy, 2]]); await page.waitForTimeout(25); }
  await touch('touchEnd', []); await page.waitForTimeout(150);
  const c2c = await ev(() => { const c = window.__app.cam; return { yaw: c.tyaw }; });
  ok(Math.abs(c2c.yaw - c2b.yaw) > 0.2, 'two-finger twist rotates the camera (' + (c2c.yaw - c2b.yaw).toFixed(2) + ' rad)');
  // does the scene turn the same way as the fingers (clockwise on screen)?  Project a point to the right of the target before / after.
  await shot('10_after_gestures');

  // ---- box selection: hold, then drag
  await ev(() => { const a = window.__app; const u = a.g.units.find((x) => x.team === 0 && x.cls !== 'work') || a.g.units.find((x) => x.team === 0); a.cam.jump(u.x, u.z, 45); a.cam.tyaw = a.cam.yaw = 0; }); await page.waitForTimeout(1200);
  await touch('touchStart', [[120, 120]]); await page.waitForTimeout(650);
  ok(await ev(() => document.getElementById('selbox').style.display === 'block'), 'holding for half a second starts a selection box');
  for (let i = 1; i <= 8; i++) { await touch('touchMove', [[120 + i * 70, 120 + i * 24]], i === 1 ? 0.65 : 0.03); await page.waitForTimeout(25); }
  await shot('11_box_drag'); await touch('touchEnd', []); await page.waitForTimeout(300);
  const nsel = await ev(() => window.__app.input.selUnits.length); ok(nsel > 0, 'hold + drag box-selects units (' + nsel + ' selected)');
  await shot('12_box_selected');
  // ---- minimap
  const mmr = await ev(() => { const b = document.getElementById('minimap').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
  const cm0 = await ev(() => ({ x: window.__app.cam.tx, z: window.__app.cam.tz }));
  await tap(mmr[0] + mmr[2] * 0.2, mmr[1] + mmr[3] * 0.8);
  const cm1 = await ev(() => ({ x: window.__app.cam.tx, z: window.__app.cam.tz }));
  ok(Math.hypot(cm1.x - cm0.x, cm1.z - cm0.z) > 10, 'tapping the minimap moves the camera');
  // ---- panels
  for (const n of ['army', 'tech', 'kingdom']) {
    await tap(...(await ev((k) => { const b = document.querySelector('.pbtn[data-p=' + k + ']').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, n)));
    await page.waitForTimeout(500); await shot('13_panel_' + n);
    const inView = await ev((k) => { const e = k === 'army' ? document.getElementById('armypanel') : document.querySelector('.dlg'); if (!e) return false; const b = e.getBoundingClientRect(); return b.bottom <= window.innerHeight + 1 && b.right <= window.innerWidth + 1 && b.height > 40; }, n);
    ok(inView, 'panel "' + n + '" fits on screen');
    await tap(...(await ev((k) => { const b = document.querySelector('.pbtn[data-p=' + k + ']').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, n))); await page.waitForTimeout(200);
  }
  // control groups from the army panel
  await ev(() => { const a = window.__app; a.ui.togglePanel('army'); }); await page.waitForTimeout(400);
  const gbtn = await ev(() => { const b = document.querySelectorAll('#armypanel .gb')[2]; if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  ok(!!gbtn, 'army panel has group buttons');
  if (gbtn) { await tap(...gbtn); await page.waitForTimeout(300); ok(await ev(() => (window.__app.g.teams[0].groups[3] || []).length > 0), 'tapping an empty group slot saves the selection'); }
  await ev(() => window.__app.ui.togglePanel('army'));
  // ---- back button hook
  await ev(() => window.__app.input.clearSel());
  ok(await ev(() => window.__ic.back()) === 'game', 'back in game goes to the pause menu'); await page.waitForTimeout(300);
  ok(await ev(() => window.__app.paused && window.__app.menus.isOpen()), 'pause menu is open'); await shot('14_pause');
  ok(await ev(() => window.__ic.back()) === 'game', 'back again resumes'); await page.waitForTimeout(200);
  ok(await ev(() => !window.__app.paused), 'game resumed');
  // ---- suspend (app goes to background): pauses and autosaves
  await ev(() => window.dispatchEvent(new Event('pagehide'))); await page.waitForTimeout(500);
  ok(await ev(() => window.__app.paused), 'moving to the background pauses the game');
  await ev(() => window.__app.closePause());
  await ev(() => window.__app.ui.togglePanel('build')); await page.waitForTimeout(300); await shot('15_build_sheet');
  if (process.env.PAYLOAD === '1') ok(externals.length === 0, 'no request left the app origin' + (externals.length ? ': ' + externals.slice(0, 3).join(', ') : ''));
  ok(await ev(() => { try { return !!localStorage.getItem('ic_settings') || true; } catch (e) { return false; } }), 'localStorage is usable');
  await browser.close();
  console.log(fails ? ('FAILED: ' + fails) : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('TEST CRASH', e); process.exit(2); });
