// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Persistence layer: Electron (files in the user data folder) with a localStorage fallback for browsers.
const api = typeof window !== 'undefined' && window.kingdoms ? window.kingdoms : null;
const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
const mem = {};
const lget = (k) => { try { return LS ? LS.getItem(k) : mem[k] || null; } catch (e) { return mem[k] || null; } };
const lset = (k, v) => { try { if (LS) LS.setItem(k, v); else mem[k] = v; return true; } catch (e) { mem[k] = v; return false; } };
const ldel = (k) => { try { if (LS) LS.removeItem(k); delete mem[k]; } catch (e) { delete mem[k]; } };

export const SLOTS = 8; // slots 1..8 are manual, slot 0 is the autosave
export const storage = {
  isNative: !!api,
  async getJSON(name, def) {
    try { const t = api ? await api.read(name) : lget('ic_' + name); return t ? JSON.parse(t) : def; } catch (e) { return def; }
  },
  async setJSON(name, obj) {
    const t = JSON.stringify(obj);
    try { if (api) return await api.write(name, t); return lset('ic_' + name, t); } catch (e) { return false; }
  },
  async listSaves() {
    const out = [];
    for (let s = 0; s <= SLOTS; s++) {
      try {
        const t = api ? await api.read('save' + s + '.meta') : lget('ic_save' + s + '.meta');
        if (t) { const m = JSON.parse(t); m.slot = s; out.push(m); }
      } catch (e) { /* ignore broken meta */ }
    }
    return out;
  },
  async readSave(slot) { return api ? api.read('save' + slot) : lget('ic_save' + slot); },
  async writeSave(slot, text, meta) {
    try {
      if (api) { await api.write('save' + slot, text); await api.write('save' + slot + '.meta', JSON.stringify(meta)); }
      else { lset('ic_save' + slot, text); lset('ic_save' + slot + '.meta', JSON.stringify(meta)); }
      return true;
    } catch (e) { return false; }
  },
  async deleteSave(slot) { try { if (api) { await api.remove('save' + slot); await api.remove('save' + slot + '.meta'); } else { ldel('ic_save' + slot); ldel('ic_save' + slot + '.meta'); } return true; } catch (e) { return false; } },
  native: api,
};
