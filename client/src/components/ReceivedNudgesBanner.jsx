import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

function getDismissedIds(date) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`nudge_dismissed_${date}`) || '[]'));
  } catch {
    return new Set();
  }
}

function dismissNudges(date, ids) {
  const dismissed = getDismissedIds(date);
  ids.forEach(id => dismissed.add(id));
  localStorage.setItem(`nudge_dismissed_${date}`, JSON.stringify([...dismissed]));
}

export default function ReceivedNudgesBanner() {
  const [nudges, setNudges] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.getReceivedNudges();
      const dismissed = getDismissedIds(data.date);
      setDate(data.date);
      setNudges((data.nudges || []).filter(n => !dismissed.has(n.id)));
    } catch {
      setNudges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading || nudges.length === 0) return null;

  const names = nudges.map(n => n.name?.split(' ')[0] || 'A friend');
  const message = names.length === 1
    ? `${names[0]} finished their sadhana and nudged you!`
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} nudged you to finish yours!`;

  function handleDismiss() {
    dismissNudges(date, nudges.map(n => n.id));
    setNudges([]);
  }

  return (
    <div className="border-4 border-secondary bg-secondary/10 woodcut-shadow p-4 flex gap-3 items-start">
      <span className="material-symbols-outlined text-secondary text-3xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
        notifications_active
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">Sangha nudge</p>
        <p className="font-body-md text-body-md text-primary">{message}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
          Your friends are cheering you on — keep going!
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-1 hover:bg-surface-variant rounded-full transition-colors"
        title="Dismiss"
        aria-label="Dismiss nudge"
      >
        <span className="material-symbols-outlined text-on-surface-variant">close</span>
      </button>
    </div>
  );
}
