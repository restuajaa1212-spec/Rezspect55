// Panggung lobi 3D di luar area main: tempat menunggu teman (4 slot) & ganti skin.
import * as THREE from 'three';
import { M, box, label, tag } from './util.js';
export const STAGE_Z = -170;
export const slotX = i => (i - 1.5) * 2.4;

export function buildLobby(scene) {
  const group = new THREE.Group(); scene.add(group);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.5, .3, 32), M(0x8d6e63)); plat.position.set(0, .15, STAGE_Z); group.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10.8, .15, 6, 40), M(0xffd54f)); ring.rotation.x = Math.PI / 2; ring.position.set(0, .35, STAGE_Z); group.add(ring);
  const pads = [];
  for (let i = 0; i < 4; i++) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .08, 20), M(0x37474f)); pad.position.set(slotX(i), .34, STAGE_Z); group.add(pad);
    const t = tag('Menunggu…'); t.position.set(slotX(i), 1.6, STAGE_Z); group.add(t); pads.push({ tag: t });
  }
  const b = label('LOBI DESA', 8, 1.4, 'rgba(46,125,50,.95)'); b.position.set(0, 5.5, STAGE_Z - 6); group.add(b);
  box(.3, 5, .3, 0x5a3a1e, -4.2, 2.7, STAGE_Z - 6, group); box(.3, 5, .3, 0x5a3a1e, 4.2, 2.7, STAGE_Z - 6, group);
  for (const [x, z] of [[-8, -6], [8, -6], [-8, 4], [8, 4]]) { // obor
    box(.2, 2.2, .2, 0x5a3a1e, x, 1.4, STAGE_Z + z, group);
    const f = new THREE.Mesh(new THREE.SphereGeometry(.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9800 })); f.position.set(x, 2.7, STAGE_Z + z); group.add(f);
  }
  for (let i = 0; i < 10; i++) { // pohon latar
    const a = -Math.PI + i * (Math.PI / 9), x = Math.cos(a) * 17, z = STAGE_Z - 6 + Math.sin(a) * -9 - 4;
    box(.5, 2.5, .5, 0x6b4a2b, x, 1.25, z, group);
    const l = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.2, 7), M(0x2e7d32)); l.position.set(x, 4.2, z); group.add(l);
  }
  return { group, pads };
}
