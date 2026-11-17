// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kingdoms', {
  read: (name) => ipcRenderer.invoke('kg:read', String(name)),
  write: (name, text) => ipcRenderer.invoke('kg:write', String(name), String(text)),
  remove: (name) => ipcRenderer.invoke('kg:remove', String(name)),
  quit: () => ipcRenderer.send('kg:quit'),
  setFullscreen: (on) => ipcRenderer.send('kg:fullscreen', !!on),
  setResolution: (w, h) => ipcRenderer.send('kg:resolution', w | 0, h | 0),
  platform: process.platform,
});
