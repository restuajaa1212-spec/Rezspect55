// Audio prosedural (Web Audio API) - tanpa file aset eksternal.
export class Sfx {
  constructor() { this.c = null; }
  init() { // harus dipanggil dari gesture pengguna
    if (this.c) { this.c.resume(); return; }
    const C = this.c = new (window.AudioContext || window.webkitAudioContext)();
    const b = this.nb = C.createBuffer(1, C.sampleRate * 2, C.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Suara sungai (noise terfilter)
    const s = C.createBufferSource(); s.buffer = b; s.loop = true;
    const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    this.rg = C.createGain(); this.rg.gain.value = 0; s.connect(f).connect(this.rg).connect(C.destination); s.start();
    // Suara mesin kendaraan
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
    const f2 = C.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 220;
    this.eg = C.createGain(); this.eg.gain.value = 0; o.connect(f2).connect(this.eg).connect(C.destination); o.start();
    // Burung berkicau acak
    setInterval(() => Math.random() < .6 && this.bird(), 2200);
  }
  tone(f, d = .15, type = 'sine', v = .1, sl = 0) {
    if (!this.c) return; const C = this.c, t = C.currentTime, o = C.createOscillator(), g = C.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (sl) o.frequency.linearRampToValueAtTime(Math.max(20, f + sl), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(C.destination); o.start(); o.stop(t + d);
  }
  noise(d = .08, v = .1, fq = 1000) {
    if (!this.c) return; const C = this.c, s = C.createBufferSource(), g = C.createGain(), f = C.createBiquadFilter();
    s.buffer = this.nb; f.type = 'bandpass'; f.frequency.value = fq;
    g.gain.setValueAtTime(v, C.currentTime); g.gain.exponentialRampToValueAtTime(.001, C.currentTime + d);
    s.connect(f).connect(g).connect(C.destination); s.start(0, Math.random()); s.stop(C.currentTime + d);
  }
  setRiver(v) { if (this.rg) this.rg.gain.value = v * .25; }
  setEngine(v) { if (this.eg) this.eg.gain.value = v * .1; }
  bird() { const f = 2000 + Math.random() * 1500; this.tone(f, .08, 'sine', .03, 600); setTimeout(() => this.tone(f + 400, .08, 'sine', .03, 500), 110); }
  step(run) { this.noise(.07, run ? .07 : .04, 500 + Math.random() * 300); }
  jump() { this.tone(280, .2, 'square', .04, 300); }
  splash() { this.noise(.25, .1, 1800); }
  horn() { this.tone(220, .5, 'sawtooth', .06); this.tone(277, .5, 'sawtooth', .05); }
  brake() { this.noise(.9, .08, 2500); }
  door() { this.tone(180, .25, 'square', .05, -80); }
  kick() { this.tone(130, .12, 'sine', .2, -80); this.noise(.05, .1, 400); }
  talk() { for (let i = 0; i < 3; i++) setTimeout(() => this.tone(380 + Math.random() * 200, .07, 'triangle', .06), i * 80); }
  bell() { this.tone(1500, .4, 'sine', .06); setTimeout(() => this.tone(1800, .4, 'sine', .05), 150); }
  shot() { this.noise(.12, .25, 1500); this.tone(110, .15, 'square', .1, -60); }
  punch() { this.noise(.1, .12, 300); this.tone(90, .1, 'sine', .15, -30); }
  hit() { this.tone(900, .05, 'square', .05); }
  hurt() { this.tone(200, .2, 'sawtooth', .08, -100); }
  click() { this.tone(1200, .03, 'square', .04); }
  heal() { this.tone(520, .12, 'sine', .08); setTimeout(() => this.tone(780, .2, 'sine', .08), 110); }
  explode(v = 1) { this.noise(1.2, .35 * v, 200); this.tone(60, .8, 'sine', .3 * v, -30); }
  whistle(v = 1) { this.tone(1600, 3, 'sine', .04 * v, -1200); }
  wind() { this.noise(.4, .08, 700); }
  chute() { this.noise(.5, .25, 900); this.tone(150, .3, 'sine', .1, -60); }
  pickup() { this.tone(660, .08, 'square', .05); setTimeout(() => this.tone(990, .12, 'square', .05), 80); }
}
