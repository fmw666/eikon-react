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
      output: {
        /*
         * Vendor splitting for the shell:
         *
         *   - `codemirror`   : @codemirror/* + @uiw/* (largest; only needed
         *                      when the user opens the editor panel, which
         *                      is already lazy-loaded via React.lazy).
         *   - `arborist`     : react-arborist (only needed when Files panel
         *                      is shown).
         *   - `iconify`      : @iconify/react + its registry.
         *   - `panels`       : react-resizable-panels (small, but isolating
         *                      it keeps the main vendor chunk leaner).
         *   - `react`        : react / react-dom — long-lived cache.
         *
         * Anything else falls into the default vendor bundle.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            id.includes('@codemirror') ||
            id.includes('@uiw/react-codemirror') ||
            id.includes('@uiw/codemirror-theme')
          ) {
            return 'codemirror';
          }
          if (id.includes('react-arborist')) return 'arborist';
          if (id.includes('@iconify')) return 'iconify';
          if (id.includes('react-resizable-panels')) return 'panels';
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
});
