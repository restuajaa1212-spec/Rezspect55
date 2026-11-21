// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Lobi: panggung 3D dengan pratinjau karakter, ganti skin, nama, musik, dan room multiplayer (maks 4).
import * as THREE from 'three';
import { SKINS, createAvatar, setSkin, animate } from './avatar.js';

const $ = (id) => document.getElementById(id);
const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

export class Lobby {
  constructor(audio, net, onStart) {
    Object.assign(this, { audio, net, onStart, t: 0 });
    // --- Panggung 3D ---
    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color(0x7ec8f2); sc.fog = new THREE.Fog(0x9fd8f7, 14, 45);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x6f9a52, 1.1));
    const dl = new THREE.DirectionalLight(0xfff3d0, 1.2); dl.position.set(3, 6, 4); sc.add(dl);
    const L = (c) => new THREE.MeshLambertMaterial({ color: c });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(45, 32), L(0x6fae4a)); ground.rotation.x = -Math.PI / 2; sc.add(ground);
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.15, 24), L(0xcfc3a0)); stage.position.set(1.4, 0.07, 0); sc.add(stage);
    for (let i = 0; i < 14; i++) {                          // pohon & rumah latar
      const a = i * 0.9, r = 9 + (i % 4) * 3, x = Math.sin(a) * r, z = -Math.abs(Math.cos(a)) * r - 3;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 6), L(0x6b4423)); tr.position.set(x, 1, z);
      const lf = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.5, 7), L(0x2f7d32)); lf.position.set(x, 3.4, z); sc.add(tr, lf);
    }
    for (const x of [-9, 6]) { const h = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), L(0xf2e3c6)), r = new THREE.Mesh(new THREE.ConeGeometry(4, 2, 4), L(0xb5532d)); h.position.set(x, 1.5, -12); r.position.set(x, 4, -12); r.rotation.y = Math.PI / 4; sc.add(h, r); }
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80); this.camera.position.set(0, 1.5, 5.2); this.camera.lookAt(0, 1, 0);

    // --- Profil tersimpan ---
    this.name = store.get('d3name', 'Pemain' + ((Math.random() * 90 + 10) | 0));
    this.skin = +store.get('d3skin', 0) % SKINS.length;
    audio.musicOn = store.get('d3music', '1') === '1';
    this.av = createAvatar(this.skin, '', false); this.av.position.set(1.4, 0.15, 0); sc.add(this.av);
    this._bind();
  }

  get profile() { return { name: this.name, skin: this.skin }; }
  show() { $('lobby').hidden = false; this._skinLabel(); this._musicLabel(); }
  hide() { $('lobby').hidden = true; }
  update(dt) { this.t += dt; this.av.rotation.y += dt * 0.9; animate(this.av, 0, 0, false); }
  msg(t) { $('lobbyMsg').textContent = t; }

  _skinLabel() { $('skinName').textContent = SKINS[this.skin].name; }
  _musicLabel() { $('musicBtn').textContent = 'Musik: ' + (this.audio.musicOn ? 'ON' : 'OFF'); $('btn-music').textContent = this.audio.musicOn ? '♪' : '✕'; }
  _sync() { if (this.net.active) this.net.updateProfile(this.profile); }
  _menu() { $('menuMain').hidden = false; $('room').hidden = true; }
  _room() {
    $('menuMain').hidden = true; $('room').hidden = false; $('roomCode').textContent = this.net.code;
    $('startGame').hidden = !this.net.isHost; this._roster(this.net.roster()); this.msg('');
  }
  _roster(list) {
    $('players').innerHTML = list.map((p) => `<li>${p.id === 0 ? '👑 ' : ''}${p.name.replace(/[<>&]/g, '')} <small>(${SKINS[p.skin % SKINS.length].name})</small></li>`).join('');
    $('count').textContent = list.length;
  }

  _bind() {
    const nm = $('name'); nm.value = this.name;
    nm.addEventListener('input', () => { this.name = nm.value.trim().slice(0, 12) || 'Pemain'; store.set('d3name', this.name); this._sync(); });
    const skin = (d) => { this.skin = (this.skin + d + SKINS.length) % SKINS.length; setSkin(this.av, this.skin); store.set('d3skin', this.skin); this._skinLabel(); this._sync(); };
    $('skinPrev').onclick = () => skin(-1); $('skinNext').onclick = () => skin(1);
    const music = () => { this.audio.setMusic(!this.audio.musicOn); store.set('d3music', this.audio.musicOn ? '1' : '0'); this._musicLabel(); };
    $('musicBtn').onclick = music; $('btn-music').onclick = music;

    $('solo').onclick = () => this.onStart([{ id: 0, ...this.profile }]);
    $('create').onclick = () => { this.msg('Membuat room…'); this.net.host(this.profile).then(() => this._room()).catch((e) => this.msg(String(e))); };
    $('join').onclick = () => {
      const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) return this.msg('Masukkan 4 karakter kode room');
      this.msg('Menghubungkan…'); this.net.join(code, this.profile).then(() => this._room()).catch((e) => this.msg(String(e)));
    };
    $('startGame').onclick = () => { this.net.startGame(); this.onStart(this.net.roster()); };
    $('leave').onclick = () => { this.net.reset(); this._menu(); this.msg(''); };

    this.net.on('roster', (d) => this._roster(d.players));
    this.net.on('start', () => this.onStart(this.net.roster()));
    this.net.on('closed', () => { if (!$('lobby').hidden) { this._menu(); this.msg('Host terputus'); } });
    this.net.on('error', (e) => this.msg('Jaringan: ' + e));
  }
}
