import { useState } from 'react';
import { api } from '../api';

export default function StreakFreezePanel({
  freezeData,
  onRefresh,
}) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!freezeData) return null;

  const {
    balance,
    max,
    frozenDates = [],
    autoApplied,
    daysUntilNextFreeze,
    earnEvery,
    incomingHelp = [],
    outgoingHelp,
  } = freezeData;

  async function handleRequestHelp() {
    setBusy('request');
    setMessage('');
    setError('');
    try {
      await api.requestStreakHelp();
      setMessage('Help request sent to your sangha.');
      await onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleAccept(id) {
    setBusy(id);
    setMessage('');
    setError('');
    try {
      await api.acceptStreakHelp(id);
      setMessage('Streak freeze shared — your friend\'s streak is safe.');
      await onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleDecline(id) {
    setBusy(id);
    setError('');
    try {
      await api.declineStreakHelp(id);
      await onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-surface thin-border woodcut-shadow p-6 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#bae6fd] opacity-30 rounded-full blur-xl pointer-events-none" />

      <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-3 border-b border-outline pb-2 relative">
        Streak Freezes
      </h3>

      <div className="flex items-center gap-3 mb-3 relative">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`material-symbols-outlined text-3xl ${
              i < balance ? 'text-[#0284c7]' : 'text-outline opacity-40'
            }`}
            style={{ fontVariationSettings: i < balance ? "'FILL' 1" : "'FILL' 0" }}
            aria-hidden="true"
          >
            ac_unit
          </span>
        ))}
        <span className="font-headline-sm text-headline-sm text-primary tabular-nums">
          {balance}/{max}
        </span>
      </div>

      <p className="font-body-md text-body-md text-on-surface-variant mb-2 relative">
        Start with 2. Earn +1 every {earnEvery} streak days (max {max}).
        {daysUntilNextFreeze > 0 && balance < max && (
          <> Next earn in <strong>{daysUntilNextFreeze}</strong> day{daysUntilNextFreeze !== 1 ? 's' : ''}.</>
        )}
      </p>

      {autoApplied && (
        <p className="font-label-sm text-label-sm text-[#0284c7] mb-2 relative">
          A freeze protected yesterday — your streak continues.
        </p>
      )}

      {frozenDates.length > 0 && (
        <p className="font-label-sm text-label-sm text-on-surface-variant mb-2 relative">
          Protected days: {frozenDates.slice(-3).join(', ')}
        </p>
      )}

      {balance === 0 && !outgoingHelp && (
        <button
          type="button"
          onClick={handleRequestHelp}
          disabled={busy === 'request'}
          className="w-full mt-2 border-2 border-primary bg-primary text-on-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50 relative"
        >
          {busy === 'request' ? 'Sending…' : 'Ask sangha for help'}
        </button>
      )}

      {outgoingHelp && (
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 relative">
          Waiting for a sangha friend to share a freeze…
        </p>
      )}

      {incomingHelp.length > 0 && (
        <div className="mt-4 pt-4 border-t border-outline relative">
          <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-2">
            Friends need help
          </p>
          <ul className="space-y-2">
            {incomingHelp.map(req => (
              <li key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-2 border-primary p-3 bg-surface-bright">
                <span className="font-body-md text-body-md text-primary truncate">
                  {req.requester_name} needs a streak freeze
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busy === req.id || balance <= 0}
                    onClick={() => handleAccept(req.id)}
                    className="flex-1 sm:flex-none border-2 border-primary bg-primary text-on-primary px-3 py-1.5 font-label-sm text-label-sm uppercase hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    {busy === req.id ? '…' : 'Share freeze'}
                  </button>
                  <button
                    type="button"
                    disabled={busy === req.id}
                    onClick={() => handleDecline(req.id)}
                    className="flex-1 sm:flex-none border-2 border-primary px-3 py-1.5 font-label-sm text-label-sm uppercase hover:bg-surface-variant transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {balance <= 0 && incomingHelp.length > 0 && (
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-2">
              You need at least one freeze to share.
            </p>
          )}
        </div>
      )}

      {message && (
        <p className="font-label-sm text-label-sm text-[#15803d] mt-3 relative">{message}</p>
      )}
      {error && (
        <p className="font-label-sm text-label-sm text-secondary mt-3 relative">{error}</p>
      )}
    </div>
  );
}
