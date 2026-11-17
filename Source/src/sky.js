// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// Sky dome (gradient, sun glow, clouds, stars) and day/night colour model.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from './util.js';

const VS = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }`;
const FS = `
varying vec3 vDir;
uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uNight; uniform float uTime; uniform float uCloud; uniform vec3 uCloudCol;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i=0;i<5;i++){ s += a*vn(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHor, uTop, pow(clamp(h, 0.0, 1.0), 0.55));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(sd, 900.0) * 3.0 + pow(sd, 18.0) * 0.28 + pow(sd, 4.0) * 0.08);
  // stars
  if (uNight > 0.02 && d.y > 0.0) {
    vec2 sp = d.xz / (d.y + 0.35) * 70.0; float st = h21(floor(sp)); float tw = 0.6 + 0.4 * sin(uTime * 2.0 + st * 50.0);
    col += vec3(1.0, 0.95, 0.85) * step(0.985, st) * tw * uNight * smoothstep(0.0, 0.25, d.y);
  }
  // clouds
  if (d.y > 0.02) {
    vec2 cp = d.xz / (d.y + 0.12) * 1.1 + vec2(uTime * 0.012, uTime * 0.006);
    float c = fbm(cp * 1.4);
    float cov = mix(0.58, 0.28, uCloud);
    float a = smoothstep(cov, cov + 0.25, c) * smoothstep(0.02, 0.28, d.y);
    vec3 cc = uCloudCol * (0.78 + 0.28 * fbm(cp * 3.0 + 5.0));
    col = mix(col, cc, a * (0.55 + 0.4 * uCloud));
  }
  gl_FragColor = vec4(col, 1.0);
#include <colorspace_fragment>
}`;

export class Sky {
  constructor(scene) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uNight: { value: 0 }, uTime: { value: 0 }, uCloud: { value: 0.2 }, uCloudCol: { value: new THREE.Color(1, 1, 1) } },
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -10;
    scene.add(this.mesh);
  }
  follow(cam) { this.mesh.position.copy(cam.position); const s = (cam.far || 1500) * 0.9; this.mesh.scale.setScalar(s); }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.mesh.parent && this.mesh.parent.remove(this.mesh); }
}

const C = (h) => new THREE.Color(h);
const NIGHT_TOP = C(0x050a1c), NIGHT_HOR = C(0x142040), DUSK_HOR = C(0xff8a50), DUSK_TOP = C(0x4a5a8a);
const tmp = new THREE.Color();

// Compute lighting state from time of day (0..1, 0 = midnight) and theme.
export function dayState(tod, theme, weather = 0) {
  const ang = tod * Math.PI * 2;
  const el = -Math.cos(ang) * 1.0;           // -1..1: >0 daytime
  const elev = Math.asin(clamp(el, -1, 1)) * 0.92 + 0.0; // radians
  const az = 0.75 + tod * Math.PI * 2 * 0.0 + Math.sin(ang) * 0.9;
  const day = smoothstep(-0.08, 0.22, el);   // 0 night .. 1 day
  const dusk = Math.max(0, 1 - Math.abs(el) / 0.28) ;          // warm band around the horizon
  const sunDir = new THREE.Vector3(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev)).normalize();
  const lightDir = sunDir.clone(); if (lightDir.y < 0.12) { lightDir.set(-sunDir.x, Math.max(0.35, -sunDir.y), -sunDir.z).normalize(); } // moon from opposite side
  const top = new THREE.Color().copy(NIGHT_TOP).lerp(C(theme.sky), day).lerp(DUSK_TOP, dusk * 0.4 * day);
  const hor = new THREE.Color().copy(NIGHT_HOR).lerp(C(theme.fog), day).lerp(DUSK_HOR, dusk * 0.7 * (0.3 + 0.7 * day));
  const grey = new THREE.Color(0x77808a);
  const w = clamp(weather, 0, 1);
  if (w > 0) { tmp.copy(grey).multiplyScalar(0.3 + 0.7 * day); top.lerp(tmp, w * 0.75); hor.lerp(tmp.multiplyScalar(1.15), w * 0.8); }
  const sunCol = new THREE.Color(1.0, 0.93, 0.8).lerp(new THREE.Color(1.0, 0.55, 0.28), dusk * 0.8);
  const lightCol = day > 0.35 ? new THREE.Color().copy(sunCol) : new THREE.Color(0.55, 0.65, 1.0);
  const sunI = lerp(0.42, 3.0, day) * (1 - 0.55 * w) * (0.55 + 0.45 * clamp(Math.sin(Math.max(elev, 0.05)) * 2.2, 0, 1));
  const hemiI = lerp(0.55, 1.15, day) * (1 - 0.15 * w);
  const hemiSky = new THREE.Color().copy(top).lerp(new THREE.Color(1, 1, 1), 0.3);
  const hemiGround = new THREE.Color(theme.low).multiplyScalar(0.55 + 0.25 * day);
  return { el, elev, day, dusk, sunDir, lightDir, top, hor, sunCol, lightCol, sunI, hemiI, hemiSky, hemiGround, night: 1 - day, fog: hor.clone() };
}
