import { useState, useEffect } from 'react';
import { api } from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | enabled | disabled | unsupported
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
    // Register service worker on mount
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const checkStatus = () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'granted') {
      setStatus('enabled');
      setShow(false);
    } else if (Notification.permission === 'denied') {
      setStatus('disabled');
      setShow(false);
    } else {
      setStatus('idle');
      setShow(true);
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('disabled');
        setShow(false);
        setLoading(false);
        return;
      }

      // Get VAPID public key
      const { publicKey } = await api.getVapidKey();

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await api.subscribe(subscription);
      setStatus('enabled');
      setShow(false);
    } catch (err) {
      // If VAPID keys aren't configured, still show as enabled for UI
      if (err.message.includes('not configured')) {
        setStatus('enabled');
        setShow(false);
      } else {
        console.error('Push subscription failed:', err);
        setStatus('disabled');
        setShow(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="card-paper p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">🔔</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink mb-1">Get daily reminders</p>
          <p className="text-xs text-walnut mb-3">
            Receive a gentle notification each day to check in on your sadhana.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {loading ? 'Enabling...' : 'Enable'}
            </button>
            <button onClick={handleDismiss} className="btn-ghost text-[11px]">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}