# 🏡 Desa Explorer 3D — © rez x Gunz (MIT)

Game eksplorasi desa 3D (Three.js + Vite) yang dibungkus Capacitor menjadi APK lewat GitHub Actions.

## Struktur
```
desa-explorer-3d/
├─ .github/workflows/build-apk.yml   # CI: build web -> APK debug
├─ index.html / package.json / vite.config.js / capacitor.config.json
├─ src/  main.js world.js lobby3d.js skins.js npc.js controls.js audio.js net.js util.js style.css
└─ server/server.js                  # server lobby/room multiplayer (opsional)
```

## Build APK (GitHub Actions)
1. Buat repo GitHub baru, upload **isi** folder ini (pastikan folder `.github` ikut) ke branch `main`.
2. Buka tab **Actions** → workflow *Build APK* jalan otomatis (atau *Run workflow*).
3. Selesai → unduh artifact **DesaExplorer-APK** (`app-debug.apk`), install di HP.

Lewat Termux (git): `pkg install git` → `git init && git add -A && git commit -m init && git remote add origin <url> && git push -u origin main`.

## Jalankan lokal
`npm install && npm run dev`  (keyboard: WASD, Spasi, C, Shift, E, F=serang, Q=ganti senjata, H=heal, mouse drag=bidik)

## Multiplayer (4 pemain)
Jalankan server: `npm install && npm run server` (port 8080) di Termux/PC/hosting (Render, dll).
Di lobby isi URL server (`ws://IP:8080`, atau `wss://…` jika hosting HTTPS), **Buat Room** → bagikan kode → teman **Gabung Room** → host tekan **Mulai**.
Catatan: posisi pemain disinkronkan; NPC berjalan lokal di tiap perangkat.

## Lobi, skin & PVP
- Lobi: panggung 3D 4 slot. Ganti skin dengan ◀ ▶ (7 skin). Teman yang masuk room muncul di panggung beserta skin-nya.
- Senjata: 👊 Tinju (jarak dekat, 12 dmg) dan 🔫 Pistol (12 peluru, 20 dmg, headshot 40, reload otomatis). Ganti senjata dengan tombol kecil di atas 💥.
- Kamera orang pertama (FPS): hanya tangan & pistol yang terlihat, dengan crosshair. Peluru terhalang bangunan/pohon.
- Heal: tombol 🩹 memakai medkit (+40 HP, mulai 3 medkit). Bicara dengan Suster Ani di Klinik = HP penuh + medkit terisi lagi.
- Warga (NPC bernama) punya 60 HP: bisa ditembak/dipukul sampai tumbang, lalu bangkit lagi setelah 12 detik.
- HP 100 per pemain, mati → respawn 3 detik di halte. 

## Kontrol
Stik kiri = jalan · geser layar = bidik/kamera · 💥 Serang (tahan) · 🔫/👊 ganti senjata · ⤒ Loncat · ▾ Jongkok (toggle) · » Lari (tahan) · 💬 bicara dengan NPC terdekat.
