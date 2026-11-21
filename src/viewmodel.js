// Viewmodel kamera orang pertama: hanya tangan + senjata yang dipegang.
import * as THREE from 'three';
import { M } from './util.js';
import { SKINS } from './skins.js';

// L=panjang, h=tinggi badan senjata, x=bagian tambahan [w,h,d,warna,x,y,z]
const GUNS = {
  1: { L: .3, h: .07, col: 0x222222, x: [[.05, .13, .07, 0x333333, 0, -.04, -.12]] },
  2: { L: .42, h: .08, col: 0x2a2a2a, x: [[.04, .18, .06, 0x333333, 0, -.08, -.22], [.05, .12, .06, 0x333333, 0, -.05, -.1]] },
  3: { L: .75, h: .07, col: 0x2f2f2f, x: [[.075, .075, .22, 0x5d4037, 0, -.005, -.38], [.06, .11, .24, 0x5d4037, 0, 0, .1]] },
  4: { L: .65, h: .09, col: 0x2b2f24, x: [[.05, .2, .08, 0x222222, 0, -.1, -.28], [.06, .11, .25, 0x333333, 0, 0, .12], [.03, .05, .03, 0x111111, 0, .08, -.3]] },
  5: { L: .95, h: .07, col: 0x242424, x: [[.06, .06, .28, 0x111111, 0, .1, -.3], [.06, .12, .3, 0x4e342e, 0, 0, .15]] },
};

export function buildViewmodel(skin) {
  const k = SKINS[((skin | 0) % SKINS.length + SKINS.length) % SKINS.length], g = new THREE.Group();
  const part = (w, h, d, c, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); p.add(m); return m; };
  const arm = () => { const a = new THREE.Group(); part(.12, .12, .42, k.s, 0, 0, .12, a); part(.1, .1, .13, k.k, 0, 0, -.1, a); return a; };
  const R = arm(), L = arm(); g.add(R, L);
  const guns = {}, tips = {}, flashes = {}, lens = {};
  for (const id in GUNS) {
    const d = GUNS[id], gg = new THREE.Group();
    part(.06, d.h, d.L, d.col, 0, .05, -(.1 + d.L / 2), gg); d.x.forEach(a => part(...a, gg));
    const fl = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .05), new THREE.MeshBasicMaterial({ color: 0xffeb3b })); fl.position.set(0, .05, -(.1 + d.L)); fl.visible = false; gg.add(fl);
    const tip = new THREE.Object3D(); tip.position.set(0, .05, -(.1 + d.L)); gg.add(tip);
    gg.visible = false; R.add(gg); guns[id] = gg; tips[id] = tip; flashes[id] = fl; lens[id] = d.L;
  }
  g.traverse(o => { if (o.isMesh) { o.material.depthTest = false; o.renderOrder = 999; } }); // selalu tampil di depan dunia
  g.visible = false;
  return { g, R, L, guns, tips, flashes, lens };
}

// w: id senjata (0 tinju); atk: 1->0 sisa animasi serang; hand: tangan yang memukul
export function animVM(vm, { w, atk, hand, moving, ph, reload }) {
  const bob = moving ? Math.sin(ph * 2) * .012 : 0, sway = moving ? Math.cos(ph) * .01 : 0, dip = reload > 0 ? -.15 : 0;
  if (w > 0) { // dua tangan memegang senjata, recoil saat menembak
    vm.R.position.set(.1 + sway, -.2 + bob + dip, -.32 + .07 * atk); vm.R.rotation.set(atk * .3, 0, 0);
    vm.L.position.set(-.04 + sway, -.24 + bob + dip, -(.15 + vm.lens[w] * .6)); vm.L.rotation.set(0, -.35, 0);
  } else { // tinju bergantian kiri/kanan
    const k = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;
    vm.R.position.set(.22 + sway - (hand === 0 ? .1 * k : 0), -.3 + bob, -.3 - (hand === 0 ? .45 * k : 0)); vm.R.rotation.set(0, 0, 0);
    vm.L.position.set(-.22 + sway + (hand === 1 ? .1 * k : 0), -.3 - bob, -.3 - (hand === 1 ? .45 * k : 0)); vm.L.rotation.set(0, 0, 0);
  }
  for (const id in vm.guns) { vm.guns[id].visible = +id === w; vm.flashes[id].visible = +id === w && atk > .85; }
}
