// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// In-game HUD: resource bar, minimap, selection and command panels, build menu, technology tree, kingdom overview, notifications.
import { RES, BUILDINGS, UNITS, TECHS, TECH_BY_ID, BUILD_ORDER, UNIT_ORDER, FORMATIONS, STANCES, TEAM_CSS, PRICES, POP_EAT, MISSIONS } from './data.js';
import { ICONS } from './icons.js';
import { t, num, fmtTimeL, has } from './i18n.js';
import { settings, keyLabel } from './settings.js';
import { terrainTheme } from './models.js';
import { clamp } from './util.js';
import { IS_TOUCH } from './platform.js';

// ---------------------------------------------------------------- tiny DOM helper
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return el;
}
export const icon = (name, cls) => h('span', { class: 'ico' + (cls ? ' ' + cls : ''), html: ICONS[name] || '' });
const fmt = (n) => num(Math.floor(n + 1e-6));
const fmtRate = (r) => { const v = Math.round(r * 10) / 10; return (v > 0 ? '+' : '') + num(v.toFixed(1)); };
const kbd = (code) => h('kbd', null, keyLabel(code));
const FX_ABS = new Set(['def', 'rrange']);
const MM = 220;

export class UI {
  constructor(app) {
    this.app = app; this.root = document.getElementById('hud');
    this.panels = { build: !IS_TOUCH, army: false };
    this.objCollapsed = IS_TOUCH; this.tab = 'eco'; this.alerts = []; this.live = []; this.dlg = null; this.confirmClose = null;
    this.slowT = 0; this.mmT = 0; this.selSigStr = ''; this.lastToast = { text: '', t: 0 }; this.tipFn = null; this.fpsT = 0; this.fpsN = 0;
    this.build();
  }
  get g() { return this.app.g; }
  get team() { return this.app.g ? this.app.g.teams[0] : null; }
  thumb(kind, key, cls = '') {
    const url = this.app.thumbs && this.app.thumbs[kind] && this.app.thumbs[kind][key];
    return url ? h('img', { src: url, class: 'thumb ' + cls, draggable: 'false', alt: '' }) : h('div', { class: 'thumb ph ' + cls }, (t((kind === 'b' ? 'b.' : 'u.') + key) || '?')[0]);
  }
  setVisible(v) { this.root.classList.toggle('hidden', !v); }

  // ---------------------------------------------------------------- tooltips
  tip(el, fn) {
    if (IS_TOUCH) return;
    el.addEventListener('mouseenter', () => { if (!settings.tooltips) return; this.tipFn = fn; this.showTip(); });
    el.addEventListener('mouseleave', () => { this.tipFn = null; this.tipEl.style.display = 'none'; });
    el.addEventListener('mousemove', (e) => this.moveTip(e));
  }
  showTip() { if (!this.tipFn) return; const c = this.tipFn(); this.tipEl.innerHTML = ''; if (typeof c === 'string') this.tipEl.textContent = c; else this.tipEl.append(c); this.tipEl.style.display = 'block'; }
  moveTip(e) {
    const el = this.tipEl; if (el.style.display === 'none') return;
    const W = window.innerWidth, H = window.innerHeight, r = el.getBoundingClientRect();
    let x = e.clientX + 16, y = e.clientY - r.height - 12;
    if (x + r.width > W - 6) x = e.clientX - r.width - 16;
    if (y < 6) y = e.clientY + 18;
    if (y + r.height > H - 6) y = H - r.height - 6;
    el.style.left = Math.max(6, x) + 'px'; el.style.top = y + 'px';
  }
  costRow(cost, small) {
    const tm = this.team;
    return h('span', { class: 'cost' + (small ? ' sm' : '') }, Object.keys(cost).map((k) => h('span', { class: 'c' + (tm && (tm.res[k] || 0) < cost[k] - 1e-6 ? ' short' : ''), 'data-r': k }, icon(k), fmt(cost[k]))));
  }
  bldTip(key) {
    const d = BUILDINGS[key], lines = [];
    lines.push(h('div', null, t('bld.size') + ': ' + num(d.w) + '×' + num(d.d) + '  ·  ' + t('bld.hp') + ': ' + fmt(d.hp)));
    if (d.popCap) lines.push(h('div', null, t('bld.pop', { n: d.popCap })));
    if (d.store) lines.push(h('div', null, t('bld.store', { n: d.store })));
    if (d.tower) lines.push(h('div', null, t('bld.tower', { r: d.tower.range, d: d.tower.dmg, s: d.tower.slots })));
    if (d.prod) {
      const o = Object.keys(d.prod.out).map((k) => '+' + num(d.prod.out[k])).join(' ');
      lines.push(h('div', { class: 'prod' }, t('bld.produces') + ': ', Object.keys(d.prod.out).map((k) => h('span', null, icon(k), num(d.prod.out[k]))), ' ' + t('bld.per', { n: d.prod.cycle }), o ? '' : ''));
      if (d.prod.inp) lines.push(h('div', { class: 'prod' }, t('bld.needs') + ': ', Object.keys(d.prod.inp).map((k) => h('span', null, icon(k), num(d.prod.inp[k])))));
    }
    if (d.gather) lines.push(h('div', { class: 'prod' }, t('bld.produces') + ': ', icon(d.gather)));
    if (d.workers) lines.push(h('div', null, t('bld.workers') + ': ' + num(d.workers)));
    if (d.trains) lines.push(h('div', null, t('bld.trains') + ': ' + d.trains.map((k) => t('u.' + k)).join('، ')));
    if (d.upkeep) lines.push(h('div', { class: 'dim' }, t('bld.upkeep', { n: d.upkeep })));
    if (d.tech && !this.team.techs.has(d.tech)) lines.push(h('div', { class: 'bad' }, t('bld.needtech', { t: t('t.' + d.tech) })));
    if (d.limit) lines.push(h('div', { class: 'dim' }, t('bld.limit') + ': ' + num(d.limit)));
    return h('div', { class: 'tipc' }, h('h4', null, t('b.' + key)), h('p', null, t('bd.' + key)), h('div', { class: 'row' }, t('hud.cost') + ': ', this.costRow(d.cost)), lines);
  }
  unitTip(key) {
    const d = UNITS[key];
    return h('div', { class: 'tipc' }, h('h4', null, t('u.' + key)), h('p', null, t('ud.' + key)), h('div', { class: 'row' }, t('hud.cost') + ': ', this.costRow(d.cost), ' · ', icon('clock'), t('hud.time.s', { n: d.time })),
      h('div', null, t('sel.hp') + ' ' + fmt(d.hp) + ' · ' + t('sel.atk') + ' ' + fmt(d.atk) + ' · ' + t('sel.def') + ' ' + fmt(d.def) + ' · ' + t('sel.range') + ' ' + num(d.range) + ' · ' + t('sel.speed') + ' ' + num(d.speed)),
      d.tech && !this.team.techs.has(d.tech) ? h('div', { class: 'bad' }, t('bld.needtech', { t: t('t.' + d.tech) })) : null);
  }

  // ---------------------------------------------------------------- skeleton
  build() {
    const R = this.root; R.innerHTML = '';
    this.resEls = {};
    const resBox = h('div', { class: 'resbar' }, RES.map((r) => {
      const amt = h('b', { class: 'amt' }), rate = h('span', { class: 'rate' });
      const el = h('div', { class: 'chip res' }, icon(r), h('div', { class: 'cv' }, amt, rate));
      this.resEls[r] = { el, amt, rate };
      this.tip(el, () => { const tm = this.team, f = tm.flow[r]; return h('div', { class: 'tipc' }, h('h4', null, t('r.' + r)), h('div', null, fmt(tm.res[r]) + ' / ' + fmt(tm.cap[r])), h('div', { class: 'good' }, '+' + num(f.rin.toFixed(1)) + ' ' + t('hud.income')), h('div', { class: 'bad' }, '−' + num(f.rout.toFixed(1)) + ' ' + t('hud.income'))); });
      return el;
    }));
    this.popAmt = h('b', { class: 'amt' }); this.popSub = h('span', { class: 'rate' });
    this.popEl = h('div', { class: 'chip', onclick: () => this.app.input.selectAllArmy() }, icon('pop'), h('div', { class: 'cv' }, this.popAmt, this.popSub));
    this.tip(this.popEl, () => h('div', { class: 'tipc' }, h('h4', null, t('hud.pop')), h('div', null, icon('sword'), t('hud.army') + ': ' + fmt(this.team.army)), h('div', null, icon('pop'), t('hud.vill') + ': ' + fmt(this.team.vill)), this.team.pop >= this.team.popCap ? h('div', { class: 'bad' }, t('hud.popfull')) : null));
    this.happyAmt = h('b', { class: 'amt' });
    this.happyEl = h('div', { class: 'chip xs-hide' }, icon('happy'), h('div', { class: 'cv' }, this.happyAmt));
    this.tip(this.happyEl, () => h('div', { class: 'tipc' }, h('h4', null, t('hud.happy')), h('div', { class: 'dim' }, t('k.tax.hint'))));
    this.foodAmt = h('b', { class: 'amt' });
    this.foodEl = h('div', { class: 'chip' }, icon('food'), h('div', { class: 'cv' }, this.foodAmt, h('span', { class: 'rate dim' }, t('hud.foodsup'))));
    this.tip(this.foodEl, () => h('div', { class: 'tipc' }, h('h4', null, t('hud.foodsup')), h('div', null, t('hud.food.days', { n: Math.floor(this.foodSecs()) }))));
    this.taxBtns = [0, 1, 2, 3].map((i) => h('button', { class: 'taxb', onclick: () => { this.team.tax = i; this.app.audio.ui('click'); this.slowT = 0; } }, num(i)));
    this.taxEl = h('div', { class: 'chip tax xs-hide' }, icon('tax'), h('div', { class: 'taxrow' }, this.taxBtns));
    this.tip(this.taxEl, () => h('div', { class: 'tipc' }, h('h4', null, t('hud.tax') + ': ' + t('tax.' + this.team.tax)), h('div', { class: 'dim' }, t('k.tax.hint'))));
    this.idleAmt = h('b', { class: 'amt' });
    this.idleEl = h('div', { class: 'chip idle', onclick: () => this.app.input.selectIdle() }, icon('hammer'), h('div', { class: 'cv' }, this.idleAmt));
    this.tip(this.idleEl, () => t('k.idle') + ' (' + keyLabel(settings.keys.selectIdle) + ')');
    this.timeAmt = h('b', { class: 'amt' });
    this.timeEl = h('div', { class: 'chip' }, icon('clock'), h('div', { class: 'cv' }, this.timeAmt));
    this.speedBtns = [[0, 'pause'], [1, '1×'], [2, '2×'], [3, '3×']].map(([s, lab]) => h('button', { class: 'spb', onclick: () => this.app.setSpeed(s) }, s === 0 ? icon('pause') : num(s) + '×'));
    const speedEl = h('div', { class: 'speed' }, this.speedBtns);
    this.tip(speedEl, () => t('hud.speed'));
    const menuBtn = h('button', { class: 'menub', onclick: () => this.app.openPause() }, icon('menu'));
    this.tip(menuBtn, () => t('hud.menu') + ' (' + keyLabel(settings.keys.pause) + ')');
    const top = h('div', { id: 'topbar' }, resBox, h('div', { class: 'statbar' }, this.popEl, this.idleEl, this.happyEl, this.foodEl, this.taxEl, this.timeEl, speedEl, menuBtn));
    this.objEl = h('div', { id: 'objectives' });
    this.noteBox = h('div', { id: 'notes' });
    this.hintEl = h('div', { id: 'hint' });
    this.fpsEl = h('div', { id: 'fps' });
    this.mm = h('canvas', { id: 'minimap', width: MM, height: MM });
    this.bindMinimap();
    const panelBtns = h('div', { class: 'pbtns' }, [['build', 'hammer', 'panelBuild', 'panel.build'], ['army', 'sword', 'panelArmy', 'panel.army'], ['tech', 'book', 'panelTech', 'panel.tech'], ['kingdom', 'crown', 'panelKingdom', 'panel.kingdom']].map(([n, ic, k, lab]) => {
      const b = h('button', { class: 'pbtn', 'data-p': n, onclick: () => this.togglePanel(n) }, icon(ic), kbd(settings.keys[k]));
      this.tip(b, () => t(lab) + ' (' + keyLabel(settings.keys[k]) + ')'); return b;
    }));
    this.selEl = h('div', { id: 'selpanel' });
    this.buildEl = h('div', { id: 'buildpanel' });
    this.armyEl = h('div', { id: 'armypanel', class: 'hidden' });
    this.dlgLayer = h('div', { id: 'dialogs' });
    this.tipEl = h('div', { id: 'tooltip' });
    this.tbar = h('div', { id: 'tbar', class: 'hidden' }); this.tbOk = null;
    const dock = h('div', { id: 'dock' }, h('div', { id: 'mmwrap' }, this.mm, panelBtns), this.selEl, this.buildEl);
    this.leftCol = h('div', { id: 'leftcol' }, this.objEl, this.armyEl);
    R.append(top, this.leftCol, this.noteBox, this.hintEl, this.tbar, dock, this.dlgLayer, this.fpsEl, this.tipEl);
    this.buildMenu(); this.syncPanels();
  }
  rebuild() { const g = this.g; this.build(); if (g) { this.initMinimap(); this.selSigStr = ''; this.slowT = 0; this.dlg = null; } }
  attach(g) {
    this.alerts = []; this.noteBox.innerHTML = ''; this.dlgLayer.innerHTML = ''; this.dlg = null; this.selSigStr = ''; this.hint('');
    this.panels.army = false; this.syncPanels(); this.buildMenu(); this.initMinimap(); this.slowT = 0; this.mmT = 0; this.setVisible(true);
    this.updateObjectives(true);
  }
  detach() { this.setVisible(false); this.dlgLayer.innerHTML = ''; this.dlg = null; this.noteBox.innerHTML = ''; if (this.confirmClose) this.confirmClose(false); }

  // ---------------------------------------------------------------- minimap
  initMinimap() {
    const g = this.g; if (!g) return;
    const S = MM, T = g.T, base = document.createElement('canvas'); base.width = base.height = S;
    const c = base.getContext('2d'), img = c.createImageData(S, S), th = terrainTheme(T.theme);
    const col = (x) => [(x >> 16) & 255, (x >> 8) & 255, x & 255];
    const low = col(th.low), mid = col(th.mid), high = col(th.high), sand = col(th.sand);
    const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const wx = (x + 0.5) / S * T.size, wz = (y + 0.5) / S * T.size, hh = T.heightAt(wx, wz);
      let C;
      if (hh < T.wl - 0.35) C = [36, 88, 136]; else if (hh < T.wl) C = [66, 128, 176]; else if (hh < T.wl + 0.4) C = sand;
      else { const f = clamp((hh - T.wl) / 9, 0, 1); C = f < 0.5 ? mix(low, mid, f * 2) : mix(mid, high, (f - 0.5) * 2); }
      const sh = clamp(1 + (T.heightAt(wx - 3, wz - 3) - T.heightAt(wx + 3, wz + 3)) * 0.07, 0.7, 1.3);
      const i = (y * S + x) * 4; img.data[i] = clamp(C[0] * sh, 0, 255); img.data[i + 1] = clamp(C[1] * sh, 0, 255); img.data[i + 2] = clamp(C[2] * sh, 0, 255); img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    const NC = { tree: '#2a4a22', stone: '#b4b0a4', ore: '#7a5a48', gold: '#ffd24a' };
    for (const n of g.nodes) { const k = NC[n.type]; if (!k) continue; c.fillStyle = k; c.fillRect(Math.floor(n.x / T.size * S), Math.floor(n.z / T.size * S), n.type === 'tree' ? 1 : 2, n.type === 'tree' ? 1 : 2); }
    this.mmBase = base; this.mmCtx = this.mm.getContext('2d'); this.drawMinimap();
  }
  bindMinimap() {
    const mm = this.mm; let drag = false;
    const pos = (e) => { const r = mm.getBoundingClientRect(), T = this.g.T; return [clamp((e.clientX - r.left) / r.width, 0, 1) * T.size, clamp((e.clientY - r.top) / r.height, 0, 1) * T.size]; };
    mm.addEventListener('contextmenu', (e) => e.preventDefault());
    mm.style.touchAction = 'none'; let tdrag = false;
    const jump = (e) => { const [x, z] = pos(e); this.app.cam.tx = x; this.app.cam.tz = z; };
    mm.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' || !this.g) return; e.preventDefault(); try { mm.setPointerCapture(e.pointerId); } catch (err) { } tdrag = true; jump(e); });
    mm.addEventListener('pointermove', (e) => { if (tdrag && this.g && e.pointerType !== 'mouse') { e.preventDefault(); jump(e); } });
    mm.addEventListener('pointerup', () => { tdrag = false; }); mm.addEventListener('pointercancel', () => { tdrag = false; });
    mm.addEventListener('mousedown', (e) => {
      if (!this.g) return; const [x, z] = pos(e);
      if (e.button === 0) { drag = true; this.app.cam.tx = x; this.app.cam.tz = z; }
      else if (e.button === 2) { const u = this.app.input.selUnits.filter((q) => !q.dead); if (u.length) { this.g.orderMove(u, x, z, {}); this.app.renderer.marker(x, z, 'move'); this.app.audio.ui('click'); } }
    });
    window.addEventListener('mousemove', (e) => { if (drag && this.g) { const [x, z] = pos(e); this.app.cam.tx = x; this.app.cam.tz = z; } });
    window.addEventListener('mouseup', () => { drag = false; });
  }
  drawMinimap() {
    const g = this.g, c = this.mmCtx; if (!g || !c || !this.mmBase) return;
    const S = MM, k = S / g.T.size, tm = this.team;
    c.drawImage(this.mmBase, 0, 0);
    for (const b of g.buildings) { if (b.dead) continue; c.fillStyle = TEAM_CSS[b.team % TEAM_CSS.length]; const w = Math.max(2, b.w * 2 * k), d = Math.max(2, b.d * 2 * k); c.fillRect(b.tx * 2 * k, b.tz * 2 * k, w, d); if (b.def.territory) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(b.tx * 2 * k - 1, b.tz * 2 * k - 1, w + 2, d + 2); } }
    for (const u of g.units) { if (u.dead || u.inside) continue; c.fillStyle = TEAM_CSS[u.team % TEAM_CSS.length]; const s = u.cls === 'siege' || u.cls === 'cav' ? 3 : 2; c.fillRect(u.x * k - s / 2, u.z * k - s / 2, s, s); }
    const sel = this.app.input.selUnits; c.fillStyle = '#fff'; for (const u of sel) { if (!u.dead) c.fillRect(u.x * k - 0.5, u.z * k - 0.5, 1.6, 1.6); }
    const now = performance.now();
    for (const a of this.alerts) { const age = (now - a.t) / 1000; if (age < 6 && a.pos) { c.strokeStyle = a.kind === 'bad' ? '#ff4a3a' : '#ffe27a'; c.lineWidth = 2; c.beginPath(); c.arc(a.pos.x * k, a.pos.z * k, 4 + (age * 8) % 12, 0, 6.283); c.stroke(); } }
    // camera frustum
    const r = this.app.renderer; const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => r.groundPoint(x, y));
    c.strokeStyle = '#fff'; c.lineWidth = 1.5;
    if (pts.every((p) => p)) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x * k, p.z * k) : c.moveTo(p.x * k, p.z * k))); c.closePath(); c.stroke(); }
    else { c.beginPath(); c.arc(this.app.cam.x * k, this.app.cam.z * k, 5, 0, 6.283); c.stroke(); }
  }

  // ---------------------------------------------------------------- panels
  togglePanel(name) {
    this.app.audio.ui('open');
    if (name === 'build') { this.panels.build = !this.panels.build; this.syncPanels(); return; }
    if (name === 'army') { this.panels.army = !this.panels.army; this.syncPanels(); this.armySig = ''; return; }
    if (this.dlg && this.dlg.name === name) { this.closeDialog(); return; }
    this.openDialog(name);
  }
  syncPanels() {
    this.buildEl.classList.toggle('hidden', !this.panels.build); this.armyEl.classList.toggle('hidden', !this.panels.army);
    this.root.classList.toggle('sheet-build', !!this.panels.build);
    for (const b of this.root.querySelectorAll('.pbtn')) { const n = b.dataset.p; b.classList.toggle('on', n === 'build' ? this.panels.build : n === 'army' ? this.panels.army : !!(this.dlg && this.dlg.name === n)); }
  }
  closeTop() {
    if (this.confirmClose) { this.confirmClose(false); return true; }
    if (this.dlg) { this.closeDialog(); return true; }
    if (this.panels.army) { this.panels.army = false; this.syncPanels(); return true; }
    return false;
  }
  hint(text, bad) { if (!this.hintEl) return; this.hintEl.textContent = text || ''; this.hintEl.classList.toggle('bad', !!bad); this.hintEl.style.display = text ? 'block' : 'none'; }
  onModeChange() {
    const inp = this.app.input, m = inp && inp.mode;
    if (IS_TOUCH && m === 'place' && this.panels.build) this.panels.build = false;
    this.syncPanels(); this.slowT = 0; this.renderTbar();
  }
  // touch only: floating buttons while placing a building or choosing a target
  renderTbar() {
    const inp = this.app.input, el = this.tbar, m = inp && inp.mode;
    document.body.classList.toggle('placing', !!m);
    this.tbOk = null;
    if (!IS_TOUCH || !m) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden'); el.innerHTML = '';
    if (m === 'place' && inp.place) {
      const def = BUILDINGS[inp.place.key];
      if (!def.line) { this.tbOk = h('button', { class: 'tbb ok' + (inp.place.ok ? '' : ' no'), 'aria-label': t('tb.ok'), onclick: () => inp.commitPlace(false) }, icon('check')); el.append(this.tbOk); }
      if (!def.line && def.w !== def.d) el.append(h('button', { class: 'tbb', 'aria-label': t('tb.rotate'), onclick: () => inp.rotatePlace() }, '⟳'));
    }
    el.append(h('button', { class: 'tbb cancel', 'aria-label': t('tb.cancel'), onclick: () => { inp.cancelMode(); this.app.audio.ui('back'); } }, icon('x')));
  }
  refreshSoon() { this.slowT = 0; }

  // ---------------------------------------------------------------- notifications
  toast(text, kind = 'info', pos) {
    const now = performance.now();
    if (text === this.lastToast.text && now - this.lastToast.t < 2500) return;
    this.lastToast = { text, t: now };
    const el = h('div', { class: 'toast ' + kind, onclick: () => { if (pos) { this.app.cam.tx = pos.x; this.app.cam.tz = pos.z; } } }, text);
    if (pos) { el.classList.add('link'); this.alerts.push({ pos, t: now, kind }); if (this.alerts.length > 20) this.alerts.shift(); }
    this.noteBox.append(el);
    while (this.noteBox.children.length > 6) this.noteBox.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 6500); setTimeout(() => el.remove(), 7200);
  }
  notify(n) {
    if (n.team !== 0 && n.team !== -1) return;
    const p = Object.assign({}, n.params);
    if (p.b) p.b = t('b.' + p.b); if (p.tech) p.tech = t('t.' + p.tech);
    if (p.o) p.o = t('oo.' + p.o);
    if (n.key === 'n.attack' || n.key === 'n.lostbuilding' || n.key === 'n.lostcastle') this.app.audio.sfx('horn');
    this.toast(t(n.key, p), n.level === 'bad' ? 'bad' : n.level === 'good' ? 'good' : 'info', n.pos);
  }
  jumpAlert() { const a = this.alerts[this.alerts.length - 1]; if (a) { this.app.cam.tx = a.pos.x; this.app.cam.tz = a.pos.z; } }
  confirm(text, cb, okLabel) {
    if (this.confirmClose) this.confirmClose(false);
    const prev = this.app.modal; this.app.modal = true;
    const done = (ok) => { box.remove(); this.confirmClose = null; this.app.modal = prev; if (ok) cb(); };
    const box = h('div', { class: 'overlay' }, h('div', { class: 'confirm' }, h('p', null, text), h('div', { class: 'btnrow' }, h('button', { class: 'btn gold', onclick: () => done(true) }, okLabel || t('ok')), h('button', { class: 'btn', onclick: () => done(false) }, t('cancel')))));
    this.confirmClose = done; (document.getElementById('modal') || this.root).append(box); this.app.audio.ui('open');
  }

  message(text) {
    if (this.confirmClose) this.confirmClose(false);
    const prev = this.app.modal; this.app.modal = true;
    const done = () => { box.remove(); this.confirmClose = null; this.app.modal = prev; };
    const box = h('div', { class: 'overlay' }, h('div', { class: 'confirm' }, h('p', null, text), h('div', { class: 'btnrow' }, h('button', { class: 'btn gold', onclick: done }, t('ok')))));
    this.confirmClose = done; (document.getElementById('modal') || this.root).append(box); this.app.audio.ui('error');
  }

  // ---------------------------------------------------------------- objectives
  updateObjectives(force) {
    const g = this.g; if (!g) return;
    const el = this.objEl, objs = g.objectives || [];
    const sig = objs.map((o) => (o.done ? 1 : 0) + ':' + Math.floor(o.v || 0)).join('|') + g.mode + (this.objCollapsed ? 1 : 0);
    if (!force && sig === this.objSig) return; this.objSig = sig;
    el.innerHTML = '';
    const lines = [];
    if (objs.length) {
      for (const o of objs) {
        let txt;
        if (o.t === 'build') txt = t('o.build', { key: t('b.' + o.key), n: o.n });
        else if (o.t === 'survive') txt = t('o.survive', { n: fmtTimeL(o.s) });
        else txt = t('o.' + o.t, { n: o.n });
        let prog = '';
        if (o.t === 'survive') prog = fmtTimeL(Math.min(o.v, o.s)) + '/' + fmtTimeL(o.s); else if (o.n != null && o.t !== 'destroy') prog = fmt(Math.min(o.v || 0, o.n)) + '/' + fmt(o.n); else if (o.t === 'destroy') prog = fmt(o.v || 0) + '/' + fmt(o.n || (g.teams.length - 1));
        lines.push(h('li', { class: o.done ? 'done' : '' }, o.done ? icon('check') : h('span', { class: 'bul' }), h('span', { class: 'ot' }, txt), h('span', { class: 'op' }, prog)));
      }
    } else if (g.mode === 'skirmish') lines.push(h('li', null, h('span', { class: 'bul' }), h('span', { class: 'ot' }, t('vic.' + (g.opts.victory || 'conquest')))));
    else if (g.mode === 'custom') lines.push(h('li', null, h('span', { class: 'bul' }), h('span', { class: 'ot' }, t('role.' + (g.opts.role || 'attack')))));
    if (!lines.length) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const mi = g.opts.missionIndex; const title = mi != null && MISSIONS[mi] ? t(MISSIONS[mi].title) : t('obj.title');
    el.append(h('div', { class: 'otitle', onclick: () => { this.objCollapsed = !this.objCollapsed; this.updateObjectives(true); } }, icon('flag'), h('span', null, title)));
    if (!this.objCollapsed) el.append(h('ul', null, lines)); // (append(null) would print the text "null")
  }

  updCost(root, cost) { const tm = this.team; for (const c of root.querySelectorAll('.c')) c.classList.toggle('short', (tm.res[c.dataset.r] || 0) < (cost[c.dataset.r] || 0) - 1e-6); }

  // ---------------------------------------------------------------- build menu
  buildMenu() {
    const el = this.buildEl; el.innerHTML = ''; this.bItems = []; this.hideTip();
    const tabs = h('div', { class: 'tabs' }, ['eco', 'mil', 'def', 'admin'].map((c) => h('button', { class: 'tab' + (c === this.tab ? ' on' : ''), onclick: () => { this.tab = c; this.buildMenu(); this.app.audio.ui('click'); } }, t('cat.' + c))));
    const grid = h('div', { class: 'bgrid' }, BUILD_ORDER[this.tab].map((key) => {
      const d = BUILDINGS[key];
      const btn = h('button', { class: 'bitem', onclick: () => this.app.input.startPlace(key) }, this.thumb('b', key), h('span', { class: 'bn' }, t('b.' + key)), this.costRow(d.cost, true), h('span', { class: 'lockmark' }, icon('lock')));
      this.tip(btn, () => this.bldTip(key));
      this.bItems.push({ key, el: btn }); return btn;
    }));
    el.append(tabs, grid); this.refreshBuildMenu();
  }
  refreshBuildMenu() {
    const tm = this.team, g = this.g; if (!tm) return;
    for (const it of this.bItems) {
      const d = BUILDINGS[it.key];
      const locked = (d.tech && !tm.techs.has(d.tech)) || (d.limit && g.buildings.filter((b) => b.team === 0 && b.key === it.key && !b.dead).length >= d.limit);
      it.el.classList.toggle('locked', !!locked);
      it.el.classList.toggle('poor', !g.canAfford(tm, d.cost));
      it.el.classList.toggle('on', !!(this.app.input.mode === 'place' && this.app.input.place && this.app.input.place.key === it.key));
      this.updCost(it.el, d.cost);
    }
  }

  // ---------------------------------------------------------------- selection panel
  onSelection() {
    this.selSigStr = ''; this.slowT = 0;
    if (IS_TOUCH && this.panels.build && this.app.input) { const i = this.app.input; if (i.selUnits.length || i.selBuilding || i.selOther) { this.panels.build = false; this.syncPanels(); } }
  }
  selSig() {
    const inp = this.app.input, g = this.g, tm = this.team;
    if (inp.selBuilding) {
      const b = inp.selBuilding; let aff = '';
      for (const k of b.def.trains || []) aff += g.canAfford(tm, UNITS[k].cost) ? 1 : 0;
      if (b.def.research) for (const x of TECHS) if (x.bld === b.def.research) aff += g.canAfford(tm, x.cost) && g.researchAvailable(tm, x, b) ? 1 : 0;
      if (g.canUpgrade(b)) aff += g.canAfford(tm, g.upgradeCost(b)) ? 'u1' : 'u0';
      return ['b', b.id, b.level, b.built ? 1 : 0, b.upg ? 1 : 0, b.want, b.queue.map((q) => q.type[0] + q.id).join(','), b.garrison.length, aff, tm.techs.size].join('|');
    }
    if (inp.selUnits.length) { const c = {}; let st = '', gar = 0; for (const u of inp.selUnits) { c[u.key] = (c[u.key] || 0) + 1; st += u.stance ? u.stance[0] : ''; if (u.garrisonOf) gar++; } return 'u|' + JSON.stringify(c) + '|' + tm.formation + '|' + (inp.selUnits[0].stance || '') + '|' + gar + '|' + (inp.mode || ''); }
    if (inp.selOther) return 'o|' + inp.selOther.id;
    return 'n|' + tm.idle;
  }
  cmdBtn(ic, label, code, fn, on, tipText) {
    const b = h('button', { class: 'cmd' + (on ? ' on' : ''), onclick: fn }, icon(ic), h('span', null, t(label)), code ? kbd(code) : null);
    this.tip(b, () => tipText || (t(label) + (code ? ' (' + keyLabel(code) + ')' : ''))); return b;
  }
  barEl(frac, text, cls) {
    const fill = h('i'), txt = h('span'), el = h('div', { class: 'bar ' + (cls || '') }, fill, txt);
    const up = () => { const f = clamp(frac(), 0, 1); fill.style.width = (f * 100).toFixed(1) + '%'; el.dataset.lv = f > 0.6 ? 'hi' : f > 0.3 ? 'mid' : 'lo'; if (text) txt.textContent = text(); };
    up(); this.live.push(up); return el;
  }
  hideTip() { this.tipFn = null; if (this.tipEl) this.tipEl.style.display = 'none'; }
  renderSel() {
    const inp = this.app.input, el = this.selEl; el.innerHTML = ''; this.live = []; this.hideTip();
    if (inp.selBuilding) this.renderBuilding(inp.selBuilding);
    else if (inp.selUnits.length) this.renderUnits(inp.selUnits);
    else if (inp.selOther) this.renderOther(inp.selOther);
    else this.renderNone();
    const any = !!(inp.selBuilding || inp.selUnits.length || inp.selOther);
    el.classList.toggle('empty', !any);
    if (IS_TOUCH && any) el.prepend(h('button', { class: 'selx', 'aria-label': t('tb.deselect'), onclick: () => inp.clearSel() }, icon('x')));
  }
  renderNone() {
    const tm = this.team;
    this.selEl.append(h('div', { class: 'nosel' }, h('h3', null, t('help.title')), h('p', null, t('help.body')), h('div', { class: 'btnrow' },
      h('button', { class: 'btn sm', onclick: () => this.app.input.selectAllArmy() }, icon('sword'), t('k.selectArmy') + ' (' + keyLabel(settings.keys.selectArmy) + ')'),
      h('button', { class: 'btn sm', onclick: () => this.app.input.selectIdle() }, icon('hammer'), t('k.selectIdle') + ' (' + keyLabel(settings.keys.selectIdle) + ')'))));
  }
  renderUnits(list) {
    const inp = this.app.input, g = this.g, tm = this.team, by = {};
    for (const u of list) (by[u.key] || (by[u.key] = [])).push(u);
    const keys = UNIT_ORDER.filter((k) => by[k]);
    const cards = h('div', { class: 'ugroups' }, keys.map((k) => {
      const c = h('button', { class: 'ucard', onclick: (e) => { if (e.shiftKey) { const rest = list.filter((u) => u.key !== k); inp.setSel(rest, null, null); } else inp.setSel(by[k], null, null); } }, this.thumb('u', k), h('b', { class: 'cnt' }, fmt(by[k].length)), h('span', { class: 'nm' }, t('u.' + k)));
      this.tip(c, () => this.unitTip(k)); return c;
    }));
    const mil = inp.militaryOf(list);
    const one = keys.length === 1 ? by[keys[0]] : null;
    const head = h('div', { class: 'uhead' }, h('h3', null, list.length === 1 ? t('u.' + list[0].key) : t('sel.units', { n: list.length })), this.barEl(() => { let a = 0, m = 0; for (const u of list) { a += u.hp; m += u.maxHp; } return m ? a / m : 0; }, () => { let a = 0, m = 0; for (const u of list) { a += u.hp; m += u.maxHp; } return fmt(a) + ' / ' + fmt(m); }));
    const stats = h('div', { class: 'ustats' });
    if (one) {
      const u = one[0], def = u.def;
      stats.append(...[h('span', null, icon('sword'), t('sel.atk') + ' ' + fmt(u.atk)), h('span', null, icon('shield'), t('sel.def') + ' ' + fmt(u.armor)), h('span', null, icon('patrol'), t('sel.speed') + ' ' + num(u.speed.toFixed(1))), def.range > 3 ? h('span', null, icon('attack'), t('sel.range') + ' ' + fmt(u.range)) : null].filter(Boolean));
    }
    const st = {}; for (const u of list) st[u.state] = (st[u.state] || 0) + 1;
    stats.append(h('span', { class: 'dim' }, Object.keys(st).map((s) => t('st.' + s) + ' ' + num(st[s])).join(' · ')));
    const cmds = h('div', { class: 'cmds' });
    const K = settings.keys;
    cmds.append(this.cmdBtn('stop', 'cmd.stop', K.stop, () => inp.cmdStop()));
    if (mil.length) {
      cmds.append(this.cmdBtn('patrol', 'cmd.patrol', K.patrol, () => inp.setMode('patrol'), inp.mode === 'patrol'), this.cmdBtn('attack', 'cmd.attackmove', K.attackMove, () => inp.setMode('attackmove'), inp.mode === 'attackmove'),
        this.cmdBtn('tower', 'cmd.garrison', K.garrison, () => inp.setMode('garrison'), inp.mode === 'garrison'), this.cmdBtn('retreat', 'cmd.retreat', K.retreat, () => inp.cmdRetreat()));
      if (list.some((u) => u.garrisonOf)) cmds.append(this.cmdBtn('up', 'cmd.ungarrison', null, () => inp.cmdUngarrison()));
    }
    this.selEl.append(h('div', { class: 'usel' }, h('div', { class: 'ucol' }, head, stats, cards), h('div', { class: 'ccol' }, cmds,
      mil.length ? h('div', { class: 'seg' }, h('span', { class: 'lab' }, t('cmd.formation')), FORMATIONS.map((f) => h('button', { class: 'sb' + (tm.formation === f ? ' on' : ''), onclick: () => inp.cmdFormation(f) }, t('form.' + f)))) : h('div', { class: 'dim tipline' }, t(IS_TOUCH ? 'tip.touch' : 'tip.rclick')),
      mil.length ? h('div', { class: 'seg' }, h('span', { class: 'lab' }, t('cmd.stance')), STANCES.map((s) => h('button', { class: 'sb' + (mil[0].stance === s ? ' on' : ''), onclick: () => inp.cmdStance(s) }, t('stance.' + s)))) : null)));
  }
  renderOther(o) {
    const g = this.g, tm = g.teams[o.team];
    const isB = o.kind === 'b';
    const head = h('div', { class: 'bhead' }, this.thumb(isB ? 'b' : 'u', o.key, 'big'), h('div', { class: 'binfo' }, h('h3', null, t((isB ? 'b.' : 'u.') + o.key)), h('div', { class: 'sub', style: { color: TEAM_CSS[o.team % TEAM_CSS.length] } }, tm ? tm.name : '')));
    this.selEl.append(h('div', { class: 'osel' }, head, this.barEl(() => o.hp / o.maxHp, () => fmt(o.hp) + ' / ' + fmt(o.maxHp)), isB ? h('p', { class: 'dim' }, t('bd.' + o.key)) : h('div', { class: 'ustats' }, h('span', null, icon('sword'), t('sel.atk') + ' ' + fmt(o.atk)), h('span', null, icon('shield'), t('sel.def') + ' ' + fmt(o.armor)), h('span', null, icon('attack'), t('sel.range') + ' ' + fmt(o.range)))));
  }
  renderBuilding(b) {
    const g = this.g, tm = this.team, d = b.def, inp = this.app.input;
    const head = h('div', { class: 'bhead' }, this.thumb('b', b.key, 'big'), h('div', { class: 'binfo' }, h('h3', null, t('b.' + b.key)), h('div', { class: 'sub' }, t('bld.level', { n: b.level }))));
    const body = h('div', { class: 'bbody' });
    body.append(this.barEl(() => b.hp / b.maxHp, () => fmt(b.hp) + ' / ' + fmt(b.maxHp)));
    if (!b.built) body.append(h('div', { class: 'lbl' }, t('bld.building')), this.barEl(() => b.progress, () => Math.floor(b.progress * 100) + '%', 'prog'));
    else {
      if (b.upg) body.append(h('div', { class: 'lbl' }, t('bld.upgrading')), this.barEl(() => b.upg ? b.upg.t / b.upg.total : 1, null, 'prog'));
      if (d.workers) {
        const val = h('b'); const upd = () => { val.textContent = num(b.wk || 0) + ' / ' + num(b.want != null ? b.want : d.workers); }; upd(); this.live.push(upd);
        body.append(h('div', { class: 'wrow' }, h('span', null, icon('pop'), t('bld.workers')), h('button', { class: 'sq', onclick: () => { g.setWorkers(b, (b.want != null ? b.want : d.workers) - 1); this.slowT = 0; } }, icon('minus')), val, h('button', { class: 'sq', onclick: () => { g.setWorkers(b, (b.want != null ? b.want : d.workers) + 1); this.slowT = 0; } }, icon('plus'))));
      }
      if (d.tower) body.append(h('div', { class: 'dim' }, icon('tower'), t('bld.garrison') + ' ' + num(b.garrison.length) + '/' + num(g.garrisonSlots(b))));
      if (d.trains) body.append(h('div', { class: 'trainrow' }, d.trains.map((k) => {
        const locked = !g.unitAvailable(tm, k);
        const btn = h('button', { class: 'ti' + (locked ? ' locked' : '') + (!g.canAfford(tm, UNITS[k].cost) ? ' poor' : ''), onclick: () => this.train(b, k) }, this.thumb('u', k), h('span', { class: 'bn' }, t('u.' + k)), this.costRow(UNITS[k].cost, true), h('span', { class: 'lockmark' }, icon('lock')));
        this.tip(btn, () => this.unitTip(k)); return btn;
      })));
      if (d.research) {
        const list = TECHS.filter((x) => x.bld === d.research && g.researchAvailable(tm, x, b));
        if (list.length) body.append(h('div', { class: 'lbl' }, t('bld.research')), h('div', { class: 'trainrow' }, list.map((x) => {
          const btn = h('button', { class: 'ti tech' + (!g.canAfford(tm, x.cost) ? ' poor' : ''), onclick: () => { if (!g.queueResearch(b, x.id)) this.fail(); else this.refreshSoon(); } }, icon('book'), h('span', { class: 'bn' }, t('t.' + x.id)), this.costRow(x.cost, true));
          this.tip(btn, () => this.techTip(x)); return btn;
        })));
      }
      if (b.queue.length) body.append(h('div', { class: 'queue' }, b.queue.map((q, i) => {
        const it = h('button', { class: 'qi', onclick: () => { g.cancelQueue(b, i); this.app.audio.ui('back'); this.refreshSoon(); } }, q.type === 'unit' ? this.thumb('u', q.id) : icon('book'), i === 0 ? this.barEl(() => 1 - (b.queue[0] ? b.queue[0].left / b.queue[0].total : 1), null, 'mini') : null);
        this.tip(it, () => (q.type === 'unit' ? t('u.' + q.id) : t('t.' + q.id)) + ' — ' + t('cancel')); return it;
      })));
      const act = h('div', { class: 'cmds' });
      if (g.canUpgrade(b)) { const c = g.upgradeCost(b); const ub = h('button', { class: 'cmd' + (!g.canAfford(tm, c) ? ' poor' : ''), onclick: () => { if (g.upgradeBuilding(b)) { this.app.audio.ui('confirm'); this.refreshSoon(); } else this.fail(); } }, icon('up'), h('span', null, t('bld.upgrade')), this.costRow(c, true)); act.append(ub); }
      if (d.trains || b.key === 'keep' || b.key === 'townhall') { const rb = h('button', { class: 'cmd', onclick: () => { if (IS_TOUCH) inp.setMode('rally'); else this.toast(t('rally.hint'), 'info'); } }, icon('flag'), h('span', null, t('bld.rally'))); act.append(rb); }
      if (b.key === 'market') act.append(h('button', { class: 'cmd', onclick: () => this.openDialog('kingdom') }, icon('gold'), h('span', null, t('panel.market'))));
      if (b.garrison.length) act.append(this.cmdBtn('up', 'cmd.ungarrison', null, () => { for (const id of b.garrison.slice()) { const u = g.byId.get(id); if (u) g.ungarrison(u, false); } this.refreshSoon(); }));
      if (g.canRelocate(b)) { const rc = g.relocateCost(b), rb2 = this.cmdBtn('flag', 'bld.relocate', null, () => inp.startRelocate(b)); if (!g.canAfford(tm, rc)) rb2.classList.add('poor'); rb2.append(this.costRow(rc, true)); act.append(rb2); }
      act.append(this.cmdBtn('trash', 'bld.demolish', settings.keys.demolish, () => inp.demolishSel()));
      body.append(act);
    }
    this.selEl.append(h('div', { class: 'bsel' }, head, body, h('p', { class: 'dim bdesc' }, t('bd.' + b.key))));
  }
  train(b, k) {
    const g = this.g;
    if (!g.unitAvailable(this.team, k)) { this.toast(t('bld.needtech', { t: t('t.' + UNITS[k].tech) }), 'bad'); this.app.audio.ui('error'); return; }
    if (g.queueUnit(b, k)) { this.app.audio.ui('confirm'); this.refreshSoon(); } else this.fail();
  }
  fail() { this.toast(t('hud.noaff'), 'bad'); this.app.audio.ui('error'); }
  techTip(x) {
    return h('div', { class: 'tipc' }, h('h4', null, t('t.' + x.id)), h('div', null, this.fxText(x)), h('div', { class: 'row' }, t('hud.cost') + ': ', this.costRow(x.cost), ' · ', icon('clock'), t('hud.time.s', { n: x.time })),
      x.unlock ? h('div', { class: 'good' }, t('tech.unlocks', { t: has('b.' + x.unlock) ? t('b.' + x.unlock) : t('u.' + x.unlock) })) : null);
  }
  fxText(x) {
    const parts = [];
    for (const k in x.fx) { const v = x.fx[k]; const sign = k === 'fee' ? '−' : '+'; parts.push(t('fx.' + k) + ' ' + sign + (FX_ABS.has(k) ? num(v) : num(Math.round(v * 100)) + '%')); }
    return parts.join(' · ');
  }

  // ---------------------------------------------------------------- army panel
  updateArmy() {
    const g = this.g, tm = this.team, inp = this.app.input; if (!this.panels.army) return;
    const by = {}, hp = {}; let idle = 0;
    for (const u of g.units) { if (u.team !== 0 || u.dead) continue; if (u.cls === 'work') { if (u.state === 'idle' && !u.job) idle++; continue; } (by[u.key] || (by[u.key] = [])).push(u); }
    const grp = tm.groups || {};
    const sig = UNIT_ORDER.map((k) => (by[k] ? by[k].length : 0)).join(',') + '|' + idle + '|' + Object.keys(grp).map((k) => k + ':' + (grp[k] || []).length).join(',');
    if (sig === this.armySig) return; this.armySig = sig;
    const el = this.armyEl; el.innerHTML = ''; this.hideTip();
    el.append(h('div', { class: 'ptitle' }, icon('sword'), h('span', null, t('panel.army')), h('button', { class: 'xb', onclick: () => this.togglePanel('army') }, icon('x'))));
    if (IS_TOUCH) {
      el.append(h('div', { class: 'groups' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const live = (grp[n] || []).map((id) => g.byId.get(id)).filter((u) => u && !u.dead && u.kind === 'u');
        const assign = () => { if (!inp.selUnits.length) return; tm.groups[n] = inp.selUnits.map((u) => u.id); this.toast(t('n.groupSet', { n }), 'info'); this.armySig = ''; };
        return h('button', { class: 'gb' + (live.length ? ' has' : ''), onclick: () => { if (live.length) inp.selectGroup(live, false); else assign(); }, oncontextmenu: (e) => { e.preventDefault(); assign(); } }, h('kbd', null, num(n)), live.length ? fmt(live.length) : '+');
      })));
    }
    const rows = UNIT_ORDER.filter((k) => by[k]).map((k) => {
      let a = 0, m = 0; for (const u of by[k]) { a += u.hp; m += u.maxHp; }
      return h('button', { class: 'arow', onclick: (e) => inp.selectGroup(by[k], e.shiftKey) }, this.thumb('u', k), h('span', { class: 'nm' }, t('u.' + k)), h('b', null, fmt(by[k].length)), h('div', { class: 'bar mini', 'data-lv': a / m > 0.6 ? 'hi' : a / m > 0.3 ? 'mid' : 'lo' }, h('i', { style: { width: (a / m * 100) + '%' } })));
    });
    el.append(h('div', { class: 'alist' }, rows.length ? rows : h('div', { class: 'dim pad' }, t('panel.none'))));
    el.append(h('div', { class: 'btnrow' }, h('button', { class: 'btn sm', onclick: () => inp.selectAllArmy() }, icon('sword'), t('k.selectArmy')), h('button', { class: 'btn sm', onclick: () => inp.selectIdle() }, icon('hammer'), t('k.idle') + ' ' + fmt(idle))));
    if (IS_TOUCH) { el.append(h('p', { class: 'dim small' }, t('grp.hint'))); return; }
    const gk = Object.keys(grp).filter((k) => (grp[k] || []).some((id) => { const u = g.byId.get(id); return u && !u.dead; }));
    if (gk.length) el.append(h('div', { class: 'groups' }, gk.map((k) => h('button', { class: 'gb', onclick: (e) => inp.selectGroup(grp[k].map((id) => g.byId.get(id)).filter((u) => u && !u.dead), e.shiftKey) }, h('kbd', null, num(k)), fmt(grp[k].filter((id) => { const u = g.byId.get(id); return u && !u.dead; }).length)))));
  }

  // ---------------------------------------------------------------- dialogs (technology, kingdom)
  openDialog(name) {
    this.closeDialog(true);
    const mk = name === 'tech' ? this.makeTech() : this.makeKingdom();
    const el = h('div', { class: 'dlg ' + name }, h('div', { class: 'dhead' }, icon(name === 'tech' ? 'book' : 'crown'), h('h2', null, t(name === 'tech' ? 'tech.title' : 'k.title')), h('button', { class: 'xb', onclick: () => this.closeDialog() }, icon('x'))), h('div', { class: 'dbody' }, mk.body));
    this.dlgLayer.append(el); this.dlg = { name, el, update: mk.update }; mk.update(); this.syncPanels(); this.app.audio.ui('open');
  }
  closeDialog(silent) { if (!this.dlg) return; this.dlg.el.remove(); this.dlg = null; this.syncPanels(); if (!silent) this.app.audio.ui('back'); }
  techBuilding(x) {
    const g = this.g; let best = null;
    for (const b of g.buildings) if (b.team === 0 && b.built && !b.dead && b.def.research === x.bld && b.queue.length < 4 && (!best || b.queue.length < best.queue.length)) best = b;
    return best;
  }
  makeTech() {
    const g = this.g, tm = this.team, cards = [];
    const cols = ['eco', 'mil'].map((bld) => h('div', { class: 'tcol' }, h('h3', null, t('tech.' + bld)), [1, 2, 3].map((tier) => h('div', { class: 'ttier' }, h('div', { class: 'tl' }, t('tech.tier', { n: tier })), h('div', { class: 'trow' }, TECHS.filter((x) => x.bld === bld && x.tier === tier).map((x) => {
      const state = h('div', { class: 'tstate' }), prog = h('i'), pb = h('div', { class: 'bar mini' }, prog);
      const btn = h('button', { class: 'btn sm', onclick: () => { const b = this.techBuilding(x); if (!b) { this.toast(t('tech.build', { b: t('b.' + (bld === 'eco' ? 'townhall' : 'blacksmith')) }), 'bad'); this.app.audio.ui('error'); return; } if (g.queueResearch(b, x.id)) { this.app.audio.ui('confirm'); upd(); } else this.fail(); } }, t('bld.research'));
      const card = h('div', { class: 'tcard' }, h('div', { class: 'tn' }, t('t.' + x.id)), h('div', { class: 'tfx' }, this.fxText(x), x.unlock ? h('div', { class: 'good' }, t('tech.unlocks', { t: has('b.' + x.unlock) ? t('b.' + x.unlock) : t('u.' + x.unlock) })) : null),
        x.req.length ? h('div', { class: 'dim' }, t('tech.needs', { t: x.req.map((r) => t('t.' + r)).join('، ') })) : null, this.costRow(x.cost, true), pb, state, btn);
      cards.push({ x, card, state, btn, prog, pb, cost: card.querySelector('.cost') }); return card;
    }))))));
    const upd = () => {
      for (const c of cards) {
        const x = c.x, done = tm.techs.has(x.id); let q = null;
        for (const b of g.buildings) if (b.team === 0 && !b.dead) { const f = b.queue.find((z) => z.type === 'tech' && z.id === x.id); if (f) { q = f; break; } }
        const reqOk = x.req.every((r) => tm.techs.has(r)); const s = done ? 'done' : q ? 'prog' : reqOk ? 'avail' : 'locked';
        c.card.className = 'tcard ' + s; c.btn.style.display = s === 'avail' ? '' : 'none'; c.pb.style.display = s === 'prog' ? '' : 'none';
        c.state.textContent = s === 'done' ? '✓ ' + t('tech.researched') : s === 'prog' ? t('tech.researching') : '';
        if (q) c.prog.style.width = ((1 - q.left / q.total) * 100) + '%';
        c.btn.classList.toggle('poor', !g.canAfford(tm, x.cost));
        if (s !== 'done') this.updCost(c.card, x.cost); else c.cost.style.display = 'none';
      }
    };
    return { body: h('div', { class: 'tgrid' }, cols), update: upd };
  }
  makeKingdom() {
    const g = this.g, tm = this.team, refs = {};
    const stat = (k, label, ic) => { const v = h('b'); refs[k] = v; return h('div', { class: 'kstat' }, ic ? icon(ic) : null, h('span', null, label), v); };
    const stats = h('div', { class: 'kstats' }, stat('pop', t('hud.pop'), 'pop'), stat('army', t('hud.army'), 'sword'), stat('vill', t('hud.vill'), 'pop'), stat('idle', t('k.idle'), 'hammer'), stat('happy', t('hud.happy'), 'happy'), stat('score', t('k.score'), 'crown'), stat('kills', t('over.kills'), 'attack'), stat('lost', t('over.lost'), 'x'), stat('built', t('over.built'), 'hammer'), stat('gath', t('over.gathered'), 'wood'), stat('time', t('hud.time'), 'clock'));
    const bal = h('table', { class: 'ktable' }, h('thead', null, h('tr', null, h('th'), h('th', null, ''), h('th', null, t('k.income')), h('th', null, t('k.spend')))), h('tbody', null, RES.map((r) => {
      const a = h('td'), i = h('td', { class: 'good' }), o = h('td', { class: 'bad' }); refs['bal' + r] = { a, i, o };
      return h('tr', null, h('td', null, icon(r), t('r.' + r)), a, i, o);
    })));
    const taxb = [0, 1, 2, 3].map((i) => h('button', { class: 'sb', onclick: () => { tm.tax = i; this.app.audio.ui('click'); upd(); } }, t('tax.' + i)));
    refs.taxb = taxb;
    const hasMarket = () => g.buildings.some((b) => b.team === 0 && b.key === 'market' && b.built && !b.dead);
    const mkRows = Object.keys(PRICES).map((r) => {
      const price = h('td'); refs['mp' + r] = price;
      const tradeBtn = (n, sell) => h('button', { class: 'btn xs' + (sell ? '' : ' gold'), onclick: () => { if (!hasMarket()) { this.toast(t('n.noMarket'), 'bad'); return; } if (g.trade(0, r, n, sell)) { this.app.audio.sfx('coin'); upd(); } else this.fail(); } }, (sell ? t('mk.sell') : t('mk.buy')) + ' ' + num(n));
      return h('tr', null, h('td', null, icon(r), t('r.' + r)), price, h('td', null, tradeBtn(10, false), tradeBtn(100, false)), h('td', null, tradeBtn(10, true), tradeBtn(100, true)));
    });
    refs.mkNote = h('div', { class: 'dim' }); refs.fee = h('span', { class: 'dim' });
    const market = h('div', { class: 'ksec' }, h('h3', null, icon('gold'), t('mk.title')), h('p', { class: 'dim' }, t('mk.hint')), refs.mkNote, refs.fee, h('table', { class: 'ktable' }, h('tbody', null, mkRows)));
    refs.rivals = h('div', { class: 'rivals' }); refs.blds = h('div', { class: 'kbld' });
    const body = h('div', { class: 'kgrid' }, h('div', { class: 'kcol' }, h('div', { class: 'ksec' }, stats), h('div', { class: 'ksec' }, h('h3', null, t('k.buildings')), refs.blds), h('div', { class: 'ksec' }, h('h3', null, icon('tax'), t('hud.tax')), h('div', { class: 'seg' }, taxb), h('p', { class: 'dim' }, t('k.tax.hint'))), h('div', { class: 'ksec' }, h('h3', null, t('k.rivals')), refs.rivals)), h('div', { class: 'kcol' }, h('div', { class: 'ksec' }, h('h3', null, t('k.balance')), bal), market));
    let bsig = '';
    const upd = () => {
      let idle = 0; for (const u of g.units) if (u.team === 0 && !u.dead && u.cls === 'work' && u.state === 'idle' && !u.job) idle++;
      const s = tm.stats;
      refs.pop.textContent = fmt(tm.pop) + '/' + fmt(tm.popCap); refs.army.textContent = fmt(tm.army); refs.vill.textContent = fmt(tm.vill); refs.idle.textContent = fmt(idle); refs.happy.textContent = fmt(tm.happiness) + '%';
      refs.score.textContent = fmt(g.score(tm)); refs.kills.textContent = fmt(s.kills); refs.lost.textContent = fmt(s.lost); refs.built.textContent = fmt(s.built); refs.gath.textContent = fmt(s.gathered); refs.time.textContent = fmtTimeL(g.time);
      for (const r of RES) { const b = refs['bal' + r]; b.a.textContent = fmt(tm.res[r]) + ' / ' + fmt(tm.cap[r]); b.i.textContent = '+' + num(tm.flow[r].rin.toFixed(1)); b.o.textContent = '−' + num(tm.flow[r].rout.toFixed(1)); }
      refs.taxb.forEach((b, i) => b.classList.toggle('on', tm.tax === i));
      const m = hasMarket(); refs.mkNote.textContent = m ? '' : t('mk.need'); refs.fee.textContent = t('mk.fee', { n: Math.round(tm.mods.fee * 100) });
      for (const r of Object.keys(PRICES)) refs['mp' + r].textContent = num(PRICES[r].toFixed(1)) + ' ' + t('r.gold');
      const cnt = {}; for (const b of g.buildings) if (b.team === 0 && !b.dead && b.built) cnt[b.key] = (cnt[b.key] || 0) + 1;
      const sig = JSON.stringify(cnt) + '|' + g.teams.map((x) => (x.defeated ? 1 : 0)).join('');
      if (sig !== bsig) {
        bsig = sig; refs.blds.innerHTML = '';
        for (const k of Object.keys(cnt)) refs.blds.append(h('div', { class: 'kb' }, this.thumb('b', k), h('span', null, t('b.' + k)), h('b', null, 'x' + fmt(cnt[k]))));
        refs.rivals.innerHTML = '';
        for (const x of g.teams) if (x.id !== 0) refs.rivals.append(h('div', { class: 'rv' + (x.defeated ? ' dead' : '') }, h('i', { style: { background: TEAM_CSS[x.id % TEAM_CSS.length] } }), h('span', null, x.name), x.diff ? h('em', null, t('diff.' + x.diff)) : null, x.defeated ? h('b', null, t('k.defeated')) : null));
        if (!refs.rivals.children.length) refs.rivals.append(h('div', { class: 'dim' }, t('none')));
      }
    };
    return { body, update: upd };
  }

  // ---------------------------------------------------------------- per-frame
  foodSecs() { const tm = this.team, use = tm.pop * POP_EAT; return use > 0 ? (tm.res.food + tm.res.bread * 2) / use : Infinity; }
  update(dt) {
    const g = this.g, tm = this.team; if (!g || !tm) return;
    this.slowT -= dt; this.mmT -= dt;
    if (this.mmT <= 0) { this.mmT = 0.1; this.drawMinimap(); }
    if (this.dlg && this.dlg.update && this.slowT <= 0.0 && !(this.dlg.el.matches(':active'))) this.dlg.update();
    if (this.slowT <= 0) {
      this.slowT = 0.25;
      for (const r of RES) {
        const e = this.resEls[r], v = tm.res[r], f = tm.flow[r], net = f.rin - f.rout;
        e.amt.textContent = fmt(v); e.rate.textContent = fmtRate(net); e.rate.className = 'rate ' + (net > 0.05 ? 'up' : net < -0.05 ? 'down' : '');
        e.el.classList.toggle('full', v >= tm.cap[r] - 0.5); e.el.classList.toggle('low', (r === 'food' || r === 'gold') && v < 15);
      }
      this.popAmt.textContent = g.mode === 'custom' ? fmt(tm.pop) : fmt(tm.pop) + '/' + fmt(tm.popCap); this.popEl.classList.toggle('full', tm.pop >= tm.popCap);
      this.popSub.textContent = '⚔ ' + fmt(tm.army) + '  ☺ ' + fmt(tm.vill);
      let idle = 0; for (const u of g.units) if (u.team === 0 && !u.dead && u.cls === 'work' && u.state === 'idle' && !u.job) idle++;
      tm.idle = idle; this.idleAmt.textContent = fmt(idle); this.idleEl.style.display = idle ? '' : 'none';
      this.happyAmt.textContent = fmt(tm.happiness) + '%'; this.happyEl.dataset.lv = tm.happiness > 60 ? 'hi' : tm.happiness > 35 ? 'mid' : 'lo';
      const fs = this.foodSecs(); this.foodAmt.textContent = isFinite(fs) && fs < 5999 ? fmtTimeL(fs) : '∞'; this.foodEl.classList.toggle('low', fs < 60 || tm.starving);
      this.taxBtns.forEach((b, i) => b.classList.toggle('on', tm.tax === i));
      this.timeAmt.textContent = fmtTimeL(g.time);
      this.speedBtns.forEach((b, i) => b.classList.toggle('on', this.app.speed === i));
      this.refreshBuildMenu(); this.updateObjectives(); this.updateArmy();
      if (this.tbOk && this.app.input.place) this.tbOk.classList.toggle('no', !this.app.input.place.ok);
      const sig = this.selSig(); if (sig !== this.selSigStr) { this.selSigStr = sig; this.renderSel(); }
    }
    for (const f of this.live) f();
    if (settings.showFps) { this.fpsN++; this.fpsT += dt; if (this.fpsT >= 0.5) { this.fpsEl.textContent = t('hud.fps') + ' ' + num(Math.round(this.fpsN / this.fpsT)); this.fpsN = 0; this.fpsT = 0; } this.fpsEl.style.display = 'block'; } else this.fpsEl.style.display = 'none';
  }
}
