import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { getDayPillarsFromServer } from '../utils/dayCompletion';

const DISMISS_PREFIX = 'sadhana_nudge_panel_dismissed_';

function isDismissed(date) {
  if (!date) return true;
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${date}`) === '1';
  } catch {
    return false;
  }
}

function dismissForDate(date) {
  if (!date) return;
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${date}`, '1');
  } catch {
    /* ignore */
  }
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function SanghaNudgePanel({ userId, date }) {
  const [visible, setVisible] = useState(() => !isDismissed(date));
  const [groups, setGroups] = useState([]);
  const [membersById, setMembersById] = useState({});
  const [nudgedIds, setNudgedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [nudgingId, setNudgingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const dismiss = useCallback(() => {
    dismissForDate(date);
    setVisible(false);
  }, [date]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teamData, nudgeData, groupData] = await Promise.all([
        api.getTeam(),
        api.getNudges(),
        api.getGroups(),
      ]);
      const memberMap = Object.fromEntries((teamData.members || []).map(m => [m.id, m]));
      setMembersById(memberMap);
      setGroups(groupData.groups || []);
      setNudgedIds(new Set(nudgeData.nudgedUserIds || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    load();
  }, [visible, load]);

  useEffect(() => {
    setVisible(!isDismissed(date));
  }, [date]);

  const groupSections = groups.map(group => {
    const groupMembers = (group.member_ids || [])
      .filter(id => id !== userId)
      .map(id => membersById[id])
      .filter(Boolean);

    const incomplete = groupMembers.filter(m => {
      const progress = getDayPillarsFromServer(m.items || []);
      return !progress.complete;
    });

    const nudgeable = incomplete.filter(m => !nudgedIds.has(m.id));

    return { group, incomplete, nudgeable };
  }).filter(section => section.incomplete.length > 0);

  const totalNudgeable = groupSections.reduce((sum, s) => sum + s.nudgeable.length, 0);

  async function handleNudge(friendId) {
    setNudgingId(friendId);
    setMessage('');
    setError('');
    try {
      await api.nudgeFriend(friendId);
      setNudgedIds(prev => new Set([...prev, friendId]));
      setMessage('Nudge sent!');
      dismiss();
    } catch (err) {
      setError(err.message);
    } finally {
      setNudgingId(null);
    }
  }

  if (!visible) return null;

  if (loading) {
    return (
      <div className="mt-3 border-2 border-[#15803d] bg-[#f0fdf4] p-3 flex justify-center">
        <div className="w-4 h-4 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (groupSections.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-2 border-[#15803d] bg-[#f0fdf4] overflow-hidden">
      <div className="flex items-start justify-between gap-2 p-3 border-b border-[#15803d]/30">
        <div className="min-w-0">
          <p className="font-label-sm text-label-sm uppercase text-[#15803d] font-bold">
            Nudge your sangha
          </p>
          <p className="font-body-md text-body-md text-on-background mt-0.5">
            {totalNudgeable > 0
              ? `${totalNudgeable} still going today`
              : 'Everyone nudged or done'}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-1 hover:bg-[#15803d]/10 rounded-full transition-colors"
          aria-label="Dismiss"
          title="Dismiss for today"
        >
          <span className="material-symbols-outlined text-lg text-[#15803d]">close</span>
        </button>
      </div>

      {message && (
        <p className="font-label-sm text-label-sm text-[#15803d] px-3 pt-2">{message}</p>
      )}
      {error && (
        <p className="font-label-sm text-label-sm text-secondary px-3 pt-2">{error}</p>
      )}

      <div className="max-h-48 overflow-y-auto">
        {groupSections.map(({ group, incomplete, nudgeable }) => (
          <div key={group.id} className="border-b border-[#15803d]/20 last:border-b-0">
            <p className="font-label-sm text-label-sm uppercase text-[#15803d] px-3 pt-2 pb-1">
              {group.name}
            </p>
            <ul>
              {incomplete.map(friend => {
                const progress = getDayPillarsFromServer(friend.items || []);
                const nudged = nudgedIds.has(friend.id);
                const canNudge = nudgeable.some(m => m.id === friend.id);

                return (
                  <li key={friend.id} className="flex items-center gap-2 px-3 py-2">
                    <div
                      className="w-8 h-8 shrink-0 border border-primary bg-secondary text-on-secondary flex items-center justify-center font-label-sm text-[10px] font-bold"
                      aria-hidden="true"
                    >
                      {initials(friend.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md text-primary truncate leading-tight">
                        {friend.name}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
                        {progress.metCount}/{progress.total}
                      </p>
                    </div>
                    {canNudge ? (
                      <button
                        type="button"
                        onClick={() => handleNudge(friend.id)}
                        disabled={nudged || nudgingId === friend.id}
                        className="shrink-0 border-2 border-primary bg-primary text-on-primary px-2.5 py-1 font-label-sm text-[10px] uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50"
                      >
                        {nudgingId === friend.id ? '…' : 'Nudge'}
                      </button>
                    ) : (
                      <span className="font-label-sm text-[10px] uppercase text-[#15803d] shrink-0">Sent</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {totalNudgeable === 0 && (
        <div className="p-3">
          <button
            type="button"
            onClick={dismiss}
            className="w-full border-2 border-[#15803d] px-3 py-2 font-label-sm text-label-sm uppercase text-[#15803d] hover:bg-[#15803d]/10 transition-colors"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
