// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// User settings, graphics presets and key bindings.
import { storage } from './storage.js';
import { IS_TOUCH } from './platform.js';

export const DEFAULT_KEYS = {
  camUp: 'KeyW', camDown: 'KeyS', camLeft: 'KeyA', camRight: 'KeyD', rotLeft: 'KeyQ', rotRight: 'KeyE', zoomIn: 'PageUp', zoomOut: 'PageDown',
  focus: 'Space', pause: 'Escape', stop: 'KeyX', patrol: 'KeyP', attackMove: 'KeyT', garrison: 'KeyG', retreat: 'KeyR', rotateBuilding: 'KeyR',
  formation: 'KeyF', stance: 'KeyC', selectArmy: 'KeyB', selectIdle: 'KeyI', demolish: 'Delete', speedUp: 'Equal', speedDown: 'Minus', quickSave: 'F5', quickLoad: 'F9',
  panelBuild: 'F1', panelArmy: 'F2', panelTech: 'F3', panelKingdom: 'F4', nextAlert: 'Backspace',
};
export const KEY_ORDER = ['camUp', 'camDown', 'camLeft', 'camRight', 'rotLeft', 'rotRight', 'zoomIn', 'zoomOut', 'focus', 'pause', 'stop', 'patrol', 'attackMove', 'garrison', 'retreat', 'rotateBuilding', 'formation', 'stance', 'selectArmy', 'selectIdle', 'demolish', 'speedUp', 'speedDown', 'panelBuild', 'panelArmy', 'panelTech', 'panelKingdom', 'nextAlert', 'quickSave', 'quickLoad'];

export const PRESETS = {
  low:    { shadow: 0,    dpr: 1,   particles: 0.35, rain: 0.4, far: 380 },
  medium: { shadow: 1024, dpr: 1.25, particles: 0.65, rain: 0.7, far: 520 },
  high:   { shadow: 2048, dpr: 1.5, particles: 1,    rain: 1,   far: 700 },
  ultra:  { shadow: 4096, dpr: 2,   particles: 1.4,  rain: 1,   far: 900 },
};
export const DEFAULTS = {
  v: 2, lang: 'en', quality: 'high', shadows: 'preset', aa: true, fullscreen: false, resolution: 'auto', fpsLimit: 60,
  volMaster: 0.8, volMusic: 0.5, volSfx: 0.8, volAmbient: 0.6,
  edgeScroll: true, camSpeed: 1, rotSpeed: 1, zoomSpeed: 1, weather: true, dayNight: true, showFps: false, tooltips: true, autosave: 5,
  keys: Object.assign({}, DEFAULT_KEYS),
};
export const SHADOW_VALUES = { off: 0, low: 1024, medium: 2048, high: 4096 };

export const settings = JSON.parse(JSON.stringify(DEFAULTS));
const listeners = [];
export function onSettings(fn) { listeners.push(fn); }
export async function loadSettings() {
  const s = await storage.getJSON('settings', null);
  if (!s && IS_TOUCH) { settings.quality = 'low'; settings.edgeScroll = false; settings.tooltips = false; settings.fullscreen = false; } // first start on a phone / tablet: light graphics, no mouse-only options
  if (s && typeof s === 'object') {
    for (const k in DEFAULTS) if (k !== 'keys' && s[k] !== undefined && typeof s[k] === typeof DEFAULTS[k]) settings[k] = s[k];
    if (s.keys && typeof s.keys === 'object') for (const k in DEFAULT_KEYS) if (typeof s.keys[k] === 'string') settings.keys[k] = s.keys[k];
  }
  return settings;
}
export function saveSettings() { storage.setJSON('settings', settings); for (const f of listeners) f(settings); }
export function resetSettings() { const k = settings.lang; Object.assign(settings, JSON.parse(JSON.stringify(DEFAULTS))); settings.lang = k; saveSettings(); }
export function qualityOf(s = settings) {
  const p = Object.assign({}, PRESETS[s.quality] || PRESETS.high);
  if (s.shadows !== 'preset' && s.shadows in SHADOW_VALUES) p.shadow = SHADOW_VALUES[s.shadows];
  p.weather = !!s.weather; p.dayNight = !!s.dayNight; p.aa = !!s.aa;
  return p;
}
export function keyLabel(code) {
  if (!code) return '—';
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '').replace('Escape', 'Esc').replace('Equal', '+').replace('Minus', '-').replace('Backspace', 'Bksp').replace('Delete', 'Del').replace('PageUp', 'PgUp').replace('PageDown', 'PgDn');
}
