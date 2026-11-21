// Titik masuk: renderer, state (lobby -> intro -> play), pemain, kamera, HUD, multiplayer.
import './style.css';
import * as THREE from 'three';
import { buildWorld, colliders, inWater, RIVER_Z } from './world.js';
import { createNPCs, humanoid, walkAnim } from './npc.js';
import { tag } from './util.js';
import { Sfx } from './audio.js';
import { Input } from './controls.js';
import { Net } from './net.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerpA = (a, b, t) => a + ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * t;

// ---------- Renderer & scene ----------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, .1, 400);
const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();

const sfx = new Sfx(), world = buildWorld(scene), npcs = createNPCs(scene, sfx), input = new Input(canvas);

// ---------- Pemain ----------
const me = humanoid(0x2d7ff9, 0x333a4a); me.visible = false; scene.add(me);
const P = { x: -20, y: 0, z: 5.3, vy: 0, yaw: 0, pitch: .35, ph: 0, moving: false, cs: 1, wasWater: false };
let state = 'lobby', introT = 0, stopT = 0, spawned = false, idx = 0;

function collide(r = .5) {
  for (const c of colliders) {
    const nx = clamp(P.x, c.x - c.hx, c.x + c.hx), nz = clamp(P.z, c.z - c.hz, c.z + c.hz), dx = P.x - nx, dz = P.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) { if (d2 > 1e-6) { const d = Math.sqrt(d2); P.x = nx + dx / d * r; P.z = nz + dz / d * r; } else P.x += r; }
  }
}

// ---------- HUD: jam digital ----------
let gm = 7 * 60;
function tickClock(dt) { // 1 detik nyata = 1 menit game
  gm = (gm + dt) % 1440;
  $('clock').textContent = String(Math.floor(gm / 60)).padStart(2, '0') + ':' + String(Math.floor(gm % 60)).padStart(2, '0');
}
let toastT; function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }

// ---------- Dialog NPC ----------
let current = null;
function closeDialog() { if (current) { current.busy = false; current.i = 0; } current = null; $('dialog').classList.add('hide'); }
function talk(e) {
  if (current === e && e.i >= e.lines.length) { closeDialog(); return; }
  if (current && current !== e) current.busy = false;
  current = e; e.busy = true; e.g.rotation.y = Math.atan2(P.x - e.g.position.x, P.z - e.g.position.z);
  $('dn').textContent = e.name; $('dt').textContent = e.lines[e.i++]; $('dialog').classList.remove('hide'); sfx.talk();
}

// ---------- Pemain jarak jauh (multiplayer) ----------
const remotes = new Map();
function remote(id, name) {
  let r = remotes.get(id);
  if (!r) { const g = humanoid(0xffc107, 0x444444), t = tag(name || 'Pemain'); t.position.y = 2.5; g.add(t); scene.add(g); r = { g, x: 0, y: 0, z: 0, r: 0, a: 0, ph: 0 }; remotes.set(id, r); }
  return r;
}
function updateRemotes(dt) {
  for (const r of remotes.values()) {
    r.g.position.x += (r.x - r.g.position.x) * .2; r.g.position.y += (r.y - r.g.position.y) * .2; r.g.position.z += (r.z - r.g.position.z) * .2;
    r.g.rotation.y = lerpA(r.g.rotation.y, r.r, .2); if (r.a) { r.ph += dt * 9; walkAnim(r.g, r.ph, .7); } else walkAnim(r.g, 0, 0);
  }
}

// ---------- Alur game ----------
function startGame() {
  sfx.init(); state = 'intro'; introT = 0; stopT = 0; spawned = false;
  idx = Math.max(0, roster.findIndex(p => p.id === myId));
  $('lobby').classList.add('hide'); $('skip').classList.remove('hide'); $('clock').classList.remove('hide');
  roster.forEach(p => { if (p.id !== myId) remote(p.id, p.name); });
  npcs.bus.start();
}
function spawnPlayer() { spawned = true; me.visible = true; P.x = -20 + idx * 1.4; P.z = 5.4; P.yaw = 0; me.rotation.y = 0; sfx.step(false); }
function endIntro() { state = 'play'; $('skip').classList.add('hide'); $('hud').classList.remove('hide'); npcs.bus.depart(); }
$('skip').onclick = () => { if (!spawned) spawnPlayer(); endIntro(); };

function updateIntro(dt) {
  introT += dt; const b = npcs.bus, bx = b.g.position.x, k = Math.min(introT / 9, 1);
  camera.position.set(bx + 9 - k * 5, 2.4 + k * .6, 11); camera.lookAt(bx + 1, 1.6, 2.5);   // kamera sinematik mengikuti bus
  if (b.state === 'stopped') {
    stopT += dt;
    if (!b.open && stopT > 1) { b.open = true; sfx.door(); }
    if (stopT > 2.6 && !spawned) spawnPlayer();
    if (stopT > 4) endIntro();
  }
}
function updatePlay(dt) {
  // Kamera: geser layar
  P.yaw -= input.drag.x * .005; P.pitch = clamp(P.pitch + input.drag.y * .005, -.1, 1.1); input.drag.x = input.drag.y = 0;
  const mv = input.move(), len = Math.hypot(mv.x, mv.y), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const crouch = input.crouch, run = input.running && !crouch, water = inWater(P.x, P.z);
  let speed = crouch ? 1.8 : run ? 7 : 3.8; if (water) speed *= .5;
  P.moving = len > .1;
  let vx = 0, vz = 0;
  if (P.moving) {
    const n = Math.min(1, len) / len, f = mv.y * n, r = mv.x * n;
    vx = -sy * f + cy * r; vz = -cy * f - sy * r;
    P.x += vx * speed * dt; P.z += vz * speed * dt; me.rotation.y = lerpA(me.rotation.y, Math.atan2(vx, vz), .25);
  }
  if (input.jump() && P.y === 0) { P.vy = 6.5; sfx.jump(); }
  P.vy -= 18 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; }
  collide(); P.x = clamp(P.x, -125, 125); P.z = clamp(P.z, -125, 110);
  if (water && !P.wasWater) sfx.splash(); P.wasWater = water;
  // Animasi & langkah kaki
  if (P.moving && P.y === 0) {
    const old = Math.floor(P.ph / Math.PI); P.ph += dt * speed * 2.2; walkAnim(me, P.ph, run ? .95 : .65);
    if (Math.floor(P.ph / Math.PI) !== old) water ? sfx.splash() : sfx.step(run);
  } else if (P.y > 0) { me.legL.rotation.x = -.5; me.legR.rotation.x = .5; } else walkAnim(me, 0, 0);
  P.cs += ((crouch ? .7 : 1) - P.cs) * Math.min(1, dt * 10); me.scale.y = P.cs; me.position.set(P.x, P.y, P.z);
  // Kamera orbit
  const d = 6, th = P.pitch, ty = P.y + 1.6 * P.cs;
  camera.position.set(P.x + Math.sin(P.yaw) * Math.cos(th) * d, Math.max(.4, ty + Math.sin(th) * d), P.z + Math.cos(P.yaw) * Math.cos(th) * d);
  camera.lookAt(P.x, ty, P.z);
  // Interaksi NPC
  let near = null, nd = 3.2;
  for (const e of npcs.inter) { const dd = Math.hypot(e.g.position.x - P.x, e.g.position.z - P.z); if (dd < nd) { nd = dd; near = e; } }
  $('bAct').classList.toggle('on', !!near);
  const act = input.act(); if (act && near) talk(near);
  if (current && current !== near) closeDialog();
}

// ---------- Lobby & multiplayer ----------
let net = null, myId = 1, hostId = 1, roster = [{ id: 1, name: 'Kamu' }];
const status = s => $('status').textContent = s || '';
$('name').value = localStorage.getItem('dx_name') || ''; $('server').value = localStorage.getItem('dx_srv') || 'ws://192.168.1.2:8080';

$('bSolo').onclick = () => { sfx.init(); roster = [{ id: 1, name: $('name').value || 'Kamu' }]; myId = 1; startGame(); };
async function joinRoom(code) {
  sfx.init(); const name = $('name').value.trim() || 'Pemain';
  localStorage.setItem('dx_name', name); localStorage.setItem('dx_srv', $('server').value);
  if (!code) return status('Isi kode room dulu');
  status('Menghubungkan…'); net = new Net(onNet);
  try { await net.connect($('server').value.trim(), name, code.toUpperCase()); status(''); } catch (e) { status(e.message); net = null; }
}
$('bCreate').onclick = () => { const c = Math.random().toString(36).slice(2, 6).toUpperCase(); $('room').value = c; joinRoom(c); };
$('bJoin').onclick = () => joinRoom($('room').value.trim());
$('bStart').onclick = () => net && net.send({ t: 'start' });

function onNet(m) {
  if (m.t === 'you') myId = m.id;
  else if (m.t === 'room') {
    roster = m.players; hostId = m.host; $('menu').classList.add('hide'); $('roomPanel').classList.remove('hide'); $('rc').textContent = m.code;
    $('plist').innerHTML = roster.map(p => `<li>${p.id === hostId ? '👑 ' : '👤 '}${p.name.replace(/[<>&]/g, '')}${p.id === myId ? ' (kamu)' : ''}</li>`).join('');
    $('bStart').classList.toggle('hide', myId !== hostId); $('wait').classList.toggle('hide', myId === hostId);
  } else if (m.t === 'start') startGame();
  else if (m.t === 'st') { const r = remote(m.id, (roster.find(p => p.id === m.id) || {}).name); Object.assign(r, { x: m.x, y: m.y, z: m.z, r: m.r, a: m.a }); }
  else if (m.t === 'left') { const r = remotes.get(m.id); if (r) { scene.remove(r.g); remotes.delete(m.id); toast('Pemain keluar'); } }
  else if (m.t === 'err') { status(m.msg); net = null; }
  else if (m.t === 'closed' && state !== 'lobby') toast('Koneksi server terputus');
  else if (m.t === 'closed') status('Koneksi terputus');
}
setInterval(() => { if (net && state === 'play') net.send({ t: 'st', x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), r: +me.rotation.y.toFixed(2), a: P.moving ? 1 : 0 }); }, 80);

// ---------- Loop utama ----------
const clk = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clk.getDelta(), .05), t = clk.elapsedTime;
  world.update(dt);
  const near = npcs.update(dt, t, state === 'lobby' ? { x: 0, z: 0 } : P);
  if (state === 'lobby') { camera.position.set(Math.cos(t * .05) * 90, 35, Math.sin(t * .05) * 90); camera.lookAt(0, 2, 0); }
  else if (state === 'intro') updateIntro(dt); else updatePlay(dt);
  if (state !== 'lobby') {
    sfx.setEngine(clamp(1 - near / 35, 0, 1)); sfx.setRiver(clamp(1 - Math.abs(P.z - RIVER_Z) / 50, 0, 1)); tickClock(dt);
  }
  updateRemotes(dt); renderer.render(scene, camera);
}
loop();
