import { defineConfig } from 'vite';
// base './' wajib agar aset terbaca di dalam APK (Capacitor)
export default defineConfig({ base: './', build: { outDir: 'dist', chunkSizeWarningLimit: 2000 } });
