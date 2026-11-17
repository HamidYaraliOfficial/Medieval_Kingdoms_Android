const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const cfg = JSON.parse(process.argv[2] || '{}');
  const q = JSON.parse(process.argv[3] || '{}');
  const steps = JSON.parse(process.argv[4] || '[]'); // [{name, step, look:[x,z,dist,yaw,pitch], eval}]
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('console', (m) => console.log('[page]', m.type(), m.text().slice(0, 400)));
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 800)));
  await page.goto('file://' + path.resolve(__dirname, 'render.html'));
  const info = await page.evaluate(([c, q]) => window.boot(c, q), [cfg, q]);
  console.log('boot', JSON.stringify(info));
  for (const s of steps) {
    const t0 = Date.now();
    const res = await page.evaluate((s) => {
      const T = window.T;
      if (s.weather) T.r.setWeather(s.weather);
      if (s.tod != null) { T.r.q.dayNight = false; T.r.fixedTod = s.tod; }
      if (s.step) T.step(s.step);
      if (s.look) { const L = s.look.slice(); if (L[0] === 'START' || L[0] === 'ENEMY') { const st = T.g.teams[L[0] === 'START' ? 0 : 1].start; L[0] = (st.tx + 0.5) * 2 + (s.dx || 0); L[1] = (st.tz + 0.5) * 2 + (s.dz || 0); } T.look(...L); }
      if (s.eval) { try { eval(s.eval); } catch (e) { return 'EVAL ERR ' + e; } }
      T.draw(s.frames || 3);
      return JSON.stringify({ draw: T.r.stats.draw, tri: T.r.stats.tri, units: T.g.units.length, b: T.g.buildings.length, t: Math.round(T.g.time) });
    }, s);
    await page.screenshot({ path: path.resolve(__dirname, 'out', s.name + '.png') });
    console.log(s.name, res, (Date.now() - t0) + 'ms');
  }
  await browser.close();
})();
