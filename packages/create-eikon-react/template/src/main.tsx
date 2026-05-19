import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App';
// @eikon:feature(i18n) begin
import { initI18n } from '@/shared/i18n';
// @eikon:feature(i18n) end
import '@/styles/index.css';

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
});
