import { useState, useEffect } from 'react';
import { api } from '../api';

export default function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setEnabled(!!sub);
      } catch {}
      setReady(true);
    })();
  }, []);

  async function toggle() {
    if (!('Notification' in window)) return;
    if (enabled) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) { await sub.unsubscribe(); await api.unsubscribe(); }
        setEnabled(false);
      } catch {}
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    try {
      const { publicKey } = await api.getVapidKey();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: url64(publicKey) });
      await api.subscribe(sub.toJSON());
      setEnabled(true);
    } catch {}
  }

  if (!ready) return null;
  if (!('Notification' in window)) return null;

  return (<button onClick={toggle} className="p-2 hover:bg-surface-variant rounded-full transition-colors" title={enabled?'Notifications ON':'Notifications OFF'}>
    <span className={`material-symbols-outlined ${enabled ? 'text-secondary' : 'text-primary'}`} style={{fontVariationSettings: `'FILL' ${enabled?1:0}`}}>
      {enabled ? 'notifications_active' : 'notifications_off'}
    </span>
  </button>);
}

function url64(s){const p='='.repeat((4-(s.length%4))%4);const b=(s+p).replace(/-/g,'+').replace(/_/g,'/');const r=atob(b);return new Uint8Array([...r].map(c=>c.charCodeAt(0)));}