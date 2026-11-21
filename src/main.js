// Desa 3D - (c) 2026 rez x Gunz - MIT License
// Titik masuk: renderer, loop game, alur: layar mulai -> intro bus -> eksplorasi.
import * as THREE from 'three';
import './style.css';
import { buildWorld, RIVER_X, inRiver } from './world.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { GameAudio } from './audio.js';
import { createIntro } from './intro.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);
const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();

const audio = new GameAudio();
const ui = new UI(canvas);
const world = buildWorld(scene);
const player = new Player(camera, world, audio);

let mode = 'menu', intro = null, gameMinutes = 7 * 60, elapsed = 0;
const fade = document.getElementById('fade'), skipBtn = document.getElementById('skip');

document.getElementById('startBtn').addEventListener('click', () => {
  audio.init();                                          // buka audio dari gestur pengguna
  lockLandscape();
  document.getElementById('start').remove();
  mode = 'intro'; skipBtn.hidden = false;
  intro = createIntro(scene, camera, audio, () => {      // dipanggil saat cutscene selesai
    fade.style.opacity = 1;
    setTimeout(() => { mode = 'play'; skipBtn.hidden = true; ui.showHUD(true); fade.style.opacity = 0; }, 900);
  });
});
skipBtn.addEventListener('click', () => intro?.skip());

/** Fullscreen + kunci landscape (WebView Android memakai manifest, ini cadangan untuk browser). */
async function lockLandscape() {
  try { await document.documentElement.requestFullscreen?.(); } catch (e) {}
  try { await screen.orientation?.lock?.('landscape'); } catch (e) {}
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
  world.update(dt, elapsed);
  if (intro && !intro.update(dt)) intro = null;          // bus tetap diperbarui sampai pergi
  if (mode === 'play') {
    player.update(dt, ui);
    gameMinutes += dt * 2;                               // 1 detik nyata = 2 menit game
    ui.setClock(gameMinutes);
    const d = Math.abs(player.pos.x - RIVER_X);          // volume sungai makin keras saat dekat
    audio.setRiver(Math.max(0, 1 - d / 40));
  }
  renderer.render(scene, camera);
});
