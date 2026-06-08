import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { getDayPillarsFromServer } from '../utils/dayCompletion';

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function SanghaNudgePanel({ userId }) {
  const [friends, setFriends] = useState([]);
  const [nudgedIds, setNudgedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [nudgingId, setNudgingId] = useState(null);
  const [nudgingAll, setNudgingAll] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teamData, nudgeData] = await Promise.all([
        api.getTeam(),
        api.getNudges(),
      ]);
      const others = (teamData.members || []).filter(m => m.id !== userId);
      setFriends(others);
      setNudgedIds(new Set(nudgeData.nudgedUserIds || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const incomplete = friends.filter(m => {
    const progress = getDayPillarsFromServer(m.items || []);
    return !progress.complete;
  });

  const complete = friends.filter(m => {
    const progress = getDayPillarsFromServer(m.items || []);
    return progress.complete;
  });

  const nudgeable = incomplete.filter(m => !nudgedIds.has(m.id));

  async function handleNudge(friendId) {
    setNudgingId(friendId);
    setMessage('');
    setError('');
    try {
      await api.nudgeFriend(friendId);
      setNudgedIds(prev => new Set([...prev, friendId]));
      setMessage('Nudge sent!');
    } catch (err) {
      setError(err.message);
    } finally {
      setNudgingId(null);
    }
  }

  async function handleNudgeAll() {
    setNudgingAll(true);
    setMessage('');
    setError('');
    try {
      const result = await api.nudgeAllFriends();
      await load();
      setMessage(result.sent > 0 ? `Nudged ${result.sent} friend${result.sent !== 1 ? 's' : ''}!` : 'Everyone already nudged or done.');
    } catch (err) {
      setError(err.message);
    } finally {
      setNudgingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 border-4 border-[#15803d] bg-[#f0fdf4] p-4 flex justify-center">
        <div className="w-5 h-5 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="mt-4 border-4 border-[#15803d] bg-[#f0fdf4] p-4">
        <p className="font-label-sm text-label-sm uppercase text-[#15803d] font-bold mb-1">Sangha complete!</p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Add friends in Sangha to nudge them when you finish first.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-4 border-[#15803d] bg-[#f0fdf4] woodcut-shadow overflow-hidden">
      <div className="p-4 border-b-2 border-[#15803d]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-label-sm text-label-sm uppercase text-[#15803d] font-bold mb-1">
              🎉 You&apos;re done for today!
            </p>
            <p className="font-body-md text-body-md text-on-background">
              {incomplete.length > 0
                ? `${incomplete.length} friend${incomplete.length !== 1 ? 's' : ''} still going — send a nudge`
                : 'Your whole sangha finished today!'}
            </p>
          </div>
          {nudgeable.length > 0 && (
            <button
              type="button"
              onClick={handleNudgeAll}
              disabled={nudgingAll}
              className="shrink-0 border-2 border-[#15803d] bg-[#15803d] text-white px-3 py-2 font-label-sm text-label-sm uppercase hover:bg-[#166534] transition-colors disabled:opacity-50"
            >
              {nudgingAll ? '…' : 'Nudge all'}
            </button>
          )}
        </div>
        {message && (
          <p className="font-label-sm text-label-sm text-[#15803d] mt-2">{message}</p>
        )}
        {error && (
          <p className="font-label-sm text-label-sm text-secondary mt-2">{error}</p>
        )}
      </div>

      {incomplete.length > 0 && (
        <ul className="divide-y-2 divide-[#15803d]/30">
          {incomplete.map(friend => {
            const progress = getDayPillarsFromServer(friend.items || []);
            const nudged = nudgedIds.has(friend.id);
            const missing = progress.pillars.filter(p => !p.met).map(p => p.label);

            return (
              <li key={friend.id} className="flex items-center gap-3 p-4 bg-surface/60">
                <div
                  className="w-11 h-11 shrink-0 border-2 border-primary bg-secondary text-on-secondary flex items-center justify-center font-label-sm text-label-sm font-bold"
                  aria-hidden="true"
                >
                  {initials(friend.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-primary truncate">{friend.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 border border-primary bg-surface overflow-hidden max-w-[8rem]">
                      <div
                        className="h-full bg-[#ea580c] transition-all"
                        style={{ width: `${progress.pct}%` }}
                      />
                    </div>
                    <span className="font-label-sm text-label-sm tabular-nums text-on-surface-variant shrink-0">
                      {progress.metCount}/{progress.total}
                    </span>
                  </div>
                  {missing.length > 0 && (
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 truncate">
                      Still needs: {missing.join(', ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleNudge(friend.id)}
                  disabled={nudged || nudgingId === friend.id}
                  className={`shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 border-2 font-label-sm text-label-sm uppercase transition-colors disabled:opacity-50 ${
                    nudged
                      ? 'border-[#15803d] text-[#15803d] bg-transparent'
                      : 'border-primary bg-primary text-on-primary hover:bg-secondary hover:border-secondary'
                  }`}
                  title={nudged ? 'Already nudged today' : 'Send nudge'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {nudged ? 'check' : 'notifications_active'}
                  </span>
                  <span className="text-[9px] leading-none">{nudged ? 'Sent' : 'Nudge'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {complete.length > 0 && (
        <div className="p-4 bg-[#15803d]/10 border-t-2 border-[#15803d]/30">
          <p className="font-label-sm text-label-sm uppercase text-[#15803d] mb-2">Already done</p>
          <div className="flex flex-wrap gap-2">
            {complete.map(friend => (
              <span
                key={friend.id}
                className="inline-flex items-center gap-1.5 border-2 border-[#15803d] bg-surface px-2 py-1 font-label-sm text-label-sm text-[#15803d]"
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                {friend.name?.split(' ')[0] || 'Friend'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
