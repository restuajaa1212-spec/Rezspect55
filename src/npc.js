// Desa 3D - (c) 2026 rez x Gunz - MIT License
// NPC berjalan di jalur tetap. Posisi = fungsi dari Date.now() sehingga semua pemain multiplayer
// melihat NPC di tempat yang (hampir) sama tanpa perlu sinkronisasi jaringan.
import * as THREE from 'three';
import { createAvatar, animate } from './avatar.js';

const LOOPS = [
  [[-70, -6.8], [22, -6.8], [22, -7.8], [-70, -7.8]],   // trotoar utara
  [[-70, 4.8], [26, 4.8], [26, 6.3], [-70, 6.3]],       // trotoar selatan
  [[-48, 19], [-12, 19], [-12, 43], [-48, 43]],         // keliling lapangan
  [[-41, 25], [-19, 25], [-19, 37], [-41, 37]],         // pemain bola di lapangan
];
// [loop, kecepatan m/s, offset jarak, skin]
const SPEC = [[0, 1.4, 0, 0], [0, 1.2, 60, 1], [0, 1.1, 150, 2], [1, 1.5, 20, 3], [1, 1.3, 120, 4], [1, 1.6, 80, 0],
              [2, 1.3, 0, 1], [3, 3.2, 0, 4], [3, 3.4, 25, 4], [3, 3.0, 50, 5]];

class Path {
  constructor(pts) {
    this.seg = []; let L = 0;
    pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); this.seg.push({ a, b, l, at: L }); L += l; });
    this.len = L;
  }
  at(d) {
    d = ((d % this.len) + this.len) % this.len;
    for (const s of this.seg) if (d <= s.at + s.l) { const u = (d - s.at) / s.l; return { x: s.a[0] + (s.b[0] - s.a[0]) * u, z: s.a[1] + (s.b[1] - s.a[1]) * u, dx: (s.b[0] - s.a[0]) / s.l, dz: (s.b[1] - s.a[1]) / s.l }; }
  }
}

export class NPCs {
  constructor(scene, audio) {
    this.audio = audio; const paths = LOOPS.map((l) => new Path(l));
    this.list = SPEC.map(([li, speed, off, skin]) => {
      const av = createAvatar(skin, '', false); scene.add(av);
      const n = { av, path: paths[li], speed, off, x: 0, z: 0, down: 0 };
      n.tryHit = (p) => {                                   // dipanggil peluru
        if (n.down > 0 || p.y < 0 || p.y > 1.9 || (p.x - n.x) ** 2 + (p.z - n.z) ** 2 > 0.3) return false;
        n.down = 4; this.audio.hit(); return true;
      };
      return n;
    });
  }
  update(dt) {
    const t = Date.now() / 1000;
    for (const n of this.list) {
      if (n.down > 0) {                                     // tumbang sementara setelah tertembak
        n.down -= dt; n.av.rotation.x += (-Math.PI / 2 - n.av.rotation.x) * Math.min(1, dt * 12); n.av.position.y = 0.2;
        if (n.down <= 0) { n.av.rotation.x = 0; n.av.position.y = 0; }
        continue;
      }
      const p = n.path.at(n.off + n.speed * t); n.x = p.x; n.z = p.z;
      n.av.position.set(p.x, 0, p.z); n.av.rotation.y = Math.atan2(p.dx, p.dz);
      animate(n.av, t * n.speed * 3 + n.off, Math.min(1, n.speed / 1.5), false);
    }
  }
}
