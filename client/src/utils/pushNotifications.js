export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  await registerServiceWorker();
  return navigator.serviceWorker.ready;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map(char => char.charCodeAt(0)));
}

const PROMPT_DISMISSED_KEY = 'sadhana_notification_prompt_dismissed';

export function isNotificationPromptDismissed() {
  try {
    return localStorage.getItem(PROMPT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissNotificationPrompt() {
  try {
    localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function isPushSubscribed() {
  if (!isPushSupported()) return false;
  try {
    const reg = await getServiceWorkerRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
