// Suasana perang: tank di tepi jalan, rumah hancur (api & asap), serangan rudal berkala.
import * as THREE from 'three';
import { M, box, rnd } from './util.js';
import { buildTank } from './setpieces.js';

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

  function update(dt, t, P) {
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
    if (missile) {
      const m = missile; m.t += dt; m.g.position.lerpVectors(m.start, m.end, Math.min(1, m.t / m.dur));
      if (m.t >= m.dur) { scene.remove(m.g); boom(m.end.x, m.end.z, m.vol); shake = Math.max(shake, Math.max(0, 1 - m.d / 90)); missile = null; next = rnd(18, 32); }
    } else if ((next -= dt) <= 0) launch(P);
  }
  return { ruin, tank, update, sites, get shake() { return shake; } };
}
