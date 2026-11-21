// Skin karakter + pose animasi (dipakai pemain, pemain lain, dan panggung lobi).
import * as THREE from 'three';
import { M, box } from './util.js';
import { humanoid } from './npc.js';

// s=baju, p=celana, k=warna kulit, hat=topi (cap/helm/band), hc=warna topi
export const SKINS = [
  { n: 'Warga Biru', s: 0x2d7ff9, p: 0x333a4a, k: 0xf1c27d },
  { n: 'Ninja Merah', s: 0xc62828, p: 0x212121, k: 0xf1c27d, hat: 'band', hc: 0x111111 },
  { n: 'Pak Polisi', s: 0x1a2f6b, p: 0x101830, k: 0xe0ac69, hat: 'cap', hc: 0x1a2f6b },
  { n: 'Tentara Hijau', s: 0x4b5d2a, p: 0x3b3f24, k: 0xc68642, hat: 'helm', hc: 0x3d4a22 },
  { n: 'Kuning Ceria', s: 0xffd600, p: 0x6d4c41, k: 0x8d5524 },
  { n: 'Pink Gaul', s: 0xff69b4, p: 0x4a148c, k: 0xf1c27d, hat: 'cap', hc: 0xff1493 },
  { n: 'Hoodie Hitam', s: 0x1b1b1b, p: 0x2b2b2b, k: 0xf1c27d, hat: 'band', hc: 0xd50000 },
];

export function makeAvatar(i) {
  const k = SKINS[((i | 0) % SKINS.length + SKINS.length) % SKINS.length], g = humanoid(k.s, k.p, k.k);
  if (k.hat === 'cap') { box(.6, .14, .6, k.hc, 0, 2.12, 0, g); box(.5, .05, .3, k.hc, 0, 2.07, .38, g); }
  else if (k.hat === 'helm') { const h = new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(k.hc)); h.position.y = 1.95; g.add(h); }
  else if (k.hat === 'band') box(.62, .1, .62, k.hc, 0, 2.0, 0, g);
  // Pistol menempel di tangan kanan (disembunyikan jika memegang tinju)
  const gun = new THREE.Group(); box(.1, .42, .12, 0x222222, 0, -.95, 0, gun); box(.1, .12, .2, 0x333333, 0, -.8, -.12, gun);
  gun.visible = false; g.armR.add(gun); g.gun = gun; return g;
}

// ph=fase langkah, amt=besar ayunan, w=senjata (0 tinju,1 pistol), atk=sisa animasi serang (1->0)
export function pose(g, { ph = 0, amt = 0, w = 0, atk = 0 }) {
  const s = Math.sin(ph) * amt;
  g.legL.rotation.x = s; g.legR.rotation.x = -s;
  if (w === 1) { g.armR.rotation.x = -1.5 - atk * .35; g.armL.rotation.x = -1.3; g.armL.rotation.z = .25; }
  else { g.armL.rotation.z = 0; g.armL.rotation.x = -s * .8; g.armR.rotation.x = s * .8 - (atk > 0 ? 1.9 * Math.sin((1 - atk) * Math.PI) : 0); }
  if (g.gun) g.gun.visible = w === 1;
}
