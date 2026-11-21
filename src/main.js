// Titik masuk: renderer, state (lobby -> intro -> play), pemain, kamera PVP, combat, HUD, multiplayer.
import './style.css';
import * as THREE from 'three';
import { buildWorld, colliders, inWater, RIVER_Z } from './world.js';
import { buildLobby, STAGE_Z, slotX } from './lobby3d.js';
import { createNPCs } from './npc.js';
import { SKINS, makeAvatar, pose } from './skins.js';
import { tag } from './util.js';
import { buildViewmodel, animVM } from './viewmodel.js';
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
const camera = new THREE.PerspectiveCamera(62, 1, .1, 400);
const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();
camera.rotation.order = 'YXZ'; camera.near = .05; camera.updateProjectionMatrix(); scene.add(camera); // kamera orang pertama (viewmodel jadi anak kamera)

const sfx = new Sfx(), world = buildWorld(scene), lobby = buildLobby(scene), npcs = createNPCs(scene, sfx), input = new Input(canvas);
// Kotak tabrakan untuk raycast peluru (bangunan & pohon menghalangi tembakan)
const boxes = colliders.map(c => new THREE.Box3(new THREE.Vector3(c.x - c.hx, 0, c.z - c.hz), new THREE.Vector3(c.x + c.hx, 6, c.z + c.hz)));

// ---------- State pemain ----------
let me = null, vm = null, mySkin = (+localStorage.getItem('dx_skin')) || 0;
const P = { x: -20, y: 0, z: 5.3, vy: 0, yaw: 0, pitch: .25, ph: 0, moving: false, cs: 1, wasWater: false };
const MAXAMMO = 12;
const W = { hp: 100, w: 0, ammo: MAXAMMO, reload: 0, cd: 0, atk: 0, dead: 0, last: 0, meds: 3, healCd: 0, hand: 0 }; // w: 0=tinju 1=pistol
let state = 'lobby', introT = 0, stopT = 0, spawned = false, idx = 0;

function collide(r = .5) {
  for (const c of colliders) {
    const nx = clamp(P.x, c.x - c.hx, c.x + c.hx), nz = clamp(P.z, c.z - c.hz, c.z + c.hz), dx = P.x - nx, dz = P.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) { if (d2 > 1e-6) { const d = Math.sqrt(d2); P.x = nx + dx / d * r; P.z = nz + dz / d * r; } else P.x += r; }
  }
}

// ---------- HUD ----------
let gm = 7 * 60; // jam game: 1 detik nyata = 1 menit
function tickClock(dt) { gm = (gm + dt) % 1440; $('clock').textContent = String(Math.floor(gm / 60)).padStart(2, '0') + ':' + String(Math.floor(gm % 60)).padStart(2, '0'); }
let toastT; function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
function updWpn() { $('wpn').textContent = W.w ? (W.reload > 0 ? '🔫 Reload…' : `🔫 Pistol ${W.ammo}/${MAXAMMO}`) : '👊 Tinju'; $('wpn').textContent += ` · 🩹${W.meds}`; $('bWeap').textContent = W.w ? '👊' : '🔫'; }
const updHp = () => $('hpb').style.width = W.hp + '%';
function healFlash() { const f = $('flash'); f.classList.add('heal', 'on'); setTimeout(() => f.classList.remove('heal', 'on'), 160); }
function heal() { // pakai medkit: +40 HP
  if (W.healCd > 0) return;
  if (W.meds <= 0) { toast('Medkit habis! Temui Suster Ani di Klinik'); return; }
  if (W.hp >= 100) { toast('HP sudah penuh'); return; }
  W.meds--; W.hp = Math.min(100, W.hp + 40); W.healCd = 1.2; sfx.heal(); healFlash(); updHp(); updWpn();
}
// Suster klinik: sembuhkan penuh + isi ulang medkit
npcs.nurse.onTalk = () => { if (W.dead <= 0) { W.hp = 100; W.meds = 3; updHp(); updWpn(); healFlash(); sfx.heal(); } };
function hitMarker() { const c = $('cross'); c.classList.add('hit'); setTimeout(() => c.classList.remove('hit'), 120); }
function dmgFlash() { const f = $('flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 80); }

// ---------- Dialog NPC ----------
let current = null;
function closeDialog() { if (current) { current.busy = false; current.i = 0; } current = null; $('dialog').classList.add('hide'); }
function talk(e) {
  if (current === e && e.i >= e.lines.length) { closeDialog(); return; }
  if (current && current !== e) current.busy = false;
  current = e; e.busy = true; e.g.rotation.y = Math.atan2(P.x - e.g.position.x, P.z - e.g.position.z);
  $('dn').textContent = e.name; $('dt').textContent = e.lines[e.i++]; $('dialog').classList.remove('hide'); sfx.talk(); if (e.i === 1 && e.onTalk) e.onTalk();
}

// ---------- Pemain lain (multiplayer) ----------
const remotes = new Map();
const names = id => (roster.find(p => p.id === id) || {}).name || 'Pemain';
function remote(id, name, skin) {
  let r = remotes.get(id);
  if (!r) {
    const g = makeAvatar(skin || 0), t = tag(name || 'Pemain'); t.position.y = 2.5; g.add(t);
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x300000, depthTest: false })), bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x00e676, depthTest: false }));
    for (const s of [bg, bar]) { s.center.set(0, .5); s.position.set(-.6, 2.25, 0); s.scale.set(1.2, .12, 1); g.add(s); }
    scene.add(g); r = { id, g, bar, x: 0, y: 0, z: 0, r: 0, a: 0, w: 0, hp: 100, ph: 0, atk: 0 }; remotes.set(id, r);
  }
  return r;
}
function updateRemotes(dt) {
  for (const r of remotes.values()) {
    const p = r.g.position; p.x += (r.x - p.x) * .2; p.y += (r.y - p.y) * .2; p.z += (r.z - p.z) * .2;
    r.g.rotation.y = lerpA(r.g.rotation.y, r.r, .25); r.g.rotation.x = r.hp <= 0 ? -1.5 : 0;
    if (r.a) r.ph += dt * 9; r.atk = Math.max(0, r.atk - dt * 4);
    pose(r.g, { ph: r.ph, amt: r.a ? .7 : 0, w: r.w, atk: r.atk }); r.bar.scale.x = Math.max(.001, r.hp / 100 * 1.2);
  }
}

// ---------- Efek tracer peluru ----------
const tr = []; let ti = 0;
for (let i = 0; i < 8; i++) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffe082 }));
  l.frustumCulled = false; l.visible = false; l.ttl = 0; scene.add(l); tr.push(l);
}
function tracer(a, b) { const l = tr[ti++ % 8], p = l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; l.visible = true; l.ttl = .08; }

// ---------- Combat: pistol & tinju ----------
const candidates = () => [...[...remotes.values()].map(r => ({ g: r.g, id: r.id })), ...npcs.inter.filter(e => !e.dead)];
function sphereT(o, d, c, r, max) { // jarak sepanjang ray ke bola (atau null)
  const t = c.clone().sub(o).dot(d); if (t < 0 || t > max) return null;
  return o.clone().addScaledVector(d, t).distanceTo(c) < r ? t : null;
}
function castRay(o, d, range) {
  const ray = new THREE.Ray(o, d), v = new THREE.Vector3(); let best = range, tgt = null, head = false;
  for (const b of boxes) { const p = ray.intersectBox(b, v); if (p) { const t = p.distanceTo(o); if (t < best) { best = t; tgt = null; } } }
  for (const c of candidates()) {
    const q = c.g.position, th = sphereT(o, d, new THREE.Vector3(q.x, q.y + 1.9, q.z), .3, best);
    if (th !== null) { best = th; tgt = c; head = true; continue; }
    const tb = sphereT(o, d, new THREE.Vector3(q.x, q.y + 1.15, q.z), .55, best);
    if (tb !== null) { best = tb; tgt = c; head = false; }
  }
  return { dist: best, tgt, head };
}
function hurtNpc(e, dmg) { // warga bisa terluka sampai mati (bangkit lagi setelah 12 detik)
  e.hp -= dmg;
  if (e.hp <= 0) { e.dead = 12; e.fall = 0; e.busy = true; if (current === e) closeDialog(); sfx.hurt(); toast('Warga tumbang!'); }
  else { e.stun = 1.5; e.busy = true; }
}
function applyHit(tgt, dmg) {
  sfx.hit(); hitMarker();
  if (tgt.id !== undefined) net && net.send({ t: 'hit', to: tgt.id, dmg });
  else hurtNpc(tgt, dmg);
}
function shoot() {
  if (W.ammo <= 0) { W.reload = 1.2; sfx.click(); updWpn(); return; }
  W.ammo--; W.cd = .25; W.atk = 1; sfx.shot();
  camera.updateMatrixWorld(true); const o = camera.position.clone(), d = new THREE.Vector3(); camera.getWorldDirection(d);
  const h = castRay(o, d, 70), end = o.clone().addScaledVector(d, h.dist);
  tracer(vm.tip.getWorldPosition(new THREE.Vector3()), end);
  net && net.send({ t: 'fx', k: 'g', ex: +end.x.toFixed(1), ey: +end.y.toFixed(1), ez: +end.z.toFixed(1) });
  if (h.tgt) applyHit(h.tgt, h.head ? 40 : 20);
  if (W.ammo === 0) W.reload = 1.2; updWpn();
}
function punch() {
  W.cd = .45; W.atk = 1; W.hand ^= 1; sfx.punch(); net && net.send({ t: 'fx', k: 'p' });
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let best = null, bd = 1.9;
  for (const c of candidates()) {
    const dx = c.g.position.x - P.x, dz = c.g.position.z - P.z, d = Math.hypot(dx, dz);
    if (d < bd && (dx * fx + dz * fz) / (d || 1) > .4) { bd = d; best = c; }
  }
  if (best) applyHit(best, 12);
}
function combat(dt) {
  if (input.weap()) { W.w = 1 - W.w; W.reload = 0; sfx.click(); updWpn(); }
  if (input.fire && W.cd <= 0 && W.reload <= 0) W.w ? shoot() : punch();
}
function die() {
  W.dead = 3; W.hp = 0; updHp(); net && net.send({ t: 'kill', by: W.last, victim: myId }); toast('Kamu kalah! Respawn 3 detik…'); closeDialog();
}
function respawn() {
  W.hp = 100; W.ammo = MAXAMMO; W.reload = 0; W.dead = 0; updHp(); updWpn();
  P.x = -20 + idx * 1.4 + Math.random() * 3; P.z = 5.4; P.y = 0; me.rotation.x = 0;
}

// ---------- Alur game ----------
function startGame() {
  sfx.init(); state = 'intro'; introT = 0; stopT = 0; spawned = false;
  idx = Math.max(0, roster.findIndex(p => p.id === myId));
  lobby.group.visible = false; $('lobby').classList.add('hide'); $('skip').classList.remove('hide'); $('clock').classList.remove('hide');
  if (me) scene.remove(me); me = makeAvatar(mySkin); me.visible = false; scene.add(me);
  if (vm) camera.remove(vm.g); vm = buildViewmodel(mySkin); camera.add(vm.g);
  roster.forEach(p => { if (p.id !== myId) remote(p.id, p.name, p.skin); });
  npcs.bus.start(); updWpn(); updHp();
}
function spawnPlayer() { spawned = true; me.visible = true; P.x = -20 + idx * 1.4; P.z = 5.4; P.yaw = 0; P.pitch = 0; me.rotation.y = Math.PI; sfx.step(false); }
function endIntro() { state = 'play'; me.visible = false; $('skip').classList.add('hide'); $('hud').classList.remove('hide'); npcs.bus.depart(); }
$('skip').onclick = () => { if (!spawned) spawnPlayer(); endIntro(); };

function updateIntro(dt) {
  introT += dt; const b = npcs.bus, bx = b.g.position.x, k = Math.min(introT / 9, 1);
  camera.position.set(bx + 9 - k * 5, 2.4 + k * .6, 11); camera.lookAt(bx + 1, 1.6, 2.5); // kamera sinematik
  if (b.state === 'stopped') {
    stopT += dt;
    if (!b.open && stopT > 1) { b.open = true; sfx.door(); }
    if (stopT > 2.6 && !spawned) spawnPlayer();
    if (stopT > 4) endIntro();
  }
}

function updatePlay(dt) {
  // Kamera: geser layar = membidik (yaw & pitch)
  P.yaw -= input.drag.x * .005; P.pitch = clamp(P.pitch - input.drag.y * .004, -1.3, 1.3); input.drag.x = input.drag.y = 0;
  const alive = W.dead <= 0;
  if (!alive) { W.dead -= dt; if (W.dead <= 0) respawn(); }
  const mv = alive ? input.move() : { x: 0, y: 0 }, len = Math.hypot(mv.x, mv.y), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const crouch = input.crouch, run = input.running && !crouch, water = inWater(P.x, P.z);
  let speed = crouch ? 1.8 : run ? 7 : 3.8; if (water) speed *= .5;
  P.moving = len > .1;
  if (P.moving) { // gerak relatif arah kamera (strafe), badan selalu menghadap arah bidik
    const n = Math.min(1, len) / len, f = mv.y * n, r = mv.x * n;
    P.x += (-sy * f + cy * r) * speed * dt; P.z += (-cy * f - sy * r) * speed * dt;
  }
  if (alive && input.jump() && P.y === 0) { P.vy = 6.5; sfx.jump(); }
  P.vy -= 18 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; }
  collide(); P.x = clamp(P.x, -125, 125); P.z = clamp(P.z, -125, 110);
  if (water && !P.wasWater) sfx.splash(); P.wasWater = water;
  // Combat & timer
  W.cd -= dt; W.healCd -= dt; W.atk = Math.max(0, W.atk - dt * 4);
  if (W.reload > 0) { W.reload -= dt; if (W.reload <= 0) { W.ammo = MAXAMMO; updWpn(); } }
  if (alive) combat(dt); const hl = input.heal(); if (alive && hl) heal();
  for (const l of tr) if (l.visible && (l.ttl -= dt) <= 0) l.visible = false;
  for (const e of npcs.inter) { // status warga: mati (tumbang lalu bangkit) / kaget
    if (e.dead > 0) {
      e.fall = Math.min(1, e.fall + dt * 3); e.g.rotation.x = -1.5 * e.fall; e.g.position.y = e.y0 + .12 * e.fall;
      if ((e.dead -= dt) <= 0) { e.dead = 0; e.hp = 60; e.busy = false; e.fall = 0; e.g.rotation.x = 0; e.g.position.y = e.y0; }
    } else if (e.stun > 0 && (e.stun -= dt) <= 0 && e !== current) e.busy = false;
  }
  // Animasi & langkah kaki
  if (P.moving && P.y === 0) {
    const old = Math.floor(P.ph / Math.PI); P.ph += dt * speed * 2.2;
    if (Math.floor(P.ph / Math.PI) !== old) water ? sfx.splash() : sfx.step(run);
  }
  pose(me, { ph: P.ph, amt: P.moving && P.y === 0 ? (run ? .95 : .65) : 0, w: W.w, atk: W.atk });
  me.rotation.y = lerpA(me.rotation.y, P.yaw + Math.PI, .35); me.rotation.x = alive ? 0 : -1.5;
  P.cs += ((crouch ? .7 : 1) - P.cs) * Math.min(1, dt * 10); me.scale.y = P.cs; me.position.set(P.x, P.y + (alive ? 0 : .3), P.z);
  // Kamera orang pertama: di mata pemain, hanya tangan (viewmodel) yang terlihat
  const ty = P.y + 1.6 * P.cs;
  if (alive) { camera.position.set(P.x, ty + (P.moving && P.y === 0 ? Math.sin(P.ph * 2) * .03 : 0), P.z); camera.rotation.set(P.pitch, P.yaw, 0); }
  else { camera.position.set(P.x, .35, P.z); camera.rotation.set(-.2, P.yaw, 1.3); } // jatuh saat kalah
  if (vm) {
    vm.g.visible = alive; vm.g.position.y = -.12 * clamp(W.healCd, 0, 1);
    animVM(vm, { w: W.w, atk: W.atk, hand: W.hand, moving: P.moving && P.y === 0, ph: P.ph, reload: W.reload });
  }
  // Interaksi NPC
  let near = null, nd = 3.2;
  for (const e of npcs.inter) { if (e.dead) continue; const dd = Math.hypot(e.g.position.x - P.x, e.g.position.z - P.z); if (dd < nd) { nd = dd; near = e; } }
  $('bAct').classList.toggle('on', !!near);
  const act = input.act(); if (act && near && alive) talk(near);
  if (current && current !== near) closeDialog();
}

// ---------- Lobi (panggung 3D, skin, room) ----------
let net = null, myId = 1, hostId = 1, roster = [];
const stage = [null, null, null, null];
const status = s => $('status').textContent = s || '';
function refreshStage() { // gambar karakter tiap slot sesuai daftar pemain
  const list = net ? roster : [{ id: myId, name: $('name').value.trim() || 'Kamu', skin: mySkin }];
  for (let i = 0; i < 4; i++) {
    const p = list[i], key = p ? `${p.id}|${p.skin}|${p.name}` : '', s = stage[i];
    if (s && s.key === key) continue;
    if (s) { lobby.group.remove(s.g); stage[i] = null; }
    lobby.pads[i].tag.visible = !p;
    if (p) {
      const g = makeAvatar(p.skin), t = tag(p.name + (p.id === myId ? ' (kamu)' : '')); t.position.y = 2.6; g.add(t);
      g.position.set(slotX(i), .38, STAGE_Z); lobby.group.add(g); stage[i] = { g, key, me: p.id === myId };
    }
  }
}
function setSkin(d) {
  mySkin = (mySkin + d + SKINS.length) % SKINS.length; localStorage.setItem('dx_skin', mySkin); $('skinName').textContent = SKINS[mySkin].n;
  if (net) net.send({ t: 'skin', s: mySkin }); else refreshStage();
}
$('skinPrev').onclick = () => setSkin(-1); $('skinNext').onclick = () => setSkin(1);
$('name').value = localStorage.getItem('dx_name') || ''; $('server').value = localStorage.getItem('dx_srv') || 'ws://192.168.1.2:8080';
$('name').oninput = () => { if (!net) refreshStage(); };
setSkin(0);

$('bSolo').onclick = () => { sfx.init(); localStorage.setItem('dx_name', $('name').value); roster = [{ id: 1, name: $('name').value.trim() || 'Kamu', skin: mySkin }]; myId = 1; net = null; startGame(); };
async function joinRoom(code) {
  sfx.init(); const name = $('name').value.trim() || 'Pemain';
  localStorage.setItem('dx_name', name); localStorage.setItem('dx_srv', $('server').value);
  if (!code) return status('Isi kode room dulu');
  status('Menghubungkan…'); net = new Net(onNet);
  try { await net.connect($('server').value.trim(), name, code.toUpperCase(), mySkin); status(''); } catch (e) { status(e.message); net = null; }
}
$('bCreate').onclick = () => { const c = Math.random().toString(36).slice(2, 6).toUpperCase(); $('room').value = c; joinRoom(c); };
$('bJoin').onclick = () => joinRoom($('room').value.trim());
$('bStart').onclick = () => net && net.send({ t: 'start' });
function leaveRoom() {
  if (net && net.ws) { net.h = () => { }; net.ws.close(); } net = null; myId = 1; roster = [];
  $('roomPanel').classList.add('hide'); $('menu').classList.remove('hide'); refreshStage();
}
$('bLeave').onclick = leaveRoom;

function onNet(m) {
  if (m.t === 'you') myId = m.id;
  else if (m.t === 'room') {
    roster = m.players; hostId = m.host; $('menu').classList.add('hide'); $('roomPanel').classList.remove('hide'); $('rc').textContent = m.code;
    $('plist').innerHTML = roster.map(p => `<li>${p.id === hostId ? '👑 ' : '👤 '}${p.name.replace(/[<>&]/g, '')}${p.id === myId ? ' (kamu)' : ''}</li>`).join('');
    $('bStart').classList.toggle('hide', myId !== hostId); $('wait').classList.toggle('hide', myId === hostId);
    if (state === 'lobby') refreshStage();
  }
  else if (m.t === 'start') startGame();
  else if (m.t === 'st') { const r = remote(m.id, names(m.id), (roster.find(p => p.id === m.id) || {}).skin); Object.assign(r, { x: m.x, y: m.y, z: m.z, r: m.r, a: m.a, w: m.w || 0, hp: m.h ?? 100 }); }
  else if (m.t === 'fx') {
    const r = remotes.get(m.from); if (!r) return; r.atk = 1;
    if (m.k === 'g') { tracer(new THREE.Vector3(r.g.position.x, r.g.position.y + 1.4, r.g.position.z), new THREE.Vector3(m.ex, m.ey, m.ez)); sfx.shot(); } else sfx.punch();
  }
  else if (m.t === 'hit' && state === 'play' && W.dead <= 0) {
    W.hp = Math.max(0, W.hp - m.dmg); W.last = m.from; updHp(); dmgFlash(); sfx.hurt(); if (W.hp <= 0) die();
  }
  else if (m.t === 'kill') toast(`${names(m.by)} 🔫 ${names(m.victim)}`);
  else if (m.t === 'left') { const r = remotes.get(m.id); if (r) { scene.remove(r.g); remotes.delete(m.id); toast('Pemain keluar'); } }
  else if (m.t === 'err') { status(m.msg); net = null; }
  else if (m.t === 'closed') { if (state === 'lobby') { status('Koneksi terputus'); leaveRoom(); } else toast('Koneksi server terputus'); }
}
setInterval(() => {
  if (net && state === 'play') net.send({ t: 'st', x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), r: +me.rotation.y.toFixed(2), a: P.moving ? 1 : 0, w: W.w, h: W.hp });
}, 80);

// ---------- Loop utama ----------
const clk = new THREE.Clock(); refreshStage();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clk.getDelta(), .05), t = clk.elapsedTime;
  world.update(dt);
  const near = npcs.update(dt, t, state === 'lobby' ? { x: 0, z: 0 } : P);
  if (state === 'lobby') { // kamera panggung lobi + animasi diam karakter
    camera.position.set(2.8, 2.3, STAGE_Z + 8.8); camera.lookAt(2.8, 1.4, STAGE_Z);
    stage.forEach((s, i) => { if (s) { s.g.rotation.y = Math.sin(t * (s.me ? 1 : .7) + i) * (s.me ? .8 : .3); pose(s.g, { ph: t * 2, amt: .05 }); } });
  } else if (state === 'intro') updateIntro(dt); else updatePlay(dt);
  if (state !== 'lobby') { sfx.setEngine(clamp(1 - near / 35, 0, 1)); sfx.setRiver(clamp(1 - Math.abs(P.z - RIVER_Z) / 50, 0, 1)); tickClock(dt); }
  updateRemotes(dt); renderer.render(scene, camera);
}
loop();
