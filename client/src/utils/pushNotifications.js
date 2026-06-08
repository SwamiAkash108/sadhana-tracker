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
