// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Procedural audio: sound effects, generative medieval music and ambience (no external audio files).
import { mulberry32, clamp } from './util.js';

const SCALES = {
  dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], phryg: [0, 1, 3, 5, 7, 8, 10],
};
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const TRACKS = {
  menu: { bpm: 66, root: 50, scale: 'dorian', drums: false, density: 0.55, lead: 'flute', title: 'menu' },
  game: { bpm: 84, root: 55, scale: 'mixo', drums: false, density: 0.5, lead: 'lute', title: 'game' },
  game2: { bpm: 76, root: 52, scale: 'dorian', drums: false, density: 0.45, lead: 'flute', title: 'game' },
  battle: { bpm: 124, root: 50, scale: 'minor', drums: true, density: 0.8, lead: 'lute', title: 'battle' },
  victory: { bpm: 100, root: 60, scale: 'major', drums: true, density: 0.9, lead: 'flute', once: 14, title: 'victory' },
  defeat: { bpm: 56, root: 50, scale: 'phryg', drums: false, density: 0.35, lead: 'flute', once: 16, title: 'defeat' },
};

export class AudioSys {
  constructor() { this.ctx = null; this.vol = { master: 0.8, music: 0.5, sfx: 0.8, ambient: 0.6 }; this.rng = mulberry32(Date.now() & 0xffff); this.voices = {}; this.track = null; this.listener = { x: 0, z: 0, d: 60 }; this.amb = null; this.enabled = true; this.stepT = 0; this.hoofT = 0; this.birdT = 3; this.clashT = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { this.enabled = false; return; }
    try { this.ctx = new AC(); } catch (e) { this.enabled = false; return; }
    const c = this.ctx;
    this.master = c.createGain(); this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master.connect(this.comp); this.comp.connect(c.destination);
    this.busM = c.createGain(); this.busS = c.createGain(); this.busA = c.createGain();
    this.busM.connect(this.master); this.busS.connect(this.master); this.busA.connect(this.master);
    // noise buffer
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.applyVolumes();
    this._startAmbient();
    this.sched = setInterval(() => this._tick(), 90);
  }
  applyVolumes(v) {
    if (v) Object.assign(this.vol, v);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05); this.busM.gain.setTargetAtTime(this.vol.music * 0.55, t, 0.05);
    this.busS.gain.setTargetAtTime(this.vol.sfx, t, 0.05); this.busA.gain.setTargetAtTime(this.vol.ambient * 0.6, t, 0.05);
  }
  setListener(x, z, dist) { this.listener.x = x; this.listener.z = z; this.listener.d = dist; }

  // ---------------------------------------------------------------- primitives
  _osc(type, f0, f1, dur, vol, dest, delay = 0, a = 0.005) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.busS); o.start(t); o.stop(t + dur + 0.05);
    return { o, g };
  }
  _noise(dur, ftype, f0, f1, q, vol, dest, delay = 0, a = 0.003) {
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true; fl.type = ftype; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.busS); s.start(t, this.rng() * 1.5); s.stop(t + dur + 0.05);
  }

  // ---------------------------------------------------------------- sound effects
  sfx(name, x, z) {
    if (!this.ctx || !this.enabled) return;
    let v = 1;
    if (x != null) {
      const d = Math.hypot(x - this.listener.x, z - this.listener.z), R = 60 + this.listener.d * 1.1;
      v = Math.pow(clamp(1 - d / R, 0, 1), 1.6); if (v < 0.03) return;
    }
    const now = this.ctx.currentTime; const slot = this.voices[name] || (this.voices[name] = []);
    while (slot.length && now - slot[0] > 0.12) slot.shift();
    if (slot.length >= 3) return; slot.push(now);
    const f = SFX[name]; if (f) f(this, v);
  }
  ui(name) { this.sfx('ui_' + name); }

  // ---------------------------------------------------------------- music
  playTrack(name, force) {
    if (!this.ctx) { this.pending = name; return; }
    if (this.track && this.track.name === name && !force) return;
    const def = TRACKS[name]; if (!def) return;
    const ctx = this.ctx;
    if (this.track) this._fadeOutTrack(this.track);
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(this.busM); g.gain.setTargetAtTime(1, ctx.currentTime, name === 'victory' || name === 'defeat' ? 0.3 : 1.6);
    this.track = { name, def, out: g, beat: 0, next: ctx.currentTime + 0.2, melIdx: 3, bar: 0, started: ctx.currentTime, seed: (Math.random() * 1e6) | 0, chord: 0 };
    this.track.r = mulberry32(this.track.seed);
  }
  stopMusic() { if (this.track) { this._fadeOutTrack(this.track); this.track = null; } }
  _fadeOutTrack(tr) { try { tr.out.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.8); setTimeout(() => { try { tr.out.disconnect(); } catch (e) { /* ignore */ } }, 4000); } catch (e) { /* ignore */ } }
  _tick() {
    if (!this.ctx) return;
    const tr = this.track; if (!tr) return;
    const c = this.ctx;
    const beatLen = 60 / tr.def.bpm / 2; // eighth notes
    while (tr.next < c.currentTime + 0.35) {
      this._step(tr, tr.next, beatLen); tr.next += beatLen; tr.beat++;
    }
    if (tr.def.once && c.currentTime - tr.started > tr.def.once) { this._fadeOutTrack(tr); this.track = null; if (this.after) { const n = this.after; this.after = null; n(); } }
  }
  _step(tr, t, bl) {
    const d = tr.def, r = tr.r, sc = SCALES[d.scale], c = this.ctx;
    const b = tr.beat % 16, bar = Math.floor(tr.beat / 16);
    const prog = [0, 3, 4, 0, 5, 3, 4, 0]; // degree progression
    const deg = prog[bar % prog.length];
    const scaleNote = (i, oct = 0) => d.root + sc[((i % 7) + 7) % 7] + 12 * (Math.floor(i / 7) + oct);
    const out = tr.out;
    // bass / drone on the downbeat
    if (b === 0 || b === 8) { this._pluck(midi(scaleNote(deg, -1)), t, bl * 7, 0.22, out, 'saw'); if (b === 0) this._pluck(midi(scaleNote(deg + 4, -1)), t, bl * 7, 0.1, out, 'saw'); }
    // arpeggio (lute)
    if (b % 2 === 0 && r() < d.density * 0.95) { const arp = [0, 2, 4, 2, 5, 4, 2, 0][((b / 2) + bar) % 8]; this._pluck(midi(scaleNote(deg + arp)), t, bl * 3, 0.13, out, 'tri'); }
    // melody
    if ((b % 4 === 0 || (b % 2 === 0 && r() < 0.35)) && r() < d.density) {
      tr.melIdx += Math.floor(r() * 5) - 2; if (tr.melIdx < 2) tr.melIdx = 2 + Math.floor(r() * 2); if (tr.melIdx > 11) tr.melIdx = 9;
      const len = (r() < 0.5 ? 2 : 4) * bl;
      const n = midi(scaleNote(tr.melIdx, 0));
      if (d.lead === 'flute') this._flute(n, t, len * 1.1, 0.12, out); else this._pluck(n, t, len, 0.17, out, 'tri', true);
    }
    // drums
    if (d.drums) {
      if (b % 4 === 0) this._drum(t, out, 70, 0.5); if (b % 8 === 4) this._drum(t, out, 110, 0.35);
      if (b % 2 === 1 && r() < 0.5) this._hat(t, out);
    } else if (b === 0 && bar % 2 === 0 && d.title !== 'menu') this._drum(t, out, 62, 0.12);
    if (d.title === 'victory' && b === 0 && bar < 4) { for (const i of [0, 2, 4]) this._pluck(midi(scaleNote(deg + i, 1)), t + i * bl * 0.4, bl * 5, 0.12, out, 'saw'); }
  }
  _pluck(f, t, dur, vol, dest, kind, vibrato) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = kind === 'saw' ? 'sawtooth' : 'triangle'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 1.004;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(kind === 'saw' ? 700 : 2600, t); fl.frequency.exponentialRampToValueAtTime(kind === 'saw' ? 260 : 500, t + Math.min(dur, 1.2));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = c.createGain(); g2.gain.value = kind === 'saw' ? 0.0 : 0.25;
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(dest); o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  _flute(f, t, dur, vol, dest) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.value = f; lfo.frequency.value = 5.2; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.09); g.gain.setTargetAtTime(vol * 0.7, t + 0.1, 0.3); g.gain.setTargetAtTime(0.0001, t + dur - 0.1, 0.12);
    o.connect(g); g.connect(dest); o.start(t); lfo.start(t); o.stop(t + dur + 0.3); lfo.stop(t + dur + 0.3);
    this._noiseTo(dest, t, dur, 3000, 0.012);
  }
  _noiseTo(dest, t, dur, f, vol) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 1.5; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.05); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, 0.3); s.stop(t + dur + 0.05);
  }
  _drum(t, dest, f, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 2.2, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.5);
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g2 = c.createGain(); s.buffer = this.noise; fl.type = 'lowpass'; fl.frequency.value = 600;
    g2.gain.setValueAtTime(vol * 0.35, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); s.connect(fl); fl.connect(g2); g2.connect(dest); s.start(t, 0.2); s.stop(t + 0.15);
  }
  _hat(t, dest) { const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; fl.type = 'highpass'; fl.frequency.value = 5000; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, 0.5); s.stop(t + 0.08); }

  // ---------------------------------------------------------------- ambience
  _startAmbient() {
    const c = this.ctx;
    const mkLoop = (type, f, q, vol) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(this.busA); s.start(); return { s, fl, g }; };
    this.amb = { wind: mkLoop('bandpass', 420, 0.7, 0.0), rain: mkLoop('highpass', 1800, 0.4, 0.0), water: mkLoop('lowpass', 520, 0.6, 0.0), crowd: mkLoop('bandpass', 700, 0.5, 0.0), cricket: null };
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 160; lfo.connect(lg); lg.connect(this.amb.wind.fl.frequency); lfo.start();
    const cr = c.createOscillator(), cg = c.createGain(), cm = c.createOscillator(), cmg = c.createGain(); cr.type = 'sine'; cr.frequency.value = 4300; cm.frequency.value = 9; cm.type = 'square'; cmg.gain.value = 0.5; cg.gain.value = 0;
    const cmod = c.createGain(); cmod.gain.value = 0.5; cm.connect(cmg); cmg.connect(cmod.gain); cr.connect(cmod); cmod.connect(cg); cg.connect(this.busA); cr.start(); cm.start(); this.amb.cricket = cg;
  }
  // g: game, cam: {x,z,dist}, env: renderer env/weather
  update(dt, g, cam, env, weather) {
    if (!this.ctx || !this.enabled) return;
    const A = this.amb, t = this.ctx.currentTime;
    this.setListener(cam.x, cam.z, cam.dist);
    const day = env ? env.day : 1, w = weather ? weather.w : 0;
    let water = 0;
    if (g) { const T = g.T; for (let k = 0; k < 6; k++) { const a = k * 1.047; const px = clamp(cam.x + Math.cos(a) * 18, 1, T.size - 1), pz = clamp(cam.z + Math.sin(a) * 18, 1, T.size - 1); if (T.heightAt(px, pz) < T.wl) water += 1 / 6; } }
    A.wind.g.gain.setTargetAtTime(0.02 + 0.06 * clamp(cam.dist / 150, 0, 1) + 0.12 * w, t, 0.6);
    A.rain.g.gain.setTargetAtTime(0.16 * w, t, 0.6);
    A.water.g.gain.setTargetAtTime(0.1 * water, t, 0.5);
    A.cricket.gain.setTargetAtTime(0.012 * (1 - day) * (1 - w), t, 1.0);
    // battle crowd + footsteps + hooves + birds
    if (g) {
      let fighting = 0, walkers = 0, riders = 0;
      for (const u of g.units) {
        if (u.dead) continue; const d2 = (u.x - cam.x) ** 2 + (u.z - cam.z) ** 2; if (d2 > 3600) continue;
        if (u.state === 'attack') fighting++; else if (u.speedNow > 0.8) { if (u.cls === 'cav') riders++; else walkers++; }
      }
      A.crowd.g.gain.setTargetAtTime(Math.min(0.13, fighting * 0.006), t, 0.4);
      this.fightLevel = fighting;
      this.stepT -= dt; if (this.stepT <= 0 && walkers > 0) { this.stepT = Math.max(0.09, 0.5 / Math.sqrt(walkers)); this._noise(0.05, 'lowpass', 380 + this.rng() * 200, 0, 0.7, Math.min(0.1, 0.02 + walkers * 0.003) * this.vol.sfx, this.busS); }
      this.hoofT -= dt; if (this.hoofT <= 0 && riders > 0) { this.hoofT = 0.16; this._noise(0.04, 'bandpass', 700, 0, 2, Math.min(0.14, 0.04 + riders * 0.01), this.busS); this._osc('sine', 120, 80, 0.06, 0.07, this.busS, 0.07); }
      this.clashT -= dt; if (this.clashT <= 0 && fighting > 2) { this.clashT = Math.max(0.15, 0.9 / Math.sqrt(fighting)); this.sfx(this.rng() < 0.6 ? 'clash' : 'hit'); }
      this.birdT -= dt; if (this.birdT <= 0) { this.birdT = 2 + this.rng() * 6; if (day > 0.5 && w < 0.3 && fighting < 3) this._bird(); }
    }
  }
  _bird() { const base = 2200 + this.rng() * 1800, n = 2 + Math.floor(this.rng() * 3); for (let i = 0; i < n; i++) this._osc('sine', base, base * (1.2 + this.rng() * 0.5), 0.09, 0.04, this.busA, i * 0.13); }
  thunder() { if (!this.ctx) return; this._noise(2.4, 'lowpass', 300, 60, 0.8, 0.5, this.busA, 0, 0.08); this._osc('sine', 50, 30, 2.0, 0.25, this.busA); }
  dispose() { clearInterval(this.sched); if (this.ctx) this.ctx.close(); this.ctx = null; }
}

const N = (a, ...x) => a._noise(...x);
const SFX = {
  ui_click: (a, v) => { a._osc('triangle', 760, 520, 0.07, 0.14); },
  ui_hover: (a, v) => { a._osc('sine', 1200, 1200, 0.03, 0.04); },
  ui_back: (a, v) => { a._osc('triangle', 520, 330, 0.09, 0.12); },
  ui_error: (a, v) => { a._osc('square', 160, 120, 0.16, 0.1); },
  ui_confirm: (a, v) => { a._osc('triangle', 520, 520, 0.1, 0.12); a._osc('triangle', 780, 780, 0.14, 0.12, null, 0.09); },
  ui_open: (a, v) => { a._osc('triangle', 330, 660, 0.18, 0.1); N(a, 0.12, 'bandpass', 900, 2200, 2, 0.04); },
  ui: (a, v) => { a._osc('triangle', 900, 700, 0.05, 0.08 * v); },
  hammer: (a, v) => { N(a, 0.07, 'bandpass', 1800, 900, 3, 0.35 * v); a._osc('triangle', 240, 150, 0.06, 0.18 * v); },
  chop: (a, v) => { N(a, 0.08, 'lowpass', 1400, 500, 0.8, 0.4 * v); a._osc('sine', 160, 90, 0.09, 0.22 * v); },
  pick: (a, v) => { a._osc('square', 2100, 1500, 0.05, 0.09 * v); N(a, 0.05, 'highpass', 3000, 0, 1, 0.2 * v); a._osc('sine', 130, 80, 0.07, 0.16 * v); },
  hoe: (a, v) => { N(a, 0.12, 'lowpass', 600, 300, 0.7, 0.22 * v); },
  craft: (a, v) => { a._osc('triangle', 480, 430, 0.06, 0.12 * v); N(a, 0.05, 'bandpass', 2400, 0, 2, 0.1 * v); },
  place: (a, v) => { a._osc('sine', 150, 70, 0.14, 0.3 * v); N(a, 0.1, 'lowpass', 700, 0, 0.8, 0.3 * v); },
  build: (a, v) => { SFX.hammer(a, v); SFX.hammer(a, v * 0.8); },
  clash: (a, v) => { for (const f of [1250, 1870, 2710]) a._osc('square', f * (0.98 + Math.random() * 0.04), f * 0.96, 0.18, 0.05 * v); N(a, 0.09, 'highpass', 3500, 0, 1, 0.22 * v); },
  hit: (a, v) => { N(a, 0.09, 'lowpass', 1500, 400, 0.8, 0.45 * v); a._osc('sine', 110, 60, 0.1, 0.25 * v); },
  charge: (a, v) => { N(a, 0.25, 'lowpass', 500, 200, 0.7, 0.5 * v); a._osc('sine', 80, 40, 0.3, 0.3 * v); },
  swish: (a, v) => { N(a, 0.14, 'bandpass', 600, 2600, 1.5, 0.2 * v); },
  bow: (a, v) => { a._osc('triangle', 260, 110, 0.12, 0.14 * v); N(a, 0.12, 'bandpass', 1800, 700, 2, 0.1 * v); },
  crossbow: (a, v) => { a._osc('square', 180, 90, 0.07, 0.14 * v); N(a, 0.05, 'highpass', 2500, 0, 1, 0.2 * v); },
  arrowhit: (a, v) => { N(a, 0.06, 'lowpass', 900, 300, 1, 0.22 * v); a._osc('sine', 200, 100, 0.06, 0.1 * v); },
  catapult: (a, v) => { a._osc('sawtooth', 70, 140, 0.6, 0.12 * v); N(a, 0.5, 'bandpass', 400, 1800, 1.4, 0.25 * v, 0.1); a._osc('sine', 90, 45, 0.3, 0.3 * v, null, 0.55); },
  boom: (a, v) => { N(a, 1.0, 'lowpass', 500, 80, 0.7, 0.9 * v); a._osc('sine', 70, 28, 0.9, 0.6 * v); },
  collapse: (a, v) => { N(a, 1.8, 'lowpass', 700, 90, 0.8, 0.8 * v, 0, 0.05); a._osc('sine', 60, 30, 1.2, 0.4 * v); N(a, 0.6, 'bandpass', 1500, 400, 1, 0.3 * v, 0.2); },
  gate: (a, v) => { a._osc('sawtooth', 90, 130, 0.9, 0.1 * v); N(a, 0.8, 'bandpass', 300, 600, 3, 0.18 * v); a._osc('sine', 80, 50, 0.2, 0.3 * v, null, 0.85); },
  ram: (a, v) => { a._osc('sine', 62, 32, 0.5, 0.7 * v); N(a, 0.4, 'lowpass', 400, 100, 0.8, 0.6 * v); },
  thud: (a, v) => { a._osc('sine', 95, 50, 0.22, 0.45 * v); N(a, 0.1, 'lowpass', 500, 0, 0.8, 0.3 * v); },
  coin: (a, v) => { a._osc('sine', 1568, 1568, 0.18, 0.12 * v); a._osc('sine', 2093, 2093, 0.25, 0.1 * v, null, 0.08); },
  spawn: (a, v) => { a._osc('triangle', 392, 392, 0.12, 0.1 * v); a._osc('triangle', 587, 587, 0.18, 0.1 * v, null, 0.1); },
  horn: (a, v) => { a._osc('sawtooth', 196, 196, 0.9, 0.12); a._osc('sawtooth', 294, 294, 0.9, 0.1, null, 0); N(a, 0.9, 'lowpass', 900, 0, 0.5, 0.03); },
};
