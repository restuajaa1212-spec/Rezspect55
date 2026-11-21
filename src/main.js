// Titik masuk: renderer, state (lobby -> intro -> play), pemain, kamera PVP, combat, HUD, multiplayer.
import './style.css';
import * as THREE from 'three';
import { buildWorld, colliders, inWater, RIVER_Z } from './world.js';
import { buildLobby, STAGE_Z, slotX } from './lobby3d.js';
import { createNPCs } from './npc.js';
import { SKINS, makeAvatar, pose } from './skins.js';
import { tag } from './util.js';
import { buildViewmodel, animVM } from './viewmodel.js';
import { buildPlane, buildChute } from './setpieces.js';
import { WEAPONS } from './weapons.js';
import { buildPickups } from './pickups.js';
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

const sfx = new Sfx(), world = buildWorld(scene, sfx), lobby = buildLobby(scene), npcs = createNPCs(scene, sfx), pickups = buildPickups(scene), input = new Input(canvas);
// Kotak tabrakan untuk raycast peluru (bangunan & pohon menghalangi tembakan)
const boxes = colliders.map(c => new THREE.Box3(new THREE.Vector3(c.x - c.hx, 0, c.z - c.hz), new THREE.Vector3(c.x + c.hx, 6, c.z + c.hz)));

// ---------- State pemain ----------
let me = null, vm = null, mySkin = (+localStorage.getItem('dx_skin')) || 0;
const P = { x: -20, y: 0, z: 5.3, vy: 0, yaw: 0, pitch: .25, ph: 0, moving: false, cs: 1, wasWater: false };
// w = id senjata aktif (0 tinju). own/mag/res = kepemilikan, isi magasin, cadangan peluru per senjata
const W = { hp: 100, w: 0, cd: 0, atk: 0, dead: 0, last: 0, meds: 3, healCd: 0, hand: 0, reload: 0, held: false, q: false,
  own: [true, true, false, false, false, false], mag: [0, 12, 0, 0, 0, 0], res: [0, 36, 0, 0, 0, 0] };
let state = 'lobby', idx = 0;

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
function nextWeapon() { for (let k = 1; k <= WEAPONS.length; k++) { const i = (W.w + k) % WEAPONS.length; if (W.own[i]) return i; } return W.w; }
function updWpn() {
  const c = WEAPONS[W.w];
  $('wpn').textContent = (c.melee ? '👊 Tinju' : `${c.icon} ${c.n} ${W.reload > 0 ? 'Reload…' : W.mag[W.w] + '/' + W.res[W.w]}`) + ` · 🩹${W.meds}`;
  $('bWeap').textContent = WEAPONS[nextWeapon()].icon;
}
const updHp = () => $('hpb').style.width = W.hp + '%';
function healFlash() { const f = $('flash'); f.classList.add('heal', 'on'); setTimeout(() => f.classList.remove('heal', 'on'), 160); }
function heal() { // pakai medkit: +40 HP
  if (W.healCd > 0) return;
  if (W.meds <= 0) { toast('Medkit habis! Temui Medis Ani di Pos Medis'); return; }
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
const names = id => id === -1 ? 'Prajurit' : (roster.find(p => p.id === id) || {}).name || 'Pemain';
function remote(id, name, skin) {
  let r = remotes.get(id);
  if (!r) {
    const g = makeAvatar(skin || 0), t = tag(name || 'Pemain'); t.position.y = 2.5; g.add(t);
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x300000, depthTest: false })), bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x00e676, depthTest: false }));
    for (const s of [bg, bar]) { s.center.set(0, .5); s.position.set(-.6, 2.25, 0); s.scale.set(1.2, .12, 1); g.add(s); }
    g.visible = false; scene.add(g); r = { id, g, bar, seen: false, x: 0, y: 0, z: 0, r: 0, a: 0, w: 0, hp: 100, ph: 0, atk: 0 }; remotes.set(id, r);
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
function hurtNpc(e, dmg) { // prajurit bisa tumbang (bangkit 12 dtk lagi); jika ditembak mereka MARAH & menyerang balik
  e.hp -= dmg;
  if (current === e) closeDialog();
  if (e.peaceful) { e.stun = 1.5; e.busy = true; } else npcs.provoke(e);
  if (e.hp <= 0) { e.hostile = false; if (e.g.hg) e.g.hg.visible = false; e.dead = 12; e.fall = 0; e.busy = true; sfx.hurt(); toast('Prajurit tumbang!'); }
}
function applyHit(tgt, dmg) {
  sfx.hit(); hitMarker();
  if (tgt.id !== undefined) net && net.send({ t: 'hit', to: tgt.id, dmg });
  else hurtNpc(tgt, dmg);
}
function startReload() {
  const c = WEAPONS[W.w];
  if (W.reload > 0 || W.mag[W.w] >= c.mag || W.res[W.w] <= 0) return;
  W.reload = c.reload; sfx.click(); updWpn();
}
function shoot(c) {
  const id = W.w;
  if (W.mag[id] <= 0) { if (W.res[id] > 0) startReload(); else { sfx.click(); W.cd = .4; toast('Peluru habis! Cari amunisi'); } return; }
  W.mag[id]--; W.cd = c.cd; W.atk = 1; sfx.shot(); if (c.pellets > 1) sfx.explode(.2);
  camera.updateMatrixWorld(true);
  const o = camera.position.clone(), base = new THREE.Vector3(); camera.getWorldDirection(base);
  const tip = vm.tips[id].getWorldPosition(new THREE.Vector3()), hits = new Map(); let first = null;
  for (let k = 0; k < c.pellets; k++) { // shotgun = banyak peluru; spread = penyebaran
    const d = base.clone(); if (c.spread) { d.x += (Math.random() - .5) * c.spread * 2; d.y += (Math.random() - .5) * c.spread * 2; d.z += (Math.random() - .5) * c.spread * 2; d.normalize(); }
    const h = castRay(o, d, c.range), end = o.clone().addScaledVector(d, h.dist); tracer(tip, end); if (!first) first = end;
    if (h.tgt) hits.set(h.tgt, (hits.get(h.tgt) || 0) + (h.head ? c.dmg * 2 : c.dmg));
  }
  net && net.send({ t: 'fx', k: 'g', ex: +first.x.toFixed(1), ey: +first.y.toFixed(1), ez: +first.z.toFixed(1) });
  for (const [t, dmg] of hits) applyHit(t, dmg);
  for (const e of npcs.inter) { // tembakan nyaris kena juga membuat prajurit di dekat garis tembak marah
    if (e.dead || e.hostile) continue; const q = e.g.position;
    if (sphereT(o, base, new THREE.Vector3(q.x, q.y + 1.2, q.z), 1.8, c.range) !== null) npcs.provoke(e);
  }
  P.pitch = clamp(P.pitch + c.kick, -1.3, 1.3);
  if (W.mag[id] === 0) startReload(); updWpn();
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
  if (input.weap()) { W.w = nextWeapon(); W.reload = 0; W.q = false; sfx.click(); updWpn(); }
  const c = WEAPONS[W.w], fire = input.fire, fresh = fire && !W.held; W.held = fire;
  if (fresh) W.q = true; if (W.reload > 0) W.q = false;
  const want = (c.melee || c.auto) ? fire : W.q; // senjata semi-auto: satu tembakan per ketukan
  if (want && W.cd <= 0 && W.reload <= 0) { W.q = false; c.melee ? punch() : shoot(c); }
}
// Ambil item: senjata baru (otomatis dipegang), amunisi untuk semua senjata, atau medkit
function pickup(s) {
  if (s.t === 'w') {
    const c = WEAPONS[s.id];
    if (W.own[s.id]) W.res[s.id] += c.mag * 2; else { W.own[s.id] = true; W.mag[s.id] = c.mag; W.res[s.id] = c.mag * 2; W.w = s.id; W.reload = 0; }
    toast(`Mengambil ${c.n}`);
  } else if (s.t === 'ammo') { WEAPONS.forEach((c, i) => { if (W.own[i] && !c.melee) W.res[i] += c.mag; }); toast('Amunisi +1 magasin'); }
  else { W.meds = Math.min(5, W.meds + 1); toast('Medkit +1'); }
  sfx.pickup(); updWpn();
}
// Serangan NPC & ledakan bom terhadap pemain
function hurtMe(d) { if (state !== 'play' || W.dead > 0) return; W.hp = Math.max(0, W.hp - d); W.last = -1; updHp(); dmgFlash(); sfx.hurt(); if (W.hp <= 0) die(); }
const hooks = { tracer: (a, b) => tracer(a, b), hurt: hurtMe, calm: () => W.dead > 0 };
const warCb = {
  warn: s => toast(s),
  blast: (x, z, r, dmg) => { // bom: tidak melukai bila berlindung di dalam bunker
    if (state !== 'play' || W.dead > 0) return;
    if (world.inBunker(P.x, P.z)) { toast('Aman di dalam bunker 🛡️'); return; }
    const d = Math.hypot(P.x - x, P.z - z); if (d < r) hurtMe(dmg * (1 - d / r));
  }
};
function die() {
  W.dead = 3; W.hp = 0; updHp(); net && net.send({ t: 'kill', by: W.last, victim: myId }); toast('Kamu kalah! Respawn 3 detik…'); closeDialog();
}
function respawn() {
  W.hp = 100; W.reload = 0; W.dead = 0; W.w = 0; W.meds = 3; W.own = [true, true, false, false, false, false]; W.mag = [0, 12, 0, 0, 0, 0]; W.res = [0, 36, 0, 0, 0, 0]; // kehilangan senjata saat mati
  updHp(); updWpn();
  P.x = -20 + idx * 1.4 + Math.random() * 3; P.z = 5.4; P.y = 0; me.rotation.x = 0;
}

// ---------- Alur game ----------
const Y0 = 100; // ketinggian pesawat
let intro = null, plane = null, chute = null;
function startGame() {
  sfx.init(); state = 'intro';
  idx = Math.max(0, roster.findIndex(p => p.id === myId));
  lobby.group.visible = false; $('lobby').classList.add('hide'); $('skip').classList.remove('hide'); $('clock').classList.remove('hide');
  if (me) scene.remove(me); me = makeAvatar(mySkin); me.visible = false; scene.add(me);
  if (vm) camera.remove(vm.g); vm = buildViewmodel(mySkin); camera.add(vm.g);
  roster.forEach(p => { if (p.id !== myId) remote(p.id, p.name, p.skin); });
  const Lx = -20 + idx * 1.4, Lz = 5.4; // titik mendarat dekat halte
  intro = { t: 0, Lx, Lz, Jx: Lx - 45, Jz: Lz - 8, y: Y0, vy: 0, open: 0, jumped: false, opened: false, land: 0, wind: 0 };
  plane = buildPlane(); scene.add(plane); chute = buildChute(); chute.visible = false; me.add(chute);
  updWpn(); updHp();
}
function finishIntro() {
  if (!intro) return;
  me.remove(chute); scene.remove(plane);
  for (const k of ['armL', 'armR', 'legL', 'legR']) me[k].rotation.set(0, 0, 0);
  P.x = intro.Lx; P.z = intro.Lz; P.y = 0; P.yaw = 0; P.pitch = 0; me.rotation.set(0, Math.PI, 0); me.position.set(P.x, 0, P.z); me.visible = false;
  intro = null; state = 'play'; $('skip').classList.add('hide'); $('hud').classList.remove('hide');
}
$('skip').onclick = finishIntro;

// Cutscene: pesawat lewat -> pemain terjun -> freefall -> parasut mengembang -> mendarat
function updateIntro(dt) {
  const I = intro; I.t += dt;
  const px = I.Jx - 100 + 40 * I.t; plane.position.set(px, Y0, I.Jz);
  if (!I.jumped) {
    camera.position.set(I.Jx - 25, Y0 - 8, I.Jz + 30); camera.lookAt(px, Y0, I.Jz);
    if (I.t >= 2.5) { I.jumped = true; me.visible = true; me.rotation.set(1.35, Math.PI / 2, 0); sfx.door(); }
    return;
  }
  if (!I.opened) I.vy = Math.min(I.vy + 32 * dt, 30); else I.vy += (7 - I.vy) * Math.min(1, dt * 2.5);
  I.y = Math.max(0, I.y - I.vy * dt);
  const f = I.y / Y0, x = I.Lx + (I.Jx - I.Lx) * f, z = I.Lz + (I.Jz - I.Lz) * f; // melayang menuju titik mendarat
  me.position.set(x, I.y, z);
  if (!I.opened) { // freefall: tangan & kaki terentang
    me.armL.rotation.set(0, 0, -1.3); me.armR.rotation.set(0, 0, 1.3); me.legL.rotation.set(0, 0, -.3); me.legR.rotation.set(0, 0, .3);
    if ((I.wind -= dt) <= 0) { I.wind = .4; sfx.wind(); }
    if (I.y <= 60) { I.opened = true; chute.visible = true; chute.scale.setScalar(.2); sfx.chute(); }
  } else { // parasut terbuka: badan tegak, tangan memegang tali
    I.open = Math.min(1, I.open + dt * 1.8); chute.scale.setScalar(I.land > 0 ? Math.max(.01, 1 - I.land * 2.5) : .2 + .8 * I.open);
    me.rotation.x += (0 - me.rotation.x) * Math.min(1, dt * 4);
    me.armL.rotation.set(-2.8, 0, 0); me.armR.rotation.set(-2.8, 0, 0); me.legL.rotation.set(Math.sin(I.t * 2) * .15, 0, 0); me.legR.rotation.set(-Math.sin(I.t * 2) * .15, 0, 0);
  }
  camera.position.set(x + 9, Math.max(1.6, I.y + 2), z + 13); camera.lookAt(x, I.y + 1.5, z);
  if (I.y <= 0) { I.land += dt; if (I.land > .7) finishIntro(); }
}

function updatePlay(dt) {
  // Kamera: geser layar = membidik (yaw & pitch)
  const sens = camera.fov / 62; P.yaw -= input.drag.x * .005 * sens; P.pitch = clamp(P.pitch - input.drag.y * .004 * sens, -1.3, 1.3); input.drag.x = input.drag.y = 0;
  const alive = W.dead <= 0;
  const tf = WEAPONS[W.w].zoom && alive ? 28 : 62; if (Math.abs(camera.fov - tf) > .1) { camera.fov += (tf - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); } // zoom sniper
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
  if (W.reload > 0) { W.reload -= dt; if (W.reload <= 0) { const c = WEAPONS[W.w], take = Math.min(c.mag - W.mag[W.w], W.res[W.w]); W.mag[W.w] += take; W.res[W.w] -= take; updWpn(); } }
  if (alive) combat(dt); const hl = input.heal(); if (alive && hl) heal();
  for (const l of tr) if (l.visible && (l.ttl -= dt) <= 0) l.visible = false;
  for (const e of npcs.inter) { // status warga: mati (tumbang lalu bangkit) / kaget
    if (e.dead > 0) {
      e.fall = Math.min(1, e.fall + dt * 3); e.g.rotation.x = -1.5 * e.fall; e.g.position.y = e.y0 + .12 * e.fall;
      if ((e.dead -= dt) <= 0) { e.dead = 0; e.hp = 60; e.busy = false; e.fall = 0; e.g.rotation.x = 0; e.g.position.y = e.y0; }
    } else if (e.stun > 0 && (e.stun -= dt) <= 0 && e !== current) e.busy = !!e.hostile;
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
  for (const e of npcs.inter) { if (e.dead || e.hostile) continue; const dd = Math.hypot(e.g.position.x - P.x, e.g.position.z - P.z); if (dd < nd) { nd = dd; near = e; } }
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
  else if (m.t === 'st') { const r = remote(m.id, names(m.id), (roster.find(p => p.id === m.id) || {}).skin); if (!r.seen) { r.seen = true; r.g.visible = true; r.g.position.set(m.x, m.y, m.z); }
    Object.assign(r, { x: m.x, y: m.y, z: m.z, r: m.r, a: m.a, w: m.w || 0, hp: m.h ?? 100 }); }
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
  world.update(dt, t, state === 'lobby' ? null : P, warCb);
  pickups.update(dt, t, state === 'play' && W.dead <= 0 ? P : null, pickup);
  const near = npcs.update(dt, t, state === 'lobby' ? { x: 0, z: 0 } : P, hooks);
  if (state === 'lobby') { // kamera panggung lobi + animasi diam karakter
    camera.position.set(2.8, 2.3, STAGE_Z + 8.8); camera.lookAt(2.8, 1.4, STAGE_Z);
    stage.forEach((s, i) => { if (s) { s.g.rotation.y = Math.sin(t * (s.me ? 1 : .7) + i) * (s.me ? .8 : .3); pose(s.g, { ph: t * 2, amt: .05 }); } });
  } else if (state === 'intro') updateIntro(dt); else updatePlay(dt);
  if (state !== 'lobby') { sfx.setEngine(clamp(1 - near / 35, 0, 1)); sfx.setRiver(clamp(1 - Math.abs(P.z - RIVER_Z) / 50, 0, 1)); tickClock(dt); }
  if (world.shake > 0 && state !== 'lobby') { camera.position.x += (Math.random() - .5) * world.shake * .5; camera.position.y += (Math.random() - .5) * world.shake * .5; } // guncangan ledakan
  updateRemotes(dt); renderer.render(scene, camera);
}
loop();
