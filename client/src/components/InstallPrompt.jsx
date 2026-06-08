import { useState, useEffect } from 'react';
import {
  canShowInstallPrompt,
  dismissInstallPrompt,
  getDeferredInstallPrompt,
  isAndroid,
  isIOS,
  isIOSInAppBrowser,
  isIOSSafari,
  PWA_INSTALL_AVAILABLE,
  PWA_INSTALLED,
  triggerInstallPrompt,
  waitForInstallPrompt,
} from '../utils/pwaInstall';

export default function InstallPrompt({ variant = 'icon' }) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [canInstall, setCanInstall] = useState(!!getDeferredInstallPrompt());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!canShowInstallPrompt()) {
      setReady(true);
      return;
    }

    setVisible(true);
    setCanInstall(!!getDeferredInstallPrompt());
    setReady(true);

    const onAvailable = () => setCanInstall(true);
    const onInstalled = () => {
      setVisible(false);
      setShowModal(false);
      setCanInstall(false);
    };

    window.addEventListener(PWA_INSTALL_AVAILABLE, onAvailable);
    window.addEventListener(PWA_INSTALLED, onInstalled);

    return () => {
      window.removeEventListener(PWA_INSTALL_AVAILABLE, onAvailable);
      window.removeEventListener(PWA_INSTALLED, onInstalled);
    };
  }, []);

  if (!ready || !visible) return null;

  async function handleInstall() {
    if (isIOS()) {
      setShowModal(true);
      return;
    }

    setInstalling(true);
    try {
      let prompt = getDeferredInstallPrompt();
      if (!prompt) {
        prompt = await waitForInstallPrompt();
      }

      if (prompt) {
        const outcome = await triggerInstallPrompt(prompt);
        if (outcome === 'accepted') {
          setVisible(false);
          setShowModal(false);
        }
        setCanInstall(!!getDeferredInstallPrompt());
        return;
      }

      setShowModal(true);
    } finally {
      setInstalling(false);
    }
  }

  function handleDismiss() {
    dismissInstallPrompt();
    setVisible(false);
    setShowModal(false);
  }

  const platform = isIOS() ? 'ios' : isAndroid() ? 'android' : 'other';
  const installLabel = installing
    ? 'Installing…'
    : canInstall
      ? 'Install app'
      : platform === 'ios'
        ? 'Add to Home Screen'
        : platform === 'android'
          ? 'Add to home screen'
          : 'How to install';

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
                  {platform === 'ios'
                    ? 'Install Sadhana on your iPhone from Safari for quick access from your home screen.'
                    : 'Install Sadhana on your phone for quick access from your home screen.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={installing}
                    className="bg-primary text-on-primary px-4 py-2 font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    {installLabel}
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
        title={canInstall ? 'Install app' : 'Add to Home Screen'}
        aria-label={canInstall ? 'Install app' : 'Add to Home Screen'}
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
  const inAppBrowser = platform === 'ios' && isIOSInAppBrowser();

  const steps = inAppBrowser
    ? [
        'Tap the menu (···) or Share icon in this app\'s browser.',
        'Choose "Open in Safari" (or copy the link and paste it into Safari).',
        'In Safari, tap Share at the bottom (square with arrow pointing up).',
        'Scroll down, tap "Add to Home Screen", then tap "Add".',
      ]
    : platform === 'ios'
      ? isIOSSafari()
        ? [
            'Tap the Share button at the bottom of Safari (square with arrow pointing up).',
            'Scroll down in the share menu.',
            'Tap "Add to Home Screen".',
            'Tap "Add" in the top-right corner.',
          ]
        : [
            'Open this page in Safari for the best install experience.',
            'In Safari, tap Share at the bottom (square with arrow pointing up).',
            'Scroll down and tap "Add to Home Screen".',
            'Tap "Add" in the top-right corner.',
          ]
      : [
          'Look for an "Install app" banner at the bottom of Chrome and tap it.',
          'If you do not see it, tap ⋮ (three dots) next to the address bar.',
          'Tap "Install app" or "Add to Home screen", then confirm.',
        ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-6 bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-surface border-4 border-primary p-6 w-full max-w-sm max-h-[min(85vh,32rem)] overflow-y-auto shadow-none"
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

        {inAppBrowser && (
          <div className="mb-4 border-2 border-secondary bg-surface-variant p-3 font-body-md text-body-md text-on-background">
            Open Sadhana in <strong>Safari</strong> first — in-app browsers cannot add to the home screen.
          </div>
        )}

        {platform === 'ios' && isIOSSafari() && (
          <div className="mb-4 flex items-center gap-3 border-2 border-primary p-3 bg-surface">
            <span className="material-symbols-outlined text-primary text-3xl shrink-0">ios_share</span>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Use the Share button in Safari&apos;s bottom toolbar.
            </p>
          </div>
        )}

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
