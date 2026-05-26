/**
 * @file main.tsx
 * @description Application entrypoint.
 *
 * Resolves any async first-paint preconditions (currently: the active
 * i18n bundle), then mounts <App /> inside React StrictMode under the
 * #root element. Feature-gated preconditions push into the array
 * inside `@eikon:feature(...)` markers so stripping a feature also
 * drops its precondition.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { StrictMode } from 'react';

// --- Core-related Libraries ---
import { createRoot } from 'react-dom/client';

// --- Absolute Imports ---
import App from '@/App';
// @eikon:feature(i18n) begin
import { initI18n } from '@/shared/i18n';
// @eikon:feature(i18n) end
import '@/styles/index.css';

// =================================================================================================
// Mount
// =================================================================================================

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

const root = createRoot(rootElement);

/**
 * Async preconditions to settle before the first paint — e.g. i18n
 * bundle load. When a feature is stripped its block (and its push to
 * this list) is removed; with an empty list the Promise.all resolves
 * on the next microtask and rendering is effectively synchronous.
 */
const preconditions: Array<Promise<unknown>> = [];

// @eikon:feature(i18n) begin
// Wait for the active locale bundle so users never see a flash of
// fallback keys. On failure we still render rather than leave the
// screen blank.
preconditions.push(
  initI18n().catch((err: unknown) => {
    console.error('[i18n] initialisation failed; rendering anyway:', err);
  })
);
// @eikon:feature(i18n) end

void Promise.all(preconditions).then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  // Preview-site bridge: when this template runs inside the playground's
  // iframe, the shell needs to know that React has actually mounted —
  // not just that the HTML parsed (which is what `iframe.onLoad` reports
  // and what the shell-side overlay used to clear on, briefly exposing
  // the dark `<body>` before the first paint of <App />).
  //
  // We post AFTER `root.render` so by the time the shell receives the
  // message, the synchronous render pass has scheduled commits; pixels
  // are at most one rAF away. Gated by:
  //   - `import.meta.env.DEV` so a production scaffold (built by the end
  //     user) ships zero bytes of preview-bridge code — Rollup can
  //     statically eliminate this whole `if` once DEV evaluates `false`.
  //   - `window.parent !== window` to skip the broadcast when the
  //     template is running standalone (regular `pnpm dev`).
  if (import.meta.env.DEV && window.parent !== window) {
    window.parent.postMessage({ type: 'eikon:preview-ready' }, '*');
  }
});
