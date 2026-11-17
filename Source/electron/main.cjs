// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Electron main process: window, persistent storage in the user-data folder, fullscreen / resolution control.
'use strict';
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const TITLE = 'Iron Crown: Medieval Kingdoms';
let win = null;

// The product name contains a colon, which is not a legal Windows folder name,
// so the user-data folder is pinned to a plain name (saves/settings live in <AppData>\IronCrown-MedievalKingdoms\data).
app.setPath('userData', path.join(app.getPath('appData'), 'IronCrown-MedievalKingdoms'));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const dataDir = () => { const d = path.join(app.getPath('userData'), 'data'); fs.mkdirSync(d, { recursive: true }); return d; };
const safe = (name) => (typeof name === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(name) && !name.includes('..') ? path.join(dataDir(), name) : null);

ipcMain.handle('kg:read', (e, name) => { const f = safe(name); if (!f) return null; try { return fs.readFileSync(f, 'utf8'); } catch (err) { return null; } });
ipcMain.handle('kg:write', (e, name, text) => {
  const f = safe(name); if (!f || typeof text !== 'string' || text.length > 64 * 1024 * 1024) return false;
  const tmp = f + '.tmp'; fs.writeFileSync(tmp, text, 'utf8'); fs.renameSync(tmp, f); return true;
});
ipcMain.handle('kg:remove', (e, name) => { const f = safe(name); if (!f) return false; try { fs.unlinkSync(f); } catch (err) { /* already gone */ } return true; });
ipcMain.on('kg:quit', () => app.quit());
ipcMain.on('kg:fullscreen', (e, on) => { if (win) win.setFullScreen(!!on); });
ipcMain.on('kg:resolution', (e, w, h) => {
  if (!win || win.isFullScreen()) return;
  w = Math.max(800, Math.min(7680, w | 0)); h = Math.max(500, Math.min(4320, h | 0));
  win.setContentSize(w, h); win.center();
});

function createWindow() {
  win = new BrowserWindow({
    width: 1366, height: 768, minWidth: 1024, minHeight: 600, show: false, title: TITLE, backgroundColor: '#0a0604', autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, spellcheck: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'UI', 'index.html'));
  win.once('ready-to-show', () => win.show());
  setTimeout(() => { if (win && !win.isVisible()) win.show(); }, 8000);
  win.on('page-title-updated', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  win.on('closed', () => { win = null; });
}
if (gotLock) app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
