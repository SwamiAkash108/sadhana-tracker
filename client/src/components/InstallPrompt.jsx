import { useState, useEffect } from 'react';
import {
  canShowInstallPrompt,
  dismissInstallPrompt,
  isAndroid,
  isIOS,
} from '../utils/pwaInstall';

export default function InstallPrompt({ variant = 'icon' }) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!canShowInstallPrompt()) {
      setReady(true);
      return;
    }

    setVisible(true);

    const onInstallable = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', onInstallable);
    setReady(true);

    return () => window.removeEventListener('beforeinstallprompt', onInstallable);
  }, []);

  if (!ready || !visible) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setVisible(false);
          setShowModal(false);
        }
        setDeferredPrompt(null);
      } finally {
        setInstalling(false);
      }
      return;
    }

    setShowModal(true);
  }

  function handleDismiss() {
    dismissInstallPrompt();
    setVisible(false);
    setShowModal(false);
  }

  const platform = isIOS() ? 'ios' : isAndroid() ? 'android' : 'other';

  if (variant === 'banner') {
    return (
      <>
        <div className="mt-8 pt-8 border-t border-outline-variant">
          <div className="border-2 border-primary bg-surface p-4 text-left">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary shrink-0">install_mobile</span>
              <div className="min-w-0 flex-1">
                <p className="font-label-sm text-label-sm text-primary uppercase font-bold mb-1">
                  Add to Home Screen
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  Install Sadhana on your {platform === 'ios' ? 'iPhone' : 'phone'} for quick access from your home screen.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={installing}
                    className="bg-primary text-on-primary px-4 py-2 font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    {deferredPrompt ? (installing ? 'Installing…' : 'Install app') : 'How to install'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-4 py-2 font-label-sm text-label-sm uppercase tracking-wider border-2 border-primary hover:bg-surface-variant transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showModal && (
          <InstallInstructions platform={platform} onClose={() => setShowModal(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        className="p-2 rounded-full transition-colors hover:bg-surface-variant shrink-0 disabled:opacity-50"
        title="Add to Home Screen"
        aria-label="Add to Home Screen"
      >
        <span className="material-symbols-outlined text-primary">install_mobile</span>
      </button>
      {showModal && (
        <InstallInstructions platform={platform} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function InstallInstructions({ platform, onClose }) {
  const steps =
    platform === 'ios'
      ? [
          'Tap the Share button at the bottom of Safari (square with an arrow pointing up).',
          'Scroll down and tap "Add to Home Screen".',
          'Tap "Add" in the top-right corner.',
        ]
      : [
          'Tap the menu (⋮) in the top-right of Chrome.',
          'Tap "Install app" or "Add to Home screen".',
          'Confirm to add Sadhana to your home screen.',
        ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-surface border-4 border-primary p-6 w-full max-w-sm shadow-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="install-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="install-title" className="font-headline-sm text-headline-sm text-primary">
            Add to Home Screen
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-surface-variant rounded-full transition-colors shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-primary">close</span>
          </button>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mb-4">
          {platform === 'ios'
            ? 'Install Sadhana on your iPhone like a native app:'
            : 'Install Sadhana on your Android phone like a native app:'}
        </p>
        <ol className="space-y-3 mb-6">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 font-body-md text-body-md text-on-background">
              <span className="font-label-sm text-label-sm font-bold text-primary shrink-0 w-5">
                {i + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-primary text-on-primary py-3 font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
