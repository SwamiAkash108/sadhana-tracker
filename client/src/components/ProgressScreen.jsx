import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function ProgressScreen({ user }) {
  const [stats, setStats] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, monthStats] = await Promise.all([
        api.getStats(30),
        api.getMonthStats(year, month),
      ]);
      setStats(statsData);
      setMonthData(monthStats);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface border-4 border-primary woodcut-shadow p-8 text-center">
        <p className="font-body-md text-body-md text-secondary mb-4">{error}</p>
        <button onClick={fetchData} className="btn-woodcut px-6 py-3">Retry</button>
      </div>
    );
  }

  if (!stats || !monthData) return null;

  const currentStreak = stats.streak || 0;
  const longestStreak = stats.longestStreak || 0;
  const longestEnd = stats.longestStreakEndDate
    ? new Date(stats.longestStreakEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  const dayMap = {};
  (monthData.dailyData || []).forEach(day => { dayMap[day.date] = day; });

  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));

  return (
    <div>
      <div className="mb-12 border-b-4 border-primary pb-6 relative">
        <div className="absolute inset-0 halftone-bg opacity-10 -z-10" />
        <h2 className="font-headline-xl text-headline-xl text-primary mb-2">Progress</h2>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest bg-black text-white inline-block px-3 py-1">
          {monthName} {year}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 md:col-span-4 space-y-8">
          <div className="bg-surface thin-border woodcut-shadow p-6 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-secondary opacity-10 rounded-full blur-2xl group-hover:bg-secondary-container transition-all" />
            <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-4 border-b border-outline pb-2">
              Current Streak
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl text-primary tracking-tighter">{currentStreak}</span>
              <span className="font-body-md text-body-md text-on-surface-variant font-bold">Days</span>
            </div>
            <div className="mt-4 flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`h-2 flex-1 ${i < Math.min(5, Math.ceil(currentStreak / 7)) ? 'bg-primary' : 'bg-surface-variant'}`} />
              ))}
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-3 opacity-70">Keep the fire burning.</p>
          </div>

          <div className="bg-surface-bright thin-border woodcut-shadow p-6 relative">
            <div className="absolute inset-0 halftone-bg opacity-5 mix-blend-multiply pointer-events-none" />
            <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-4 border-b border-outline pb-2">
              Longest Streak
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-secondary tracking-tighter">{longestStreak}</span>
              <span className="font-body-md text-body-md text-on-surface-variant font-bold">Days</span>
            </div>
            {longestEnd && (
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-4 opacity-70">Personal best ending {longestEnd}</p>
            )}
          </div>
        </div>

        <div className="col-span-12 md:col-span-8">
          <div className="bg-surface stark-border woodcut-shadow p-8 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 border-b-4 border-primary pb-4 gap-3">
              <h3 className="font-headline-md text-headline-md text-primary tracking-tight">{monthName} Consistency</h3>
              <div className="flex flex-wrap items-center gap-3 font-label-sm text-label-sm md:justify-end">
                <div className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-primary" /> Done</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-secondary" /> Part</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 border border-primary bg-surface" /> Miss</div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6 flex-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center font-label-sm text-label-sm uppercase text-on-surface-variant py-2">{d}</div>
              ))}
              {Array.from({ length: firstOfMonth.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {monthDates.map(d => {
                const ds = d.toISOString().split('T')[0];
                const day = dayMap[ds];
                const pct = day ? day.percentage : 0;
                const isToday = d.toDateString() === new Date().toDateString();
                const isFuture = d > new Date();

                let cellClass = 'bg-surface thin-border flex items-center justify-center text-primary';
                if (day && pct >= 100) cellClass = 'bg-primary thin-border flex items-center justify-center text-white';
                else if (day && pct >= 50) cellClass = 'bg-secondary thin-border flex items-center justify-center text-white';
                else if (day && pct > 0) cellClass = 'bg-surface thin-border flex items-center justify-center text-primary';
                if (isFuture) cellClass += ' opacity-50';

                return (
                  <div
                    key={ds}
                    className={`aspect-square ${cellClass} font-label-sm text-label-sm hover:scale-105 transition-transform cursor-default relative group`}
                    title={day ? `${day.completed}/${day.total} (${pct}%)` : 'No data'}
                  >
                    {d.getDate()}
                    {day && pct >= 50 && pct < 100 && (
                      <div className="absolute inset-0 halftone-bg opacity-30 mix-blend-overlay pointer-events-none" />
                    )}
                    {isToday && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-secondary border border-black rounded-full animate-pulse" />
                    )}
                    {day && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white px-2 py-1 text-[10px] hidden group-hover:block whitespace-nowrap z-10">
                        {day.completed}/{day.total} ({pct}%)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-12 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter relative">
            <div className="absolute inset-0 halftone-bg opacity-5 -z-10 bg-surface-container" />
            <StatBlock
              label="30-Day Atma Kriya"
              value={`${stats.akyCompletionRate ?? 0}%`}
              unit="Avg Completion"
              pct={stats.akyCompletionRate ?? 0}
              accent
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, unit, pct, accent }) {
  return (
    <div className="border-t-4 border-primary pt-6 pl-4 relative">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent ? 'bg-secondary' : 'bg-primary'}`} />
      <h4 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-2">{label}</h4>
      <div className="flex items-end gap-3">
        <span className={`font-headline-xl text-headline-xl leading-none ${accent ? 'text-secondary' : 'text-primary'}`}>{value}</span>
        <span className="font-body-md text-body-md text-on-surface-variant mb-2 font-bold uppercase">{unit}</span>
      </div>
      <div className="w-full bg-surface-variant h-1 mt-4">
        <div className={`h-1 ${accent ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
