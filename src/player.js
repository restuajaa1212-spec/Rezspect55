import * as THREE from 'three';
import { input, keys } from './controls.js';
import { getHeight, colliders } from './world.js';

// Pemain orang pertama: gerak, lari, jongkok, loncat, tabrakan kotak (AABB).
export class Player {
  constructor(cam) {
    this.cam = cam; this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0;
    this.vy = 0; this.ground = true; this.eye = 1.7; this.stride = 0;
    this.onStep = () => {}; this.onJump = () => {}; this.onLand = () => {};
  }
  place(x, z, yaw) { this.pos.set(x, getHeight(x, z), z); this.yaw = yaw; this.pitch = 0; }

  update(dt) {
    this.yaw -= input.dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch - input.dy * 0.005, -1.4, 1.4);
    input.dx = input.dy = 0;
    let mx = input.mx + (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let mz = input.mz + (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
    const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    const crouch = input.crouch || keys.KeyC;
    const run = (input.run || keys.ShiftLeft) && !crouch;
    const sp = crouch ? 1.6 : run ? 6.5 : 3.4;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const p = this.pos;
    p.x += (rx * mx - fx * mz) * sp * dt; p.z += (rz * mx - fz * mz) * sp * dt;
    p.x = THREE.MathUtils.clamp(p.x, -100, 100); p.z = THREE.MathUtils.clamp(p.z, -100, 100);
    const r = 0.4;
    for (const c of colliders) {
      if (p.x > c.x0 - r && p.x < c.x1 + r && p.z > c.z0 - r && p.z < c.z1 + r) {
        const l = p.x - (c.x0 - r), rr = c.x1 + r - p.x, t = p.z - (c.z0 - r), b = c.z1 + r - p.z, m = Math.min(l, rr, t, b);
        if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === t) p.z = c.z0 - r; else p.z = c.z1 + r;
      }
    }
    if ((input.jump || keys.Space) && this.ground) { this.vy = 6; this.ground = false; this.onJump(); }
    this.vy -= 18 * dt; p.y += this.vy * dt;
    const gy = getHeight(p.x, p.z);
    if (p.y <= gy) { if (!this.ground) this.onLand(); p.y = gy; this.vy = 0; this.ground = true; }
    if (this.ground && len > 0.1) { this.stride += len * sp * dt; if (this.stride > 2.2) { this.stride = 0; this.onStep(run, crouch); } }
    this.eye += ((crouch ? 1.0 : 1.7) - this.eye) * Math.min(1, dt * 10);
    this.cam.position.set(p.x, p.y + this.eye, p.z);
    this.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
