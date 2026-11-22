// Input: stik virtual (kiri), tombol (kanan), geser layar untuk melihat, + keyboard untuk uji di PC.
export const input = { mx: 0, mz: 0, run: false, crouch: false, jump: false, dx: 0, dy: 0 };
export const keys = {};

export function initControls() {
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  const R = 50; let sid = null, cx = 0, cy = 0;
  const move = (e) => {
    if (e.pointerId !== sid) return;
    let x = e.clientX - cx, y = e.clientY - cy; const d = Math.hypot(x, y);
    if (d > R) { x = x / d * R; y = y / d * R; }
    knob.style.transform = `translate(${x}px,${y}px)`;
    input.mx = x / R; input.mz = y / R;           // mz negatif = maju
  };
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; input.mx = input.mz = 0; };
  stick.addEventListener('pointerdown', (e) => {
    sid = e.pointerId; stick.setPointerCapture(sid);
    const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e);
  });
  stick.addEventListener('pointermove', move);
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);

  // Geser di layar (kanvas) = kamera
  const cv = document.getElementById('game'); let lid = null, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', (e) => { if (lid === null) { lid = e.pointerId; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(lid); } });
  cv.addEventListener('pointermove', (e) => { if (e.pointerId === lid) { input.dx += e.clientX - lx; input.dy += e.clientY - ly; lx = e.clientX; ly = e.clientY; } });
  const le = (e) => { if (e.pointerId === lid) lid = null; };
  cv.addEventListener('pointerup', le); cv.addEventListener('pointercancel', le);

  // Tombol tahan: Lari & Loncat. Jongkok = toggle.
  const hold = (id, k) => {
    const b = document.getElementById(id), up = () => { input[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', () => { input[k] = true; b.classList.add('on'); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, up));
  };
  hold('bRun', 'run'); hold('bJump', 'jump');
  const bc = document.getElementById('bCrouch');
  bc.addEventListener('pointerdown', () => { input.crouch = !input.crouch; bc.classList.toggle('on', input.crouch); });

  addEventListener('keydown', (e) => (keys[e.code] = true));
  addEventListener('keyup', (e) => (keys[e.code] = false));
}
