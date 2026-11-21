// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Karakter kotak (blocky): dipakai pemain lain, NPC, dan pratinjau skin di lobi.
import * as THREE from 'three';

export const SKINS = [
  { name: 'Warga',     shirt: 0x3a86ff, pants: 0x2b2d42, skin: 0xf1c27d, hair: 0x2b1b0e },
  { name: 'Petani',    shirt: 0x7cb342, pants: 0x6d4c41, skin: 0xc68642, hair: 0x111111 },
  { name: 'Polisi',    shirt: 0x1d3557, pants: 0x14213d, skin: 0xe0ac69, hair: 0x222222 },
  { name: 'Perawat',   shirt: 0xffffff, pants: 0x4dd0e1, skin: 0xf1c27d, hair: 0x8d5524 },
  { name: 'Anak Bola', shirt: 0xd32f2f, pants: 0xffffff, skin: 0x8d5524, hair: 0x000000 },
  { name: 'Ninja',     shirt: 0x212121, pants: 0x212121, skin: 0x333333, hair: 0x000000 },
];

const lam = (c = 0xffffff) => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };

/** Avatar menghadap +z, kaki di y=0, tinggi ±2. */
export function createAvatar(skin = 0, name = '', armed = true) {
  const mats = { shirt: lam(), pants: lam(), skin: lam(), hair: lam() }, root = new THREE.Group();
  const legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.14, 0.9, 0); p.add(box(0.22, 0.9, 0.25, mats.pants, 0, -0.45, 0)); root.add(p); return p; });
  root.add(box(0.5, 0.7, 0.28, mats.shirt, 0, 1.25, 0));
  root.add(box(0.3, 0.3, 0.3, mats.skin, 0, 1.8, 0), box(0.32, 0.1, 0.32, mats.hair, 0, 1.98, 0));
  const eye = new THREE.MeshBasicMaterial({ color: 0 });
  for (const s of [-1, 1]) root.add(box(0.05, 0.05, 0.02, eye, s * 0.07, 1.82, 0.151));
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.33, 1.55, 0); p.add(box(0.16, 0.55, 0.2, mats.shirt, 0, -0.275, 0), box(0.14, 0.12, 0.18, mats.skin, 0, -0.61, 0)); root.add(p); return p; });
  const gun = box(0.07, 0.1, 0.3, lam(0x222222), 0, -0.62, 0.12); gun.visible = armed; arms[1].add(gun);
  if (name) {                                           // label nama di atas kepala
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 128, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false })); sp.scale.set(1.4, 0.35, 1); sp.position.y = 2.4; root.add(sp);
  }
  root.rotation.order = 'YXZ'; root.userData = { mats, legs, arms, armed };
  setSkin(root, skin); return root;
}

export function setSkin(av, i) {
  const s = SKINS[i % SKINS.length], m = av.userData.mats;
  m.shirt.color.setHex(s.shirt); m.pants.color.setHex(s.pants); m.skin.color.setHex(s.skin); m.hair.color.setHex(s.hair);
}

/** phase: fase langkah, amt: 0..1 besar ayunan, crouch: merunduk */
export function animate(av, phase, amt, crouch) {
  const u = av.userData, w = Math.sin(phase) * amt;
  u.legs[0].rotation.x = w * 0.8; u.legs[1].rotation.x = -w * 0.8;
  u.arms[0].rotation.x = -w * 0.6; u.arms[1].rotation.x = u.armed ? -Math.PI / 2 : w * 0.6;
  av.scale.y = crouch ? 0.8 : 1;
}
