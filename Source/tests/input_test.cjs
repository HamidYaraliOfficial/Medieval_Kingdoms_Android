const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 600)));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
  await page.addInitScript(() => { localStorage.setItem('ic_settings', JSON.stringify({ quality: 'low', fpsLimit: 0, autosave: 0, edgeScroll: false })); });
  await page.goto('file://' + path.resolve(__dirname, '../UI/index.html'));
  await page.waitForFunction(() => window.__app && !document.getElementById('boot'), null, { timeout: 90000 });
  const ev = (f) => page.evaluate(f);
  await page.click('.mbtn:nth-child(5)'); await page.click('.btn.gold.big');
  while (!(await ev(() => window.__app.playing))) await page.waitForTimeout(300);
  await page.waitForTimeout(1500);
  const R = {};
  // place camera over the starting army
  await ev(() => { const a = window.__app, g = a.g; const us = g.units.filter((u) => u.team === 0 && u.cls !== 'work'); let x = 0, z = 0; for (const u of us) { x += u.x; z += u.z; } a.cam.jump(x / us.length, z / us.length, 40); });
  await page.waitForTimeout(800);
  const scr = await ev(() => { const a = window.__app, g = a.g; const us = g.units.filter((u) => u.team === 0 && u.cls !== 'work'); return us.map((u) => a.renderer.worldToScreen(u.x, u.y + 1, u.z)); });
  const xs = scr.map((p) => p.x), ys = scr.map((p) => p.y);
  const x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + 30, y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 30;
  await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up();
  R.boxSelect = await ev(() => window.__app.input.selUnits.length);
  // right-click move
  await page.mouse.click(500, 250, { button: 'right' });
  R.moveOrder = await ev(() => { const u = window.__app.input.selUnits[0]; return u && u.order && u.order.type; });
  // control group
  await page.keyboard.down('Control'); await page.keyboard.press('Digit1'); await page.keyboard.up('Control');
  await ev(() => window.__app.input.clearSel());
  await page.keyboard.press('Digit1');
  R.groupRecall = await ev(() => window.__app.input.selUnits.length);
  // Space focuses camera
  await ev(() => { window.__app.cam.tx = 20; window.__app.cam.tz = 20; });
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  R.focus = await ev(() => { const c = window.__app.cam; return [Math.round(c.tx), Math.round(c.tz)]; });
  // WASD
  const before = await ev(() => [window.__app.cam.tx, window.__app.cam.tz]);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(500); await page.keyboard.up('KeyD');
  const after = await ev(() => [window.__app.cam.tx, window.__app.cam.tz]);
  R.wasd = [Math.round(after[0] - before[0]), Math.round(after[1] - before[1])];
  // wheel zoom
  const d0 = await ev(() => window.__app.cam.tdist); await page.mouse.move(640, 300); await page.mouse.wheel(0, -300); await page.waitForTimeout(150);
  R.zoom = [Math.round(d0), Math.round(await ev(() => window.__app.cam.tdist))];
  // middle drag rotate
  const y0r = await ev(() => window.__app.cam.tyaw); await page.mouse.move(600, 300); await page.mouse.down({ button: 'middle' }); await page.mouse.move(700, 300, { steps: 5 }); await page.mouse.up({ button: 'middle' });
  R.rotate = +(await ev(() => window.__app.cam.tyaw) - y0r).toFixed(2);
  // speed keys and pause
  await page.keyboard.press('Equal'); R.speed = await ev(() => window.__app.speed);
  await page.keyboard.press('Escape'); R.paused = await ev(() => window.__app.paused);
  await page.keyboard.press('Escape'); R.resumed = await ev(() => !window.__app.paused);
  // quick save / load
  await page.keyboard.press('F5'); await page.waitForTimeout(500);
  R.saves = await ev(() => window.__app.menus.saves.map((m) => m.slot));
  console.log(JSON.stringify(R, null, 1));
  await browser.close();
})();
