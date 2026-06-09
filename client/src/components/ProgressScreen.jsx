import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { buildDayRecord, formatRecordDate } from '../utils/dayRecord';
import { buildHistoryFromSources } from '../utils/daySnapshot';
import { getSadhanaDate, getMonthBounds } from '../utils/sadhanaDate';
import {
  buildStatusByDate,
  computeCurrentStreak,
  computeLongestStreak,
  getMonthDayStatuses,
} from '../utils/streakHistory';
import { DayHistoryCard } from './DayHistoryPanel';
import SessionErrorPanel from './SessionErrorPanel';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [longestStreakEndDate, setLongestStreakEndDate] = useState('');
  const [monthDays, setMonthDays] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [items, setItems] = useState([]);
  const [progressByDate, setProgressByDate] = useState({});

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const sadhanaToday = getSadhanaDate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ items: itemList }, { progress }, { snapshots }] = await Promise.all([
        api.getItems(),
        api.getProgressRange(),
        api.getDaySnapshots(),
      ]);

      const statusByDate = buildStatusByDate(itemList, progress);
      const streak = computeCurrentStreak(statusByDate, sadhanaToday);
      const { longest, endDate } = computeLongestStreak(statusByDate, sadhanaToday);
      const dayHistory = buildHistoryFromSources(itemList, progress, snapshots);

      setItems(itemList);
      setProgressByDate(progress);
      setCurrentStreak(streak);
      setLongestStreak(longest);
      setLongestStreakEndDate(endDate);
      setMonthDays(getMonthDayStatuses(statusByDate, year, month));
      setHistory(dayHistory);
      setSelectedDate(prev => prev || sadhanaToday);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year, month, sadhanaToday]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedRecord = useMemo(() => {
    if (!selectedDate) return null;
    const fromHistory = history.find(r => r.date === selectedDate);
    if (fromHistory) return fromHistory;
    if (items.length === 0) return null;
    return buildDayRecord({
      items,
      date: selectedDate,
      completedIds: progressByDate[selectedDate] || [],
    });
  }, [selectedDate, history, items, progressByDate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <SessionErrorPanel error={error} onRetry={fetchData} />;
  }

  const dayMap = Object.fromEntries(monthDays.map(day => [day.date, day]));
  const longestEnd = longestStreakEndDate
    ? new Date(longestStreakEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  const { start: monthStart, daysInMonth } = getMonthBounds(year, month);
  const firstWeekday = new Date(`${monthStart}T12:00:00`).getDay();
  const monthDateStrings = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });

  return (
    <div className="space-y-10">
      <div className="border-b-4 border-primary pb-6 relative">
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
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-3 opacity-70">
              Partial or full practice counts.
            </p>
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
          <div className="bg-surface stark-border woodcut-shadow p-8 flex flex-col">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 border-b-4 border-primary pb-4 gap-3">
              <h3 className="font-headline-md text-headline-md text-primary tracking-tight">{monthName} Consistency</h3>
              <div className="flex flex-wrap items-center gap-3 font-label-sm text-label-sm md:justify-end">
                <div className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-[#15803d]" /> Full</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-[#ea580c]" /> Partial</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 border border-primary bg-surface" /> Miss</div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center font-label-sm text-label-sm uppercase text-on-surface-variant py-2">{d}</div>
              ))}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {monthDateStrings.map(ds => {
                const dayNum = Number(ds.split('-')[2]);
                const day = dayMap[ds];
                const status = day?.status || 'none';
                const isToday = ds === sadhanaToday;
                const isFuture = ds > sadhanaToday;
                const isSelected = ds === selectedDate;

                let cellClass = 'bg-surface thin-border flex items-center justify-center text-primary';
                if (status === 'green') cellClass = 'bg-[#15803d] thin-border flex items-center justify-center text-white';
                else if (status === 'orange') cellClass = 'bg-[#ea580c] thin-border flex items-center justify-center text-white';
                if (isFuture) cellClass += ' opacity-50';
                if (isSelected) cellClass += ' ring-2 ring-black ring-offset-1';

                return (
                  <button
                    key={ds}
                    type="button"
                    disabled={isFuture}
                    onClick={() => setSelectedDate(ds)}
                    className={`aspect-square ${cellClass} font-label-sm text-label-sm hover:scale-105 transition-transform relative group disabled:cursor-default disabled:hover:scale-100`}
                    title="View this day's practice"
                  >
                    {dayNum}
                    {status === 'orange' && (
                      <div className="absolute inset-0 halftone-bg opacity-30 mix-blend-overlay pointer-events-none" />
                    )}
                    {isToday && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-secondary border border-black rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t-4 border-primary pt-6">
              <h3 className="font-headline-sm text-headline-sm uppercase mb-4">
                {selectedDate ? formatRecordDate(selectedDate) : 'Select a day'}
              </h3>
              {selectedRecord?.hasActivity ? (
                <DayHistoryCard record={selectedRecord} hideHeader />
              ) : (
                <div className="border-2 border-primary bg-surface-bright p-8 text-center">
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {selectedDate
                      ? 'Nothing logged for this day yet.'
                      : 'Tap a date on the calendar above.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
