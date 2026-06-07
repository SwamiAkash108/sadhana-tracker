import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function ProgressScreen({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchStats = useCallback(async (d) => {
    setLoading(true);
    try {
      const data = await api.getStats(d);
      setStats(data);
    } catch (err) { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(days); }, [days, fetchStats]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!stats) return null;

  const currentStreak = stats.streak || 0;
  const longestStreak = 48;
  const today = new Date();

  const monthDates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    monthDates.push(d);
  }

  const dayMap = {};
  (stats.dailyData || []).forEach(day => { dayMap[day.date] = day; });

  return (
    <>
      <div className="lg:hidden space-y-5">
        <JourneyHeader />
        <StreakBoxes current={currentStreak} longest={longestStreak} />
        <DaySelector days={days} setDays={setDays} />
        <CalendarGrid monthDates={monthDates} dayMap={dayMap} today={today} />
        <AveragesCard stats={stats} />
      </div>

      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4">
        <div className="col-span-8 space-y-4">
          <div className="card-wood p-6">
            <JourneyHeader />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <StreakBoxes current={currentStreak} longest={longestStreak} />
            </div>
          </div>
          <div className="card-wood p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-display font-black text-ink uppercase tracking-widest">
                {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} Consistency
              </h3>
              <DaySelector days={days} setDays={setDays} />
            </div>
            <CalendarGrid monthDates={monthDates} dayMap={dayMap} today={today} />
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <div className="card-wood p-6">
            <h3 className="text-xs font-display font-black text-ink uppercase tracking-widest mb-4">
              October Cycle
            </h3>
            <div className="space-y-4">
              <StatRow label="Current Streak" value={`${currentStreak} Days`} sub="Keep the fire burning" />
              <StatRow label="Longest Streak" value={`${longestStreak} Days`} sub="Personal best achieved in Aug" highlight />
            </div>
          </div>
          <div className="card-wood p-6">
            <h3 className="text-xs font-display font-black text-ink uppercase tracking-widest mb-4">
              30-Day Averages
            </h3>
            <div className="space-y-4">
              <AvgRow label="Japa Rounds" value="14.2" unit="rounds/day" pct={85} />
              <AvgRow label="Atma Kriya" value="85" unit="% completion" pct={85} highlight />
              <AvgRow label="Meditation" value="28" unit="min/day" pct={70} />
              <AvgRow label="Hydration" value="2.3" unit="L/day" pct={92} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function JourneyHeader() {
  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-display font-black text-ink mb-1">My Journey</h2>
      <p className="text-[10px] lg:text-xs text-mute italic leading-relaxed">
        &ldquo;The mind is restless and difficult to restrain, but it is subdued by practice.&rdquo;
      </p>
    </div>
  );
}

function StreakBoxes({ current, longest }) {
  return (
    <>
      <div className="stat-card">
        <p className="text-[10px] text-mute uppercase tracking-widest font-bold mb-1">Current Streak</p>
        <p className="text-3xl lg:text-4xl font-display font-black text-ink">{current}</p>
        <p className="text-[9px] text-mute uppercase tracking-wider mt-1">Days</p>
        <div className="mt-2 h-1 bar-wood">
          <div className="bar-wood-fill" style={{ width: `${Math.min(current * 8.3, 100)}%` }} />
        </div>
      </div>
      <div className="stat-card bg-ink">
        <p className="text-[10px] text-paper/40 uppercase tracking-widest font-bold mb-1">
          Longest Streak
        </p>
        <p className="text-3xl lg:text-4xl font-display font-black text-rust">{longest}</p>
        <p className="text-[9px] text-paper/40 uppercase tracking-wider mt-1">Days</p>
      </div>
    </>
  );
}

function StatRow({ label, value, sub, highlight }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] text-mute uppercase tracking-widest font-bold">{label}</span>
        <span className={`text-lg font-display font-black ${highlight ? 'text-rust' : 'text-ink'}`}>
          {value}
        </span>
      </div>
      <p className="text-[9px] text-mute">{sub}</p>
    </div>
  );
}

function AvgRow({ label, value, unit, pct, highlight }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] text-mute uppercase tracking-widest font-bold">{label}</span>
        <span className={`text-sm font-display font-black ${highlight ? 'text-rust' : 'text-ink'}`}>
          {value} <span className="text-[9px] font-sans font-medium text-mute ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="bar-wood">
        <div className={`bar-wood-fill ${highlight ? 'rust' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DaySelector({ days, setDays }) {
  return (
    <div className="flex gap-1.5">
      {[7, 14, 30, 60].map(d => (
        <button
          key={d}
          onClick={() => setDays(d)}
          className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 border-2 border-ink transition-all ${
            days === d ? 'bg-ink text-paper' : 'bg-paper text-mute hover:text-ink'
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

function CalendarGrid({ monthDates, dayMap, today }) {
  const dayNames = ['S','M','T','W','T','F','S'];
  const firstDate = monthDates[0];
  const startDay = firstDate.getDay();
  const leadingBlanks = startDay;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
        {dayNames.map(d => (
          <div key={d} className="text-[9px] lg:text-[10px] text-mute text-center font-bold py-0.5">{d}</div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`l-${i}`} className="aspect-square" />
        ))}
        {monthDates.map((d) => {
          const ds = d.toISOString().split('T')[0];
          const hasData = dayMap[ds];
          const pct = hasData ? Math.round(dayMap[ds].percentage) : 0;
          let bg = 'bg-paper';
          if (hasData && pct >= 100) bg = 'bg-ink';
          else if (hasData && pct >= 50) bg = 'bg-rust';
          else if (hasData && pct > 0) bg = 'bg-stone-dark';
          const isFuture = d > today;
          return (
            <div
              key={ds}
              className={`heat-cell ${bg} ${isFuture ? 'opacity-20' : ''}`}
              title={`${ds}${hasData ? `: ${dayMap[ds].completed}/${dayMap[ds].total}` : ''}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 mt-2 text-[8px] lg:text-[9px] text-mute font-medium">
        <span>0%</span>
        <div className="w-3 h-3 bg-paper border border-ink/15" />
        <div className="w-3 h-3 bg-stone-dark" />
        <div className="w-3 h-3 bg-rust" />
        <div className="w-3 h-3 bg-ink" />
        <span>100%</span>
      </div>
    </div>
  );
}

function AveragesCard({ stats }) {
  return (
    <div className="card-wood p-5">
      <h3 className="text-xs font-bold text-ink uppercase tracking-widest mb-4">30-Day Averages</h3>
      <div className="space-y-3">
        {[
          { label: 'All Sadhana', pct: stats.overallRate || 0 },
          { label: 'Japa', pct: 85 },
          { label: 'Atma Kriya Yoga', pct: 60 },
          { label: 'Hydration', pct: 92 },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-mute w-24 text-right font-medium">{item.label}</span>
            <div className="flex-1 bar-wood">
              <div className={`bar-wood-fill ${item.pct >= 80 ? 'rust' : ''}`} style={{ width: `${item.pct}%` }} />
            </div>
            <span className="text-[10px] text-mute font-bold tabular-nums w-10">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}