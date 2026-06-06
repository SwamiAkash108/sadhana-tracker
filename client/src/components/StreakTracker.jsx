import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function StreakTracker() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  const fetchStats = useCallback(async (d) => {
    setLoading(true);
    try {
      const data = await api.getStats(d);
      setStats(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(days); }, [days, fetchStats]);

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
        <button onClick={() => fetchStats(days)} className="btn-secondary">Retry</button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-5">
      <div className="card-paper p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
            stats.streak >= 7 ? 'border-forest bg-forest/5' : 'border-sand bg-linen'
          }`}>
            <span className={`text-2xl ${stats.streak >= 7 ? 'animate-streak-pulse' : ''}`}>
              {stats.streak >= 7 ? '🔥' : '📿'}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-display font-semibold text-deepink">{stats.streak}</span>
              <span className="text-sm text-bark">day streak</span>
            </div>
            <p className="text-xs text-walnut mt-0.5">
              {stats.streak === 0 && "Start today — check off everything!"}
              {stats.streak >= 1 && stats.streak < 7 && "Keep going, you're building momentum."}
              {stats.streak >= 7 && stats.streak < 30 && "Strong commitment. Keep it up!"}
              {stats.streak >= 30 && "Incredible dedication. You inspire others."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-linen rounded-lg p-3 border border-sand/60">
            <p className="text-[10px] text-walnut uppercase tracking-wide mb-0.5">Overall Rate</p>
            <p className="text-xl font-display font-semibold text-deepink">{stats.overallRate}%</p>
            <p className="text-[10px] text-walnut">last {stats.days} days</p>
          </div>
          <div className="bg-linen rounded-lg p-3 border border-sand/60">
            <p className="text-[10px] text-walnut uppercase tracking-wide mb-0.5">Best Day</p>
            <p className="text-xl font-display font-semibold text-deepink">{stats.bestDay.completed}/{stats.totalItems}</p>
            <p className="text-[10px] text-walnut">{stats.bestDay.date ? new Date(stats.bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1">
        {[7, 14, 30, 60].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-all duration-200 ${
              days === d
                ? 'bg-deepink text-cream'
                : 'text-walnut hover:text-ink hover:bg-linen'
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      <div className="card-paper p-5">
        <h3 className="text-sm font-display text-deepink mb-4">Daily Completion</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {stats.dailyData.map((day, i) => {
            const intensity = day.percentage;
            let bg;
            if (intensity === 0) bg = 'bg-linen';
            else if (intensity < 25) bg = 'bg-khaki';
            else if (intensity < 50) bg = 'bg-stone';
            else if (intensity < 75) bg = 'bg-bark';
            else if (intensity < 100) bg = 'bg-ink';
            else bg = 'bg-forest';

            return (
              <div
                key={day.date}
                className={`aspect-square rounded-sm ${bg} transition-all duration-200 hover:scale-110 cursor-default relative group`}
                title={`${day.date}: ${day.completed}/${day.total} (${day.percentage}%)`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-deepink text-cream text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <br />{day.completed}/{day.total} ({day.percentage}%)
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 mt-4 justify-end">
          <span className="text-[10px] text-walnut">Less</span>
          <div className="w-3 h-3 rounded-sm bg-linen" />
          <div className="w-3 h-3 rounded-sm bg-khaki" />
          <div className="w-3 h-3 rounded-sm bg-stone" />
          <div className="w-3 h-3 rounded-sm bg-bark" />
          <div className="w-3 h-3 rounded-sm bg-ink" />
          <div className="w-3 h-3 rounded-sm bg-forest" />
          <span className="text-[10px] text-walnut">More</span>
        </div>
      </div>
    </div>
  );
}