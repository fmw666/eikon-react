import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { previewBuildPlugin } from './server/middleware';

export default defineConfig({
  plugins: [react(), tailwindcss(), previewBuildPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3100,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssMinify: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
