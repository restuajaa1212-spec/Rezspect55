// Klien WebSocket untuk lobby & multiplayer (maks 4 pemain).
export class Net {
  constructor(handler) { this.h = handler; this.ws = null; this.id = null; }
  connect(url, name, room) {
    return new Promise((res, rej) => {
      try { this.ws = new WebSocket(url); } catch (e) { return rej(new Error('URL server tidak valid')); }
      this.ws.onopen = () => { this.send({ t: 'join', name, room }); res(); };
      this.ws.onerror = () => rej(new Error('Gagal terhubung ke server'));
      this.ws.onmessage = e => { const m = JSON.parse(e.data); if (m.t === 'you') this.id = m.id; this.h(m); };
      this.ws.onclose = () => this.h({ t: 'closed' });
    });
  }
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
}
