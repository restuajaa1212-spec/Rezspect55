// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Cutscene: bus datang lalu berhenti di halte. Setelah selesai bus tetap berjalan pergi.
import * as THREE from 'three';
import { SPOT } from './world.js';

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const STOP_X = SPOT.stop[0], START_X = -130, LANE_Z = -1.5, DRIVE_T = 10;

export function createIntro(scene, camera, audio, onDone) {
  // --- Model bus (menghadap +x) ---
  const bus = new THREE.Group(), wheels = [];
  const add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); bus.add(m); return m; };
  add(new THREE.BoxGeometry(10, 3, 2.6), 0xd9382c, 0, 1.9, 0);
  add(new THREE.BoxGeometry(10.02, 0.5, 2.62), 0xffffff, 0, 1.2, 0);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(8.6, 1, 0.05), 0x1d3557, -0.3, 2.5, s * 1.32);
  add(new THREE.BoxGeometry(0.05, 1.2, 2.2), 0x1d3557, 5.02, 2.5, 0);
  for (const [x, z] of [[-3, 1.3], [-3, -1.3], [3, 1.3], [3, -1.3]]) {
    const w = add(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14), 0x111111, x, 0.55, z); w.rotation.x = Math.PI / 2; wheels.push(w);
  }
  bus.position.set(START_X, 0, LANE_Z); scene.add(bus);

  let t = 0, done = false, skipped = false, hissed = false, prevX = START_X;
  audio.engineStart();
  camera.position.set(-2, 2.2, -9);

  return {
    get done() { return done; },
    skip() { skipped = true; },
    update(dt) {
      t += dt;
      const u = Math.min(t / DRIVE_T, 1), p = 1 - (1 - u) * (1 - u);   // melambat (ease-out)
      if (t < 15 + 0) {
        if (t <= DRIVE_T + 4) bus.position.x = START_X + (STOP_X - START_X) * p;
        else bus.position.x += (t - DRIVE_T - 4) * 3 * dt * 2;          // bus berangkat pelan-pelan
      } else bus.position.x += 14 * dt;
      const v = (bus.position.x - prevX) / Math.max(dt, 1e-4); prevX = bus.position.x;
      for (const w of wheels) w.rotation.y -= v * dt / 0.55;

      // suara mesin ~ jarak & kecepatan; klakson saat mendekati halte
      const dist = Math.abs(bus.position.x - camera.position.x);
      audio.engineSet(Math.min(1, 25 / (dist + 5)), 45 + Math.abs(v) * 1.6);
      if (!hissed && t > DRIVE_T - 1.5 && t < DRIVE_T) { audio.honk(); hissed = true; }
      if (hissed && t > DRIVE_T && !this._h2) { this._h2 = true; audio.hiss(); }

      if (!done) {
        camera.position.y = 2.2 + Math.min(t, 8) * 0.05;
        camera.lookAt(bus.position.x, 1.8, bus.position.z);
        if (t > DRIVE_T + 2.5 || skipped) { done = true; onDone(); }
      }
      if (bus.position.x > 160) { audio.engineStop(); scene.remove(bus); return false; }
      return true;
    },
  };
}
