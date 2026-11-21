// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Membangun seluruh lingkungan desa. Mengembalikan data tabrakan & fungsi pembantu.
import * as THREE from 'three';

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647; // acak deterministik

// Posisi bangunan khusus (x, z)
export const SPOT = {
  stop: [-12, -5.5], police: [20, -17], clinic: [20, 17],
  guard: [-62, -5.5], warung: [-2, 9], field: [-30, 31],
};
export const RIVER_X = 35, ROAD_HALF = 3, BRIDGE_HALF = 4;
const FIELD = { x0: -46, x1: -14, z0: 21, z1: 41 };

export const inField = (x, z) => x > FIELD.x0 && x < FIELD.x1 && z > FIELD.z0 && z < FIELD.z1;
export const onRoad = (x, z) => Math.abs(z) < ROAD_HALF;
export const inRiver = (x, z) => Math.abs(x - RIVER_X) < 4;
export const onBridge = (x, z) => inRiver(x, z) && Math.abs(z) < BRIDGE_HALF;

function label(text, w, h, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w);
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg; g.font = `bold ${c.height * 0.55}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
}

export function buildWorld(scene) {
  scene.background = new THREE.Color(0x7ec8f2);          // langit biru cerah
  scene.fog = new THREE.Fog(0x9fd8f7, 70, 230);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f9a52, 1.05));
  const sun = new THREE.DirectionalLight(0xfff3d0, 1.3); sun.position.set(80, 120, 40); scene.add(sun);

  const colliders = [];                                   // {x,z,r}
  const put = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  const flat = (w, d, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(c)); m.rotation.x = -Math.PI / 2; return m; };
  const solid = (x, z, r) => colliders.push({ x, z, r });

  // ---- Tanah, jalan, sungai, jembatan ----
  put(flat(320, 320, 0x6fae4a), 0, 0, 0);
  put(flat(320, 2 * ROAD_HALF, 0x4a4a4f), 0, 0.03, 0);
  for (let x = -150; x < 150; x += 8) put(flat(3, 0.25, 0xf2f2f2), x, 0.05, 0);
  const river = put(flat(2 * 4, 320, 0x2f8fd8), RIVER_X, 0.06, 0);
  river.material.transparent = true; river.material.opacity = 0.85;
  put(box(2 * 4 + 1, 0.3, 2 * BRIDGE_HALF, 0x8b6a3e), RIVER_X, 0.1, 0);
  for (const s of [-1, 1]) put(box(9, 0.8, 0.2, 0x6b4f2a), RIVER_X, 0.6, s * BRIDGE_HALF);

  // ---- Lapangan sepak bola berlumpur ----
  const fw = FIELD.x1 - FIELD.x0, fd = FIELD.z1 - FIELD.z0, fx = SPOT.field[0], fz = SPOT.field[1];
  put(flat(fw, fd, 0x6b4a2b), fx, 0.04, fz);
  const rand = rng(7);
  for (let i = 0; i < 14; i++) put(flat(2 + rand() * 4, 2 + rand() * 3, 0x4e341d), fx + (rand() - .5) * fw * .9, 0.05, fz + (rand() - .5) * fd * .9);
  const line = (w, d, x, z) => put(flat(w, d, 0xcfc3a0), fx + x, 0.06, fz + z);
  line(fw - 2, 0.25, 0, -fd / 2 + 1); line(fw - 2, 0.25, 0, fd / 2 - 1);
  line(0.25, fd - 2, -fw / 2 + 1, 0); line(0.25, fd - 2, fw / 2 - 1, 0); line(0.25, fd - 2, 0, 0);
  for (const s of [-1, 1]) {                              // gawang
    const gx = fx + s * (fw / 2 - 1);
    put(box(0.2, 2.4, 0.2, 0xffffff), gx, 1.2, fz - 3.5); put(box(0.2, 2.4, 0.2, 0xffffff), gx, 1.2, fz + 3.5);
    put(box(0.2, 0.2, 7.2, 0xffffff), gx, 2.4, fz);
  }

  // ---- Pembuat bangunan generik ----
  function building(x, z, w, h, d, wall, roof, ry, collide = true) {
    const g = new THREE.Group();
    const body = box(w, h, d, wall); body.position.y = h / 2; g.add(body);
    const rg = new THREE.ConeGeometry(0.7071, 1, 4); rg.rotateY(Math.PI / 4);
    const r = new THREE.Mesh(rg, mat(roof));
    r.scale.set(w * 1.15, 2.2, d * 1.15); r.position.y = h + 1.1; g.add(r);
    const door = box(1.2, 2.2, 0.15, 0x5a3a1e); door.position.set(0, 1.1, d / 2); g.add(door);
    for (const s of [-1, 1]) { const win = box(1.2, 1.1, 0.15, 0xbfe6ff); win.position.set(s * w * 0.3, h * 0.6, d / 2); g.add(win); }
    put(g, x, 0, z, ry);
    if (collide) solid(x, z, Math.hypot(w, d) / 2);
    return g;
  }

  // ---- Bangunan khusus ----
  const [px, pz] = SPOT.police; const pol = building(px, pz, 10, 4, 7, 0xb9c6d6, 0x2b3a67, 0);
  const pl = label('POLISI', 5, 1.2, '#1c2a5a', '#fff'); pl.position.set(0, 3.2, 3.6); pol.add(pl);

  const [cx, cz] = SPOT.clinic; const cli = building(cx, cz, 11, 4, 8, 0xffffff, 0xd94343, Math.PI);
  const cl = label('KLINIK', 5, 1.2, '#ffffff', '#c22'); cl.position.set(0, 3.3, 4.05); cli.add(cl);
  const cross1 = box(1.6, 0.5, 0.1, 0xd02020), cross2 = box(0.5, 1.6, 0.1, 0xd02020);
  cross1.position.set(3.5, 3, 4.05); cross2.position.set(3.5, 3, 4.05); cli.add(cross1, cross2);

  const [wx, wz] = SPOT.warung; const war = building(wx, wz, 5, 3, 4, 0xe0b872, 0xb5532d, Math.PI);
  const wl = label('WARUNG', 3.6, 0.8, '#b5532d', '#fff'); wl.position.set(0, 2.6, 2.05); war.add(wl);
  const awn = box(5.4, 0.12, 1.6, 0xe8412b); awn.position.set(0, 2.5, 2.8); war.add(awn);

  const [gx, gz] = SPOT.guard; const gp = building(gx, gz, 3, 3, 3, 0xe8e2d0, 0x555555, 0);
  const bar = box(6, 0.2, 0.2, 0xff3b30); put(bar, gx + 4, 1.1, gz + 3.5 + 0); put(box(0.3, 1.3, 0.3, 0x333333), gx + 1, 0.65, gz + 3.5);
  const gl = label('POS SATPAM', 2.8, .6, '#222', '#fff'); gl.position.set(0, 2.4, 1.55); gp.add(gl);

  // Halte bus
  const [sx, sz] = SPOT.stop; const stop = new THREE.Group();
  for (const s of [-1, 1]) { const p = box(0.15, 2.6, 0.15, 0x777777); p.position.set(s * 2, 1.3, 0); stop.add(p); }
  const roofS = box(4.8, 0.15, 2, 0x2a7ab8); roofS.position.y = 2.65; stop.add(roofS);
  const bench = box(3, 0.15, 0.6, 0x8b5a2b); bench.position.set(0, 0.55, -0.6); stop.add(bench);
  const hs = label('HALTE', 1.8, .5, '#2a7ab8', '#fff'); hs.position.set(0, 2.2, 0.95); stop.add(hs);
  put(stop, sx, 0, sz);

  // ---- Rumah warga ----
  const wallC = [0xf2e3c6, 0xd8e8c4, 0xf5c7a9, 0xc9dff0, 0xf0d9e6, 0xffe08a];
  const roofC = [0xb5532d, 0x8a3b2e, 0x4b6a8a, 0x6b6b3a];
  const r2 = rng(42); const specials = Object.values(SPOT);
  for (const rz of [-18, -30, 18, 30]) for (let x = -80; x <= 26; x += 13) {
    const hx = x + (r2() - .5) * 4, hz = rz + (r2() - .5) * 3;
    if (hx > FIELD.x0 - 6 && hx < FIELD.x1 + 6 && hz > FIELD.z0 - 6) continue;
    if (specials.some(([sx2, sz2]) => Math.hypot(sx2 - hx, sz2 - hz) < 13)) continue;
    building(hx, hz, 6 + r2() * 2, 3.5, 5.5 + r2(), wallC[(r2() * 6) | 0], roofC[(r2() * 4) | 0], hz > 0 ? Math.PI : 0);
  }

  // ---- Pepohonan ----
  const trunkM = mat(0x6b4423), leafM = [mat(0x2f7d32), mat(0x3e9a3f), mat(0x276a2b)];
  const r3 = rng(99); let placed = 0, tries = 0;
  while (placed < 130 && tries++ < 1500) {
    const x = (r3() - .5) * 190, z = (r3() - .5) * 190;
    if (Math.abs(z) < 7 || Math.abs(x - RIVER_X) < 7 || inField(x, z) || (x > FIELD.x0 - 3 && x < FIELD.x1 + 3 && z > FIELD.z0 - 3 && z < FIELD.z1 + 3)) continue;
    if (colliders.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 2.5)) continue;
    const s = 0.8 + r3() * 0.9, t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), trunkM); tr.position.y = 1.5; t.add(tr);
    const lf = new THREE.Mesh(r3() > .5 ? new THREE.SphereGeometry(1.7, 8, 6) : new THREE.ConeGeometry(1.8, 4.2, 7), leafM[(r3() * 3) | 0]);
    lf.position.y = 4; t.add(lf); t.scale.setScalar(s); put(t, x, 0, z); solid(x, z, 0.5 * s); placed++;
  }

  // ---- Tiang listrik + kabel ----
  const poleTops = [];
  for (let x = -90; x <= 90; x += 20) {
    if (Math.abs(x - RIVER_X) < 6) continue;
    const p = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 8, 6), mat(0x6e5a44)); m.position.y = 4; p.add(m);
    const arm = box(3, 0.15, 0.15, 0x4d3f30); arm.position.y = 7.6; p.add(arm);
    put(p, x, 0, -4.4); solid(x, -4.4, 0.3); poleTops.push(x);
  }
  const wireM = new THREE.LineBasicMaterial({ color: 0x222222 });
  for (let i = 0; i < poleTops.length - 1; i++) for (const o of [-1.3, 0, 1.3]) {
    const a = new THREE.Vector3(poleTops[i], 7.6, -4.4 + o), b = new THREE.Vector3(poleTops[i + 1], 7.6, -4.4 + o), mid = a.clone().lerp(b, .5); mid.y -= 0.6;
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(10)), wireM));
  }

  // ---- Awan mengapung ----
  const clouds = []; const r4 = rng(5); const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(5 + r4() * 5, 8, 6), cm); s.position.set(k * 6 - 12, r4() * 3, (r4() - .5) * 6); s.scale.y = 0.55; c.add(s); }
    put(c, (r4() - .5) * 300, 55 + r4() * 25, (r4() - .5) * 300); clouds.push(c);
  }

  return {
    colliders,
    update(dt, t) {
      for (const c of clouds) { c.position.x += dt * 1.5; if (c.position.x > 160) c.position.x = -160; }
      river.material.opacity = 0.8 + Math.sin(t * 2) * 0.05;   // riak air sederhana
    },
    /** Jenis permukaan untuk suara langkah */
    surface(x, z) { return onBridge(x, z) ? 'wood' : inField(x, z) ? 'mud' : onRoad(x, z) ? 'road' : 'grass'; },
  };
}
