// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Pemain sudut pandang orang pertama: jalan, lari, jongkok, loncat, tabrakan, suara langkah.
import * as THREE from 'three';
import { inRiver, onBridge } from './world.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Player {
  constructor(camera, world, audio) {
    this.cam = camera; this.world = world; this.audio = audio;
    this.pos = new THREE.Vector3(-12, 0, -3);
    this.yaw = Math.PI; this.pitch = 0;       // yaw π = menghadap +z (ke arah jalan)
    this.vy = 0; this.eye = 1.7; this.stepDist = 0;
  }

  _blocked(x, z) {
    if (Math.abs(x) > 150 || Math.abs(z) > 150) return true;
    if (inRiver(x, z) && !onBridge(x, z)) return true;      // sungai: hanya bisa lewat jembatan
    for (const c of this.world.colliders) if (Math.hypot(c.x - x, c.z - z) < c.r + 0.4) return true;
    return false;
  }

  update(dt, ui) {
    // Kamera: geser layar
    this.yaw -= ui.look.x * 0.005; this.pitch = clamp(this.pitch - ui.look.y * 0.005, -1.2, 1.2);
    ui.look.x = ui.look.y = 0;

    const crouch = ui.isCrouching(), run = ui.isRunning() && !crouch;
    const speed = crouch ? 1.6 : run ? 7 : 3.6;
    const a = ui.axes(), len = Math.min(1, Math.hypot(a.x, a.y));
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    let dx = 0, dz = 0;
    if (len > 0.05) {
      const n = Math.hypot(a.x, a.y);
      dx = (-s * a.y + c * a.x) / n * speed * len * dt;
      dz = (-c * a.y - s * a.x) / n * speed * len * dt;
    }
    // Gerak per-sumbu agar bisa menyusur dinding
    if (!this._blocked(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
    if (!this._blocked(this.pos.x, this.pos.z + dz)) this.pos.z += dz;

    // Loncat & gravitasi
    const grounded = this.pos.y <= 0.001;
    if (ui.consumeJump() && grounded && !crouch) { this.vy = 6.5; this.audio.jump(); }
    this.vy -= 18 * dt; this.pos.y += this.vy * dt;
    const surf = this.world.surface(this.pos.x, this.pos.z);
    if (this.pos.y <= 0) { if (this.vy < -3) this.audio.land(surf); this.pos.y = 0; this.vy = 0; }

    // Langkah kaki
    if (this.pos.y <= 0.001 && len > 0.05) {
      this.stepDist += Math.hypot(dx, dz);
      if (this.stepDist > (run ? 2.4 : crouch ? 1.2 : 1.6)) { this.stepDist = 0; this.audio.step(surf); }
    }

    // Tinggi mata halus (jongkok)
    this.eye += ((crouch ? 1.0 : 1.7) - this.eye) * Math.min(1, dt * 10);
    this.cam.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
    this.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
