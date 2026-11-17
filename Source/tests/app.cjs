// Full-app headless test: node tests/app.cjs '<json steps>'  (steps: {name, eval, wait, click, key, shot})
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const steps = JSON.parse(process.argv[2] || '[]');
  const W = +(process.env.W || 1280), H = +(process.env.H || 720);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 1) });
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning' && !/GPU stall|swiftshader|WebGL/i.test(t)) console.log('[page]', m.type(), t.slice(0, 500)); });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 900)));
  await page.addInitScript(([q, extra]) => { try { if (!localStorage.getItem('ic_settings')) localStorage.setItem('ic_settings', JSON.stringify(Object.assign({ quality: q, fpsLimit: 0, autosave: 0 }, JSON.parse(extra)))); } catch (e) {} }, [process.env.Q || 'low', process.env.SETTINGS || '{}']);
  await page.goto('file://' + path.resolve(__dirname, '../UI/index.html') + '?preserve=1');
  await page.waitForFunction(() => window.__app && !document.getElementById('boot'), null, { timeout: 90000 }).catch((e) => console.log('BOOT FAIL', e.message));
  for (const s of steps) {
    const t0 = Date.now();
    try {
      if (s.eval) { const r = await page.evaluate(s.eval); if (r !== undefined) console.log(s.name || 'eval', JSON.stringify(r).slice(0, 600)); }
      if (s.click) await page.click(s.click, { timeout: 5000 });
      if (s.key) await page.keyboard.press(s.key);
      if (s.mouse) await page.mouse.click(s.mouse[0], s.mouse[1], { button: s.mouse[2] || 'left' });
      if (s.wait) await page.waitForTimeout(s.wait);
      if (s.waitFor) { const t1 = Date.now(); while (Date.now() - t1 < 60000) { const ok = await page.evaluate(s.waitFor); if (ok) break; await page.waitForTimeout(300); } }
    } catch (e) { console.log('STEP ERR', s.name, String(e).slice(0, 300)); }
    if (s.shot) { await page.screenshot({ path: path.resolve(__dirname, 'out', s.shot + '.png') }); console.log('shot', s.shot, (Date.now() - t0) + 'ms'); }
  }
  await browser.close();
})();
