// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Platform detection. Touch devices (and the Android build) get touch controls and a compact HUD.
const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
const q = (typeof location !== 'undefined' && location.search) || '';

export const IS_ANDROID = /Android/i.test(ua) || /[?&]android=1/.test(q);
export const IS_TOUCH = IS_ANDROID || /[?&]touch=1/.test(q) || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && !/Electron/i.test(ua));

/** Major Chromium version of the embedded browser / WebView (0 when unknown). */
export function chromeMajor() { const m = /Chrome\/(\d+)/.exec(ua); return m ? +m[1] : 0; }

export function applyPlatformClasses() {
  document.body.classList.toggle('touch', IS_TOUCH);
  document.body.classList.toggle('android', IS_ANDROID);
}
