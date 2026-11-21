// Model set-piece: pesawat, parasut, dan tank.
import * as THREE from 'three';
import { M, box } from './util.js';

// Pesawat angkut (menghadap +X)
export function buildPlane(c = 0xdfe6e9) {
  const g = new THREE.Group();
  box(16, 2.4, 2.4, c, 0, 0, 0, g); box(2.6, 1.9, 1.9, 0xb0bec5, 8.9, -.1, 0, g);
  box(3, .35, 22, 0xb0bec5, 0, -.3, 0, g);
  box(2.2, 3.4, .3, 0xb0bec5, -7.5, 2.2, 0, g); box(2, .3, 7, 0xb0bec5, -7.5, .7, 0, g);
  box(10, .3, 2.45, 0x1565c0, 0, .5, 0, g);
  for (const z of [-5, 5]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 3, 10), M(0x90a4ae)); e.rotation.z = Math.PI / 2; e.position.set(1.5, -.9, z); g.add(e); }
  return g;
}

// Parasut: kubah belang + tali (pivot di kaki pemain)
export function buildChute() {
  const g = new THREE.Group(), mk = (r, c, a = 0, len = Math.PI * 2) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 8, a, len, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
    m.scale.y = .7; m.position.y = 4.6; g.add(m);
  };
  mk(2.8, 0xff5722); for (let k = 0; k < 4; k++) mk(2.82, 0xffffff, k * Math.PI / 2, Math.PI / 4);
  const pts = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; pts.push(Math.cos(a) * 2.8, 4.6, Math.sin(a) * 2.8, 0, 1.7, 0); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x222222 })));
  return g;
}

// Tank (laras ke +X). g.turret = menara yang bisa berputar
export function buildTank(c) {
  const g = new THREE.Group();
  box(6.2, 1.1, 3, c, 0, 1.05, 0, g);
  for (const z of [-1.75, 1.75]) {
    box(7, 1.0, .9, 0x2b2b2b, 0, .6, z, g);
    for (let k = -3; k <= 3; k++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .95, 8), M(0x3a3a3a)); w.rotation.x = Math.PI / 2; w.position.set(k, .55, z); g.add(w); }
  }
  const t = new THREE.Group(); t.position.y = 1.6; g.add(t);
  box(2.8, .9, 2.4, c, 0, .45, 0, t); box(1.1, .4, 1.1, c, -.3, 1.05, 0, t);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 4.6, 8), M(0x2f2f2f)); b.rotation.z = Math.PI / 2; b.position.set(3.4, .5, 0); t.add(b);
  box(.5, .35, .35, 0x222222, 5.6, .5, 0, t);
  g.turret = t; return g;
}

// Bangkai mobil hangus (menghadap +X)
export function buildWreck() {
  const g = new THREE.Group(), dk = 0x2d2a26, k = 0x1a1a1a;
  box(3.8, .7, 1.9, dk, 0, .75, 0, g);
  const roof = box(1.5, .12, 1.7, k, -.5, 1.55, 0, g); roof.rotation.z = .12;
  for (const z of [-.8, .8]) box(.08, .8, .08, k, -1.1, 1.15, z, g);
  const hood = box(1.1, .05, 1.6, 0x3b3b3b, 1.2, 1.2, 0, g); hood.rotation.z = -.5;
  box(1.2, .05, .8, 0x6b7a3e, .9, 1.12, .3, g);
  for (const [x, z] of [[-1.3, .95], [1.3, -.95]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .25, 8), M(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(x, .4, z); g.add(w); }
  box(4.4, .02, 2.5, 0x0a0a0a, 0, .03, 0, g);
  return g;
}
