// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Menu screens: main menu, campaign, game setup, save/load, settings, credits, pause and game-over.
import { h, icon } from './ui.js';
import { t, num, fmtTimeL, has } from './i18n.js';
import { settings, saveSettings, resetSettings, DEFAULT_KEYS, KEY_ORDER, keyLabel, SHADOW_VALUES } from './settings.js';
import { MAP_ORDER, MISSIONS, GAME_TITLE, VERSION } from './data.js';
import { storage, SLOTS } from './storage.js';
import { IS_ANDROID } from './platform.js';

const THEME_BG = {
  greenvalley: 'linear-gradient(135deg,#4f8a3a,#86b4e0)', highlands: 'linear-gradient(135deg,#e6edf2,#7d8ea0)', riverkingdom: 'linear-gradient(135deg,#5fa040,#3b78b0)',
  forestfrontier: 'linear-gradient(135deg,#2f5a2a,#6d8a55)', rockyfortress: 'linear-gradient(135deg,#8c8672,#5c5a52)', desert: 'linear-gradient(135deg,#e0c88a,#b8905a)', plains: 'linear-gradient(135deg,#7fb452,#c6d890)',
  random: 'repeating-linear-gradient(45deg,#3a3326,#3a3326 8px,#4a4232 8px,#4a4232 16px)',
};
const objText = (o) => (o.t === 'build' ? t('o.build', { key: t('b.' + o.key), n: o.n }) : o.t === 'survive' ? t('o.survive', { n: fmtTimeL(o.s) }) : t('o.' + o.t, { n: o.n }));
const fmtDate = (ms) => { try { return new Date(ms).toLocaleString(settings.lang === 'fa' ? 'fa-IR' : undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; } };

export class Menus {
  constructor(app) {
    this.app = app; this.root = document.getElementById('screens');
    this.hist = []; this.cur = null; this.tab = 'game'; this.camSel = 0; this.cfgs = {}; this.profile = { name: '' };
  }
  get audio() { return this.app.audio; }

  // ---------------------------------------------------------------- navigation
  hide() { this.root.innerHTML = ''; this.root.className = 'hidden'; this.hist = []; this.cur = null; }
  isOpen() { return !!this.cur; }
  go(name, args, replace) {
    if (this.cur && !replace) this.hist.push(this.cur);
    this.cur = { name, args: args || {} }; this.render();
  }
  back() {
    const p = this.hist.pop(); this.audio.ui('back');
    if (p) { this.cur = p; this.render(); } else if (this.app.playing) this.app.closePause(); else this.go('main', null, true);
  }
  render() {
    if (!this.cur) return;
    const { name, args } = this.cur; const f = this['s_' + name]; if (!f) return;
    const overlay = name === 'pause' || name === 'over' || (this.app.playing && name !== 'main');
    this.root.className = overlay ? 'overlay-mode' : name === 'main' ? 'main-mode' : 'page-mode';
    this.root.replaceChildren(f.call(this, args));
  }
  onEscape() { if (!this.cur) return false; if (this.cur.name === 'over' || this.cur.name === 'loading') return true; if (this.cur.name === 'main') return true; this.back(); return true; }

  // ---------------------------------------------------------------- widgets
  btn(label, fn, cls = '', sub) { return h('button', { class: 'btn ' + cls, onclick: fn }, h('span', null, label), sub ? h('small', null, sub) : null); }
  mbtn(label, fn, dis, sub) { return h('button', { class: 'mbtn' + (dis ? ' dis' : ''), onclick: dis ? null : fn }, h('span', null, label), sub ? h('small', null, sub) : null); }
  field(label, ctl, hint) { return h('div', { class: 'fld' }, h('label', null, label), h('div', { class: 'ctl' }, ctl), hint ? h('div', { class: 'hint' }, hint) : null); }
  select(opts, val, on) { return h('select', { onchange: (e) => on(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(val) }, l))); }
  seg(opts, val, on) { const row = h('div', { class: 'seg' }); const draw = (v) => { row.replaceChildren(...opts.map(([k, l]) => h('button', { class: 'sb' + (String(k) === String(v) ? ' on' : ''), onclick: () => { on(k); draw(k); this.audio.ui('click'); } }, l))); }; draw(val); return row; }
  toggle(val, on) { const b = h('button', { class: 'tog' + (val ? ' on' : ''), onclick: () => { val = !val; b.classList.toggle('on', val); b.textContent = val ? t('on') : t('off'); on(val); this.audio.ui('click'); } }, val ? t('on') : t('off')); return b; }
  slider(min, max, step, val, on, show) {
    const lab = h('b', { class: 'sv' }, show ? show(val) : String(val));
    const inp = h('input', { type: 'range', min, max, step, value: val, oninput: (e) => { const v = parseFloat(e.target.value); lab.textContent = show ? show(v) : String(v); on(v); } });
    return h('div', { class: 'sld' }, inp, lab);
  }
  page(title, body, foot, wide) { return h('div', { class: 'page' + (wide ? ' wide' : '') }, h('h1', { class: 'ptitle' }, title), h('div', { class: 'pbody' }, body), h('div', { class: 'pfoot' }, foot || this.btn(t('back'), () => this.back(), ''))); }

  // ---------------------------------------------------------------- main menu
  s_main() {
    const app = this.app, has1 = this.saves && this.saves.length > 0;
    const items = [
      this.mbtn(t('menu.continue'), () => app.continueGame(), !has1),
      this.mbtn(t('menu.load'), () => this.go('slots', { mode: 'load' }), !has1),
      this.mbtn(t('menu.new'), () => this.go('new')),
      this.mbtn(t('menu.campaign'), () => this.go('campaign')),
      this.mbtn(t('menu.skirmish'), () => this.go('setup', { mode: 'skirmish' })),
      this.mbtn(t('menu.free'), () => this.go('setup', { mode: 'free' })),
      this.mbtn(t('menu.custom'), () => this.go('setup', { mode: 'custom' })),
      this.mbtn(t('menu.settings'), () => this.go('settings')),
      this.mbtn(t('menu.credits'), () => this.go('credits')),
      IS_ANDROID ? null : this.mbtn(t('menu.exit'), () => app.exitGame()),
    ].filter(Boolean);
    const embers = Array.from({ length: 26 }, (_, i) => h('i', { class: 'ember', style: { left: ((i * 37) % 100) + '%', animationDuration: (7 + (i * 13) % 9) + 's', animationDelay: '-' + ((i * 5) % 11) + 's', width: (2 + i % 3) + 'px', height: (2 + i % 3) + 'px' } }));
    return h('div', { class: 'mainmenu' }, embers,
      h('div', { class: 'banner left' }), h('div', { class: 'banner right' }),
      h('div', { class: 'titleblock' }, h('div', { class: 'crest' }, icon('crown')), h('h1', null, t('game.title')), h('p', null, t('game.sub'))),
      h('nav', { class: 'mlist' }, items),
      h('footer', { class: 'mfoot' }, h('div', null, t('dev.by') + ' ', h('b', null, t('dev.name'))), h('div', { class: 'dim' }, t('copyright') + '  ·  ' + t('version') + ' ' + num(VERSION))));
  }
  s_new() {
    const card = (ic, title, desc, fn) => h('button', { class: 'modecard', onclick: fn }, icon(ic), h('h3', null, title), h('p', null, desc));
    return this.page(t('menu.newTitle'), h('div', { class: 'modes' },
      card('flag', t('menu.campaign'), t('menu.campaignDesc'), () => this.go('campaign')), card('sword', t('menu.skirmish'), t('menu.skirmishDesc'), () => this.go('setup', { mode: 'skirmish' })),
      card('hammer', t('menu.free'), t('menu.freeDesc'), () => this.go('setup', { mode: 'free' })), card('shield', t('menu.custom'), t('menu.customDesc'), () => this.go('setup', { mode: 'custom' }))), null, true);
  }

  // ---------------------------------------------------------------- campaign
  s_campaign() {
    const pr = this.app.progress, sel = Math.min(this.camSel, MISSIONS.length - 1);
    const list = h('div', { class: 'mlist2' }, MISSIONS.map((m, i) => {
      const locked = i + 1 > pr.unlocked, done = pr.done.includes(m.id);
      return h('button', { class: 'mis' + (i === sel ? ' on' : '') + (locked ? ' locked' : '') + (done ? ' done' : ''), onclick: () => { if (locked) { this.audio.ui('error'); return; } this.camSel = i; this.audio.ui('click'); this.render(); } },
        h('b', { class: 'mn' }, num(i + 1)), h('span', { class: 'mt' }, t(m.title), h('small', null, t('map.' + m.map))), locked ? icon('lock') : done ? icon('check') : null);
    }));
    const m = MISSIONS[sel], locked = sel + 1 > pr.unlocked;
    const prev = sel > 0 && pr.done.includes(MISSIONS[sel - 1].id) ? MISSIONS[sel - 1].reward : null;
    const detail = h('div', { class: 'mdetail' }, h('div', { class: 'mmap', style: { background: THEME_BG[m.map] } }, h('span', null, t('map.' + m.map))), h('h2', null, t('camp.mission', { n: m.id }) + ' — ' + t(m.title)), h('p', { class: 'intro' }, t(m.intro)),
      h('h4', null, t('obj.title')), h('ul', { class: 'olist' }, m.objectives.map((o) => h('li', null, objText(o)))),
      h('div', { class: 'rew' }, h('b', null, t('camp.reward') + ': '), Object.keys(m.reward).filter((k) => m.reward[k]).map((k) => h('span', { class: 'c' }, icon(k), num(m.reward[k]))), !Object.keys(m.reward).some((k) => m.reward[k]) ? h('span', { class: 'dim' }, icon('crown')) : null),
      this.btn(t('camp.begin'), () => this.app.startGame({ mode: 'campaign', mission: sel, bonus: prev, playerName: this.profile.name || t('set.name') }), 'gold big' + (locked ? ' dis' : '')));
    return this.page(t('camp.title'), h('div', { class: 'campaign' }, list, detail), null, true);
  }

  // ---------------------------------------------------------------- setup screens
  s_setup({ mode }) {
    const def = { skirmish: { mode: 'skirmish', mapId: 'greenvalley', size: 'medium', enemies: 1, difficulty: 'normal', res: 'normal', victory: 'conquest', seed: 1234 }, free: { mode: 'free', mapId: 'greenvalley', size: 'medium', res: 'high', seed: 4321 }, custom: { mode: 'custom', mapId: 'plains', size: 'medium', role: 'attack', fort: 'castle', armySize: 'medium', difficulty: 'normal', seed: 777 } }[mode];
    const c = this.cfgs[mode] || (this.cfgs[mode] = Object.assign({}, def));
    const set = (k) => (v) => { c[k] = v; };
    const maps = h('div', { class: 'mapgrid' });
    const drawMaps = () => maps.replaceChildren(...MAP_ORDER.concat('random').map((id) => h('button', { class: 'mapcard' + (c.mapId === id ? ' on' : ''), style: { background: THEME_BG[id] }, onclick: () => { c.mapId = id; this.audio.ui('click'); drawMaps(); seedRow.style.display = id === 'random' ? '' : 'none'; } }, h('span', null, t('map.' + id)))));
    const seedInp = h('input', { type: 'number', value: c.seed, oninput: (e) => { c.seed = parseInt(e.target.value, 10) || 0; } });
    const seedRow = this.field(t('set.seed'), h('div', { class: 'row' }, seedInp, this.btn(t('map.randomize'), () => { c.seed = (Math.random() * 99999) | 0; seedInp.value = c.seed; }, 'sm')));
    seedRow.style.display = c.mapId === 'random' ? '' : 'none'; drawMaps();
    const name = h('input', { type: 'text', maxlength: 18, value: this.profile.name || '', placeholder: t('set.name'), oninput: (e) => { this.profile.name = e.target.value; storage.setJSON('profile', this.profile); } });
    const rows = [];
    if (mode !== 'custom') rows.push(this.field(t('set.name'), name));
    rows.push(this.field(t('set.map'), maps), seedRow, this.field(t('set.size'), this.seg([['small', t('size.small')], ['medium', t('size.medium')], ['large', t('size.large')]], c.size, set('size'))));
    if (mode === 'skirmish') rows.push(this.field(t('set.enemies'), this.seg([[1, '1'], [2, '2'], [3, '3']].map(([a, b]) => [a, num(b)]), c.enemies, (v) => { c.enemies = +v; })), this.field(t('set.diff'), this.seg(['easy', 'normal', 'hard', 'expert'].map((d) => [d, t('diff.' + d)]), c.difficulty, set('difficulty'))), this.field(t('set.res'), this.seg(['low', 'normal', 'high', 'rich'].map((d) => [d, t('res.' + d)]), c.res, set('res'))), this.field(t('set.victory'), this.seg([['conquest', t('vic.conquest')], ['wealth', t('vic.wealth')], ['timed', t('vic.timed')]], c.victory, (v) => { c.victory = v; c.timeLimit = v === 'timed' ? 1800 : undefined; })));
    if (mode === 'free') rows.push(this.field(t('set.res'), this.seg(['normal', 'high', 'rich'].map((d) => [d, t('res.' + d)]), c.res, set('res'))));
    if (mode === 'custom') rows.push(this.field(t('set.role'), this.seg([['attack', t('role.attack')], ['defend', t('role.defend')]], c.role, set('role'))), this.field(t('set.fort'), this.seg([['none', t('fort.none')], ['light', t('fort.light')], ['castle', t('fort.castle')]], c.fort, set('fort'))), this.field(t('set.army'), this.seg(['small', 'medium', 'large', 'epic'].map((d) => [d, t('size.' + d)]), c.armySize, set('armySize'))), this.field(t('set.diff'), this.seg(['easy', 'normal', 'hard', 'expert'].map((d) => [d, t('diff.' + d)]), c.difficulty, set('difficulty'))));
    const start = () => { const cfg = Object.assign({}, c, { playerName: this.profile.name || (settings.lang === 'fa' ? 'پادشاه' : 'King') }); if (cfg.mapId === 'random') cfg.seed = c.seed; else cfg.seed = undefined; this.app.startGame(cfg); };
    return this.page(t('menu.' + mode), h('div', { class: 'form' }, rows), h('div', { class: 'btnrow' }, this.btn(t('back'), () => this.back()), this.btn(t('start'), start, 'gold big')), true);
  }

  // ---------------------------------------------------------------- save / load
  s_slots({ mode }) {
    const saving = mode === 'save';
    const body = h('div', { class: 'slots' }); body.append(h('div', { class: 'dim pad' }, '…'));
    storage.listSaves().then((list) => {
      this.saves = list; const by = {}; for (const m of list) by[m.slot] = m;
      const order = saving ? Array.from({ length: SLOTS }, (_, i) => i + 1) : [0].concat(Array.from({ length: SLOTS }, (_, i) => i + 1));
      body.replaceChildren(...order.map((s) => {
        const m = by[s]; const label = s === 0 ? t('autosave') : t('sv.slot', { n: s });
        const info = m ? h('div', { class: 'sinfo' }, h('b', null, label), h('div', null, t('sv.meta', { mode: t('mode.' + m.mode), map: t(m.map && m.map.startsWith('map.') ? m.map : 'map.' + m.map), time: fmtTimeL(m.time) })), h('div', { class: 'dim' }, fmtDate(m.saved) + (m.pop != null ? '  ·  ' + t('hud.pop') + ' ' + num(m.pop) : '')))
          : h('div', { class: 'sinfo' }, h('b', null, label), h('div', { class: 'dim' }, t('empty')));
        const act = () => {
          if (saving) { if (m) this.app.ui.confirm(t('sv.overwrite'), () => this.app.saveToSlot(s)); else this.app.saveToSlot(s); }
          else if (m) this.app.loadFromSlot(s);
        };
        const del = m ? h('button', { class: 'btn sm danger', onclick: (e) => { e.stopPropagation(); this.app.ui.confirm(t('sv.confirmDel'), async () => { await storage.deleteSave(s); this.saves = await storage.listSaves(); this.render(); }); } }, icon('trash')) : null;
        return h('div', { class: 'slot' + (m ? '' : ' empty') + (!saving && !m ? ' dis' : ''), onclick: act }, info, del);
      }));
    });
    return this.page(t(saving ? 'sv.title' : 'ld.title'), body, null, true);
  }

  // ---------------------------------------------------------------- settings
  s_settings() {
    const S = settings, app = this.app, save = () => saveSettings();
    const tabs = h('div', { class: 'tabs big' }, [['game', 'st.tab.game'], ['gfx', 'st.tab.gfx'], ['audio', 'st.tab.audio'], ['keys', 'st.tab.keys']].map(([k, l]) => h('button', { class: 'tab' + (this.tab === k ? ' on' : ''), onclick: () => { this.tab = k; this.audio.ui('click'); this.render(); } }, t(l))));
    const pct = (v) => num(Math.round(v * 100)) + '%'; const mult = (v) => '×' + num(v.toFixed(1));
    const rows = [];
    if (this.tab === 'game') {
      rows.push(this.field(t('st.lang'), this.seg([['en', 'English'], ['fa', 'فارسی']], S.lang, (v) => { S.lang = v; save(); app.onLang(); this.render(); })),
        this.field(t('st.edge'), this.toggle(S.edgeScroll, (v) => { S.edgeScroll = v; save(); })), this.field(t('st.camspeed'), this.slider(0.4, 2.5, 0.1, S.camSpeed, (v) => { S.camSpeed = v; save(); }, mult)),
        this.field(t('st.rotspeed'), this.slider(0.4, 2.5, 0.1, S.rotSpeed, (v) => { S.rotSpeed = v; save(); }, mult)), this.field(t('st.zoomspeed'), this.slider(0.4, 2.5, 0.1, S.zoomSpeed, (v) => { S.zoomSpeed = v; save(); }, mult)),
        this.field(t('st.tooltips'), this.toggle(S.tooltips, (v) => { S.tooltips = v; save(); })), this.field(t('st.autosave'), this.seg([[0, t('off')], [2, num(2)], [5, num(5)], [10, num(10)]], S.autosave, (v) => { S.autosave = +v; save(); })));
    } else if (this.tab === 'gfx') {
      rows.push(this.field(t('st.quality'), this.seg(['low', 'medium', 'high', 'ultra'].map((q) => [q, { low: settings.lang === 'fa' ? 'کم' : 'Low', medium: settings.lang === 'fa' ? 'متوسط' : 'Medium', high: settings.lang === 'fa' ? 'زیاد' : 'High', ultra: settings.lang === 'fa' ? 'فوق‌العاده' : 'Ultra' }[q]]), S.quality, (v) => { S.quality = v; save(); })),
        this.field(t('st.shadows'), this.select([['preset', t('default')], ['off', t('off')], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], S.shadows, (v) => { S.shadows = v; save(); })),
        this.field(t('st.aa'), this.toggle(S.aa, (v) => { S.aa = v; save(); })), this.field(t('st.fullscreen'), this.toggle(S.fullscreen, (v) => { S.fullscreen = v; save(); })),
        this.field(t('st.resolution'), this.select([['auto', 'Auto'], ['1280x720', '1280×720'], ['1600x900', '1600×900'], ['1920x1080', '1920×1080'], ['2560x1440', '2560×1440']], S.resolution, (v) => { S.resolution = v; save(); })),
        this.field(t('st.fps'), this.select([[30, '30'], [60, '60'], [120, '120'], [144, '144'], [0, t('st.unlimited')]], S.fpsLimit, (v) => { S.fpsLimit = +v; save(); })),
        this.field(t('st.weather'), this.toggle(S.weather, (v) => { S.weather = v; save(); })), this.field(t('st.daynight'), this.toggle(S.dayNight, (v) => { S.dayNight = v; save(); })), this.field(t('st.showfps'), this.toggle(S.showFps, (v) => { S.showFps = v; save(); })));
    } else if (this.tab === 'audio') {
      for (const [k, l] of [['volMaster', 'st.vol.master'], ['volMusic', 'st.vol.music'], ['volSfx', 'st.vol.sfx'], ['volAmbient', 'st.vol.ambient']]) rows.push(this.field(t(l), this.slider(0, 1, 0.05, S[k], (v) => { S[k] = v; save(); }, pct)));
    } else {
      rows.push(h('p', { class: 'dim' }, t('st.keyhint')));
      const grid = h('div', { class: 'keygrid' }, KEY_ORDER.map((a) => {
        const b = h('button', { class: 'keyb', onclick: () => this.capture(a, b) }, keyLabel(S.keys[a]));
        return h('div', { class: 'keyrow' }, h('span', null, t('k.' + a)), b);
      }));
      rows.push(grid, h('p', { class: 'dim small' }, t('st.fixedKeys')), this.btn(t('reset'), () => { for (const k in DEFAULT_KEYS) S.keys[k] = DEFAULT_KEYS[k]; save(); this.render(); }, 'sm'));
    }
    return this.page(t('st.title'), h('div', null, tabs, h('div', { class: 'form scroll' }, rows)), h('div', { class: 'btnrow' }, this.btn(t('back'), () => this.back()), this.btn(t('reset'), () => { resetSettings(); this.app.onLang(); this.render(); }, 'sm')), true);
  }
  capture(action, btn) {
    const app = this.app; if (app.capturingKey) return;
    app.capturingKey = true; btn.textContent = t('st.press'); btn.classList.add('wait');
    const done = (code) => {
      window.removeEventListener('keydown', onKey, true); app.capturingKey = false;
      if (code && code !== 'Escape') { const old = settings.keys[action]; for (const k in settings.keys) if (k !== action && settings.keys[k] === code) settings.keys[k] = old; settings.keys[action] = code; saveSettings(); }
      this.render();
    };
    const onKey = (e) => { e.preventDefault(); e.stopPropagation(); if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) return; done(e.code); };
    window.addEventListener('keydown', onKey, true);
  }

  // ---------------------------------------------------------------- credits
  s_credits() {
    return this.page(t('cr.title'), h('div', { class: 'credits' }, h('div', { class: 'crest' }, icon('crown')), h('h2', null, t('game.title')), h('p', { class: 'dim' }, t('game.sub')),
      h('h3', null, t('dev.by')), h('div', { class: 'big' }, t('dev.name')), h('p', null, t('cr.design')), h('p', { class: 'dim' }, t('cr.assets')), h('p', { class: 'dim' }, t('cr.tech')), h('p', { class: 'dim' }, t('version') + ' ' + num(VERSION)), h('p', { class: 'cp' }, t('copyright')), h('p', null, t('cr.thanks'))));
  }

  // ---------------------------------------------------------------- loading
  s_loading() { return h('div', { class: 'loading' }, h('div', { class: 'spinner' }), h('p', null, args_text(this.cur.args))); }

  // ---------------------------------------------------------------- pause
  s_pause() {
    const app = this.app;
    return h('div', { class: 'pausebox' }, h('h2', null, t('pause.title')), h('div', { class: 'plist' },
      this.mbtn(t('pause.resume'), () => app.closePause()), this.mbtn(t('pause.save'), () => this.go('slots', { mode: 'save' })), this.mbtn(t('pause.load'), () => this.go('slots', { mode: 'load' })),
      this.mbtn(t('pause.settings'), () => this.go('settings')), this.mbtn(t('pause.restart'), () => app.ui.confirm(t('pause.confirmRestart'), () => app.restart())), this.mbtn(t('pause.menu'), () => app.ui.confirm(t('pause.confirmMenu'), () => app.quitToMenu()))));
  }

  // ---------------------------------------------------------------- game over
  s_over({ over, mission, reward, hasNext }) {
    const app = this.app, g = app.g, tm = g.teams[0], win = over.win;
    const stats = h('div', { class: 'ostats' }, [['over.time', fmtTimeL(over.time)], ['over.kills', num(tm.stats.kills)], ['over.lost', num(tm.stats.lost)], ['over.built', num(tm.stats.built)], ['over.gathered', num(Math.floor(tm.stats.gathered))]].map(([k, v]) => h('div', null, h('span', null, t(k)), h('b', null, v))));
    const btns = [];
    if (win && hasNext) btns.push(this.btn(t('over.next'), () => app.nextMission(), 'gold big'));
    if (!win) btns.push(this.btn(t('over.retry'), () => app.restart(), 'gold big'));
    if (win && !hasNext) btns.push(this.btn(t('over.retry'), () => app.restart(), ''));
    if (win && g.mode !== 'campaign') btns.push(this.btn(t('over.keep'), () => app.keepPlaying(), ''));
    btns.push(this.btn(t('over.menu'), () => app.quitToMenu(), ''));
    return h('div', { class: 'overbox ' + (win ? 'win' : 'lose') }, h('div', { class: 'crest' }, icon(win ? 'crown' : 'shield')), h('h1', null, t(win ? 'over.win' : 'over.lose')), h('p', null, t('over.' + over.reason)), stats,
      reward && Object.keys(reward).some((k) => reward[k]) ? h('div', { class: 'rew' }, h('b', null, t('camp.reward') + ': '), Object.keys(reward).filter((k) => reward[k]).map((k) => h('span', { class: 'c' }, icon(k), num(reward[k])))) : null, h('div', { class: 'btnrow' }, btns));
  }
}
function args_text(a) { return a && a.text ? a.text : ''; }
