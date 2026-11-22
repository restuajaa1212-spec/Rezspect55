import './style.css';
import * as THREE from 'three';
import { buildWorld, updateWorld, makeTruck, getHeight, WAR } from './world.js';
import { initControls } from './controls.js';
import { Player } from './player.js';
import { Intro } from './intro.js';
import * as audio from './audio.js';

const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene(); const SKY = 0x6b5a4a;      // langit berasap
scene.background = new THREE.Color(SKY); scene.fog = new THREE.Fog(SKY, 25, 140);
scene.add(new THREE.HemisphereLight(0xffd2a0, 0x3a3a2a, 1.0));
const sun = new THREE.DirectionalLight(0xffb070, 0.9); sun.position.set(-40, 30, -20); scene.add(sun);
const boomLight = new THREE.PointLight(0xff8a30, 0, 200); scene.add(boomLight);   // kilatan ledakan
const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 300);
const resize = () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();

buildWorld(scene); initControls();
const player = new Player(cam);
player.onStep = audio.step; player.onJump = audio.jump; player.onLand = audio.land;

// Jam digital (kiri atas)
const tick = () => ($('clock').textContent = new Date().toLocaleTimeString('id-ID', { hour12: false }).replace(/\./g, ':'));
tick(); setInterval(tick, 1000);

let mode = 'menu', intro = null, nextShot = 0, nextBoom = 4, burstLeft = 0, flash = 0;

function startGame() {
  mode = 'play'; $('skip').classList.add('hidden'); $('hud').classList.remove('hidden');
  player.place(0, -4, Math.PI);           // spawn di gerbang markas, menghadap ke dalam
  $('fade').style.opacity = 0;
}
function startIntro() {
  audio.initAudio(); audio.resume(); $('start').classList.add('hidden'); $('skip').classList.remove('hidden');
  mode = 'intro'; const truck = makeTruck();
  intro = new Intro(cam, truck, $('sub'), () => { $('fade').style.opacity = 1; setTimeout(() => { scene.remove(truck); startGame(); }, 900); });
  $('skip').onclick = () => { $('sub').textContent = ''; audio.setEngine(false); scene.remove(truck); intro.fin = true; startGame(); };
}
$('startBtn').onclick = startIntro;

// Suara perang lingkungan: volume menyesuaikan jarak ke medan perang
function ambient(t, dt) {
  const d = Math.hypot(cam.position.x - WAR.x, cam.position.z - WAR.z), v = THREE.MathUtils.clamp(1 - d / 130, 0.05, 1);
  if (t > nextShot) { if (burstLeft <= 0) burstLeft = 2 + Math.floor(Math.random() * 6); audio.shot(v); burstLeft--; nextShot = t + (burstLeft > 0 ? 0.09 : 0.6 + Math.random() * 2); }
  if (t > nextBoom) { audio.boom(v); flash = 1; boomLight.position.set(WAR.x + (Math.random() - 0.5) * 40, 12, WAR.z + (Math.random() - 0.5) * 40); nextBoom = t + 6 + Math.random() * 8; }
  flash = Math.max(0, flash - dt * 3); boomLight.intensity = flash * 3;
  audio.setWind(0.06 + Math.min(0.2, Math.max(0, cam.position.y) * 0.02));          // angin lebih kencang di bukit
  const fireD = 8; if (mode === 'play' && Math.random() < 0.3 * dt * 60 * 0.1) audio.crackle(Math.max(0, 1 - Math.hypot(cam.position.x - 20, cam.position.z + 40) / (fireD * 8)));
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (mode === 'intro') intro.update(dt); else if (mode === 'play') player.update(dt);
  else { cam.position.set(0, 14, -40); cam.lookAt(0, 3, 10); }               // latar menu
  if (mode !== 'menu') ambient(t, dt);
  updateWorld(t); renderer.render(scene, cam);
});
