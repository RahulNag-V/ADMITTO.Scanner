import { registerSW } from 'virtual:pwa-register';

export function setupPWA() {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log('[PWA] New content available, updating automatically.');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline.');
      },
      onRegisterError(error) {
        console.warn('[PWA] Service worker registration error:', error);
      },
    });
  }
}
