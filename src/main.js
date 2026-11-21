// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Alur: layar masuk -> LOBI (skin, musik, room) -> intro bus -> permainan (NPC, pistol, multiplayer).
import * as THREE from 'three';
import './style.css';
import { buildWorld, RIVER_X } from './world.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { GameAudio } from './audio.js';
import { createIntro } from './intro.js';
import { Weapon } from './weapon.js';
import { Combat } from './combat.js';
import { NPCs } from './npc.js';
import { Net } from './net.js';
import { Lobby } from './lobby.js';
import { createAvatar, animate } from './avatar.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);
scene.add(camera);                                          // wajib: model pistol adalah anak kamera

const audio = new GameAudio(), net = new Net(), ui = new UI(canvas);
const world = buildWorld(scene), player = new Player(camera, world, audio);
const weapon = new Weapon(camera, audio), combat = new Combat(scene, world), npcs = new NPCs(scene, audio);
const lobby = new Lobby(audio, net, beginGame);
weapon.model.visible = false;

const resize = () => {
  renderer.setSize(innerWidth, innerHeight, false);
  for (const c of [camera, lobby.camera]) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
};
addEventListener('resize', resize); resize();

let mode = 'start', intro = null, myId = 0, gameMinutes = 7 * 60, elapsed = 0, sendT = 0;
const remotes = new Map();                                  // id -> {av, tx,ty,tz, yaw, c, a}
const fade = document.getElementById('fade'), skipBtn = document.getElementById('skip');
const spawnX = (id) => -12 + (id - 1.5) * 1.2;

/** Fullscreen + kunci landscape (WebView Android memakai manifest, ini cadangan untuk browser). */
async function lockLandscape() {
  try { await document.documentElement.requestFullscreen?.(); } catch (e) {}
  try { await screen.orientation?.lock?.('landscape'); } catch (e) {}
}

// Layar masuk -> lobi (tap pengguna dibutuhkan untuk membuka audio)
document.getElementById('startBtn').addEventListener('click', () => {
  audio.init(); lockLandscape(); audio.musicStart('lobby');
  document.getElementById('start').remove(); lobby.show(); mode = 'lobby';
});

/** Dipanggil lobi saat game dimulai (solo / host menekan MULAI / tamu menerima 'start') */
function beginGame(roster) {
  if (mode !== 'lobby') return;
  myId = net.active ? net.id : 0;
  lobby.hide(); audio.musicStart('game');
  for (const r of remotes.values()) scene.remove(r.av); remotes.clear();
  for (const p of roster) if (p.id !== myId) {
    const av = createAvatar(p.skin, p.name); av.position.set(spawnX(p.id), 0, -3); scene.add(av);
    remotes.set(p.id, { av, tx: spawnX(p.id), ty: 0, tz: -3, yaw: Math.PI, c: false, a: true, phase: 0 });
  }
  player.respawn(myId); weapon.refill(); ui.setHP(100);
  mode = 'intro'; skipBtn.hidden = false;
  intro = createIntro(scene, camera, audio, () => {
    fade.style.opacity = 1;
    setTimeout(() => { mode = 'play'; skipBtn.hidden = true; ui.showHUD(true); weapon.model.visible = true; fade.style.opacity = 0; }, 900);
  });
}
skipBtn.addEventListener('click', () => intro?.skip());

// ---- Event jaringan ----
net.on('s', (m) => { const r = remotes.get(m.id); if (r) Object.assign(r, { tx: m.x, ty: m.y, tz: m.z, yaw: m.yaw, c: m.c, a: m.a }); });
net.on('f', (m) => {
  const o = new THREE.Vector3(...m.o), d = new THREE.Vector3(...m.d);
  combat.spawn(o, d, m.id); audio.shot(Math.max(0.15, 1 - o.distanceTo(player.pos) / 60));
});
net.on('left', (m) => { const r = remotes.get(m.id); if (r) { scene.remove(r.av); remotes.delete(m.id); ui.toast('Pemain keluar'); } });
net.on('closed', () => { if (mode === 'play' || mode === 'intro') { ui.toast('Host terputus…', 2500); setTimeout(() => location.reload(), 2600); } });

// ---- Tembak & terkena tembakan ----
function shoot() {
  const d = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  d.x += (Math.random() - 0.5) * 0.012; d.y += (Math.random() - 0.5) * 0.012; d.normalize();
  const o = camera.position.clone().addScaledVector(d, 0.6);
  combat.spawn(o, d, myId);
  if (net.active) net.send({ t: 'f', id: myId, o: [o.x, o.y, o.z], d: [d.x, d.y, d.z] });
}
function damageMe(n) {                                      // korban menghitung sendiri damage-nya
  if (!player.alive) return;
  player.hp -= n; audio.hit(); ui.setHP(player.hp); ui.flash();
  if (player.hp <= 0) {
    player.alive = false; ui.toast('KO! Respawn 3 detik…', 3000);
    setTimeout(() => { player.respawn(myId); weapon.refill(); ui.setHP(100); }, 3000);
  }
}
const me = { get id() { return myId; }, pos: player.pos, get eye() { return player.eye; }, alive: () => player.alive, hit: () => damageMe(20) };

// ---- Loop utama ----
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
  if (mode === 'start' || mode === 'lobby') { lobby.update(dt); renderer.render(lobby.scene, lobby.camera); return; }

  world.update(dt, elapsed); npcs.update(dt);
  if (intro && !intro.update(dt)) intro = null;

  for (const r of remotes.values()) {                       // interpolasi pemain lain
    const k = Math.min(1, dt * 12), p = r.av.position, mx = (r.tx - p.x) * k, mz = (r.tz - p.z) * k;
    p.x += mx; p.z += mz; p.y += (r.ty - p.y) * k;
    const sp = Math.hypot(mx, mz) / Math.max(dt, 1e-4); r.phase += sp * dt * 2.2;
    animate(r.av, r.phase, Math.min(1, sp / 3), r.c); r.av.rotation.y = r.yaw + Math.PI; r.av.visible = r.a;
  }

  if (mode === 'play') {
    player.update(dt, ui); weapon.update(dt);
    if (player.alive) {
      if (ui.consumeReload()) weapon.reload();
      if (ui.isFiring() && weapon.tryFire()) shoot();
    }
    ui.setAmmo(weapon.reloading ? 'ISI ULANG…' : `${weapon.mag}/${weapon.max}`);
    gameMinutes += dt * 2; ui.setClock(gameMinutes);
    audio.setRiver(Math.max(0, 1 - Math.abs(player.pos.x - RIVER_X) / 40));
    sendT += dt;
    if (net.active && sendT > 0.066) {                      // ±15 pembaruan posisi/detik
      sendT = 0; const f = (v) => +v.toFixed(2);
      net.send({ t: 's', id: myId, x: f(player.pos.x), y: f(player.pos.y), z: f(player.pos.z), yaw: f(player.yaw), c: ui.isCrouching(), a: player.alive });
    }
  }
  combat.update(dt, { npcs: npcs.list, me });
  renderer.render(scene, camera);
});
