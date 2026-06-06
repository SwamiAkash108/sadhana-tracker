import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import NotificationPrompt from './NotificationPrompt';

export default function SadhanaChecklist() {
  const [checklist, setChecklist] = useState([]);
  const [summary, setSummary] = useState({ total: 0, done: 0, remaining: 0 });
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  const fetchToday = useCallback(async () => {
    try {
      const data = await api.getToday();
      setChecklist(data.checklist);
      setSummary(data.summary);
      setDate(data.date);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleToggle = async (itemId) => {
    setToggling(itemId);
    // Optimistic update
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
    setSummary(prev => {
      const wasCompleted = checklist.find(i => i.id === itemId)?.completed;
      const delta = wasCompleted ? -1 : 1;
      return {
        ...prev,
        done: prev.done + delta,
        remaining: prev.remaining - delta
      };
    });
    try {
      const result = await api.toggleItem(itemId);
    } catch {
      setChecklist(prev => prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ));
      setSummary(prev => {
        const wasCompleted = checklist.find(i => i.id === itemId)?.completed;
        const delta = wasCompleted ? -1 : 1;
        return {
          ...prev,
          done: prev.done + delta,
          remaining: prev.remaining - delta
        };
      });
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-paper p-6 text-center">
        <p className="text-sm text-brick mb-3">{error}</p>
        <button onClick={fetchToday} className="btn-secondary">Retry</button>
      </div>
    );
  }

  const pct = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const allDone = summary.done === summary.total && summary.total > 0;

  return (
    <div className="space-y-5">
      <div className={`card-paper p-5 transition-all duration-500 ${allDone ? 'ring-1 ring-forest/30' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-display text-deepink mb-0.5">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-xs text-walnut">
              {allDone ? '🎉 All done! Beautiful day.' : `${summary.remaining} remaining`}
            </p>
          </div>
          {allDone && (
            <span className="text-3xl animate-check-pop">✨</span>
          )}
        </div>

        <div className="progress-bar mb-2">
          <div
            className={`progress-bar-fill ${allDone ? 'bg-forest' : 'bg-ink'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-walnut">
          <span>{summary.done} of {summary.total} completed</span>
          <span className="font-medium text-bark">{pct}%</span>
        </div>
      </div>

      <div className="card-paper divide-y divide-sand/50">
        {checklist.map((item, i) => (
          <button
            key={item.id}
            onClick={() => handleToggle(item.id)}
            disabled={toggling === item.id}
            className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-all duration-200 hover:bg-linen/50 ${
              item.completed ? 'opacity-60' : ''
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                item.completed
                  ? 'bg-forest border-forest'
                  : 'border-stone'
              }`}
            >
              {item.completed && (
                <svg className="w-3 h-3 text-cream animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {item.emoji && <span className="text-sm">{item.emoji}</span>}
                <span className={`text-sm font-medium transition-colors duration-200 ${
                  item.completed ? 'text-walnut line-through' : 'text-ink'
                }`}>
                  {item.name}
                </span>
              </div>
              {item.description && !item.completed && (
                <p className="text-[11px] text-walnut mt-0.5 ml-0.5 truncate">{item.description}</p>
              )}
            </div>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-200 ${
              item.completed ? 'bg-forest' : 'bg-stone/0'
            }`} />
          </button>
        ))}
      </div>

      <NotificationPrompt />
    </div>
  );
}