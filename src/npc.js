// NPC (jalan kaki, motor, mobil, bus, pemain bola, duduk di warung, penjual) + model manusia.
import * as THREE from 'three';
import { M, box, tag, rnd } from './util.js';
import { FIELD } from './world.js';

const rc = () => [0xd9534f, 0x5bc0de, 0xf0ad4e, 0x5cb85c, 0x9b59b6, 0xe67e22, 0xffffff][Math.floor(Math.random() * 7)];
const pick = a => a[Math.floor(Math.random() * a.length)];
const TALK_OLD = ['Selamat pagi! Cuacanya cerah ya.', 'Kalau lapar, mampir ke warung.', 'Hati-hati, motor suka ngebut di sini.', 'Air sungai di selatan jernih banget.', 'Sore nanti ada main bola di lapangan.'];

const TALK = ['Siap! Desa ini dalam pengawasan.', 'Tetap waspada, rudal masih sering jatuh.', 'Warung buka, istirahatlah sebentar.', 'Hati-hati, kendaraan taktis lewat.', 'Lapangan dipakai latihan fisik sore ini.'];
const CAMO = [{ s: 0x4b5d2a, p: 0x3b4a24, h: 0x3d4a22 }, { s: 0xa89968, p: 0x8f8157, h: 0x8a7c4f }, { s: 0x5a6b3a, p: 0x2f3b1f, h: 0x2f3b1f }];
const TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524];

// Model manusia blocky: kaki/tangan adalah pivot yang bisa diayun
export function humanoid(shirt, pants, skin = 0xf1c27d) {
  const g = new THREE.Group();
  box(.7, .9, .4, shirt, 0, 1.25, 0, g);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.28, 10, 8), M(skin)); h.position.y = 1.9; g.add(h);
  const limb = (w, hh, d, c, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); box(w, hh, d, c, 0, -hh / 2, 0, p); g.add(p); return p; };
  g.legL = limb(.28, .8, .3, pants, -.18, .8); g.legR = limb(.28, .8, .3, pants, .18, .8);
  g.armL = limb(.2, .8, .25, shirt, -.48, 1.65); g.armR = limb(.2, .8, .25, shirt, .48, 1.65);
  return g;
}
// Prajurit: seragam loreng, helm, rompi, senapan di punggung (medic = helm putih + palang merah)
export function soldier(k = Math.floor(Math.random() * 3), medic = false) {
  const c = CAMO[k % 3], g = humanoid(c.s, c.p, pick(TONES));
  const hm = new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(medic ? 0xf5f5f5 : c.h)); hm.position.y = 1.93; g.add(hm);
  box(.8, .55, .46, medic ? 0xeeeeee : 0x2b3320, 0, 1.32, 0, g);
  if (medic) { box(.25, .08, .02, 0xd32f2f, 0, 1.38, .24, g); box(.08, .25, .02, 0xd32f2f, 0, 1.38, .24, g); }
  else { const r = box(.08, .9, .1, 0x1c1c1c, .15, 1.25, -.3, g); r.rotation.z = .35; }
  return g;
}
export function walkAnim(g, ph, amt = .7) {
  const s = Math.sin(ph) * amt;
  g.legL.rotation.x = s; g.legR.rotation.x = -s; g.armL.rotation.x = -s; g.armR.rotation.x = s;
}
const wheel = (p, x, y, z, r = .35) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .25, 10), M(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(x, y, z); p.add(w); };
// Kendaraan menghadap +X
function motorModel() {
  const g = new THREE.Group(); box(1.8, .4, .5, 0x4b5d2a, 0, .7, 0, g); wheel(g, .8, .35, 0); wheel(g, -.8, .35, 0);
  const r = soldier(); r.scale.setScalar(.75); r.position.set(-.1, .3, 0); r.rotation.y = Math.PI / 2;
  r.legL.rotation.x = r.legR.rotation.x = -1.2; g.add(r); return g;
}
function carModel() { // jip militer
  const g = new THREE.Group(), c = pick([0x4b5d2a, 0xa89968]);
  box(3.8, .8, 1.9, c, 0, .8, 0, g); box(1.5, .8, 1.8, 0x9fd3ff, -.5, 1.55, 0, g); box(1.8, .12, 1.9, 0x6b7a3e, -.5, 2.0, 0, g); box(.6, .02, .6, 0xffffff, 1.1, 1.22, 0, g);
  for (const x of [-1.3, 1.3]) for (const z of [-.95, .95]) wheel(g, x, .4, z, .4); return g;
}
function busModel() {
  const g = new THREE.Group();
  box(10, 2.6, 2.6, 0x4b5d2a, 0, 1.7, 0, g); box(9.4, .4, 2.7, 0x6b7a3e, 0, 3.2, 0, g); box(1, .02, 1, 0xffffff, 3.2, 3.42, 0, g);
  for (const z of [-1.31, 1.31]) box(8, .9, .05, 0x9fd3ff, -.6, 2.2, z, g);
  for (const x of [-3, 3]) for (const z of [-1.2, 1.2]) wheel(g, x, .5, z, .5);
  const door = new THREE.Group(); door.position.set(2.4, 0, 1.32); box(1.3, 2.1, .08, 0x2b6cb0, .65, 1.15, 0, door); g.add(door);
  return { g, door };
}

export function createNPCs(scene, sfx) {
  const inter = [], movers = [], vehicles = [];
  const add = (g, name, lines) => {
    scene.add(g); if (name) { const t = tag(name); t.position.y = 2.5; g.add(t); }
    const e = { g, name, lines, i: 0, busy: false, hp: 60, dead: 0, fall: 0, y0: g.position.y }; if (lines) inter.push(e); return e;
  };

  // 1) NPC jalan kaki di trotoar
  ['Prada Budi', 'Koptu Sari', 'Sertu Andi', 'Prada Siti', 'Letda Joko', 'Kopda Dewi', 'Prada Rudi', 'Serka Wati'].forEach((n, i) => {
    const g = soldier(i % 3), e = add(g, n, [pick(TALK), pick(TALK)]);
    let dir = i % 2 ? 1 : -1, ph = rnd(0, 6); const sp = rnd(1.2, 1.8);
    g.position.set(rnd(-90, 90), 0, i % 4 < 2 ? 6.7 : -6.7);
    movers.push(dt => {
      if (e.busy) { walkAnim(g, 0, 0); return; }
      g.position.x += dir * sp * dt; if (g.position.x > 105) dir = -1; if (g.position.x < -105) dir = 1;
      ph += dt * sp * 4; g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; walkAnim(g, ph, .6);
    });
  });

  // 2) Motor & mobil lewat (dua lajur)
  const mkVeh = (g, dir, sp) => { g.position.set(rnd(-120, 120), 0, dir > 0 ? 2.5 : -2.5); g.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(g); vehicles.push({ g, dir, sp }); };
  for (let i = 0; i < 4; i++) mkVeh(motorModel(), i % 2 ? 1 : -1, rnd(8, 11));
  for (let i = 0; i < 3; i++) mkVeh(carModel(), i % 2 ? -1 : 1, rnd(6, 8));

  // 3) Bus intro (state: wait -> arrive -> stopped -> depart -> traffic)
  const bm = busModel(); bm.g.position.set(-110, 0, 2.5); scene.add(bm.g);
  const bus = {
    g: bm.g, state: 'traffic', t: 0, open: false, door: 0, vel: 0,
    start() { this.state = 'arrive'; this.t = 0; this.g.visible = true; this.g.position.x = -110; },
    depart() { if (this.state === 'arrive') { this.state = 'traffic'; this.g.position.x = -130; } else if (this.state === 'stopped') { this.state = 'depart'; this.open = false; } }
  };
  function updBus(dt) {
    const b = bus, p = b.g.position;
    b.door += ((b.open ? 1 : 0) - b.door) * Math.min(1, dt * 3); bm.door.rotation.y = -b.door * 1.6;
    if (b.state === 'arrive') { b.t += dt; const u = Math.min(b.t / 6, 1); p.x = -110 + 87 * (1 - (1 - u) * (1 - u)); if (u >= 1) { b.state = 'stopped'; sfx.brake(); } }
    else if (b.state === 'depart') { if (b.door < .05) { b.vel = Math.min(9, b.vel + dt * 3); p.x += b.vel * dt; if (p.x > 130) { b.state = 'traffic'; p.x = -130; } } }
    else if (b.state === 'traffic') { p.x += 8 * dt; if (p.x > 130) p.x = -130; }
  }

  // 4) Pemain bola di lapangan berlumpur
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), M(0xffffff)); ball.position.set(FIELD.x, .3, FIELD.z); scene.add(ball);
  const bs = { vx: 0, vz: 0, vy: 0 };
  movers.push(dt => {
    const p = ball.position; p.x += bs.vx * dt; p.z += bs.vz * dt; bs.vx *= .985; bs.vz *= .985; bs.vy -= 15 * dt;
    p.y += bs.vy * dt; if (p.y < .3) { p.y = .3; bs.vy = Math.abs(bs.vy) * .4; }
    const dx = p.x - FIELD.x, dz = p.z - FIELD.z;
    if (Math.abs(dx) > FIELD.w / 2) { bs.vx *= -.6; p.x = FIELD.x + Math.sign(dx) * FIELD.w / 2; }
    if (Math.abs(dz) > FIELD.d / 2) { bs.vz *= -.6; p.z = FIELD.z + Math.sign(dz) * FIELD.d / 2; }
  });
  for (let i = 0; i < 6; i++) {
    const tm = i % 2, g = soldier(tm ? 1 : 0), home = { x: FIELD.x + rnd(-12, 12), z: FIELD.z + rnd(-8, 8) };
    g.position.set(home.x, 0, home.z); add(g, null, null); let cd = 0, ph = 0;
    movers.push((dt, t, P) => {
      cd -= dt; const bx = ball.position.x, bz = ball.position.z, dB = Math.hypot(bx - g.position.x, bz - g.position.z);
      const tx = dB < 10 ? bx : home.x, tz = dB < 10 ? bz : home.z, dx = tx - g.position.x, dz = tz - g.position.z, d = Math.hypot(dx, dz);
      if (d > .5) { g.position.x += dx / d * 3.6 * dt; g.position.z += dz / d * 3.6 * dt; g.rotation.y = Math.atan2(dx, dz); ph += dt * 14; walkAnim(g, ph, .9); } else walkAnim(g, 0, 0);
      if (dB < 1 && cd <= 0) {
        const gx = FIELD.x + (tm ? -1 : 1) * FIELD.w / 2, ang = Math.atan2(FIELD.z + rnd(-3, 3) - bz, gx - bx), sp = rnd(7, 11);
        bs.vx = Math.cos(ang) * sp; bs.vz = Math.sin(ang) * sp; bs.vy = rnd(1.5, 3.5); cd = .8;
        if (Math.hypot(P.x - bx, P.z - bz) < 40) sfx.kick();
      }
    });
  }

  // 5) Duduk di warung (2 orang di bangku)
  [[8.2, Math.PI / 2, 'Mayor Haji'], [11.8, -Math.PI / 2, 'Praka Dodi']].forEach(([x, ry, n], i) => {
    const g = soldier(i); g.position.set(x, -.3, 8.6); g.rotation.y = ry; g.legL.rotation.x = g.legR.rotation.x = -1.4;
    const e = add(g, n, ['Istirahat dulu sambil ngopi, Prajurit.', 'Gorengan Sertu Warung paling mantap!']);
    movers.push((dt, t) => { g.armR.rotation.x = e.busy ? -1 : -.5 + Math.sin(t * 1.5 + x) * .2; });
  });

  // 6) Penjual warung (jualan, bisa diajak interaksi)
  { const g = soldier(2); g.position.set(10, 0, 12.4); g.rotation.y = Math.PI;
    const e = add(g, 'Sertu Warung', ['Siap! Mau pesan apa, Komandan?', 'Ada gorengan, kopi, dan nasi bungkus.', 'Ini pesanannya, Rp2.000. Siap!', 'Terima kasih, tetap waspada!']);
    movers.push((dt, t) => { g.armR.rotation.x = -.4 + Math.sin(t * 2) * .3; }); }

  // 7) Pedagang bakso keliling (jalan & bisa diajak interaksi)
  { const g = soldier(0), cart = new THREE.Group();
    box(1.6, 1, .9, 0x4b5d2a, 0, .9, 1.3, cart); box(1.8, .1, 1.1, 0xf5f5f5, 0, 1.45, 1.3, cart);
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.2, .5, 8), M(0x556b2f)); u.position.set(0, 2.6, 1.3); cart.add(u); box(.06, 1.2, .06, 0x555555, 0, 2, 1.3, cart);
    g.add(cart); g.position.set(-60, 0, -6.7);
    const e = add(g, 'Koki Lapangan', ['Dapur lapangan keliling! Bakso hangat!', 'Semangkuk Rp10.000, Prajurit?', 'Silakan, hati-hati panas.', 'Terima kasih, selamat makan!']);
    let ph = 0, bell = 0;
    movers.push((dt, t, P) => {
      if (e.busy) { walkAnim(g, 0, 0); return; }
      g.position.x += dt * 1.1; if (g.position.x > 105) g.position.x = -105; g.rotation.y = Math.PI / 2; ph += dt * 4.5; walkAnim(g, ph, .5);
      bell -= dt; if (bell <= 0) { bell = 6; if (Math.hypot(P.x - g.position.x, P.z - g.position.z) < 30) sfx.bell(); }
    }); }

  // 8) Suster Klinik: memulihkan HP penuh + isi ulang medkit (lihat onTalk di main.js)
  const nurse = (() => {
    const g = soldier(0, true); g.position.set(-44, 0, -13);
    return add(g, 'Medis Ani', ['Selamat datang di Pos Medis!', 'Sini, saya rawat lukamu sampai pulih.', 'Medkit sudah diisi ulang. Siap kembali bertugas!']);
  })();

  let hornCd = 0;
  function update(dt, t, P) {
    movers.forEach(f => f(dt, t, P));
    for (const v of vehicles) { const p = v.g.position; p.x += v.dir * v.sp * dt; if (p.x > 130) p.x = -130; if (p.x < -130) p.x = 130; }
    updBus(dt);
    let near = 999;
    for (const o of [...vehicles.map(v => v.g), bus.g]) if (o.visible) near = Math.min(near, Math.hypot(o.position.x - P.x, o.position.z - P.z));
    hornCd -= dt; if (near < 8 && hornCd <= 0 && bus.state !== 'arrive') { sfx.horn(); hornCd = 6; }
    return near; // jarak kendaraan terdekat (untuk volume mesin)
  }
  return { update, inter, bus, nurse };
}
