import { getHeight } from './world.js';
import * as audio from './audio.js';
// Cutscene: truk militer membawa pasukan melewati hutan menuju markas.
const SUBS = [[0, 'Konvoi militer memasuki hutan menuju markas...'], [5, 'Dentuman perang terdengar dari arah desa.'], [10, 'Bersiaplah. Selamat datang di garis depan.']];
export class Intro {
  constructor(cam, truck, subEl, onDone) { this.cam = cam; this.truck = truck; this.sub = subEl; this.done = onDone; this.t = 0; this.z = -92; this.fin = false; }
  update(dt) {
    if (this.fin) return;
    this.t += dt; const sp = 6.5; this.z += sp * dt;
    const T = this.truck, y = getHeight(0, this.z);
    T.position.set(0, y, this.z); T.rotation.x = -(getHeight(0, this.z + 2) - getHeight(0, this.z - 2)) / 4; T.position.x = Math.sin(this.t * 1.3) * 0.15;
    T.children[0].rotation.z = Math.sin(this.t * 14) * 0.004;
    audio.setEngine(true, sp + Math.sin(this.t * 3));
    // 3 sudut kamera: samping, belakang, depan
    const c = this.cam, k = this.t < 5 ? 0 : this.t < 10 ? 1 : 2;
    if (k === 0) c.position.set(9, y + 2.5, this.z + 10); else if (k === 1) c.position.set(1.5, y + 4, this.z - 10); else c.position.set(-3, y + 1.5, this.z + 14);
    c.lookAt(T.position.x, y + 1.8, T.position.z);
    for (const [s, txt] of SUBS) if (this.t >= s) this.sub.textContent = txt;
    if (this.z >= -13) this.finish();
  }
  finish() { if (this.fin) return; this.fin = true; audio.setEngine(false); this.sub.textContent = ''; this.done(); }
}
