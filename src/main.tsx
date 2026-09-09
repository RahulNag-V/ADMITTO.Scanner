import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';
import { setupPWA } from './pwa';
import { getOrCreateDeviceUuid } from './lib/offline/security';

try {
  setupPWA();
} catch (err) {
  console.warn('[PWA] Service worker setup bypassed:', err);
}

try {
  getOrCreateDeviceUuid().catch((err) => {
    console.warn('[Device UUID] Init caught:', err);
  });
} catch (err) {
  console.warn('[Device UUID] Sync init bypassed:', err);
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('[ADMITTO] Root element #root not found in document.');
}
