import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App';
// @evomap:feature(i18n) begin
import '@/shared/i18n';
// @evomap:feature(i18n) end
import '@/styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
