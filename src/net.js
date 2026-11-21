// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Multiplayer P2P (WebRTC via PeerJS). Host = penengah (star topology), maks 4 pemain.
// Kode room 4 karakter. Tidak perlu server sendiri (memakai server sinyal publik PeerJS).
import Peer from 'peerjs';

const PFX = 'desa3d-rezgunz-', AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rc = () => Array.from({ length: 4 }, () => AL[(Math.random() * AL.length) | 0]).join('');

export class Net {
  constructor() { this.h = {}; this.reset(); }
  on(t, f) { (this.h[t] ??= []).push(f); }
  _emit(t, d) { (this.h[t] || []).forEach((f) => f(d)); }
  reset() {
    try { this.peer?.destroy(); } catch (e) {}
    this.peer = null; this.conns = new Map(); this.up = null; this.isHost = false; this.id = 0;
    this.code = ''; this.players = new Map(); this.active = false; this.started = false;
  }
  roster() { return [...this.players.values()]; }

  /** Buat room → resolve kode room */
  host(profile) {
    return new Promise((res, rej) => {
      const attempt = (n) => {
        const code = rc(), p = new Peer(PFX + code); let opened = false;
        p.on('open', () => {
          opened = true; this.peer = p; this.isHost = true; this.id = 0; this.code = code; this.active = true;
          this.players.set(0, { id: 0, ...profile }); p.on('connection', (c) => this._onGuest(c)); res(code);
        });
        p.on('error', (e) => {
          if (opened) return this._emit('error', e.type);
          p.destroy(); if (e.type === 'unavailable-id' && n < 5) attempt(n + 1); else rej('Gagal membuat room (' + e.type + ')');
        });
      };
      attempt(0);
    });
  }

  _onGuest(c) {
    c.meta = { id: null };
    c.on('data', (m) => this._hostRecv(c, m));
    c.on('close', () => {
      const id = c.meta.id; if (id == null) return;
      this.conns.delete(id); this.players.delete(id); this._bcastRoster();
      this.send({ t: 'left', id }); this._emit('left', { id });
    });
  }
  _hostRecv(c, m) {
    if (m.t === 'hello') {
      if (c.meta.id != null) return;
      let id = 1; while (this.players.has(id)) id++;
      if (this.started || id > 3) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; }
      c.meta.id = id; this.conns.set(id, c); this.players.set(id, { id, name: m.name, skin: m.skin });
      c.send({ t: 'welcome', id }); this._bcastRoster(); return;
    }
    if (c.meta.id == null) return;
    if (m.t === 'prof') { this.players.set(c.meta.id, { id: c.meta.id, name: m.name, skin: m.skin }); this._bcastRoster(); return; }
    m.id = c.meta.id;                                        // relay ke pemain lain + proses di host
    for (const o of this.conns.values()) if (o !== c && o.open) o.send(m);
    this._emit(m.t, m);
  }
  _bcastRoster() {
    const players = this.roster();
    for (const c of this.conns.values()) if (c.open) c.send({ t: 'roster', players });
    this._emit('roster', { players });
  }

  /** Gabung room → resolve saat diterima host */
  join(code, profile) {
    return new Promise((res, rej) => {
      const p = new Peer(); this.peer = p; let done = false;
      const fail = (m) => { if (done) return; done = true; this.reset(); rej(m); };
      const to = setTimeout(() => fail('Waktu habis, room tidak merespons'), 12000);
      p.on('error', (e) => { if (!done) fail(e.type === 'peer-unavailable' ? 'Room tidak ditemukan' : 'Gagal terhubung (' + e.type + ')'); else this._emit('error', e.type); });
      p.on('open', () => {
        const c = p.connect(PFX + code, { reliable: true });
        c.on('open', () => { this.up = c; c.send({ t: 'hello', ...profile }); });
        c.on('data', (m) => {
          if (m.t === 'welcome') { this.id = m.id; this.active = true; this.code = code; if (!done) { done = true; clearTimeout(to); res(); } }
          else if (m.t === 'full') fail('Room penuh / game sudah dimulai');
          else if (m.t === 'roster') { this.players = new Map(m.players.map((q) => [q.id, q])); this._emit('roster', m); }
          else this._emit(m.t, m);
        });
        c.on('close', () => { if (this.active) this._emit('closed', {}); });
      });
    });
  }

  /** Kirim ke semua pemain lain (host: langsung; tamu: lewat host) */
  send(m) {
    try {
      if (this.isHost) { for (const c of this.conns.values()) if (c.open) c.send(m); }
      else if (this.up?.open) this.up.send(m);
    } catch (e) {}
  }
  startGame() { this.started = true; this.send({ t: 'start' }); }
  updateProfile(p) {
    if (this.isHost) { this.players.set(0, { id: 0, ...p }); this._bcastRoster(); }
    else this.send({ t: 'prof', ...p });
  }
}
