// Real-Electron smoke test: launches the packaged app (Linux build of the same code), attaches over CDP,
// checks the preload bridge, the IPC file storage and that a game can be started and saved.
// usage: node tests/electron_smoke.cjs <path-to-Game-binary>
const { spawn } = require('child_process'); const { chromium } = require('playwright'); const fs = require('fs'); const os = require('os'); const path = require('path');
const bin = process.argv[2];
(async () => {
  const data = path.join(os.homedir(), '.config', 'IronCrown-MedievalKingdoms'); fs.rmSync(data, { recursive: true, force: true });
  const p = spawn('xvfb-run', ['-a', '-s', '-screen 0 1280x800x24', bin, '--no-sandbox', '--remote-debugging-port=9333', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', (d) => log += d); p.stderr.on('data', (d) => log += d);
  let browser;
  for (let i = 0; i < 60 && !browser; i++) { await new Promise((r) => setTimeout(r, 1000)); try { browser = await chromium.connectOverCDP('http://127.0.0.1:9333'); } catch (e) {} }
  if (!browser) { console.log('could not attach\n', log.slice(-1500)); p.kill(); process.exit(1); }
  const ctx = browser.contexts()[0]; let page = ctx.pages()[0]; for (let i = 0; i < 30 && !page; i++) { await new Promise((r) => setTimeout(r, 500)); page = ctx.pages()[0]; }
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
  await page.waitForFunction(() => window.__app && !document.getElementById('boot'), null, { timeout: 120000 });
  console.log('title:', await page.title(), '| url:', page.url().slice(-40));
  console.log('bridge:', JSON.stringify(await page.evaluate(() => ({ keys: Object.keys(window.kingdoms || {}), platform: window.kingdoms && window.kingdoms.platform }))));
  console.log('fonts loaded:', JSON.stringify(await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i); })));
  await page.evaluate(() => window.__app.startGame({ mode: 'skirmish', mapId: 'greenvalley', size: 'medium', seed: 5, enemies: 1, difficulty: 'normal', army: 8 }));
  for (let i = 0; i < 120 && !(await page.evaluate(() => window.__app.playing)); i++) await page.waitForTimeout(500);
  console.log('playing:', await page.evaluate(() => window.__app.playing), 'buildings:', await page.evaluate(() => window.__app.g.buildings.length));
  await page.evaluate(() => window.__app.saveToSlot(1, false)); await page.waitForTimeout(1500);
  const files = fs.existsSync(path.join(data, 'data')) ? fs.readdirSync(path.join(data, 'data')) : [];
  console.log('files in userData/data:', JSON.stringify(files));
  await page.screenshot({ path: path.join(__dirname, 'out', 'electron_smoke.png') });
  p.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 1500)); try { await browser.close(); } catch (e) {}
  console.log('--- app log tail ---\n' + log.split('\n').filter((l) => !/dbus|gpu_|GLib|libva|vaapi|Fontconfig|viz_main|ERROR:gl|angle_platform/i.test(l)).slice(-12).join('\n'));
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
