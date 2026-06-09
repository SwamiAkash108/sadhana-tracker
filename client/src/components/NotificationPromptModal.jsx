import { useState } from 'react';
import { enablePushNotifications } from '../utils/enablePush';
import { dismissNotificationPrompt, isPushSupported } from '../utils/pushNotifications';

export default function NotificationPromptModal({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = isPushSupported();

  const finish = (dismissed = false) => {
    if (dismissed) dismissNotificationPrompt();
    onDone?.();
  };

  const handleEnable = async () => {
    setError('');
    setBusy(true);
    try {
      await enablePushNotifications();
      finish(false);
    } catch (err) {
      setError(err.message || 'Could not enable notifications.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
    >
      <div
        className="bg-surface border-4 border-primary w-full max-w-md max-h-[min(90vh,40rem)] overflow-y-auto shadow-none relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-prompt-title"
      >
        <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          <div className="text-center mb-6">
            <span
              className="material-symbols-outlined text-4xl text-secondary mb-3 inline-block"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              notifications_active
            </span>
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-2">
              Stay connected
            </p>
            <h2 id="notification-prompt-title" className="font-headline-md text-headline-md text-primary">
              Enable notifications
            </h2>
          </div>

          <p className="font-body-md text-body-md text-on-background mb-6 leading-relaxed">
            Get alerted when a sangha friend nudges you, sends a friend request, or invites you to a shared group — even when the app is closed.
          </p>

          {!supported && (
            <p className="font-label-sm text-label-sm text-secondary mb-6 border-2 border-outline-variant p-3 bg-surface-bright">
              On iPhone: open in Safari → Share → Add to Home Screen, then come back and enable notifications here.
            </p>
          )}

          {error && (
            <p className="font-label-sm text-label-sm text-secondary mb-4">{error}</p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleEnable}
              disabled={busy || !supported}
              className="w-full bg-primary text-on-primary py-4 font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors disabled:opacity-60 border-2 border-primary"
            >
              {busy ? 'Enabling…' : 'Enable notifications'}
            </button>
            <button
              type="button"
              onClick={() => finish(true)}
              disabled={busy}
              className="w-full border-2 border-primary py-3 font-label-sm text-label-sm uppercase tracking-wider hover:bg-surface-variant transition-colors disabled:opacity-60"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
