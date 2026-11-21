// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Audio prosedural (WebAudio): tanpa file suara, jadi APK tetap kecil & bebas error aset.
export class GameAudio {
  constructor() { this.ctx = null; }

  /** Harus dipanggil dari tap pengguna (kebijakan autoplay browser/WebView). */
  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    this.ctx = new C();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    // buffer derau putih dipakai ulang
    const n = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.wind = this._loop('lowpass', 450, 0.07);
    this.river = this._loop('bandpass', 900, 0);
    this._birdLoop();
  }

  _loop(type, freq, vol) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(this.master); s.start();
    return g;
  }

  burst(dur, type, freq, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur);
  }

  tone(f0, f1, dur, vol, type = 'sine') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur);
  }

  _birdLoop() {
    const chirp = () => {
      const b = 2500 + Math.random() * 1500;
      for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++)
        setTimeout(() => this.tone(b, b * 1.4, 0.09, 0.05), i * 130);
      setTimeout(chirp, 2000 + Math.random() * 5000);
    };
    chirp();
  }

  /** surface: 'grass' | 'road' | 'mud' | 'wood' */
  step(surface) {
    if (surface === 'mud') { this.burst(0.18, 'lowpass', 420, 0.35); this.tone(110, 60, 0.12, 0.12); }
    else if (surface === 'road') this.burst(0.06, 'bandpass', 2400, 0.2);
    else if (surface === 'wood') { this.burst(0.07, 'bandpass', 900, 0.25); this.tone(180, 120, 0.06, 0.1, 'triangle'); }
    else this.burst(0.09, 'lowpass', 1300, 0.16);
  }
  jump() { this.tone(260, 520, 0.18, 0.12, 'triangle'); }
  land(surface) { this.burst(0.12, 'lowpass', surface === 'mud' ? 350 : 800, 0.3); }
  setRiver(v) { if (this.ctx) this.river.gain.setTargetAtTime(v * 0.25, this.ctx.currentTime, 0.2); }

  // --- Mesin bus ---
  engineStart() {
    if (!this.ctx) return;
    this.eng = this.ctx.createOscillator(); this.eng.type = 'sawtooth'; this.eng.frequency.value = 55;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    this.engGain = this.ctx.createGain(); this.engGain.gain.value = 0;
    this.eng.connect(f).connect(this.engGain).connect(this.master); this.eng.start();
  }
  engineSet(vol, freq) {
    if (!this.eng) return;
    this.engGain.gain.setTargetAtTime(vol * 0.35, this.ctx.currentTime, 0.1);
    this.eng.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
  }
  engineStop() { if (this.eng) { this.eng.stop(this.ctx.currentTime + 0.3); this.eng = null; } }
  hiss() { this.burst(1.2, 'highpass', 3500, 0.3); }
  honk() { this.tone(330, 320, 0.5, 0.15, 'square'); }
}
