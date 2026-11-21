// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Pistol sudut pandang orang pertama: model, amunisi, jeda tembak, isi ulang, recoil.
import * as THREE from 'three';

export class Weapon {
  constructor(camera, audio) {
    this.audio = audio; this.max = 12; this.mag = 12; this.cd = 0; this.reloadT = 0; this.recoil = 0;
    const m = (c) => new THREE.MeshLambertMaterial({ color: c });
    this.model = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.28), m(0x333333)); slide.position.z = -0.1;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.07), m(0x5a3a1e)); grip.position.set(0, -0.09, 0.02);
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd34d })); this.flash.position.z = -0.28; this.flash.visible = false;
    this.model.add(slide, grip, this.flash); this.model.position.set(0.2, -0.2, -0.4); camera.add(this.model);
  }
  get reloading() { return this.reloadT > 0; }
  refill() { this.mag = this.max; this.reloadT = 0; }
  reload() { if (this.reloadT > 0 || this.mag === this.max) return; this.reloadT = 1.4; this.audio.reload(); }
  /** true jika peluru benar-benar keluar */
  tryFire() {
    if (this.cd > 0 || this.reloadT > 0) return false;
    if (this.mag <= 0) { this.audio.empty(); this.cd = 0.3; this.reload(); return false; }
    this.mag--; this.cd = 0.22; this.recoil = 1; this.audio.shot(1); return true;
  }
  update(dt) {
    this.cd -= dt; this.recoil *= Math.max(0, 1 - dt * 14); this.flash.visible = this.recoil > 0.7;
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.mag = this.max; }
    this.model.position.z = -0.4 + this.recoil * 0.06;
    this.model.rotation.x = this.reloadT > 0 ? -0.6 : this.recoil * 0.15;
  }
}
