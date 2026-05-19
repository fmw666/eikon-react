import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssMinify: true,
    rollupOptions: {
      output: {
        /*
         * Vendor splitting. Each group is selected because it's either
         * large (motion / react-query / supabase), feature-toggleable
         * (query / i18n / supabase — may be stripped entirely), or
         * benefits from long-lived browser cache (react itself).
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('node_modules/react-router')) return 'router';
          if (id.includes('node_modules/motion')) return 'motion';
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'query';
          }
          if (
            id.includes('node_modules/i18next') ||
            id.includes('node_modules/react-i18next')
          ) {
            return 'i18n';
          }
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (
            id.includes('node_modules/@radix-ui') ||
            id.includes('node_modules/sonner')
          ) {
            return 'ui-vendor';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react';
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  envPrefix: 'VITE_',
});
