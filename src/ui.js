// Desa 3D - (c) 2026 rez x Gunz - MIT License
// HUD & kontrol: jam, HP, amunisi, stik analog, tombol aksi, geser untuk melihat, keyboard cadangan.
export class UI {
  constructor(canvas) {
    this.$ = (id) => document.getElementById(id);
    this.joy = { x: 0, y: 0 }; this.look = { x: 0, y: 0 };
    this.run = false; this.crouch = false; this.fire = false; this._jump = false; this._reload = false; this.keys = {};
    this._joystick(); this._buttons(); this._look(canvas); this._keyboard();
  }
  showHUD(on) {
    const d = { clock: 'block', joy: 'block', btns: 'flex', hpbar: 'block', ammo: 'block', cross: 'block', 'btn-fire': 'block', 'btn-music': 'block' };
    for (const id in d) this.$(id).style.display = on ? d[id] : 'none';
  }

  _joystick() {
    const base = this.$('joy'), knob = this.$('knob'); let id = null;
    const set = (e) => {
      const r = base.getBoundingClientRect(), R = r.width / 2;
      let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`; this.joy.x = dx / R; this.joy.y = -dy / R;
    };
    base.addEventListener('pointerdown', (e) => { id = e.pointerId; base.setPointerCapture(id); set(e); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; this.joy.x = this.joy.y = 0; };
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  }

  _buttons() {
    this.$('btn-jump').addEventListener('pointerdown', () => (this._jump = true));
    this.$('btn-reload').addEventListener('pointerdown', () => (this._reload = true));
    const toggle = (id, key) => this.$(id).addEventListener('pointerdown', () => {
      this[key] = !this[key]; this.$(id).classList.toggle('on', this[key]);
      if (key === 'crouch' && this.crouch) { this.run = false; this.$('btn-run').classList.remove('on'); }
    });
    toggle('btn-crouch', 'crouch'); toggle('btn-run', 'run');
    const f = this.$('btn-fire');                           // tahan untuk menembak terus
    f.addEventListener('pointerdown', (e) => { f.setPointerCapture(e.pointerId); this.fire = true; });
    const up = () => (this.fire = false); f.addEventListener('pointerup', up); f.addEventListener('pointercancel', up);
  }

  _look(canvas) {
    let id = null, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', (e) => { id = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(id); });
    canvas.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; this.look.x += e.clientX - lx; this.look.y += e.clientY - ly; lx = e.clientX; ly = e.clientY; });
    const end = (e) => { if (e.pointerId === id) id = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  _keyboard() {
    addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT') return; this.keys[e.code] = true; if (e.code === 'Space') this._jump = true; if (e.code === 'KeyR') this._reload = true; });
    addEventListener('keyup', (e) => (this.keys[e.code] = false));
  }

  axes() {
    const k = this.keys;
    const kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), ky = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    return { x: this.joy.x || kx, y: this.joy.y || ky };
  }
  isRunning() { return this.run || this.keys.ShiftLeft; }
  isCrouching() { return this.crouch || this.keys.KeyC; }
  isFiring() { return this.fire || this.keys.KeyF; }
  consumeJump() { const j = this._jump; this._jump = false; return j; }
  consumeReload() { const r = this._reload; this._reload = false; return r; }

  setClock(min) { const m = Math.floor(min) % 1440; this.$('clock').textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
  setHP(v) { this.$('hp').style.width = Math.max(0, v) + '%'; }
  setAmmo(t) { this.$('ammo').textContent = t; }
  toast(t, ms = 2500) { const m = this.$('msg'); m.textContent = t; m.style.display = 'block'; clearTimeout(this._tt); this._tt = setTimeout(() => (m.style.display = 'none'), ms); }
  flash() { const h = this.$('hurt'); h.style.opacity = 1; setTimeout(() => (h.style.opacity = 0), 150); }
}
