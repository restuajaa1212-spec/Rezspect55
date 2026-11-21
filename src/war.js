// Suasana perang: tank di tepi jalan, rumah hancur (api & asap), serangan rudal berkala.
import * as THREE from 'three';
import { M, box, rnd, label } from './util.js';
import { buildTank, buildPlane, buildWreck } from './setpieces.js';

export function buildWar(scene, solid, sfx) {
  const sites = [], puffs = [], fires = [], tanks = [], fx = [];
  const puffG = new THREE.SphereGeometry(1, 8, 6);
  let shake = 0, next = 12, missile = null;

  // Rumah hancur total: kawah, puing, dinding patah, balok hangus, api & asap
  function ruin(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const cr = new THREE.Mesh(new THREE.CircleGeometry(5, 18), M(0x141414)); cr.rotation.x = -Math.PI / 2; cr.position.y = .06; g.add(cr);
    const cols = [0x9e9e9e, 0x757575, 0x4a3b32, 0xb5532f, 0x2b2b2b];
    for (let k = 0; k < 18; k++) {
      const w = rnd(.5, 2.4), h = rnd(.3, 1.1), d = rnd(.5, 2.2), m = box(w, h, d, cols[k % 5], rnd(-4.2, 4.2), h * .4, rnd(-3.8, 3.8), g);
      m.rotation.set(rnd(-.5, .5), rnd(0, 3.1), rnd(-.5, .5));
    }
    box(4.5, rnd(1.6, 2.8), .4, 0xe0d4b8, -1, 1.2, -3.7, g); box(.4, rnd(1.4, 2.2), 3.4, 0xd9c9a3, 4.2, 1.0, .6, g); // dinding tersisa
    solid(x - 1, z - 3.7, 4.5, .4); solid(x + 4.2, z + .6, .4, 3.4);
    for (let k = 0; k < 4; k++) { const m = box(.25, .25, rnd(3, 5), 0x1b1b1b, rnd(-3, 3), rnd(.6, 1.4), rnd(-3, 3), g); m.rotation.set(rnd(-.7, .7), rnd(0, 3), rnd(-.5, .5)); } // balok hangus
    const r = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.4, 4), M(0x7a3b22)); r.position.set(-2, .5, 2); r.rotation.set(.9, .7, .5); g.add(r); // atap runtuh
    for (let k = 0; k < 2; k++) {
      const f = new THREE.Mesh(puffG, new THREE.MeshBasicMaterial({ color: k ? 0xffd54f : 0xff6d00, transparent: true, opacity: .9 }));
      f.position.set(rnd(-2.5, 2.5), .7, rnd(-2.5, 2.5)); g.add(f); fires.push({ m: f, s: rnd(0, 6) });
    }
    for (let k = 0; k < 7; k++) {
      const m = new THREE.Mesh(puffG, new THREE.MeshBasicMaterial({ color: 0x4a4a4a, transparent: true, opacity: .5, depthWrite: false })); g.add(m);
      puffs.push({ m, t: k / 7 * 6, x: rnd(-1.5, 1.5), z: rnd(-1.5, 1.5) });
    }
    sites.push({ x, z });
  }

  // Tank + karung pasir di tepi jalan
  function tank(x, z, ry, c) {
    const g = buildTank(c); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); solid(x, z, 6.8, 3.8);
    const s = z < 0 ? 1 : -1;
    for (let k = -3; k <= 3; k++) { box(1.1, .5, .6, 0xc2b280, x + k * 1.15, .25, z + s * 2.9, scene); if (k % 2) box(1.1, .5, .6, 0xb5a572, x + k * 1.15, .75, z + s * 2.9, scene); }
    solid(x, z + s * 2.9, 8, .7); tanks.push(g.turret);
  }

  // Ledakan rudal: bola api, puing beterbangan, guncangan layar
  function boom(x, z, vol) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: .95 })); s.position.set(x, 2, z); scene.add(s);
    const deb = []; for (let k = 0; k < 12; k++) { const d = box(.5, .5, .5, 0x3e2f20, x, 2, z, scene); d.v = new THREE.Vector3(rnd(-9, 9), rnd(8, 18), rnd(-9, 9)); deb.push(d); }
    fx.push({ t: 0, s, deb }); sfx.explode(vol);
  }
  function launch(P) {
    const s = sites[Math.floor(Math.random() * sites.length)];
    const start = new THREE.Vector3(s.x - rnd(90, 140), rnd(120, 160), s.z + rnd(-70, 70)), end = new THREE.Vector3(s.x + rnd(-2, 2), .5, s.z + rnd(-2, 2));
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 3.6, 8), M(0xdadada)), nose = new THREE.Mesh(new THREE.ConeGeometry(.35, 1.2, 8), M(0xb71c1c));
    nose.position.y = 2.4; const fl = new THREE.Mesh(new THREE.SphereGeometry(.6, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9100 })); fl.position.y = -2.2; fl.scale.y = 2;
    g.add(body, nose, fl); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()); g.position.copy(start); scene.add(g);
    const d = Math.hypot(P.x - s.x, P.z - s.z), vol = Math.max(.1, Math.min(1, 1 - d / 150));
    missile = { g, start, end, t: 0, dur: 3, d, vol }; sfx.whistle(vol);
  }

  // ---- Bunker beton yang bisa dimasuki + bendera Merah Putih berkibar di atasnya ----
  const bk = { x: -16, z: 32, W: 10, D: 8, H: 2.8 }, flags = [];
  function bunker() {
    const { x, z, W, D, H } = bk, t = .6, c = 0x8a8a84, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const fw = (W - 2.4) / 2; // pintu lebar 2.4 di sisi utara
    box(W, H, t, c, 0, H / 2, D / 2 - t / 2, g); box(t, H, D, c, -W / 2 + t / 2, H / 2, 0, g); box(t, H, D, c, W / 2 - t / 2, H / 2, 0, g);
    box(fw, H, t, c, -(1.2 + fw / 2), H / 2, -D / 2 + t / 2, g); box(fw, H, t, c, 1.2 + fw / 2, H / 2, -D / 2 + t / 2, g); box(2.4, .7, t, c, 0, H - .35, -D / 2 + t / 2, g);
    box(W + .8, .5, D + .8, 0x77776f, 0, H + .25, 0, g);
    solid(x, z + D / 2 - t / 2, W, t); solid(x - W / 2 + t / 2, z, t, D); solid(x + W / 2 - t / 2, z, t, D);
    solid(x - (1.2 + fw / 2), z - D / 2 + t / 2, fw, t); solid(x + 1.2 + fw / 2, z - D / 2 + t / 2, fw, t);
    box(W - 1.2, .02, D - 1.2, 0x4a4a46, 0, .04, 0, g); // lantai
    for (const sx of [-1, 1]) { box(2.4, .35, 1, 0x5d4037, sx * 3.2, .5, D / 2 - 1.2, g); box(2.4, .12, 1, 0x607d8b, sx * 3.2, .75, D / 2 - 1.2, g); } // ranjang
    box(1.6, .9, 1, 0x5d4037, 0, .45, .6, g); box(1.3, .02, .8, 0xe8e0c0, 0, .92, .6, g); // meja peta
    box(.9, .9, .9, 0x6b7a3e, -3.6, .45, -2.6, g); box(.9, .9, .9, 0x556b2f, 3.6, .45, -2.6, g); box(.6, .5, .5, 0x333333, 3.6, 1.15, -2.6, g); // peti & radio
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe082 })); lamp.position.set(0, H - .5, 0); g.add(lamp);
    for (const k of [-5.2, -4.2, -3.2, -2.2, 2.2, 3.2, 4.2, 5.2]) { box(1, .5, .6, 0xc2b280, k, .25, -D / 2 - 1, g); if (Math.abs(k) > 3) box(1, .5, .6, 0xb5a572, k, .75, -D / 2 - 1, g); } // karung pasir
    const l = label('BUNKER', 2.2, .55, 'rgba(20,20,20,.85)'); l.position.set(0, H - .35, -D / 2 - .02); l.rotation.y = Math.PI; g.add(l);
    // Tiang + bendera Merah Putih (atas merah, bawah putih)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 6, 6), M(0xcccccc)); pole.position.set(3.6, H + .5 + 3, -1.2); g.add(pole);
    const top = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd54f })); top.position.set(3.6, H + .5 + 6.1, -1.2); g.add(top);
    for (const [col, y] of [[0xe70011, H + .5 + 5.6], [0xffffff, H + .5 + 4.8]]) {
      const geo = new THREE.PlaneGeometry(2.4, .8, 14, 1), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      geo.userData.o = geo.attributes.position.array.slice(); m.position.set(3.6 + 1.2, y, -1.2); g.add(m); flags.push(geo);
    }
  }
  const inBunker = (x, z) => Math.abs(x - bk.x) < bk.W / 2 - .3 && Math.abs(z - bk.z) < bk.D / 2 - .3;

  // ---- Bangkai mobil (sebagian terbakar) ----
  function wreck(x, z, ry, burn, flip) {
    const g = buildWreck(); g.position.set(x, flip ? 1.5 : 0, z); g.rotation.set(0, ry, flip ? Math.PI : 0); scene.add(g); solid(x, z, 4.4, 2.4);
    if (!burn) return;
    const h = new THREE.Group(); h.position.set(x, 0, z); scene.add(h);
    for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(puffG, new THREE.MeshBasicMaterial({ color: k % 2 ? 0xffd54f : 0xff6d00, transparent: true, opacity: .9 })); f.position.set(rnd(-1.2, 1.2), 1.1, rnd(-.6, .6)); h.add(f); fires.push({ m: f, s: rnd(0, 6) }); }
    for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(puffG, new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: .5, depthWrite: false })); h.add(m); puffs.push({ m, t: k / 5 * 6, x: rnd(-.8, .8), z: rnd(-.5, .5) }); }
  }

  // ---- Pesawat pembom: lewat tiap menit & menjatuhkan bom ----
  const bombs = [], scorch = []; let bomber = null, nextBomber = 35;
  function scorchMark(x, z) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(rnd(2, 3), 14), new THREE.MeshBasicMaterial({ color: 0x0b0b0b })); m.rotation.x = -Math.PI / 2; m.position.set(x, .09, z); scene.add(m);
    scorch.push(m); if (scorch.length > 14) scene.remove(scorch.shift());
  }
  function dropBomb(p) {
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1.5, 8), M(0x2b2b2b)));
    const n = new THREE.Mesh(new THREE.ConeGeometry(.35, .6, 8), M(0x555555)); n.position.y = -1.05; g.add(n);
    g.position.set(p.x, p.y - 1, p.z + rnd(-6, 6)); scene.add(g); bombs.push({ g, v: new THREE.Vector3(14, 0, 0) });
  }

  function update(dt, t, P, cb) {
    for (const geo of flags) { // bendera berkibar
      const pos = geo.attributes.position, o = geo.userData.o;
      for (let i = 0; i < pos.count; i++) { const u = (o[i * 3] + 1.2) / 2.4; pos.setZ(i, Math.sin(u * 6 - t * 5) * .2 * u); }
      pos.needsUpdate = true;
    }
    for (const p of puffs) { p.t = (p.t + dt) % 6; const u = p.t / 6; p.m.position.set(p.x + u * 3, .8 + u * 16, p.z); p.m.scale.setScalar(1.2 + u * 3.5); p.m.material.opacity = .55 * (1 - u); }
    for (const f of fires) f.m.scale.set(.5, .6 + Math.sin(t * 9 + f.s) * .3, .5);
    tanks.forEach((tt, i) => tt.rotation.y = Math.sin(t * .25 + i * 2) * .5);
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; f.s.scale.setScalar(1 + f.t * 14); f.s.material.opacity = Math.max(0, .95 - f.t * 1.5);
      for (const d of f.deb) { d.v.y -= 22 * dt; d.position.addScaledVector(d.v, dt); d.rotation.x += dt * 3; if (d.position.y < .25) { d.position.y = .25; d.v.set(0, 0, 0); } }
      if (f.t > 2) { scene.remove(f.s); f.deb.forEach(d => scene.remove(d)); fx.splice(i, 1); }
    }
    shake = Math.max(0, shake - dt * 1.5);
    if (!P) return; // lobi: tanpa serangan
    nextBomber -= dt;
    if (!bomber && nextBomber <= 0) { // pesawat pembom lewat setiap 60 detik
      nextBomber = 60; const g = buildPlane(0x55604a); g.scale.setScalar(.8); g.position.set(-190, 70, rnd(-30, 30)); scene.add(g);
      bomber = { g, left: 6, dropT: 0 }; sfx.plane(.7); cb.warn('✈️ Pesawat pembom! Cari perlindungan!');
    }
    if (bomber) {
      const b = bomber, p = b.g.position; p.x += 50 * dt;
      if (p.x > -90 && p.x < 80 && b.left > 0 && (b.dropT -= dt) <= 0) { b.left--; b.dropT = .5; dropBomb(p); sfx.whistle(.5); }
      if (p.x > 200) { scene.remove(b.g); bomber = null; }
    }
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i], p = b.g.position; b.v.y -= 24 * dt; p.addScaledVector(b.v, dt); b.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), b.v.clone().normalize());
      if (p.y <= .4) {
        const d = Math.hypot(P.x - p.x, P.z - p.z); scene.remove(b.g); bombs.splice(i, 1);
        boom(p.x, p.z, Math.max(.1, Math.min(1, 1 - d / 150))); scorchMark(p.x, p.z); shake = Math.max(shake, Math.max(0, 1 - d / 90)); cb.blast(p.x, p.z, 10, 45);
      }
    }
    if (missile) {
      const m = missile; m.t += dt; m.g.position.lerpVectors(m.start, m.end, Math.min(1, m.t / m.dur));
      if (m.t >= m.dur) { scene.remove(m.g); boom(m.end.x, m.end.z, m.vol); shake = Math.max(shake, Math.max(0, 1 - m.d / 90)); missile = null; next = rnd(18, 32); }
    } else if ((next -= dt) <= 0) launch(P);
  }
  return { ruin, tank, bunker, wreck, inBunker, bk, update, sites, get shake() { return shake; } };
}
