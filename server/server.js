// Server multiplayer sederhana (WebSocket). Jalankan: npm run server
// Maks 4 pemain per room. Server hanya merelay posisi pemain.
import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
const rooms = new Map();
let nid = 1;
const send = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
const bc = (r, o, except) => r.players.forEach(p => p.ws !== except && send(p.ws, o));
const info = r => ({ t: 'room', code: r.code, host: r.host, players: r.players.map(p => ({ id: p.id, name: p.name, skin: p.skin })) });

wss.on('connection', ws => {
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'join') {
      let r = rooms.get(m.room);
      if (!r) { r = { code: m.room, players: [], host: null, started: false }; rooms.set(m.room, r); }
      if (r.players.length >= 4 || r.started) return send(ws, { t: 'err', msg: 'Room penuh / sudah dimulai' });
      const p = { id: nid++, name: String(m.name || 'Pemain').slice(0, 12), skin: m.skin | 0, ws };
      ws.p = p; ws.r = r; r.players.push(p);
      if (!r.host) r.host = p.id;
      send(ws, { t: 'you', id: p.id });
      const i = info(r); r.players.forEach(q => send(q.ws, i));
    } else if (!ws.r) return;
    else if (m.t === 'start' && ws.p.id === ws.r.host) { ws.r.started = true; bc(ws.r, { t: 'start' }); }
    else if (m.t === 'skin') { ws.p.skin = m.s | 0; const i = info(ws.r); ws.r.players.forEach(q => send(q.ws, i)); }
    else if (m.t === 'hit') { const q = ws.r.players.find(p => p.id === m.to); if (q) send(q.ws, { t: 'hit', from: ws.p.id, dmg: Math.min(60, +m.dmg || 0) }); }
    else if (m.t === 'fx' || m.t === 'kill') bc(ws.r, { ...m, from: ws.p.id }, ws);
    else if (m.t === 'st') bc(ws.r, { t: 'st', id: ws.p.id, x: m.x, y: m.y, z: m.z, r: m.r, a: m.a, w: m.w, h: m.h }, ws);
  });
  ws.on('close', () => {
    const r = ws.r; if (!r) return;
    r.players = r.players.filter(p => p !== ws.p);
    if (!r.players.length) return rooms.delete(r.code);
    if (r.host === ws.p.id) r.host = r.players[0].id;
    const i = info(r); r.players.forEach(q => send(q.ws, i));
    bc(r, { t: 'left', id: ws.p.id });
  });
});
console.log('Server multiplayer aktif di port', process.env.PORT || 8080);
