import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { getServiceWorkerRegistration, isPushSupported } from '../utils/pushNotifications';

export default function NotificationToggle() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const canPush = isPushSupported();
      if (!cancelled) setSupported(canPush);

      try {
        await api.getVapidKey();
        if (!cancelled) setServerConfigured(true);
      } catch {
        if (!cancelled) setServerConfigured(false);
      }

      if (!canPush) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const reg = await getServiceWorkerRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setEnabled(!!sub);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function enableNotifications() {
    setError('');
    setMessage('');

    if (!supported) {
      setError('Install Sadhana to your home screen first (Add to Home Screen in Safari/Chrome).');
      return;
    }

    if (!serverConfigured) {
      setError('Push is not configured on the server yet.');
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setError('Notification permission denied. Check your browser or phone settings.');
      return;
    }

    setBusy(true);
    try {
      const { publicKey } = await api.getVapidKey();
      const reg = await getServiceWorkerRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: url64(publicKey),
      });
      await api.subscribe(sub.toJSON());
      setEnabled(true);
      setMessage('Notifications enabled. You\'ll get Sangha nudges on this device.');
    } catch (err) {
      setError(err.message || 'Could not enable notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const reg = await getServiceWorkerRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await api.unsubscribe();
      }
      setEnabled(false);
      setMessage('Notifications turned off.');
    } catch (err) {
      setError(err.message || 'Could not turn off notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setError('');
    setMessage('');
    setTesting(true);
    try {
      await api.sendTestNotification();
      setMessage('Test sent — check your notifications!');
    } catch (err) {
      setError(err.message || 'Test failed.');
    } finally {
      setTesting(false);
    }
  }

  if (!ready) return null;

  const iconTitle = enabled
    ? 'Notifications on'
    : 'Set up notifications';

  return (
    <div className="relative shrink-0 flex items-center" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-colors hover:bg-surface-variant ${enabled ? '' : 'opacity-90'}`}
        title={iconTitle}
        aria-label={iconTitle}
        aria-expanded={open}
      >
        <span
          className={`material-symbols-outlined text-[24px] leading-none ${enabled ? 'text-secondary' : 'text-primary'}`}
          style={{ fontVariationSettings: `'FILL' ${enabled ? 1 : 0}` }}
        >
          {enabled ? 'notifications_active' : 'notifications'}
        </span>
        {!enabled && supported && serverConfigured && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary border border-primary rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 z-[60] bg-surface border-4 border-primary woodcut-shadow p-4">
          <p className="font-headline-sm text-headline-sm uppercase text-primary mb-2">Push Notifications</p>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Get alerted when a Sangha friend nudges you, even when the app is closed.
          </p>

          {!supported && (
            <p className="font-label-sm text-label-sm text-secondary mb-3">
              On iPhone: open in Safari → Share → Add to Home Screen, then enable here.
            </p>
          )}

          {supported && !serverConfigured && (
            <p className="font-label-sm text-label-sm text-secondary mb-3">
              Server push keys are not set up yet (VAPID keys in server/.env).
            </p>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-block w-3 h-3 border-2 border-primary ${enabled ? 'bg-secondary' : 'bg-surface-variant'}`} />
            <span className="font-label-sm text-label-sm uppercase">
              {enabled ? 'Enabled on this device' : 'Not enabled'}
            </span>
          </div>

          {enabled ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={sendTest}
                disabled={testing || busy}
                className="w-full border-2 border-primary bg-primary text-on-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50"
              >
                {testing ? 'Sending…' : 'Send test notification'}
              </button>
              <button
                type="button"
                onClick={disableNotifications}
                disabled={busy}
                className="w-full border-2 border-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-surface-variant transition-colors disabled:opacity-50"
              >
                Turn off
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={enableNotifications}
              disabled={busy || !supported || !serverConfigured}
              className="w-full border-2 border-primary bg-primary text-on-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50"
            >
              {busy ? 'Enabling…' : 'Enable notifications'}
            </button>
          )}

          {message && (
            <p className="font-label-sm text-label-sm text-[#15803d] mt-3">{message}</p>
          )}
          {error && (
            <p className="font-label-sm text-label-sm text-secondary mt-3">{error}</p>
          )}
        </div>
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
