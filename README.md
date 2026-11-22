# Desa Perang 3D — © 2026 rez x Gunz (MIT)

Game eksplorasi desa 3D (Three.js + Vite) → APK lewat Capacitor + GitHub Actions.

## Struktur
```
index.html  package.json  vite.config.js  capacitor.config.json  LICENSE
.github/workflows/build-apk.yml
src/main.js (loop, jam, suara lingkungan) | world.js (desa, markas, perang)
src/player.js | controls.js (stik & tombol) | intro.js (cutscene truk) | audio.js
```

## Build APK via GitHub (tanpa error)
1. Buat repo baru di GitHub, lalu upload SEMUA isi folder ini (termasuk folder `.github`).
   Pastikan `.github/workflows/build-apk.yml` ada di root repo.
2. Branch harus `main` atau `master`. Push akan memicu build otomatis
   (atau tab **Actions → Build APK → Run workflow**).
3. Setelah hijau, unduh **desa-perang-apk** di bagian *Artifacts* → ekstrak → `app-debug.apk`.

Uji di PC: `npm install && npm run dev` (WASD, Shift lari, C jongkok, Spasi loncat).
Catatan: folder `android/` dibuat otomatis oleh workflow, jangan diunggah.
