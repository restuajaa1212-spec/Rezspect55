// Input: stik analog virtual, tombol sentuh, geser layar untuk kamera, + keyboard/mouse (debug PC).
export class Input {
  constructor(canvas) {
    this.joy = { x: 0, y: 0 }; this.drag = { x: 0, y: 0 };
    this.crouch = false; this.run = false; this._j = false; this._a = false; this.keys = {}; this.sid = null; this.fire = false; this._w = false; this._h = false;
    const stick = document.getElementById('stick'), knob = document.getElementById('knob'), R = 50;
    const setJ = t => {
      const r = stick.getBoundingClientRect();
      let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
      const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`; this.joy.x = dx / R; this.joy.y = -dy / R;
    };
    const resetJ = () => { this.sid = null; knob.style.transform = ''; this.joy.x = this.joy.y = 0; };
    stick.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; this.sid = t.identifier; setJ(t); }, { passive: false });
    stick.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === this.sid) setJ(t); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === this.sid) resetJ(); };
    stick.addEventListener('touchend', end); stick.addEventListener('touchcancel', end);

    const bind = (id, down, up) => {
      const b = document.getElementById(id);
      const d = e => { e.preventDefault(); b.classList.add('p'); down(); };
      const u = e => { e.preventDefault(); b.classList.remove('p'); if (up) up(); };
      b.addEventListener('touchstart', d, { passive: false }); b.addEventListener('touchend', u); b.addEventListener('touchcancel', u);
      b.addEventListener('mousedown', d); b.addEventListener('mouseup', u);
    };
    bind('bJump', () => this._j = true);
    bind('bCrouch', () => { this.crouch = !this.crouch; document.getElementById('bCrouch').classList.toggle('on', this.crouch); });
    bind('bRun', () => this.run = true, () => this.run = false);
    bind('bAct', () => this._a = true);
    bind('bAtk', () => this.fire = true, () => this.fire = false);
    bind('bWeap', () => this._w = true);
    bind('bHeal', () => this._h = true);

    // Geser layar = putar kamera
    let did = null, lx = 0, ly = 0;
    canvas.addEventListener('touchstart', e => { if (did !== null) return; const t = e.changedTouches[0]; did = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: true });
    canvas.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === did) { this.drag.x += t.clientX - lx; this.drag.y += t.clientY - ly; lx = t.clientX; ly = t.clientY; } }, { passive: true });
    const de = e => { for (const t of e.changedTouches) if (t.identifier === did) did = null; };
    canvas.addEventListener('touchend', de); canvas.addEventListener('touchcancel', de);
    let md = false;
    canvas.addEventListener('mousedown', () => md = true); addEventListener('mouseup', () => md = false);
    addEventListener('mousemove', e => { if (md) { this.drag.x += e.movementX; this.drag.y += e.movementY; } });
    // Keyboard
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase(); this.keys[k] = true;
      if (k === ' ') this._j = true; if (k === 'e') this._a = true; if (k === 'f') this.fire = true; if (k === 'q') this._w = true; if (k === 'h') this._h = true;
      if (k === 'c') { this.crouch = !this.crouch; document.getElementById('bCrouch').classList.toggle('on', this.crouch); }
    });
    addEventListener('keyup', e => { const k = e.key.toLowerCase(); this.keys[k] = false; if (k === 'f') this.fire = false; });
  }
  move() {
    const k = this.keys, x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), y = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0);
    return (x || y) ? { x, y } : this.joy;
  }
  get running() { return this.run || !!this.keys.shift; }
  jump() { const j = this._j; this._j = false; return j; }
  heal() { const h = this._h; this._h = false; return h; }
  weap() { const w = this._w; this._w = false; return w; }
  act() { const a = this._a; this._a = false; return a; }
}
