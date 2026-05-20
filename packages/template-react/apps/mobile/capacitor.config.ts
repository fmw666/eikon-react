/**
 * @file capacitor.config.ts
 * @description Capacitor 6 config for the mobile shell.
 *
 * Layout (after first scaffold + `cap add ios|android`):
 *
 *     <project>/
 *       apps/
 *         mobile/
 *           capacitor.config.ts   ← this file
 *           package.json
 *           ios/                  ← created by `pnpm cap:add:ios`
 *           android/              ← created by `pnpm cap:add:android`
 *       dist/                     ← Vite output, referenced via webDir
 *
 * The web build must be produced before `cap sync`:
 *
 *     pnpm build           # writes ../../dist
 *     pnpm cap:sync        # rsync's ../../dist into ios/android projects
 *
 * Vite is configured for relative asset paths in `capacitor` mode (see
 * `vite.config.ts`), which is required because the WebView loads the
 * bundle from `file://` (iOS/Android) rather than a real domain.
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.eikon.__PROJECT_NAME__',
  appName: '__PROJECT_NAME__',
  webDir: '../../dist',
  // NOTE: `bundledWebRuntime` was removed in Capacitor 6 — the web runtime
  // is now always inlined by the CLI. Do NOT add it back; modern @capacitor/cli
  // versions emit a deprecation warning and `cap doctor` flags it.
  /**
   * Server config — leave unset for production builds (Capacitor serves
   * the static webDir bundle from `file://`). For live-reload during dev
   * point `url` at your Vite dev server's LAN IP, e.g.:
   *
   *     server: { url: 'http://192.168.1.42:5173', cleartext: true }
   *
   * and on iOS use `cap run ios -l --external` so the device fetches over
   * the network instead of the bundled webDir.
   */
  server: {
    androidScheme: 'https',
  },
};

export default config;
