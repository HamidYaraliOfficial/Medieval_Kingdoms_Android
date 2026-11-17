// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Application shell: boot, game lifecycle, main loop, save/load, campaign progress, music and settings application.
import { Renderer } from './render.js';
import { AudioSys } from './audio.js';
import { RTSCamera } from './camera.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Menus } from './menus.js';
import { makeThumbs } from './icons.js';
import { createGame } from './setup.js';
import { serialize, deserialize, SaveError } from './save.js';
import { storage } from './storage.js';
import { settings, loadSettings, onSettings, qualityOf } from './settings.js';
import { t, isRTL } from './i18n.js';
import { MISSIONS, VERSION } from './data.js';
import { clamp } from './util.js';
import { IS_TOUCH, IS_ANDROID, applyPlatformClasses, chromeMajor } from './platform.js';

const frames = (n = 2) => new Promise((res) => { const f = () => (--n <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });

class App {
  constructor() {
    this.canvas = document.getElementById('view'); this.g = null; this.playing = false; this.paused = false; this.modal = false; this.capturingKey = false;
    this.speed = 1; this.progress = { unlocked: 1, done: [] }; this.thumbs = { b: {}, u: {} }; this.cfg = null; this.lastSlot = 1;
    this.audio = new AudioSys(); this.cam = new RTSCamera(); this.tr = t; this.last = performance.now(); this.fps = 60;
    this.wantTrack = 'menu'; this.autoT = 0; this.calm = 99; this.inBattle = false; this.gameTrack = 'game'; this.menuT = 0; this.applied = {};
  }

  async boot() {
    applyPlatformClasses();
    await loadSettings();
    this.progress = Object.assign({ unlocked: 1, done: [] }, await storage.getJSON('progress', null) || {});
    this.applyLang();
    this.ui = new UI(this); this.menus = new Menus(this); this.ui.setVisible(false);
    this.menus.profile = Object.assign({ name: '' }, await storage.getJSON('profile', null) || {});
    try { this.renderer = new Renderer(this.canvas, qualityOf(settings), { preserve: /preserve=1/.test(location.search) }); }
    catch (e) { console.error(e); this.fatal(t('err.gl')); return; }
    this.renderer.applyQuality(qualityOf(settings));
    this.renderer.onThunder = () => this.audio.thunder();
    try { this.thumbs = makeThumbs(96); } catch (e) { console.warn('thumbnails unavailable', e); }
    this.input = new Input(this);
    this.ui.rebuild();
    onSettings(() => this.applySettings());
    this.applySettings(true);
    window.addEventListener('resize', () => this.renderer.resize(window.innerWidth, window.innerHeight));
    window.addEventListener('pagehide', () => this.onSuspend());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.onSuspend(); else if (this.audio) this.audio.init(); });
    window.__ic = { back: () => this.onBack() }; // called by the Android shell for the hardware / gesture back button
    if (IS_ANDROID && chromeMajor() && chromeMajor() < 90) setTimeout(() => this.ui.message(t('err.webview')), 600);
    const gesture = () => { if (!this.audio.ctx) { this.audio.init(); if (this.audio.ctx) this.audio.playTrack(this.wantTrack, true); } else this.audio.init(); };
    window.addEventListener('pointerdown', gesture); window.addEventListener('keydown', gesture);
    window.addEventListener('keydown', (e) => { if (!this.playing && e.code === 'Escape' && !this.capturingKey) { if (this.ui.confirmClose) this.ui.confirmClose(false); else this.menus.onEscape(); } });
    document.addEventListener('mouseover', (e) => { const b = e.target.closest && e.target.closest('#screens button'); if (b && b !== this.hoverB) { this.hoverB = b; this.audio.ui('hover'); } });
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#screens button')) this.audio.ui('click'); });
    this.menus.saves = await storage.listSaves();
    this.startMenuScene();
    this.menus.go('main', null, true);
    document.getElementById('boot').remove();
    requestAnimationFrame((n) => this.loop(n));
  }
  fatal(msg) { const b = document.getElementById('boot'); if (b) b.innerHTML = '<div class="fatal"><h2>' + t('game.title') + '</h2><p>' + msg + '</p><button id="qx">' + t('menu.exit') + '</button></div>'; const q = document.getElementById('qx'); if (q) q.onclick = () => this.exitGame(true); }

  // ---------------------------------------------------------------- settings
  applyLang() { const fa = settings.lang === 'fa'; document.documentElement.lang = settings.lang; document.documentElement.dir = isRTL() ? 'rtl' : 'ltr'; document.body.classList.toggle('fa', fa); document.title = t('game.title'); }
  onLang() { this.applyLang(); if (this.ui) this.ui.rebuild(); if (this.menus && this.menus.isOpen()) this.menus.render(); }
  applySettings(first) {
    const S = settings, a = this.applied;
    if (this.renderer) this.renderer.applyQuality(qualityOf(S));
    this.audio.applyVolumes({ master: S.volMaster, music: S.volMusic, sfx: S.volSfx, ambient: S.volAmbient });
    const nat = window.kingdoms;
    if (a.fullscreen !== S.fullscreen && (!first || S.fullscreen)) {
      if (nat && nat.setFullscreen) nat.setFullscreen(S.fullscreen);
      else if (S.fullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else if (!S.fullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    if (a.resolution !== S.resolution && nat && nat.setResolution && !S.fullscreen && (!first || S.resolution !== 'auto')) { const m = /^(\d+)x(\d+)$/.exec(S.resolution); if (m) nat.setResolution(+m[1], +m[2]); }
    a.fullscreen = S.fullscreen; a.resolution = S.resolution;
    if (this.renderer) this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  // ---------------------------------------------------------------- game lifecycle
  attachGame(g) {
    this.g = g; this.renderer.setGame(g); this.cam.setGame(g);
    g.on('sfx', (e) => this.audio.sfx(e.s, e.x, e.z));
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }
  startMenuScene() {
    const g = createGame({ mode: 'skirmish', mapId: 'greenvalley', size: 'small', seed: 20260, enemies: 1, difficulty: 'easy', castle: 'large', army: 10, playerName: 'Menu' });
    this.attachGame(g); this.playing = false; this.paused = false; this.speed = 1; this.menuT = 0;
    const e = g.teams[1].start; this.menuC = { x: (e.tx + 0.5) * 2, z: (e.tz + 0.5) * 2 };
    this.cam.jump(this.menuC.x, this.menuC.z, 64); this.cam.tyaw = this.cam.yaw = 0.6;
    this.renderer.sel.units.clear(); this.renderer.sel.buildings.clear();
  }
  async startGame(cfg) {
    cfg = Object.assign({}, cfg); if (cfg.seed == null) cfg.seed = (Math.random() * 1e6) | 0;
    this.menus.hist = []; this.menus.go('loading', { text: t('loading.map') }, true); await frames(3);
    let g; try { g = createGame(cfg); } catch (e) { console.error(e); this.menus.go('main', null, true); this.ui.message(t('err.load')); return; }
    this.beginGame(g, cfg);
  }
  beginGame(g, cfg, extra) {
    this.cancelTimers(); this.attachGame(g); this.cfg = cfg || g.cfg || {};
    this.playing = true; this.paused = false; this.modal = false; this.speed = extra && extra.speed != null ? extra.speed : 1; this.overShown = false; this.autoT = 0; this.calm = 99; this.inBattle = false;
    this.gameTrack = Math.random() < 0.5 ? 'game' : 'game2';
    g.on('notify', (n) => { if (this.g === g) this.ui.notify(n); });
    g.on('gameOver', (o) => { if (this.g === g) this.onGameOver(o); });
    this.input.clearSel(); this.input.cancelMode(true);
    const tm = g.teams[0], cap = g.byId.get(tm.capitalId), x = cap ? cap.cx : (tm.start.tx + 0.5) * 2, z = cap ? cap.cz : (tm.start.tz + 0.5) * 2;
    this.cam.jump(x, z, 62); this.cam.tyaw = this.cam.yaw = 0;
    if (extra && extra.cam) { this.cam.jump(extra.cam.x, extra.cam.z, extra.cam.dist || 62); this.cam.tyaw = this.cam.yaw = extra.cam.yaw || 0; this.cam.tdist = extra.cam.dist || 62; }
    this.menus.hide(); this.ui.attach(g); this.ui.setVisible(true); this.renderer.setWeather('clear');
    this.setMusic(this.gameTrack);
    const mi = g.opts.missionIndex; if (mi != null && MISSIONS[mi]) setTimeout(() => { if (this.g === g) this.ui.toast(t(MISSIONS[mi].title), 'info'); }, 400);
    this.ui.toast(t(IS_TOUCH ? 'tip.touch' : 'tip.rclick'), 'info');
  }
  cancelTimers() { if (this.overTimer) { clearTimeout(this.overTimer); this.overTimer = null; } }
  quitToMenu() {
    this.cancelTimers(); this.input.clearSel(); this.input.cancelMode(true); this.ui.detach(); this.modal = false;
    this.playing = false; this.paused = false; this.startMenuScene(); this.setMusic('menu');
    storage.listSaves().then((l) => { this.menus.saves = l; }); this.menus.hist = []; this.menus.go('main', null, true);
  }
  restart() { const cfg = this.cfg; this.ui.detach(); this.startGame(cfg); }
  nextMission() {
    const g = this.g, i = g.opts.missionIndex; if (i == null || i + 1 >= MISSIONS.length) return;
    this.ui.detach(); this.startGame({ mode: 'campaign', mission: i + 1, bonus: MISSIONS[i].reward, playerName: this.cfg.playerName });
  }
  keepPlaying() { this.menus.hide(); this.paused = false; this.overShown = true; this.setMusic(this.gameTrack); }
  openPause() {
    if (!this.playing || this.menus.isOpen()) return;
    this.input.cancelMode(true); this.paused = true; this.menus.hist = []; this.menus.go('pause', null, true); this.audio.ui('open');
  }
  closePause() { this.menus.hide(); this.paused = false; this.audio.ui('back'); }
  onEscape() {
    if (!this.playing) return;
    if (this.ui.confirmClose) { this.ui.confirmClose(false); return; }
    if (this.menus.isOpen()) { this.menus.onEscape(); return; }
    if (this.ui.closeTop()) return;
    if (this.input.mode) { this.input.cancelMode(); return; }
    this.openPause();
  }
  // the app went to the background (Android home / app switcher / screen off): pause and autosave
  onSuspend() {
    if (this.suspended) return; this.suspended = true; setTimeout(() => { this.suspended = false; }, 800);
    if (this.audio && this.audio.ctx && this.audio.ctx.state === 'running') this.audio.ctx.suspend().catch(() => {});
    if (!this.playing || !this.g || this.g.over || this.overShown) return;
    if (!this.paused) { this.saveToSlot(0, true); this.openPause(); }
  }
  // Android back button: close the top-most thing; returns 'exit' only when the main menu is showing and nothing is left to close
  onBack() {
    if (!this.ui || !this.menus) return 'exit';
    const c = this.menus.cur && this.menus.cur.name;
    if (c === 'loading' || c === 'over') return 'busy';
    if (this.playing) { this.onEscape(); return 'game'; }
    if (this.ui.confirmClose) { this.ui.confirmClose(false); return 'menu'; }
    if (c && c !== 'main') { this.menus.back(); return 'menu'; }
    return 'exit';
  }
  exitGame(force) {
    const go = () => { if (window.kingdoms && window.kingdoms.quit) window.kingdoms.quit(); else window.close(); };
    if (force) go(); else this.ui.confirm(t('conf.exit'), go);
  }
  setMusic(name) { this.wantTrack = name; if (this.audio.ctx) this.audio.playTrack(name); }

  // ---------------------------------------------------------------- speed / alerts
  setSpeed(s) { s = clamp(s, 0, 3); if (s === this.speed) return; this.speed = s; this.audio.ui('click'); this.ui.toast(s === 0 ? t('hud.paused') : t('n.speed', { n: s }), 'info'); this.ui.refreshSoon(); }
  changeSpeed(d) { this.setSpeed(this.speed + d); }
  jumpAlert() { this.ui.jumpAlert(); }

  // ---------------------------------------------------------------- game over & campaign
  onGameOver(o) {
    if (!this.playing || this.overShown) return;
    const g = this.g, mi = g.opts.missionIndex, camp = g.mode === 'campaign' && mi != null;
    let reward = null;
    if (o.win && camp) {
      const m = MISSIONS[mi]; reward = m.reward;
      if (!this.progress.done.includes(m.id)) this.progress.done.push(m.id);
      this.progress.unlocked = Math.max(this.progress.unlocked, Math.min(MISSIONS.length, mi + 2));
      storage.setJSON('progress', this.progress);
    }
    this.setMusic(o.win ? 'victory' : 'defeat'); this.audio.sfx(o.win ? 'horn' : 'boom');
    this.overTimer = setTimeout(() => {
      if (!this.playing || this.g !== g) return;
      this.overShown = true; this.paused = true; this.input.cancelMode(true);
      this.menus.hist = []; this.menus.go('over', { over: o, mission: mi, reward, hasNext: camp && o.win && mi + 1 < MISSIONS.length }, true);
    }, 2800);
  }

  // ---------------------------------------------------------------- save / load
  meta() { const g = this.g, tm = g.teams[0]; return { mode: g.mode, map: g.T.mapId, time: Math.floor(g.time), pop: tm.pop, mission: g.opts.missionIndex != null ? g.opts.missionIndex : null, name: tm.name, saved: Date.now(), v: VERSION }; }
  async saveToSlot(slot, auto) {
    if (!this.g || !this.playing) return false;
    const cam = this.cam, extra = { cam: { x: cam.tx, z: cam.tz, dist: cam.tdist, yaw: cam.tyaw }, speed: this.speed, progress: this.progress, lang: settings.lang };
    let ok = false;
    try { ok = await storage.writeSave(slot, serialize(this.g, extra), this.meta()); } catch (e) { console.error(e); }
    if (ok) { if (!auto) this.lastSlot = slot; this.menus.saves = await storage.listSaves(); }
    this.ui.toast(t(ok ? (auto ? 'n.autosaved' : 'n.saved') : 'n.saveFail'), ok ? 'good' : 'bad');
    if (ok && this.menus.isOpen() && this.menus.cur.name === 'slots') this.menus.render();
    return ok;
  }
  async loadFromSlot(slot) {
    let text; try { text = await storage.readSave(slot); } catch (e) { text = null; }
    if (!text) { this.ui.message(t('err.load')); return false; }
    const was = this.menus.cur; this.menus.go('loading', { text: t('loading') }, true); await frames(3);
    try {
      const { g, extra } = deserialize(text);
      this.ui.detach();
      if (extra && extra.progress) { this.progress.unlocked = Math.max(this.progress.unlocked, extra.progress.unlocked || 1); for (const d of extra.progress.done || []) if (!this.progress.done.includes(d)) this.progress.done.push(d); }
      this.beginGame(g, g.cfg, extra); this.lastSlot = slot || this.lastSlot;
      this.ui.toast(t('n.loaded'), 'good'); return true;
    } catch (e) {
      console.error(e);
      if (was && this.playing) { this.menus.cur = was; this.menus.render(); } else this.menus.go('main', null, true);
      this.ui.message(e instanceof SaveError ? t(e.message === 'newer' ? 'sv.newer' : 'sv.corrupt') : t('err.load'));
      return false;
    }
  }
  async continueGame() {
    const list = await storage.listSaves(); this.menus.saves = list; if (!list.length) return;
    list.sort((a, b) => (b.saved || 0) - (a.saved || 0)); this.loadFromSlot(list[0].slot);
  }
  async quickSave() { if (this.playing && !this.paused && this.g && !this.g.over) this.saveToSlot(this.lastSlot || 1); }
  async quickLoad() { if (this.playing) this.continueGame(); }

  // ---------------------------------------------------------------- main loop
  loop(now) {
    requestAnimationFrame((n) => this.loop(n));
    const lim = settings.fpsLimit; if (lim > 0 && now - this.last < 1000 / lim - 2) return;
    let dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; if (dt <= 0) return;
    this.fps += (1 / dt - this.fps) * 0.1;
    try { this.frame(dt); } catch (e) { if (!this.errShown) { this.errShown = true; console.error(e); } }
  }
  frame(dt) {
    const g = this.g; if (!g) return;
    const cam = this.cam;
    if (this.playing) {
      if (!this.paused && this.speed > 0) this.step(g, dt * this.speed);
      this.input.update(dt);
      if (!this.paused && settings.autosave > 0 && !g.over) { this.autoT += dt; if (this.autoT >= settings.autosave * 60) { this.autoT = 0; this.saveToSlot(0, true); } }
    } else {
      this.menuT += dt; this.step(g, dt);
      cam.tyaw += dt * 0.045; cam.tdist = 66; const k = isRTL() ? -17 : 17; cam.tx = this.menuC.x - Math.cos(cam.tyaw) * k; cam.tz = this.menuC.z + Math.sin(cam.tyaw) * k;
      if (this.menuT > 240) this.startMenuScene();
    }
    cam.update(dt);
    this.renderer.frame(dt, cam);
    this.audio.update(dt, g, cam, this.renderer.env, this.renderer.weather);
    if (this.playing) {
      this.ui.update(dt);
      if (!g.over) {
        const f = this.audio.fightLevel || 0;
        if (f >= 6) { this.calm = 0; this.inBattle = true; } else this.calm += dt;
        if (this.inBattle && this.calm > 12) this.inBattle = false;
        this.setMusic(this.inBattle ? 'battle' : this.gameTrack);
      }
    } else this.setMusic('menu');
  }
  step(g, dt) { let rem = dt, n = 0; while (rem > 1e-6 && n++ < 6) { const s = Math.min(0.1, rem); g.update(s); rem -= s; } }
}

const app = new App(); window.__app = app;
app.boot().catch((e) => { console.error(e); app.fatal(String(e && e.message || e)); });
