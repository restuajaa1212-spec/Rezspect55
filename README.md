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
