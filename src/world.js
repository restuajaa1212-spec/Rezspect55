import * as THREE from 'three';

// ===== Dunia: desa, hutan, perbukitan, markas, perang =====
export const colliders = [];            // kotak tabrakan {x0,x1,z0,z1}
export const WAR = { x: 55, z: 10 };    // pusat medan perang (untuk volume suara)
const anim = [];                        // fungsi animasi per-frame
let scene;

let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const M = (c) => new THREE.MeshLambertMaterial({ color: c });
const B = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));

// Tinggi tanah: datar di sekitar markas/desa, berbukit di tepi peta
export function getHeight(x, z) {
  const mask = THREE.MathUtils.smoothstep(Math.hypot(x, z + 20), 45, 95);
  const h = Math.sin(x * 0.045) * Math.cos(z * 0.04) * 7 + Math.sin(x * 0.12 + z * 0.08) * 1.5 + Math.max(0, Math.abs(x) - 70) * 0.5;
  return (h + Math.sin(x * 0.3) * Math.cos(z * 0.35) * 0.15) * mask;
}
const put = (o, x, z, dy = 0) => { o.position.set(x, getHeight(x, z) + dy, z); scene.add(o); return o; };
const col = (x, z, w, d) => colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });

function smokeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(60,60,60,.7)'); r.addColorStop(1, 'rgba(60,60,60,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

function terrain() {
  const g = new THREE.PlaneGeometry(220, 220, 110, 110); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cols = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = getHeight(x, z); p.setY(i, y);
    const burnt = Math.sin(x * 0.21) * Math.cos(z * 0.17) > 0.45;      // tanah rusak/hangus
    const n = rand() * 0.06;
    cols.push(...(burnt ? [0.2 + n, 0.16, 0.12] : y > 4 ? [0.28, 0.4 + n, 0.2] : [0.36 + n, 0.42 + n, 0.2]));
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
  // Kawah bekas ledakan
  for (let i = 0; i < 14; i++) {
    const x = (rand() - 0.5) * 120, z = (rand() - 0.3) * 90, r = 1 + rand() * 2;
    if (Math.abs(x) < 6 && z < -10) continue;
    const c = new THREE.Mesh(new THREE.CircleGeometry(r, 14), M(0x1d1814)); c.rotation.x = -Math.PI / 2; put(c, x, z, 0.05);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r * 1.5, 14), M(0x2c2218)); ring.rotation.x = -Math.PI / 2; put(ring, x, z, 0.05);
  }
}

function road() {   // jalan tanah dari hutan (z=-100) ke gerbang markas (z=-12)
  const g = new THREE.PlaneGeometry(6, 90, 1, 45); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i) - 57; p.setZ(i, z); p.setY(i, getHeight(p.getX(i), z) + 0.07); }
  scene.add(new THREE.Mesh(g, M(0x5a4b38)));
}

function tree(x, z, kind) {
  const g = new THREE.Group();
  if (kind === 'stand') {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6), M(0x4a3420)); t.position.y = 1.5;
    const l1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 7), M(0x1f4a24)); l1.position.y = 4;
    const l2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 7), M(0x275a2b)); l2.position.y = 5.5;
    g.add(t, l1, l2); col(x, z, 0.7, 0.7);
  } else if (kind === 'fallen') {          // pohon tumbang
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 7, 6), M(0x4a3420)); t.rotation.z = Math.PI / 2; t.position.y = 0.45;
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 5), M(0x3a2a18)); r.position.set(3.5, 0.5, 0);
    g.add(t, r); g.rotation.y = rand() * 6; col(x, z, 1.2, 1.2);
  } else {                                 // pohon terbakar
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 4, 6), M(0x1a1410)); t.position.y = 2;
    const br = new THREE.Mesh(new THREE.ConeGeometry(0.15, 2, 4), M(0x111)); br.position.set(0.5, 3.5, 0); br.rotation.z = -1;
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2, 6), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85 })); fl.position.y = 4.4;
    const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), transparent: true })); sm.scale.set(4, 4, 1); sm.position.y = 6;
    g.add(t, br, fl, sm); col(x, z, 0.7, 0.7);
    const ph = rand() * 9;
    anim.push((tm) => { fl.scale.set(1 + Math.sin(tm * 12 + ph) * 0.2, 1 + Math.sin(tm * 9 + ph) * 0.3, 1); sm.position.y = 6 + ((tm * 0.8 + ph) % 4); sm.material.opacity = 1 - ((tm * 0.8 + ph) % 4) / 4; });
  }
  put(g, x, z); return g;
}

function tent(x, z, ry = 0) {   // tenda pasukan
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0, 2.6, 2.4, 4), M(0x4b5a34)); t.rotation.y = Math.PI / 4 + ry; t.position.y = 1.2;
  const g = new THREE.Group(); g.add(t); put(g, x, z); col(x, z, 3.4, 3.4);
}

function ruinedHouse(x, z) {   // reruntuhan rumah: dinding sebagian + puing
  const W = 7, D = 6, mat = 0x6b6258, y = getHeight(x, z) - 0.3;
  [[0, -D / 2, W, 0.4, 2.6], [0, D / 2, W * 0.5, 0.4, 1.6], [-W / 2, 0, 0.4, D, 2.2], [W / 2, D / 4, 0.4, D * 0.5, 3]].forEach(([dx, dz, w, d, h]) => {
    const m = B(w, h, d, mat); m.position.set(x + dx, y + h / 2, z + dz); scene.add(m); col(x + dx, z + dz, w, d);
  });
  for (let i = 0; i < 9; i++) { const r = B(0.4 + rand() * 0.8, 0.3 + rand() * 0.4, 0.4 + rand() * 0.8, i % 2 ? 0x2b2622 : 0x7a6d5e); r.position.set(x + (rand() - 0.5) * W, y + 0.25, z + (rand() - 0.5) * D); r.rotation.y = rand() * 3; scene.add(r); }
  const beam = B(0.25, 0.25, 5, 0x2a1d12); beam.position.set(x, y + 2.2, z); beam.rotation.set(0.5, 0.3, 0); scene.add(beam);   // balok atap patah
}

function corpse(x, z) {   // mayat tentara (lowpoly)
  const g = new THREE.Group();
  const b = B(0.45, 0.25, 1.2, 0x4a5236); b.position.y = 0.15;
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), M(0xb88a64)); h.position.set(0, 0.2, 0.75);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, 6.3, 0, 1.5), M(0x2f3a22)); hl.position.set(0, 0.24, 0.75);
  const bl = new THREE.Mesh(new THREE.CircleGeometry(0.9, 10), M(0x4a0a0a)); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.03;
  g.add(b, h, hl, bl); g.rotation.y = rand() * 6.28; put(g, x, z);
}

export function soldier(c) {
  const g = new THREE.Group();
  const legs = B(0.4, 0.7, 0.25, 0x333322); legs.position.y = 0.35;
  const body = B(0.5, 0.8, 0.3, c); body.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), M(0xd2a679)); head.position.y = 1.7;
  const hel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, 6.3, 0, 1.6), M(0x2f3a22)); hel.position.y = 1.74;
  const gun = B(0.08, 0.1, 0.8, 0x111111); gun.position.set(0.2, 1.25, 0.4);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffcc55 })); fl.position.set(0.2, 1.25, 0.9); fl.visible = false;
  g.add(legs, body, head, hel, gun, fl); g.userData.fl = fl; return g;
}

function warZone() {   // dua pasukan saling tembak
  const all = [];
  for (let i = 0; i < 5; i++) {
    const a = soldier(0x4b5a34), b = soldier(0x6a5a3a);
    put(a, WAR.x - 8, WAR.z + i * 4 - 8); a.rotation.y = Math.PI / 2;
    put(b, WAR.x + 8, WAR.z + i * 4 - 8); b.rotation.y = -Math.PI / 2;
    all.push(a, b);
  }
  for (let i = 0; i < 4; i++) { const s = B(2, 0.7, 0.8, 0x7a6a50); put(s, WAR.x - 6, WAR.z + i * 5 - 8, 0.35); }
  anim.push(() => all.forEach((s) => { if (rand() < 0.12) s.userData.fl.visible = !s.userData.fl.visible; }));
}

function base() {   // markas tentara: pagar, gerbang, menara, bangunan, bendera
  const wall = (x, z, w, d, h = 3) => { const m = B(w, h, d, 0x6f6f62); put(m, x, z, h / 2); col(x, z, w, d); };
  wall(-9.5, -12, 13, 0.6); wall(9.5, -12, 13, 0.6);      // gerbang terbuka x -3..3
  wall(0, 20, 32, 0.6); wall(-16, 4, 0.6, 32); wall(16, 4, 0.6, 32);
  [[-16, -12], [16, -12], [-16, 20], [16, 20]].forEach(([x, z]) => { const t = B(3, 6, 3, 0x56564a); put(t, x, z, 3); col(x, z, 3, 3); const r = B(3.6, 0.5, 3.6, 0x3b3b30); put(r, x, z, 6.2); });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), new THREE.MeshBasicMaterial({ color: 0xc41e1e, side: 2 }));
  const pole = B(0.1, 7, 0.1, 0xbbbbbb); put(pole, 0, 4, 3.5); fl.position.set(1, 6.3, 4); fl.userData.y = getHeight(0, 4); scene.add(fl);
  anim.push((t) => (fl.rotation.y = Math.sin(t * 3) * 0.3));
  const hq = B(9, 4, 6, 0x5d5d50); put(hq, 0, 14, 2); col(0, 14, 9, 6); const roof = B(10, 0.5, 7, 0x3b3b30); put(roof, 0, 14, 4.2);
  [[-9, 0], [9, 0], [-9, 9], [9, 9]].forEach(([x, z]) => tent(x, z));
  for (let i = 0; i < 5; i++) { const s = B(1.6, 0.7, 0.8, 0x7a6a50); put(s, -5 + i * 2, -9, 0.35); }   // karung pasir
}

export function makeTruck() {   // truk militer membawa pasukan (menghadap +z)
  const g = new THREE.Group();
  const ch = B(2.4, 0.5, 6, 0x3d4a2c); ch.position.y = 0.9;
  const cab = B(2.3, 1.6, 1.8, 0x4b5a34); cab.position.set(0, 1.9, 2.1);
  const wind = B(2.0, 0.6, 0.1, 0x223344); wind.position.set(0, 2.2, 3.02);
  const bed = B(2.4, 0.2, 3.8, 0x2f3a22); bed.position.set(0, 1.25, -1);
  [-1.2, 1.2].forEach((sx) => { const s = B(0.1, 0.8, 3.8, 0x3d4a2c); s.position.set(sx, 1.7, -1); g.add(s); });
  const bk = B(2.4, 0.8, 0.1, 0x3d4a2c); bk.position.set(0, 1.7, -2.9);
  g.add(ch, cab, wind, bed, bk);
  [[-1.25, 2], [1.25, 2], [-1.25, -1.8], [1.25, -1.8]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), M(0x111111)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.55, z); g.add(w); });
  [-1.8, -1, -0.2].forEach((z, i) => { const s = soldier(0x4b5a34); s.scale.setScalar(0.9); s.position.set(i % 2 ? 0.6 : -0.6, 1.3, z); s.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2; g.add(s); });
  scene.add(g); return g;
}

export function buildWorld(sc) {
  scene = sc; terrain(); road(); base(); warZone();
  const free = (x, z) => !(Math.abs(x) < 22 && z > -18 && z < 24) && !(Math.abs(x) < 7 && z < -10) && Math.hypot(x - WAR.x, z - WAR.z) > 14;
  for (let i = 0; i < 40; i++) { const s = rand() < 0.5 ? 1 : -1; tree(s * (8 + rand() * 14), -95 + rand() * 76, 'stand'); }   // hutan sepanjang jalan
  for (let i = 0, n = 0; i < 400 && n < 110; i++) { const x = (rand() - 0.5) * 190, z = (rand() - 0.5) * 190; if (free(x, z)) { tree(x, z, 'stand'); n++; } }
  for (let i = 0, n = 0; i < 200 && n < 14; i++) { const x = (rand() - 0.5) * 150, z = (rand() - 0.5) * 150; if (free(x, z)) { tree(x, z, n < 6 ? 'burn' : 'fallen'); n++; } }
  [[-40, 10], [-55, 28], [-30, 40], [38, -30], [60, 40]].forEach(([x, z]) => ruinedHouse(x, z));
  [[-45, -10, 0.4], [-52, -4, 1], [30, 30, 0.2]].forEach(([x, z, r]) => tent(x, z, r));       // kemah pasukan di desa
  for (let i = 0; i < 12; i++) corpse(WAR.x + (rand() - 0.5) * 30, WAR.z + (rand() - 0.5) * 22);
  [[-38, 14], [-34, 6], [34, -26], [2, -30], [-5, 26]].forEach(([x, z]) => corpse(x, z));
}
export const updateWorld = (t) => anim.forEach((f) => f(t));
