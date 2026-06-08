import { useState, useEffect } from 'react';
import { api } from '../api';
import { getServiceWorkerRegistration, isPushSupported } from '../utils/pushNotifications';

export default function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const canPush = isPushSupported();
      if (!cancelled) setSupported(canPush);

      if (!canPush) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const reg = await getServiceWorkerRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setEnabled(!!sub);
      } catch {
        /* subscription check failed — still show toggle */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  async function toggle() {
    setError('');
    if (!supported) {
      setError('Add Sadhana to your home screen to enable notifications on this device.');
      return;
    }

    if (enabled) {
      try {
        const reg = await getServiceWorkerRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await api.unsubscribe();
        }
        setEnabled(false);
      } catch (err) {
        setError(err.message || 'Could not turn off notifications.');
      }
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setError('Notification permission denied.');
      return;
    }

    try {
      const { publicKey } = await api.getVapidKey();
      const reg = await getServiceWorkerRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: url64(publicKey),
      });
      await api.subscribe(sub.toJSON());
      setEnabled(true);
    } catch (err) {
      setError(err.message || 'Could not enable notifications.');
    }
  }

  if (!ready) return null;

  const title = !supported
    ? 'Notifications require installing the app (Add to Home Screen)'
    : enabled
      ? 'Notifications ON'
      : 'Notifications OFF';

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        className={`p-2 rounded-full transition-colors ${supported ? 'hover:bg-surface-variant' : 'opacity-50'}`}
        title={title}
        aria-label={title}
      >
        <span
          className={`material-symbols-outlined ${enabled ? 'text-secondary' : 'text-primary'}`}
          style={{ fontVariationSettings: `'FILL' ${enabled ? 1 : 0}` }}
        >
          {enabled ? 'notifications_active' : 'notifications_off'}
        </span>
      </button>
      {error && (
        <p className="absolute right-0 top-full mt-1 w-48 z-50 bg-surface border-2 border-primary p-2 font-label-sm text-label-sm text-secondary shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
}

function url64(s) {
  const p = '='.repeat((4 - (s.length % 4)) % 4);
  const b = (s + p).replace(/-/g, '+').replace(/_/g, '/');
  const r = atob(b);
  return new Uint8Array([...r].map(c => c.charCodeAt(0)));
}
