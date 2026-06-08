import { useState, useEffect } from 'react';
import { api } from '../api';

export default function NotificationToggle() {
  const [status, setStatus] = useState('loading');

  useEffect(() => { checkStatus(); }, []);

  async function checkStatus() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported'); return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? 'enabled' : 'disabled');
    } catch { setStatus('disabled'); }
  }

  async function enable() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return; }
      const vapidData = await api.getVapidKey();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });
      await api.subscribe(sub.toJSON());
      setStatus('enabled');
    } catch (err) { console.error(err); setStatus('disabled'); }
  }

  async function disable() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await sub.unsubscribe(); await api.unsubscribe(); }
      setStatus('disabled');
    } catch (err) { console.error(err); }
  }

  async function handleToggle() {
    if (status === 'enabled') await disable();
    else if (status === 'disabled') await enable();
    else if (status === 'denied') alert('Notifications are blocked. Enable them in your browser settings for this site.');
  }

  if (status === 'unsupported') return null;
  if (status === 'loading') return <span className="text-[10px] text-on-surface-variant px-4 py-3">…</span>;

  return (
    <button onClick={handleToggle}
      className="flex items-center justify-between w-full px-4 py-3 text-on-surface hover:bg-surface-variant transition-colors border border-transparent hover:border-outline font-label-sm text-label-sm uppercase tracking-wide">
      <span className="flex items-center gap-3">
        <span className="material-symbols-outlined" style={{fontVariationSettings:`'FILL' ${status==='enabled'?1:0}`}}>
          {status === 'enabled' ? 'notifications_active' : 'notifications_off'}
        </span>
        <span>Notifications</span>
      </span>
      <span className={`text-[10px] px-2 py-0.5 ${status==='enabled'?'bg-primary text-on-primary':'text-on-surface-variant border border-outline-variant'}`}>
        {status === 'enabled' ? 'ON' : status === 'denied' ? 'BLOCKED' : 'OFF'}
      </span>
    </button>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}