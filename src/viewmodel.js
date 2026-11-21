// Viewmodel kamera orang pertama: hanya tangan (dan pistol) yang terlihat.
import * as THREE from 'three';
import { M } from './util.js';
import { SKINS } from './skins.js';

export function buildViewmodel(skin) {
  const k = SKINS[((skin | 0) % SKINS.length + SKINS.length) % SKINS.length], g = new THREE.Group();
  const part = (w, h, d, c, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); p.add(m); return m; };
  const arm = () => { const a = new THREE.Group(); part(.12, .12, .42, k.s, 0, 0, .12, a); part(.1, .1, .13, k.k, 0, 0, -.1, a); return a; }; // lengan baju + tangan
  const R = arm(), L = arm(); g.add(R, L);
  const gun = new THREE.Group();
  part(.055, .07, .3, 0x222222, 0, .05, -.22, gun); part(.05, .13, .07, 0x333333, 0, -.04, -.12, gun);
  const flash = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .05), new THREE.MeshBasicMaterial({ color: 0xffeb3b })); flash.position.set(0, .05, -.4); flash.visible = false; gun.add(flash);
  const tip = new THREE.Object3D(); tip.position.set(0, .05, -.4); gun.add(tip);
  gun.visible = false; R.add(gun);
  g.traverse(o => { if (o.isMesh) { o.material.depthTest = false; o.renderOrder = 999; } }); // selalu tampil di depan dunia
  g.visible = false;
  return { g, R, L, gun, tip, flash };
}

// w: 0=tinju 1=pistol; atk: 1->0 sisa animasi serang; hand: tangan yang memukul
export function animVM(vm, { w, atk, hand, moving, ph, reload }) {
  const bob = moving ? Math.sin(ph * 2) * .012 : 0, sway = moving ? Math.cos(ph) * .01 : 0, dip = reload > 0 ? -.15 : 0;
  if (w === 1) { // dua tangan memegang pistol, recoil saat menembak
    vm.R.position.set(.1 + sway, -.2 + bob + dip, -.32 + .07 * atk); vm.R.rotation.set(atk * .3, 0, 0);
    vm.L.position.set(-.04 + sway, -.24 + bob + dip, -.3); vm.L.rotation.set(0, -.35, 0);
  } else { // tinju bergantian kiri/kanan
    const k = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;
    vm.R.position.set(.22 + sway - (hand === 0 ? .1 * k : 0), -.3 + bob, -.3 - (hand === 0 ? .45 * k : 0)); vm.R.rotation.set(0, 0, 0);
    vm.L.position.set(-.22 + sway + (hand === 1 ? .1 * k : 0), -.3 - bob, -.3 - (hand === 1 ? .45 * k : 0)); vm.L.rotation.set(0, 0, 0);
  }
  vm.gun.visible = w === 1; vm.flash.visible = w === 1 && atk > .85;
}
