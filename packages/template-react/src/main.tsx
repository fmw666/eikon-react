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
import { LayoutVariantProvider } from '@/app/LayoutVariantContext';
// @eikon:feature(i18n) begin
import { initI18n } from '@/shared/i18n';
// @eikon:feature(i18n) end
import '@/styles/index.css';

// =================================================================================================
// Mount
// =================================================================================================

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

// Apply the initial class-based variant axes. Source of truth is the
// `data-{design,ui}` attribute set the CLI stamps on <html> at scaffold
// time (see `create-eikon-react/src/index.ts`). When absent — e.g.
// running the workspace template directly with no CLI step — we leave
// <html> untouched and Tailwind's base @theme tokens render the
// "default" / "animate-ui" combination. The 14 design overrides live as
// `:root.design-<name>` rules and the 2 non-default ui overrides as
// `:root.ui-<name>` rules in `styles/index.css`; switching is a class
// swap, no rebuild.
function applyClassAxis(prefix: string, value: string | undefined): void {
  if (!value) return;
  const root = document.documentElement;
  for (const cls of Array.from(root.classList)) {
    if (cls.startsWith(`${prefix}-`)) root.classList.remove(cls);
  }
  // 'default' (design) / 'animate-ui' (ui) means "no class" — base @theme
  // is the active variant. Anything else gets a `<prefix>-<value>` class.
  if (value !== 'default' && !(prefix === 'ui' && value === 'animate-ui')) {
    root.classList.add(`${prefix}-${value}`);
  }
}

const htmlEl = rootElement.ownerDocument.documentElement;
applyClassAxis('design', htmlEl.dataset.design);
applyClassAxis('ui', htmlEl.dataset.ui);

// Preview-shell variant bridge. Only mounted when (a) the bundle is a
// dev build — production scaffolds drop this whole branch via Rollup's
// dead-code elimination once `import.meta.env.DEV` evaluates `false` —
// and (b) we're embedded in another window, i.e. the playground iframe.
// Standalone `pnpm dev` skips it entirely.
//
// Class-axis swaps (`design`, `ui`) are handled here. `layout` and
// `toastPosition` are consumed by LayoutVariantContext and Toaster.
if (import.meta.env.DEV && window.parent !== window) {
  window.addEventListener('message', (e: MessageEvent) => {
    const data = e.data as
      | { type?: string; design?: string; ui?: string }
      | null;
    if (!data || data.type !== 'eikon:set-variant') return;
    if (typeof data.design === 'string') applyClassAxis('design', data.design);
    if (typeof data.ui === 'string') applyClassAxis('ui', data.ui);
  });
}

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
      <LayoutVariantProvider>
        <App />
      </LayoutVariantProvider>
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
