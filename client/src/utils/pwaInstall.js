const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 14;

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
