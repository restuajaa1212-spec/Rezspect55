// Item yang bisa diambil: senjata, amunisi, medkit. Auto-ambil saat didekati, muncul lagi setelah 30 detik.
import * as THREE from 'three';
import { M, box, tag } from './util.js';
import { WEAPONS } from './weapons.js';

const SPOTS = [
  { t: 'w', id: 2, x: -12, z: 9.5 }, { t: 'w', id: 3, x: 3, z: -10.5 }, { t: 'w', id: 4, x: -56, z: -10.5 }, { t: 'w', id: 5, x: 31, z: -10.5 },
  { t: 'w', id: 2, x: 62, z: 9.5 }, { t: 'w', id: 3, x: -96, z: -8 }, { t: 'w', id: 4, x: 6, z: 30 }, { t: 'w', id: 5, x: -80, z: 9.5 },
  { t: 'ammo', x: -30, z: -10.5 }, { t: 'ammo', x: 20, z: 9.5 }, { t: 'ammo', x: 90, z: -10.5 },
  { t: 'med', x: -8, z: -10.5 }, { t: 'med', x: 35, z: 9.5 }, { t: 'med', x: -75, z: -10.5 },
];
const COL = { w: 0xffc107, ammo: 0x8bc34a, med: 0xf44336 };

export function buildPickups(scene) {
  const list = [];
  for (const s of SPOTS) {
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); scene.add(g);
    box(1, .5, .7, 0x4b5d2a, 0, .25, 0, g);                                  // peti militer
    const fl = new THREE.Group(); fl.position.y = 1.3; g.add(fl);            // benda melayang
    if (s.t === 'w') { box(.8, .14, .18, 0x222222, 0, 0, 0, fl); box(.14, .32, .16, 0x333333, -.15, -.2, 0, fl); }
    else if (s.t === 'ammo') { box(.5, .35, .35, 0x6b7a3e, 0, 0, 0, fl); box(.5, .08, .36, 0xffd54f, 0, .1, 0, fl); }
    else { box(.5, .4, .3, 0xffffff, 0, 0, 0, fl); box(.3, .08, .32, 0xd32f2f, 0, 0, 0, fl); box(.08, .3, .32, 0xd32f2f, 0, 0, 0, fl); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: COL[s.t], transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 3; g.add(beam);
    const t = tag(s.t === 'w' ? WEAPONS[s.id].n : s.t === 'ammo' ? 'Amunisi' : 'Medkit'); t.position.y = 2.3; g.add(t);
    list.push({ g, fl, s, wait: 0 });
  }
  return {
    update(dt, t, P, onPick) {
      for (const p of list) {
        if (p.wait > 0) { if ((p.wait -= dt) <= 0) p.g.visible = true; continue; }
        p.fl.rotation.y = t * 2; p.fl.position.y = 1.3 + Math.sin(t * 3 + p.s.x) * .12;
        if (P && Math.hypot(P.x - p.s.x, P.z - p.s.z) < 1.8) { onPick(p.s); p.wait = 30; p.g.visible = false; }
      }
    }
  };
}
