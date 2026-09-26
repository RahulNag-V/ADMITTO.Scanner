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

    // Only reload when a NEW controller replaces an ALREADY EXISTING active controller.
    // On fresh visits/other devices, navigator.serviceWorker.controller is initially null;
    // reloading immediately upon first client claim causes blank screen / aborted module loads.
    let hadExistingController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadExistingController) {
        hadExistingController = true;
        return;
      }
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}
