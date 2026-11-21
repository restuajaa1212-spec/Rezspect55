// Helper umum: material, kotak, label teks 3D.
import * as THREE from 'three';
export const M = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o });
export const rnd = (a, b) => a + Math.random() * (b - a);
export function box(w, h, d, c, x, y, z, p) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
  m.position.set(x, y, z); if (p) p.add(m); return m;
}
// Papan nama bidang (untuk bangunan)
export function label(text, w = 4, h = 1, bg = 'rgba(0,0,0,.6)') {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w);
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff'; x.font = `bold ${c.height * .55}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, c.width / 2, c.height / 2);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide }));
}
// Nama melayang di atas kepala (selalu menghadap kamera)
export function tag(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 8, 256, 48);
  x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false }));
  s.scale.set(2.4, .6, 1); return s;
}
