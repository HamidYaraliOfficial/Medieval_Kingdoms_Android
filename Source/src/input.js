// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// In-game input: camera control, selection, commands, construction placement, hotkeys and control groups.
import { TILE, BUILDINGS, UNITS, FORMATIONS, STANCES } from './data.js';
import { settings } from './settings.js';
import { clamp } from './util.js';
import { IS_TOUCH } from './platform.js';

export class Input {
  constructor(app) {
    this.app = app; this.canvas = app.canvas;
    this.keys = new Set(); this.mouse = { x: 0, y: 0, in: false, mid: false, left: false, sx: 0, sy: 0, drag: false, lastX: 0, lastY: 0 };
    this.selUnits = []; this.selBuilding = null; this.selOther = null;
    this.mode = null; this.place = null; this.lastClick = { t: 0, key: '', x: 0, y: 0 }; this.hoverT = 0; this.lineStart = null; this.lastGroupKey = { k: '', t: 0 };
    this.box = document.getElementById('selbox');
    this.tp = new Map(); this.tg = null; this.lastTap = { t: 0, x: 0, y: 0 };
    if (IS_TOUCH) { this.mouse.x = this.mouse.y = -1; }
    this._bind();
  }
  get g() { return this.app.g; }
  get me() { return 0; }
  get active() { return this.app.playing && !this.app.paused && !this.app.modal; }

  _bind() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('mousedown', (e) => this.onDown(e));
    window.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('mouseup', (e) => this.onUp(e));
    c.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.mid = false; this.mouse.left = false; this.hideBox(); });
    document.addEventListener('mouseleave', () => { this.mouse.in = false; });
    document.addEventListener('mouseenter', () => { this.mouse.in = true; });
    // touch: one finger pans / taps, two fingers zoom + rotate + pan, hold + drag box-selects
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => this.onTouchDown(e));
    c.addEventListener('pointermove', (e) => this.onTouchMove(e));
    c.addEventListener('pointerup', (e) => this.onTouchUp(e, false));
    c.addEventListener('pointercancel', (e) => this.onTouchUp(e, true));
    if (IS_TOUCH) document.addEventListener('contextmenu', (e) => { const n = e.target && e.target.tagName; if (n !== 'INPUT' && n !== 'TEXTAREA') e.preventDefault(); });
  }

  // ---------------------------------------------------------------- selection
  setSel(units, building, other) {
    this.selUnits = units || []; this.selBuilding = building || null; this.selOther = other || null;
    const r = this.app.renderer; if (r) { r.sel.units = new Set(this.selUnits.map((u) => u.id)); r.sel.buildings = new Set(this.selBuilding ? [this.selBuilding.id] : []); r.setRally(null); }
    this.app.ui && this.app.ui.onSelection();
  }
  clearSel() { this.setSel([], null, null); }
  pruneSel() {
    let ch = false;
    const u = this.selUnits.filter((x) => !x.dead && !x.inside); if (u.length !== this.selUnits.length) { ch = true; this.selUnits = u; }
    if (this.selBuilding && this.selBuilding.dead) { this.selBuilding = null; ch = true; }
    if (this.selOther && this.selOther.dead) { this.selOther = null; ch = true; }
    if (ch) this.setSel(this.selUnits, this.selBuilding, this.selOther);
  }
  myUnits() { return this.g.units.filter((u) => u.team === this.me && !u.dead && !u.inside); }
  selectGroup(list, add) {
    list = list.filter((u) => u.team === this.me && !u.dead);
    if (add) { const set = new Set(this.selUnits); for (const u of list) set.add(u); list = [...set]; }
    this.setSel(list, null, null);
  }
  selectAllArmy() { this.setSel(this.myUnits().filter((u) => u.cls !== 'work'), null, null); }
  selectIdle() { this.setSel(this.myUnits().filter((u) => u.cls === 'work' && (u.state === 'idle') && !u.job), null, null); }
  militaryOf(list) { return list.filter((u) => u.cls !== 'work'); }

  // ---------------------------------------------------------------- pointer events
  ndc(e) { return this.app.renderer.setPointer(e.clientX, e.clientY); }
  ground(e) { const [nx, ny] = this.ndc(e); return this.app.renderer.groundPoint(nx, ny); }
  fromTouch(e) { return !!(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents); }
  onDown(e) {
    if (this.fromTouch(e) || this.tp.size) return;
    if (!this.app.playing || this.app.paused || this.app.modal) return;
    this.app.audio.init();
    const m = this.mouse; m.x = e.clientX; m.y = e.clientY;
    if (e.button === 1) { m.mid = true; m.lastX = e.clientX; e.preventDefault(); return; }
    if (e.button === 0) {
      m.left = true; m.sx = e.clientX; m.sy = e.clientY; m.drag = false;
      if (this.mode === 'place' && this.place) { this.placeDown(e); return; }
    } else if (e.button === 2) { this.rightClick(e); }
  }
  onMove(e) {
    if (this.fromTouch(e) || this.tp.size) return;
    const m = this.mouse; m.x = e.clientX; m.y = e.clientY; m.in = true;
    if (!this.app.playing) return;
    if (m.mid) { const dx = e.clientX - m.lastX; m.lastX = e.clientX; this.app.cam.rotate(-dx * 0.006 * settings.rotSpeed); return; }
    if (m.left && !this.mode) {
      if (!m.drag && Math.hypot(e.clientX - m.sx, e.clientY - m.sy) > 6) m.drag = true;
      if (m.drag) this.showBox(m.sx, m.sy, e.clientX, e.clientY);
    }
    if (this.mode === 'place' && this.place) this.updatePlace(e);
  }
  onUp(e) {
    if (this.fromTouch(e)) return;
    const m = this.mouse;
    if (e.button === 1) { m.mid = false; return; }
    if (e.button !== 0) return;
    const was = m.left; m.left = false;
    if (!this.app.playing || !was) return;
    if (this.app.paused || this.app.modal) { this.hideBox(); return; }
    if (this.mode === 'place' && this.place) { this.placeUp(e); return; }
    if (m.drag) { this.hideBox(); this.boxSelect(m.sx, m.sy, e.clientX, e.clientY, e.shiftKey); m.drag = false; return; }
    if (e.target !== this.canvas) return;
    this.leftClick(e);
  }
  onWheel(e) {
    if (!this.app.playing || this.app.paused || this.app.modal) return;
    e.preventDefault();
    const f = Math.pow(1.1, (e.deltaY > 0 ? 1 : -1) * settings.zoomSpeed);
    // zoom toward the cursor
    const gp = this.ground(e); const cam = this.app.cam;
    const before = cam.tdist; cam.zoom(f);
    if (gp && e.deltaY < 0) { const k = 1 - cam.tdist / before; cam.tx += (gp.x - cam.tx) * k * 0.6; cam.tz += (gp.z - cam.tz) * k * 0.6; }
  }
  showBox(x0, y0, x1, y1) { const b = this.box; if (!b) return; b.style.display = 'block'; b.style.left = Math.min(x0, x1) + 'px'; b.style.top = Math.min(y0, y1) + 'px'; b.style.width = Math.abs(x1 - x0) + 'px'; b.style.height = Math.abs(y1 - y0) + 'px'; }
  hideBox() { if (this.box) this.box.style.display = 'none'; }

  // ---------------------------------------------------------------- touch
  // One finger: tap = select / command, drag = pan, hold then drag = box-select.
  // Two fingers: pinch = zoom, twist = rotate, drag = pan.  While placing a building the ghost follows the finger (shown above it)
  // and the on-screen buttons confirm / rotate / cancel.
  tev(x, y) { return { clientX: x, clientY: y, shiftKey: false, target: this.canvas, button: 0 }; }
  placeEv(x, y) { return this.tev(x, y - 64); }
  panPx(dx, dy) {
    const cam = this.app.cam, s = 2 * cam.dist * Math.tan(23 * Math.PI / 180) / Math.max(200, window.innerHeight);
    cam.move(-dx * s, -dy * s / Math.max(0.4, Math.sin(cam.pitch)));
  }
  onTouchDown(e) {
    if (e.pointerType === 'mouse') return;
    if (!this.app.playing || this.app.paused || this.app.modal) return;
    e.preventDefault(); try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    this.app.audio.init(); this.mouse.in = false;
    this.tp.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    if (this.tp.size === 1) {
      const g = this.tg = { kind: 'one', moved: false, long: false, timer: 0, sx: e.clientX, sy: e.clientY, t0: e.timeStamp };
      if (this.mode === 'place' && this.place) { g.kind = 'place'; const ev = this.placeEv(e.clientX, e.clientY); this.mouse.x = ev.clientX; this.mouse.y = ev.clientY; this.placeDown(ev); }
      else g.timer = setTimeout(() => this.touchLong(), 450);
    } else if (this.tp.size === 2) {
      if (this.tg) clearTimeout(this.tg.timer);
      this.hideBox(); this.lineStart = null;
      const [a, b] = [...this.tp.values()];
      this.tg = { kind: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
  }
  touchLong() {
    const g = this.tg; if (!g || g.kind !== 'one' || g.moved || this.mode) return;
    g.long = true; try { if (navigator.vibrate) navigator.vibrate(18); } catch (err) { /* no haptics */ }
    this.showBox(g.sx, g.sy, g.sx, g.sy);
  }
  onTouchMove(e) {
    const p = this.tp.get(e.pointerId); if (!p) return;
    e.preventDefault();
    const ox = p.x, oy = p.y; p.x = e.clientX; p.y = e.clientY;
    const g = this.tg; if (!g) return;
    const cam = this.app.cam;
    if (g.kind === 'pinch' && this.tp.size >= 2) {
      const [a, b] = [...this.tp.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (d > 8 && g.d > 8) cam.zoom(Math.pow(g.d / d, settings.zoomSpeed));
      let da = ang - g.ang; if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
      if (d > 40) cam.rotate(da * settings.rotSpeed);
      this.panPx(mx - g.mx, my - g.my);
      g.d = d; g.ang = ang; g.mx = mx; g.my = my; return;
    }
    if (g.kind === 'place') { const ev = this.placeEv(e.clientX, e.clientY); this.mouse.x = ev.clientX; this.mouse.y = ev.clientY; if (this.place) this.updatePlace(ev); return; }
    if (g.kind === 'one') {
      if (Math.hypot(p.x - g.sx, p.y - g.sy) > 10) {
        // decide by the event's own timestamp (not the timer): on a slow device the timer can fire before an older queued move is handled
        g.moved = true; clearTimeout(g.timer);
        const held = e.timeStamp - g.t0 >= 450 && !this.mode;
        if (held) { g.kind = 'box'; g.long = true; this.showBox(g.sx, g.sy, e.clientX, e.clientY); } else { g.kind = 'pan'; g.long = false; this.hideBox(); }
      } else return;
    }
    if (g.kind === 'pan') this.panPx(e.clientX - ox, e.clientY - oy);
    else if (g.kind === 'box') this.showBox(g.sx, g.sy, e.clientX, e.clientY);
  }
  onTouchUp(e, cancelled) {
    const p = this.tp.get(e.pointerId); if (!p) return;
    this.tp.delete(e.pointerId);
    const g = this.tg; if (!g) return;
    if (this.tp.size > 0) { // a finger lifted during a pinch: keep panning with the one that is left
      if (g.kind === 'pinch') { const r = [...this.tp.values()][0]; this.tg = { kind: 'pan', moved: true, long: false, timer: 0, sx: r.x, sy: r.y }; }
      return;
    }
    clearTimeout(g.timer); this.tg = null;
    if (cancelled) { this.hideBox(); if (g.kind === 'place' && this.lineStart) { this.lineStart = null; } return; }
    if (!this.app.playing || this.app.paused || this.app.modal) { this.hideBox(); return; }
    if (g.kind === 'place') { const ev = this.placeEv(e.clientX, e.clientY); this.mouse.x = ev.clientX; this.mouse.y = ev.clientY; if (this.place && BUILDINGS[this.place.key].line) this.placeUp(ev); else if (this.place) this.updatePlace(ev); return; }
    if (g.kind === 'box') { this.hideBox(); this.boxSelect(g.sx, g.sy, e.clientX, e.clientY, false); return; }
    if (g.kind === 'one') { this.hideBox(); this.touchTap(this.tev(e.clientX, e.clientY)); }
  }
  // tap: select things; with units selected the tap is a command (move / attack / gather / build / garrison)
  touchTap(ev) {
    if (this.mode && this.mode !== 'place') { this.leftClick(ev); return; }
    const r = this.app.renderer, me = this.me, units = this.selUnits.filter((u) => !u.dead);
    if (!units.length) { this.leftClick(ev); return; }
    const hit = r.pick(ev.clientX, ev.clientY, {});
    if (hit && hit.ent.team === me) {
      if (hit.kind === 'b') {
        const b = hit.ent, mil = this.militaryOf(units);
        if (units.some((u) => u.cls === 'work') || ((b.def.tower || b.def.wall) && mil.length && this.g.garrisonSlots(b) > 0)) { this.rightClick(ev); return; }
      }
      this.leftClick(ev); return;
    }
    this.rightClick(ev);
  }

  leftClick(e) {
    const g = this.g, r = this.app.renderer;
    if (this.mode && this.mode !== 'place') { this.modeClick(e); return; }
    const hit = r.pick(e.clientX, e.clientY, {});
    const now = performance.now();
    if (!hit) { if (!e.shiftKey) this.clearSel(); return; }
    if (hit.kind === 'u') {
      const u = hit.ent;
      if (u.team !== this.me) { this.setSel([], null, u); return; }
      const dbl = now - this.lastClick.t < 380 && this.lastClick.key === u.key;
      this.lastClick = { t: now, key: u.key };
      if (dbl) { // select all visible units of the same type
        const list = this.myUnits().filter((o) => o.key === u.key && r.worldToScreen(o.x, o.y + 1, o.z).vis && this.inView(o));
        this.setSel(list, null, null); return;
      }
      if (e.shiftKey) { const set = new Set(this.selUnits); if (set.has(u)) set.delete(u); else set.add(u); this.setSel([...set], null, null); }
      else this.setSel([u], null, null);
    } else {
      const b = hit.ent;
      if (b.team === this.me) this.setSel([], b, null); else this.setSel([], null, b);
    }
  }
  inView(o) { const p = this.app.renderer.worldToScreen(o.x, o.y + 1, o.z); return p.x >= 0 && p.y >= 0 && p.x <= window.innerWidth && p.y <= window.innerHeight; }
  boxSelect(x0, y0, x1, y1, add) {
    const r = this.app.renderer; const xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1);
    const inside = [];
    for (const u of this.myUnits()) { const p = r.worldToScreen(u.x, u.y + 1, u.z); if (p.vis && p.x >= xa && p.x <= xb && p.y >= ya && p.y <= yb) inside.push(u); }
    const mil = inside.filter((u) => u.cls !== 'work');
    this.selectGroup(mil.length ? mil : inside, add);
  }

  rightClick(e) {
    if (this.mode) { this.cancelMode(); return; }
    const g = this.g, r = this.app.renderer, me = this.me;
    const units = this.selUnits.filter((u) => !u.dead);
    const hit = r.pick(e.clientX, e.clientY, {});
    const gp = this.ground(e);
    if (!units.length) {
      if (this.selBuilding && this.selBuilding.team === me && gp && (this.selBuilding.def.trains || this.selBuilding.key === 'keep' || this.selBuilding.key === 'townhall')) {
        this.selBuilding.rally = { x: gp.x, z: gp.z }; r.setRally(gp); r.marker(gp.x, gp.z, 'build'); this.app.audio.ui('click');
      }
      return;
    }
    const mil = this.militaryOf(units), vil = units.filter((u) => u.cls === 'work');
    if (hit && hit.kind === 'u' && hit.ent.team !== me) {
      if (mil.length) g.orderAttack(mil, hit.ent);
      if (vil.length) g.orderMove(vil, hit.ent.x, hit.ent.z);
      r.marker(hit.ent.x, hit.ent.z, 'attack'); this.app.audio.sfx('swish'); return;
    }
    if (hit && hit.kind === 'b') {
      const b = hit.ent;
      if (b.team !== me) {
        if (mil.length) g.orderAttack(mil, b);
        if (vil.length) g.orderMove(vil, b.cx, b.cz);
        r.marker(b.cx, b.cz, 'attack'); this.app.audio.sfx('swish'); return;
      }
      if ((b.def.tower || b.def.wall) && mil.length && (g.garrisonSlots(b) > 0)) { g.orderGarrison(mil, b); r.marker(b.cx, b.cz, 'build'); return; }
      if (vil.length && b.team === me) { g.orderVillagers(vil, b); r.marker(b.cx, b.cz, 'build'); if (mil.length && gp) g.orderMove(mil, gp.x, gp.z); return; }
    }
    if (hit && hit.kind === 'u' && hit.ent.team === me && hit.ent.key === 'siegetower' && mil.length && !mil.some((u) => u.cls === 'siege')) { g.orderBoard(mil, hit.ent); r.marker(hit.ent.x, hit.ent.z, 'build'); return; }
    if (!gp) return;
    if (vil.length) {
      let node = null, bd = 9;
      g.nodesNear(gp.x, gp.z, 3.2, (n, d2) => { if (d2 < bd) { bd = d2; node = n; } });
      if (node) { g.orderVillagers(vil, node); r.marker(node.x, node.z, 'build'); if (mil.length) g.orderMove(mil, gp.x, gp.z); return; }
    }
    g.orderMove(units, gp.x, gp.z, {});
    r.marker(gp.x, gp.z, 'move');
    this.app.audio.ui('click');
  }
  modeClick(e) {
    const g = this.g, r = this.app.renderer, gp = this.ground(e), mil = this.militaryOf(this.selUnits);
    if (this.mode === 'attackmove' && gp) { g.orderAttackMove(this.selUnits, gp.x, gp.z); r.marker(gp.x, gp.z, 'attack'); }
    else if (this.mode === 'patrol' && gp) { g.orderPatrol(mil, gp.x, gp.z); r.marker(gp.x, gp.z, 'move'); }
    else if (this.mode === 'rally') {
      const b = this.selBuilding;
      if (b && b.team === this.me && gp) { b.rally = { x: gp.x, z: gp.z }; r.setRally(gp); r.marker(gp.x, gp.z, 'build'); }
    } else if (this.mode === 'garrison') {
      const hit = r.pick(e.clientX, e.clientY, { buildingsOnly: true, team: this.me });
      if (hit && hit.kind === 'b' && g.garrisonSlots(hit.ent) > 0) { g.orderGarrison(mil, hit.ent); r.marker(hit.ent.cx, hit.ent.cz, 'build'); }
      else { this.app.ui.toast(this.app.tr('hud.noaff'), 'bad'); return; }
    }
    if (!e.shiftKey) this.cancelMode(); this.app.audio.ui('click');
  }
  setMode(m) {
    if (!this.selUnits.length && m !== 'place' && m !== 'rally') return;
    this.cancelMode(true); this.mode = m; this.canvas.style.cursor = 'crosshair'; this.app.ui.hint(m === 'patrol' ? this.app.tr('cmd.patrol') : m === 'garrison' ? this.app.tr('cmd.garrison') : m === 'rally' ? this.app.tr('rally.tap') : this.app.tr('cmd.attackmove'));
    this.app.ui.onModeChange();
  }
  cancelMode(keep) {
    this.mode = null; this.place = null; this.lineStart = null; this.canvas.style.cursor = '';
    const r = this.app.renderer; if (r) r.clearGhost();
    if (this.app.ui) this.app.ui.hint('');
    if (!keep && this.app.ui) this.app.ui.onModeChange();
  }

  // ---------------------------------------------------------------- construction placement
  startPlace(key) {
    const g = this.g, t = g.teams[this.me];
    const def = BUILDINGS[key]; if (!def) return;
    if (def.tech && !t.techs.has(def.tech)) { this.app.ui.toast(this.app.tr('bld.needtech', { t: this.app.tr('t.' + def.tech) }), 'bad'); this.app.audio.ui('error'); return; }
    this.cancelMode(true);
    this.mode = 'place'; this.place = { key, rot: 0, tx: 0, tz: 0, ok: false, reason: '' };
    this.app.ui.hint(this.hintText(def));
    this.app.renderer.showTerritory(this.me);
    this.canvas.style.cursor = 'cell';
    this.app.audio.ui('click');
    this.refreshPlaceStart();
    this.app.ui.onModeChange();
  }
  startRelocate(b) {
    const g = this.g; if (!b || b.team !== this.me || !g.canRelocate(b)) { this.app.audio.ui('error'); return; }
    this.cancelMode(true);
    this.mode = 'place'; this.place = { key: b.key, rot: b.rot || 0, tx: 0, tz: 0, ok: false, reason: '', reloc: b };
    this.app.ui.hint(this.hintText(BUILDINGS[b.key]));
    this.app.renderer.showTerritory(this.me);
    this.canvas.style.cursor = 'cell';
    this.app.audio.ui('click');
    this.refreshPlaceStart();
    this.app.ui.onModeChange();
  }
  hintText(def) { return this.app.tr((def.line ? 'place.hintLine' : 'place.hint') + (IS_TOUCH ? 'T' : '')); }
  refreshPlaceStart() { if (IS_TOUCH && this.mouse.x < 0) { this.mouse.x = window.innerWidth / 2; this.mouse.y = window.innerHeight * 0.45; } this.refreshPlace(this.mouse.x, this.mouse.y); }
  tileFor(gp) { const p = this.place, g = this.g; const { w, d } = g.footprint(p.key, p.rot); return { tx: Math.round(gp.x / TILE - w / 2), tz: Math.round(gp.z / TILE - d / 2), w, d }; }
  refreshPlace(cx, cz) { const r = this.app.renderer; const [nx, ny] = r.setPointer(cx, cz); const gp = r.groundPoint(nx, ny); if (gp) this.updatePlaceAt(gp); }
  updatePlace(e) { const gp = this.ground(e); if (gp) this.updatePlaceAt(gp); }
  updatePlaceAt(gp) {
    const g = this.g, p = this.place, r = this.app.renderer, def = BUILDINGS[p.key];
    const T = this.tileFor(gp); p.tx = T.tx; p.tz = T.tz; p.gp = gp;
    if (def.line && this.lineStart) {
      const list = this.lineTiles(this.lineStart, { tx: T.tx, tz: T.tz });
      const res = Object.assign({}, g.teams[this.me].res); const tiles = [];
      for (const t of list) {
        const c = g.canPlace(p.key, this.me, t.tx, t.tz, 0, { skipCost: true });
        let ok = c.ok; if (ok) { for (const k in def.cost) if ((res[k] || 0) < def.cost[k]) ok = false; if (ok) for (const k in def.cost) res[k] -= def.cost[k]; }
        tiles.push({ tx: t.tx, tz: t.tz, ok });
      }
      p.lineTiles = tiles; r.setGhostTiles(tiles); p.ok = tiles.some((t) => t.ok); p.reason = p.ok ? '' : 'cost';
    } else {
      const c = g.canPlace(p.key, this.me, T.tx, T.tz, p.rot, p.reloc ? { skipCost: true } : {});
      if (c.ok && p.reloc && !g.canAfford(g.teams[this.me], g.relocateCost(p.reloc))) { c.ok = false; c.reason = 'cost'; }
      p.ok = c.ok; p.reason = c.reason || '';
      r.setGhost(p.key, p.rot, T.tx, T.tz, c.ok);
    }
    if (this.app.ui.tbOk) this.app.ui.tbOk.classList.toggle('no', !p.ok);
    this.app.ui.hint(p.ok || !p.reason ? this.hintText(def) : this.app.tr('why.' + p.reason), !p.ok && !!p.reason);
  }
  lineTiles(a, b) {
    let dx = b.tx - a.tx, dz = b.tz - a.tz; const adx = Math.abs(dx), adz = Math.abs(dz);
    if (adx > 2 * adz) dz = 0; else if (adz > 2 * adx) dx = 0; else { const m = Math.max(adx, adz); dx = Math.sign(dx) * m; dz = Math.sign(dz) * m; }
    const n = Math.max(Math.abs(dx), Math.abs(dz)), out = [];
    for (let i = 0; i <= n; i++) out.push({ tx: a.tx + Math.sign(dx) * i, tz: a.tz + Math.sign(dz) * i });
    return out;
  }
  placeDown(e) {
    const p = this.place, def = BUILDINGS[p.key];
    this.updatePlace(e);
    if (def.line) { this.lineStart = { tx: p.tx, tz: p.tz }; this.updatePlace(e); }
  }
  placeUp(e) {
    const g = this.g, p = this.place, def = BUILDINGS[p.key], r = this.app.renderer;
    this.updatePlace(e);
    if (def.line) {
      const tiles = (p.lineTiles || [{ tx: p.tx, tz: p.tz, ok: p.ok }]);
      let n = 0;
      for (const t of tiles) { if (!t.ok) continue; const res = g.placeBuilding(this.me, p.key, t.tx, t.tz, 0, {}); if (res.ok) n++; else break; }
      this.lineStart = null; p.lineTiles = null;
      if (n) { this.app.audio.sfx('place'); this.app.ui.refreshSoon(); } else this.app.audio.ui('error');
      this.updatePlace(e);
      return;
    }
    this.commitPlace(e.shiftKey, e);
  }
  // place (or relocate) the building at the ghost's current tile; shared by mouse release and the touch "confirm" button
  commitPlace(keepPlacing, e) {
    const g = this.g, p = this.place, r = this.app.renderer; if (!p || this.mode !== 'place') return false;
    if (!p.ok) { this.app.audio.ui('error'); if (p.reason) this.app.ui.toast(this.app.tr('why.' + p.reason), 'bad'); return false; }
    const res = p.reloc ? g.relocateBuilding(p.reloc, p.tx, p.tz, p.rot) : g.placeBuilding(this.me, p.key, p.tx, p.tz, p.rot, {});
    if (!res.ok) { this.app.audio.ui('error'); return false; }
    r.marker((p.tx + 0.5) * TILE, (p.tz + 0.5) * TILE, 'build'); this.app.ui.refreshSoon();
    if (!keepPlacing) { this.cancelMode(); this.setSel([], res.b, null); }
    else if (e) this.updatePlace(e); else if (p.gp) this.updatePlaceAt(p.gp);
    return true;
  }
  rotatePlace() { if (this.mode !== 'place' || !this.place) return; const d = BUILDINGS[this.place.key]; if (d.w === d.d) return; this.place.rot ^= 1; this.refreshPlace(this.mouse.x, this.mouse.y); this.app.audio.ui('click'); }

  // ---------------------------------------------------------------- commands (also used by UI buttons)
  cmdStop() { const u = this.selUnits; if (u.length) { this.g.orderStop(u); this.app.audio.ui('click'); } }
  cmdRetreat() { const u = this.militaryOf(this.selUnits); if (u.length) { this.g.orderRetreat(u); this.app.audio.ui('click'); } }
  cmdFormation(f) {
    const mil = this.militaryOf(this.selUnits); if (!mil.length) return;
    this.g.teams[this.me].formation = f;
    let cx = 0, cz = 0; for (const u of mil) { cx += u.x; cz += u.z; } cx /= mil.length; cz /= mil.length;
    this.g.orderMove(mil, cx, cz, { formation: f }); this.app.audio.ui('click'); this.app.ui.onSelection();
  }
  cmdStance(s) { const mil = this.militaryOf(this.selUnits); if (mil.length) { this.g.orderStance(mil, s); this.app.audio.ui('click'); this.app.ui.onSelection(); } }
  cycleFormation() { const t = this.g.teams[this.me]; const i = FORMATIONS.indexOf(t.formation || 'line'); this.cmdFormation(FORMATIONS[(i + 1) % FORMATIONS.length]); }
  cycleStance() { const mil = this.militaryOf(this.selUnits); if (!mil.length) return; const i = STANCES.indexOf(mil[0].stance); this.cmdStance(STANCES[(i + 1) % STANCES.length]); }
  cmdUngarrison() { for (const u of this.selUnits) if (u.garrisonOf) this.g.ungarrison(u, false); this.app.ui.onSelection(); }
  focusSelection() {
    const cam = this.app.cam; let x = 0, z = 0, n = 0;
    for (const u of this.selUnits) { x += u.x; z += u.z; n++; }
    if (!n && this.selBuilding) { x = this.selBuilding.cx; z = this.selBuilding.cz; n = 1; }
    if (!n && this.selOther) { x = this.selOther.x != null ? this.selOther.x : this.selOther.cx; z = this.selOther.z != null ? this.selOther.z : this.selOther.cz; n = 1; }
    if (!n) { const cap = this.g.byId.get(this.g.teams[this.me].capitalId); if (cap) { x = cap.cx; z = cap.cz; n = 1; } }
    if (n) { cam.tx = x / n; cam.tz = z / n; }
  }
  demolishSel() {
    const b = this.selBuilding; if (!b || b.team !== this.me) return;
    this.app.ui.confirm(this.app.tr('bld.confirmDemolish'), () => { if (this.g.demolish(b)) { this.clearSel(); this.app.audio.sfx('collapse', b.cx, b.cz); } else this.app.audio.ui('error'); });
  }

  // ---------------------------------------------------------------- keyboard
  onKey(e, down) {
    const k = settings.keys, code = e.code;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    if (this.app.capturingKey) return;
    if (down) { this.keys.add(code); if (e.repeat && code !== k.rotateBuilding) { /* auto-repeat only affects held camera keys */ } }
    else { this.keys.delete(code); return; }
    if (!this.app.playing) return;
    const app = this.app;
    if (code === k.pause) { e.preventDefault(); app.onEscape(); return; }
    if (e.repeat) return;
    if (code === 'F1' || code === 'F2' || code === 'F3' || code === 'F4' || code === 'F5' || code === 'F9') e.preventDefault();
    if (code === k.quickSave) { app.quickSave(); return; }
    if (code === k.quickLoad) { app.quickLoad(); return; }
    if (app.paused || app.modal) return;
    if (code === k.panelBuild) { app.ui.togglePanel('build'); return; }
    if (code === k.panelArmy) { app.ui.togglePanel('army'); return; }
    if (code === k.panelTech) { app.ui.togglePanel('tech'); return; }
    if (code === k.panelKingdom) { app.ui.togglePanel('kingdom'); return; }
    if (code === k.focus) { e.preventDefault(); this.focusSelection(); return; }
    if (code === k.rotateBuilding && this.mode === 'place') { this.rotatePlace(); return; }
    if (code === k.stop) { this.cmdStop(); return; }
    if (code === k.patrol) { this.setMode('patrol'); return; }
    if (code === k.attackMove) { this.setMode('attackmove'); return; }
    if (code === k.garrison) { this.setMode('garrison'); return; }
    if (code === k.retreat) { this.cmdRetreat(); return; }
    if (code === k.formation) { this.cycleFormation(); return; }
    if (code === k.stance) { this.cycleStance(); return; }
    if (code === k.selectArmy) { this.selectAllArmy(); return; }
    if (code === k.selectIdle) { this.selectIdle(); return; }
    if (code === k.demolish) { this.demolishSel(); return; }
    if (code === k.speedUp) { app.changeSpeed(1); return; }
    if (code === k.speedDown) { app.changeSpeed(-1); return; }
    if (code === k.nextAlert) { app.jumpAlert(); return; }
    const m = /^Digit([1-9])$/.exec(code);
    if (m) {
      const n = +m[1], t = this.g.teams[this.me];
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); t.groups[n] = this.selUnits.map((u) => u.id); this.app.ui.toast(this.app.tr('n.groupSet', { n }), 'info'); }
      else {
        const ids = t.groups[n] || []; const list = ids.map((id) => this.g.byId.get(id)).filter((u) => u && !u.dead && u.kind === 'u');
        if (list.length) { this.selectGroup(list, e.shiftKey); const now = performance.now(); if (this.lastGroupKey.k === code && now - this.lastGroupKey.t < 400) this.focusSelection(); this.lastGroupKey = { k: code, t: now }; }
      }
    }
  }

  // ---------------------------------------------------------------- per-frame
  update(dt) {
    if (!this.app.playing || this.app.paused || this.app.modal) return;
    const k = settings.keys, cam = this.app.cam, keys = this.keys, m = this.mouse;
    const sp = (50 + cam.tdist * 0.95) * settings.camSpeed;
    let dx = 0, dz = 0;
    if (keys.has(k.camLeft) || keys.has('ArrowLeft')) dx -= 1; if (keys.has(k.camRight) || keys.has('ArrowRight')) dx += 1;
    if (keys.has(k.camUp) || keys.has('ArrowUp')) dz -= 1; if (keys.has(k.camDown) || keys.has('ArrowDown')) dz += 1;
    if (settings.edgeScroll && m.in && document.hasFocus() && !m.mid && !m.drag) {
      const W = window.innerWidth, H = window.innerHeight, E = 4;
      if (m.x <= E) dx -= 1; else if (m.x >= W - E - 1) dx += 1;
      if (m.y <= E) dz -= 1; else if (m.y >= H - E - 1) dz += 1;
    }
    if (dx || dz) { const l = Math.hypot(dx, dz); cam.move(dx / l * sp * dt, dz / l * sp * dt); }
    if (keys.has(k.rotLeft)) cam.rotate(1.6 * dt * settings.rotSpeed); if (keys.has(k.rotRight)) cam.rotate(-1.6 * dt * settings.rotSpeed);
    if (keys.has(k.zoomIn)) cam.zoom(Math.pow(0.35, dt)); if (keys.has(k.zoomOut)) cam.zoom(Math.pow(0.35, -dt));
    this.pruneSel();
    this.hoverT -= dt;
    if (this.hoverT <= 0) { this.hoverT = 0.07; this.updateHover(); }
  }
  updateHover() {
    const r = this.app.renderer, m = this.mouse;
    if (IS_TOUCH) { r.sel.hover = null; return; }
    const el = document.elementFromPoint(m.x, m.y);
    if (el !== this.canvas || m.drag || m.mid) { r.sel.hover = null; return; }
    const hit = this.mode === 'place' ? null : r.pick(m.x, m.y, {});
    r.sel.hover = hit ? hit.ent : null;
    if (!this.mode) {
      let cur = '';
      if (hit && this.selUnits.length) cur = hit.ent.team !== this.me ? 'crosshair' : 'pointer';
      else if (hit) cur = 'pointer';
      this.canvas.style.cursor = cur;
    }
  }
}
