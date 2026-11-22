// Audio prosedural (WebAudio): tanpa file suara, jadi APK kecil & tanpa error aset.
let ctx, master, noise, windGain, engine, engGain;

export function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const n = ctx.sampleRate * 2; noise = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const w = ctx.createBufferSource(); w.buffer = noise; w.loop = true;           // angin
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  windGain = ctx.createGain(); windGain.gain.value = 0.1; w.connect(f).connect(windGain).connect(master); w.start();
  engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 40;   // mesin truk
  const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 220;
  engGain = ctx.createGain(); engGain.gain.value = 0; engine.connect(ef).connect(engGain).connect(master); engine.start();
}
export const resume = () => ctx && ctx.state !== 'running' && ctx.resume();

function burst(dur, type, freq, vol, delay = 0) {
  if (!ctx || vol < 0.01) return;
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(); s.buffer = noise;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t, Math.random(), dur + 0.05);
}
export const setWind = (v) => windGain && (windGain.gain.value = v);
export const setEngine = (on, speed = 0) => { if (!engine) return; engGain.gain.value = on ? 0.25 : 0; engine.frequency.value = 38 + speed * 4; };
// vol 0..1 sudah disesuaikan jarak oleh pemanggil (jauh = pelan & teredam)
export const shot = (vol) => burst(0.12, vol > 0.4 ? 'highpass' : 'lowpass', vol > 0.4 ? 1200 : 700, vol * 0.5);
export const boom = (vol) => burst(1.6, 'lowpass', 180, vol);
export const step = (run, crouch) => burst(0.09, 'lowpass', 600, crouch ? 0.08 : run ? 0.3 : 0.18);
export const jump = () => burst(0.12, 'lowpass', 300, 0.2);
export const land = () => burst(0.18, 'lowpass', 250, 0.35);
export const crackle = (vol) => burst(0.04, 'highpass', 2500, vol * 0.3);
