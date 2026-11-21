# Desa 3D — © 2026 rez x Gunz (MIT)

Game eksplorasi desa 3D (Three.js + Vite) → APK via Capacitor + GitHub Actions.

## Struktur
```
desa3d/
├─ .github/workflows/build-apk.yml   # otomatis build APK
├─ src/ main.js world.js player.js ui.js audio.js intro.js style.css
├─ index.html  package.json  vite.config.js  capacitor.config.json
├─ LICENSE  .gitignore  README.md
```
## Langkah build APK (tanpa error)
1. Buat repo baru di GitHub, lalu upload **isi** folder ini (`package.json` harus di root repo; folder `.github` ikut terunggah).
2. Pastikan branch bernama `main` (atau `master`).
3. Buka tab **Actions** → workflow **Build APK** (otomatis jalan saat push, atau klik *Run workflow*).
4. Setelah hijau, unduh artifact **Desa3D-debug-apk** → `app-debug.apk`, instal di HP.

## Uji di Termux / PC
```
npm install && npm run dev
```
Kontrol keyboard: WASD, Spasi (loncat), Shift (lari), C (jongkok).

## Catatan
- Jangan commit folder `android/` — dibuat otomatis oleh workflow.
- APK debug sudah dapat dipasang langsung (tanpa tanda tangan rilis).

## Fitur
- **Lobi** (pratinjau 3D): ganti nama & skin (6 pilihan), musik ON/OFF, Main Solo / Buat Room / Gabung Room.
- **Mabar hingga 4 orang** (WebRTC via PeerJS): host membuat room → dapat kode 4 karakter → teman memasukkan kode → host menekan MULAI.
  Perlu internet. Jika 2 pemain di jaringan seluler ketat (CGNAT) gagal terhubung, coba pakai Wi-Fi yang sama / hotspot.
- **Pistol**: tombol TEMBAK (tahan), ISI ULANG (12 peluru), HP 100, tertembak -20, respawn di halte setelah 3 detik.
- **NPC** berjalan di trotoar & lapangan; bisa ditembak (tumbang 4 detik).
- Keyboard (uji di PC): WASD, Spasi, Shift, C, F (tembak), R (isi ulang).
