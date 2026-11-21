// Dunia desa: jalan, sungai, rumah, bangunan khusus, pohon, tiang listrik, lapangan, langit & awan.
import * as THREE from 'three';
import { M, box, label, rnd } from './util.js';
import { buildWar } from './war.js';

export const colliders = [];               // kotak tabrakan (AABB) di bidang XZ
const solid = (x, z, w, d) => colliders.push({ x, z, hx: w / 2, hz: d / 2 });
export const FIELD = { x: 70, z: -50, w: 36, d: 24 };
export const RIVER_Z = 48;
export const inWater = (x, z) => Math.abs(z - RIVER_Z) < 4.5 && Math.abs(x) > 3.5; // di luar jembatan

export function buildWorld(scene, sfx) {
  // ---- Langit, kabut & cahaya ----
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x9fd8f5, 70, 230);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a4a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2d0, .8); sun.position.set(50, 80, 30); scene.add(sun);

  const flat = (w, d, c, x, y, z, o) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M(c, o));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m;
  };

  // ---- Tanah, jalan, trotoar ----
  flat(500, 500, 0x5fa24a, 0, 0, 0);
  flat(260, 10, 0x3a3a3f, 0, .02, 0);
  for (let x = -120; x <= 120; x += 8) flat(3, .25, 0xffffff, x, .04, 0);
  for (const z of [-6.5, 6.5]) flat(260, 3, 0xb8b8b0, 0, .05, z);
  flat(6, 43, 0xc2a878, 0, .035, 26.5);           // jalan tanah ke sungai

  // ---- Sungai + jembatan ----
  flat(500, 14, 0xcdb98a, 0, .03, RIVER_Z);       // pasir tepi sungai
  flat(500, 9, 0x2e8bd6, 0, .06, RIVER_Z, { transparent: true, opacity: .85 });
  box(6, .1, 15, 0x7a5a3a, 0, .1, RIVER_Z, scene);
  for (const x of [-3, 3]) box(.2, .9, 15, 0x5a3a1e, x, .55, RIVER_Z, scene);

  // ---- Bangunan generik ----
  function bld({ x, z, w = 9, d = 8, h = 4, wall, roof = 0xb5532f, sign, fl }) {
    const s = z < 0 ? 1 : -1, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    box(w, h, d, wall, 0, h / 2, 0, g);
    if (fl) box(w + .4, .3, d + .4, 0x777777, 0, h + .15, 0, g);
    else { const r = new THREE.Mesh(new THREE.ConeGeometry(w * .78, 2.5, 4), M(roof)); r.position.y = h + 1.25; r.rotation.y = Math.PI / 4; g.add(r); }
    box(1.4, 2.4, .2, 0x5a3a1e, 0, 1.2, s * (d / 2 + .05), g);
    if (w >= 6) for (const dx of [-w / 3, w / 3]) box(1.3, 1.2, .2, 0x9fd3ff, dx, 2.4, s * (d / 2 + .05), g);
    if (sign) { const l = label(sign, Math.min(w * .5, 6), 1); l.position.set(0, h - .6, s * (d / 2 + .15)); if (s < 0) l.rotation.y = Math.PI; g.add(l); }
    solid(x, z, w, d); return g;
  }
  const wallCols = [0xf5e6c8, 0xe8c9a0, 0xcfe3d4, 0xd9d2e9, 0xf6d5d5, 0xfff3b0];
  const pickC = i => wallCols[Math.abs(i) % wallCols.length];
  // Baris rumah warga (utara z=-18, selatan z=18, belakang z=-34)
  const war = buildWar(scene, solid, sfx);
  const RU = new Set(['n3', 'n4', 's-3', 's2', 's3', 's4', 't-4', 't-3']); // rumah yang hancur terkena rudal
  const place = (key, o, rx, rz) => RU.has(key) ? war.ruin(rx, rz) : bld(o);
  for (let i = -4; i <= 4; i++) {
    const x = i * 22;
    if (i !== -2 && i !== 1) place('n' + i, { x, z: -18, wall: pickC(i + 2) }, x, -18);
    if (i !== 0) place('s' + i, { x, z: 18, wall: pickC(i + 5) }, x, 18);
    if (i <= 1) place('t' + i, { x: x * 1.3, z: -34, wall: pickC(i + 1), w: 8, d: 7 }, x * 1.3, -34);
  }
  // Tank di tepi jalan
  war.tank(-64, -12, 0, 0x4b5d2a); war.tank(46, -12, Math.PI, 0xa89968); war.tank(-85, 11, Math.PI, 0x4b5d2a); war.tank(75, 11, 0, 0xa89968);
  // Bangunan khusus
  bld({ x: 22, z: -20, w: 12, d: 9, h: 4.5, wall: 0x3b5fc0, roof: 0x1a2f6b, sign: 'POLISI' });
  const clinic = bld({ x: -44, z: -20, w: 13, d: 9, h: 4.5, wall: 0xf2f2f2, roof: 0xd32f2f, sign: 'POS MEDIS' });
  box(1.6, .5, .15, 0xd32f2f, 4.4, 3.2, 4.6, clinic); box(.5, 1.6, .15, 0xd32f2f, 4.4, 3.2, 4.6, clinic);
  bld({ x: -100, z: -10, w: 3.5, d: 3.5, h: 2.6, wall: 0x6d8b74, sign: 'POS JAGA', fl: true });
  box(.15, .15, 7, 0xff5722, -100, 1, -6.5 + 3, scene); // palang

  // ---- Warung (area duduk + penjual) ----
  { const g = new THREE.Group(); g.position.set(10, 0, 12); scene.add(g);
    box(6.4, .2, 6.5, 0xc0392b, 0, 3.2, -.6, g);
    for (const [x, z] of [[-3, -3.8], [3, -3.8], [-3, 2], [3, 2]]) box(.2, 3.2, .2, 0x6b4a2b, x, 1.6, z, g);
    box(6, 3, .2, 0xd7b98a, 0, 1.5, 2.3, g);
    box(4.6, 1, .8, 0x8d6e63, 0, .5, -.2, g); solid(10, 11.8, 4.6, .8);
    box(1.8, .1, 1, 0x8d6e63, 0, .8, -3.4, g); box(.2, .8, .2, 0x5a3a1e, 0, .4, -3.4, g);
    for (const x of [-1.8, 1.8]) box(.6, .1, 1.4, 0x6d4c41, x, .45, -3.4, g);
    const l = label('WARUNG', 3.6, .9, 'rgba(192,57,43,.9)'); l.position.set(0, 2.7, -3.9); l.rotation.y = Math.PI; g.add(l); }

  // ---- Halte bus ----
  { const g = new THREE.Group(); g.position.set(-20, 0, 7); scene.add(g);
    box(4, .15, 1.8, 0x2b6cb0, 0, 2.6, 0, g);
    for (const x of [-1.8, 1.8]) box(.12, 2.6, .12, 0x555555, x, 1.3, .8, g);
    box(3, .1, .6, 0x8d6e63, 0, .5, .7, g); box(3.2, 2, .08, 0xbfe3ff, 0, 1.5, .9, g).material.transparent = true;
    const l = label('HALTE', 2.4, .6); l.position.set(0, 2.95, 0); l.rotation.y = Math.PI; g.add(l); }

  // ---- Tiang listrik + kabel ----
  const wire = [];
  for (let x = -108; x <= 108; x += 18) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 8, 6), M(0x5a4632)); p.position.set(x, 4, -8.5); scene.add(p);
    box(2.4, .15, .15, 0x3e2f20, x, 7.5, -8.5, scene);
    if (x < 108) for (const o of [-1, 0, 1]) wire.push(x + o * .01 + 1 * o, 7.5, -8.5, x + 18 + o, 7.5, -8.5);
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x222222 })));

  // ---- Pohon ----
  const free = (x, z, pad) => {
    if (Math.abs(z) < 10 || Math.abs(z - RIVER_Z) < 10 || (Math.abs(x) < 5 && z > 0)) return false;
    if (war.sites.some(q => Math.hypot(x - q.x, z - q.z) < 7)) return false;
    if (Math.abs(x - FIELD.x) < FIELD.w / 2 + 4 && Math.abs(z - FIELD.z) < FIELD.d / 2 + 4) return false;
    return !colliders.some(c => Math.abs(x - c.x) < c.hx + pad && Math.abs(z - c.z) < c.hz + pad);
  };
  const tg = new THREE.CylinderGeometry(.25, .35, 2.5, 6), lgm = new THREE.ConeGeometry(1.7, 4.2, 7);
  const tm = M(0x6b4a2b), lm = [M(0x2e7d32), M(0x388e3c), M(0x1b5e20)];
  for (let n = 0; n < 120;) {
    const x = rnd(-125, 125), z = rnd(-120, 100); if (!free(x, z, 3)) continue;
    const t = new THREE.Group(), s = rnd(.8, 1.4); t.position.set(x, 0, z); t.scale.setScalar(s);
    const a = new THREE.Mesh(tg, tm); a.position.y = 1.25; const b = new THREE.Mesh(lgm, lm[n % 3]); b.position.y = 4.2;
    t.add(a, b); scene.add(t); solid(x, z, .8, .8); n++;
  }

  // ---- Lapangan sepak bola berlumpur ----
  flat(FIELD.w, FIELD.d, 0x7a5c3a, FIELD.x, .03, FIELD.z);
  for (let i = 0; i < 14; i++) flat(rnd(2, 4.5), rnd(1.5, 3), 0x5e4529, FIELD.x + rnd(-15, 15), .04, FIELD.z + rnd(-10, 10));
  const ln = (w, d, x, z) => box(w, .05, d, 0xf0ead6, FIELD.x + x, .07, FIELD.z + z, scene);
  ln(FIELD.w, .2, 0, -FIELD.d / 2); ln(FIELD.w, .2, 0, FIELD.d / 2); ln(.2, FIELD.d, -FIELD.w / 2, 0); ln(.2, FIELD.d, FIELD.w / 2, 0); ln(.2, FIELD.d, 0, 0);
  for (const sx of [-1, 1]) {
    const gx = FIELD.x + sx * FIELD.w / 2;
    box(.2, 2.4, .2, 0xffffff, gx, 1.2, FIELD.z - 3, scene); box(.2, 2.4, .2, 0xffffff, gx, 1.2, FIELD.z + 3, scene); box(.2, .2, 6.2, 0xffffff, gx, 2.4, FIELD.z, scene);
  }

  // ---- Awan melayang ----
  const clouds = [], cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .92 });
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rnd(4, 7), 8, 6), cm); s.position.set(k * 5 - 10, rnd(-1, 2), rnd(-3, 3)); s.scale.y = .6; c.add(s); }
    c.position.set(rnd(-200, 200), rnd(50, 75), rnd(-200, 200)); scene.add(c); clouds.push(c);
  }
  return {
    update(dt, t, P) { for (const c of clouds) { c.position.x += dt * 1.5; if (c.position.x > 220) c.position.x = -220; } war.update(dt, t, P); },
    get shake() { return war.shake; }
  };
}
