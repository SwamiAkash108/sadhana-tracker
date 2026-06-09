import { api } from '../api';
import {
  getServiceWorkerRegistration,
  isPushSupported,
  urlBase64ToUint8Array,
} from './pushNotifications';

export async function checkServerPushConfigured() {
  try {
    await api.getVapidKey();
    return true;
  } catch {
    return false;
  }
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error('Install Sadhana to your home screen first (Add to Home Screen in Safari/Chrome).');
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Notification permission denied. Check your browser or phone settings.');
  }

  const { publicKey } = await api.getVapidKey();
  const reg = await getServiceWorkerRegistration();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await api.subscribe(sub.toJSON());
  window.dispatchEvent(new Event('push-subscription-changed'));
  return true;
}

export async function disablePushNotifications() {
  const reg = await getServiceWorkerRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    await api.unsubscribe();
  }
  window.dispatchEvent(new Event('push-subscription-changed'));
}
