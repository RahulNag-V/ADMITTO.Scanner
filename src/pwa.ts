import { registerSW } from 'virtual:pwa-register';

export function setupPWA() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] New deployment detected, updating cache and reloading.');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline.');
      },
      onRegisterError(error) {
        console.warn('[PWA] Service worker registration error:', error);
      },
    });

    // Proactively check for service worker updates when the user returns to the tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        updateSW().catch(() => {});
      }
    });

    // Check periodically every 60 seconds for newly deployed versions
    setInterval(() => {
      updateSW().catch(() => {});
    }, 60 * 1000);

    // Refresh page when new controller takes over to prevent stale script references
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}
