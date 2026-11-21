# 🏡 Desa Explorer 3D — © rez x Gunz (MIT)

Game eksplorasi desa 3D (Three.js + Vite) yang dibungkus Capacitor menjadi APK lewat GitHub Actions.

## Struktur
```
desa-explorer-3d/
├─ .github/workflows/build-apk.yml   # CI: build web -> APK debug
├─ index.html / package.json / vite.config.js / capacitor.config.json
├─ src/  main.js world.js npc.js controls.js audio.js net.js util.js style.css
└─ server/server.js                  # server lobby/room multiplayer (opsional)
```

## Build APK (GitHub Actions)
1. Buat repo GitHub baru, upload **isi** folder ini (pastikan folder `.github` ikut) ke branch `main`.
2. Buka tab **Actions** → workflow *Build APK* jalan otomatis (atau *Run workflow*).
3. Selesai → unduh artifact **DesaExplorer-APK** (`app-debug.apk`), install di HP.

Lewat Termux (git): `pkg install git` → `git init && git add -A && git commit -m init && git remote add origin <url> && git push -u origin main`.

## Jalankan lokal
`npm install && npm run dev`  (keyboard: WASD, Spasi, C, Shift, E)

## Multiplayer (4 pemain)
Jalankan server: `npm install && npm run server` (port 8080) di Termux/PC/hosting (Render, dll).
Di lobby isi URL server (`ws://IP:8080`, atau `wss://…` jika hosting HTTPS), **Buat Room** → bagikan kode → teman **Gabung Room** → host tekan **Mulai**.
Catatan: posisi pemain disinkronkan; NPC berjalan lokal di tiap perangkat.

## Kontrol
Stik kiri = jalan · geser layar = kamera · ⤒ Loncat · ▾ Jongkok (toggle) · » Lari (tahan) · 💬 bicara dengan NPC terdekat.
