const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 14;

export const PWA_INSTALL_AVAILABLE = 'pwa-install-available';
export const PWA_INSTALLED = 'pwa-installed';

let deferredInstallPrompt = null;

export function initPwaInstallCapture() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new Event(PWA_INSTALL_AVAILABLE));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new Event(PWA_INSTALLED));
  });
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null;
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isIOSSafari() {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
}

export function isIOSInstallBrowser() {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  return isIOSSafari() || /CriOS|FxiOS|EdgiOS/.test(ua);
}

export function isIOSInAppBrowser() {
  return isIOS() && !isIOSInstallBrowser();
}

export function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

export function isMobileBrowser() {
  return isIOS() || isAndroid();
}

export function canShowInstallPrompt() {
  return isMobileBrowser() && !isStandalone() && !isInstallDismissed();
}

export function isInstallDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 86400000;
}

export function dismissInstallPrompt() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export async function waitForInstallPrompt(timeoutMs = 1200) {
  if (deferredInstallPrompt) return deferredInstallPrompt;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener(PWA_INSTALL_AVAILABLE, onAvailable);
      resolve(deferredInstallPrompt);
    }, timeoutMs);

    function onAvailable() {
      clearTimeout(timer);
      window.removeEventListener(PWA_INSTALL_AVAILABLE, onAvailable);
      resolve(deferredInstallPrompt);
    }

    window.addEventListener(PWA_INSTALL_AVAILABLE, onAvailable);
  });
}

export async function triggerInstallPrompt(prompt = deferredInstallPrompt) {
  if (!prompt) return 'unavailable';

  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === 'accepted') {
    deferredInstallPrompt = null;
    return 'accepted';
  }
  return outcome;
}
