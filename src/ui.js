// Desa 3D - (c) 2026 rez x Gunz - MIT License
// HUD: jam digital, stik analog virtual, tombol Loncat/Jongkok/Lari, geser untuk melihat, + papan ketik cadangan.
export class UI {
  constructor(canvas) {
    this.$ = (id) => document.getElementById(id);
    this.joy = { x: 0, y: 0 }; this.look = { x: 0, y: 0 };
    this.run = false; this.crouch = false; this._jump = false; this.keys = {};
    this._joystick(); this._buttons(); this._look(canvas); this._keyboard();
  }
  showHUD(on) { for (const id of ['clock', 'joy', 'btns']) this.$(id).style.display = on ? (id === 'btns' ? 'flex' : 'block') : 'none'; }

  _joystick() {
    const base = this.$('joy'), knob = this.$('knob'); let id = null;
    const set = (e) => {
      const r = base.getBoundingClientRect(), R = r.width / 2;
      let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.joy.x = dx / R; this.joy.y = -dy / R;
    };
    base.addEventListener('pointerdown', (e) => { id = e.pointerId; base.setPointerCapture(id); set(e); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; this.joy.x = this.joy.y = 0; };
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  }

  _buttons() {
    this.$('btn-jump').addEventListener('pointerdown', () => (this._jump = true));
    const toggle = (id, key) => this.$(id).addEventListener('pointerdown', () => { this[key] = !this[key]; this.$(id).classList.toggle('on', this[key]); if (key === 'crouch' && this.crouch) { this.run = false; this.$('btn-run').classList.remove('on'); } });
    toggle('btn-crouch', 'crouch'); toggle('btn-run', 'run');
  }

  _look(canvas) {
    let id = null, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', (e) => { id = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(id); });
    canvas.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; this.look.x += e.clientX - lx; this.look.y += e.clientY - ly; lx = e.clientX; ly = e.clientY; });
    const end = (e) => { if (e.pointerId === id) id = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  _keyboard() {
    addEventListener('keydown', (e) => { this.keys[e.code] = true; if (e.code === 'Space') this._jump = true; });
    addEventListener('keyup', (e) => (this.keys[e.code] = false));
  }

  /** Gabungan stik + keyboard */
  axes() {
    const k = this.keys;
    const kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const ky = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    return { x: this.joy.x || kx, y: this.joy.y || ky };
  }
  isRunning() { return this.run || this.keys.ShiftLeft; }
  isCrouching() { return this.crouch || this.keys.KeyC; }
  consumeJump() { const j = this._jump; this._jump = false; return j; }

  setClock(minutes) {
    const m = Math.floor(minutes) % 1440, h = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(m % 60).padStart(2, '0');
    this.$('clock').textContent = `${h}:${mm}`;
  }
}
