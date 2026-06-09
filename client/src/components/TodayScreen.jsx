import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { api } from '../api';
import {
  getJapaState, setJapaState,
  getWaterState, toggleWaterGlass, toggleWaterBottle, getWaterMl, isWaterGoalMet, WATER_GOAL_ML,
  getExerciseState, setExerciseState,
  setExercisePushups, isExerciseGoalMet, isPushupGoalMet, EXERCISE_GOAL_SEC, PUSHUP_MAX,
} from '../utils/sadhanaStorage';
import { getAkySessionLevel, getAkySessionMeta } from '../utils/akyCompletion';
import { getDayPillars } from '../utils/dayCompletion';
import { scheduleDaySnapshot } from '../utils/daySnapshot';
import { syncLocalPillarsToServer } from '../utils/syncLocalProgress';
import SanghaNudgePanel from './SanghaNudgePanel';
import ReceivedNudgesBanner from './ReceivedNudgesBanner';
import SessionErrorPanel from './SessionErrorPanel';

const TodayScreen = forwardRef(function TodayScreen({ user, onOpenAky }, ref) {
  const [checklist, setChecklist] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pillarTick, setPillarTick] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [editingCustom, setEditingCustom] = useState(null);
  const [customLabelDraft, setCustomLabelDraft] = useState('');
  const [customLabelError, setCustomLabelError] = useState('');
  const [savingCustomLabel, setSavingCustomLabel] = useState(false);
  const japaRef = useRef(null);
  const checklistRef = useRef(checklist);
  checklistRef.current = checklist;
  const bumpPillars = () => setPillarTick(t => t + 1);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useImperativeHandle(ref, () => ({
    startJapa: () => japaRef.current?.start(),
    scrollToJapa: () => japaRef.current?.scrollIntoView(),
  }));

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const todayData = await api.getToday();
      const syncedChecklist = await syncLocalPillarsToServer(todayData.checklist, todayData.date);
      setChecklist(syncedChecklist);
      setDate(todayData.date);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  useEffect(() => {
    if (!date || checklist.length === 0) return;
    const completedIds = checklist.filter(i => i.completed).map(i => i.id);
    scheduleDaySnapshot(checklist, date, completedIds);
  }, [checklist, date, pillarTick]);

  useEffect(() => {
    if (!date) return;

    const resync = async () => {
      if (document.visibilityState !== 'visible') return;
      const synced = await syncLocalPillarsToServer(checklistRef.current, date);
      setChecklist(synced);
      bumpPillars();
    };

    document.addEventListener('visibilitychange', resync);
    return () => document.removeEventListener('visibilitychange', resync);
  }, [date]);

  const handleToggle = async (itemId) => {
    setChecklist(prev => prev.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i));
    bumpPillars();
    try {
      await api.toggleItem(itemId);
    } catch {
      setChecklist(prev => prev.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i));
      bumpPillars();
    }
  };

  const openCustomEdit = (item) => {
    setEditingCustom(item);
    setCustomLabelDraft(item.name === 'Custom' ? '' : item.name);
    setCustomLabelError('');
  };

  const saveCustomLabel = async (e) => {
    e?.preventDefault();
    if (!editingCustom) return;
    const label = customLabelDraft.trim() || 'Custom';
    setSavingCustomLabel(true);
    setCustomLabelError('');
    try {
      await api.setCustomLabel(editingCustom.id, label);
      setChecklist(prev => prev.map(i =>
        i.id === editingCustom.id ? { ...i, name: label } : i
      ));
      setEditingCustom(null);
    } catch (err) {
      setCustomLabelError(err.message);
    } finally {
      setSavingCustomLabel(false);
    }
  };

  const handleJapaComplete = (completed) => {
    const japaItem = checklist.find(i => (i.category || '').toLowerCase() === 'japa');
    if (japaItem && japaItem.completed !== completed) {
      setChecklist(prev => prev.map(i => i.id === japaItem.id ? { ...i, completed } : i));
    }
    bumpPillars();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <SessionErrorPanel error={error} onRetry={fetchToday} />;
  }

  const today = date ? new Date(date + 'T00:00:00') : new Date();
  const japaItem = checklist.find(i => (i.category || '').toLowerCase() === 'japa');
  const quickItems = checklist.filter(i => (i.category || '').toLowerCase() === 'quick');
  const waterItem = quickItems.find(i => (i.name || '').toLowerCase() === 'water');
  const exerciseItem = quickItems.find(i => (i.name || '').toLowerCase() === 'exercise');
  const otherQuickItems = quickItems.filter(i => {
    const n = (i.name || '').toLowerCase();
    return n !== 'water' && n !== 'exercise';
  });
  const customItems = checklist.filter(i => (i.category || '').toLowerCase() === 'custom')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const pillarToggleItems = otherQuickItems
    .filter(i => ['study', 'abhishekam'].includes((i.name || '').toLowerCase()))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const optionalToggleItems = otherQuickItems
    .filter(i => ['music', 'morning mantras'].includes((i.name || '').toLowerCase()))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const hasOptionalSection = optionalToggleItems.length > 0 || customItems.length > 0;
  const akyItems = checklist.filter(i => {
    const c = (i.category || '').toLowerCase();
    return c !== 'quick' && c !== 'japa';
  });
  const akyDone = akyItems.filter(i => i.completed).length;
  const akyTotal = akyItems.length || 12;
  const akyPct = akyTotal > 0 ? Math.round((akyDone / akyTotal) * 100) : 0;
  const akyLevel = getAkySessionLevel(akyItems, date);
  const akyMeta = getAkySessionMeta(akyLevel);

  void pillarTick;
  const dayProgress = getDayPillars({ checklist, date });
  const { pillars, metCount, total: pillarTotal, pct: dayPct, complete: dayComplete } = dayProgress;

  const dateLabel = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="space-y-8 md:space-y-12">
      <ReceivedNudgesBanner />

      <header className="flex flex-col md:flex-row md:justify-between md:items-start border-b-4 border-primary pb-6 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-headline-xl text-headline-xl text-primary">Today</h2>
            <p className="font-label-sm text-label-sm uppercase bg-primary text-on-primary px-3 py-1 shrink-0 md:hidden text-right">
              <span className="block">{dateLabel}</span>
              <span className="block tabular-nums normal-case">{timeLabel}</span>
            </p>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                Daily progress
              </span>
              <span className={`font-label-sm text-label-sm uppercase tabular-nums ${
                dayComplete ? 'text-[#15803d] font-bold' : 'text-on-surface-variant'
              }`}>
                {metCount} / {pillarTotal}
                {dayComplete && ' · Complete'}
              </span>
            </div>
            <div className={`w-full h-6 border-2 flex overflow-hidden ${
              dayComplete ? 'border-[#15803d]' : 'border-primary'
            }`}>
              {dayComplete ? (
                <div
                  className="h-full w-full"
                  style={{ background: 'repeating-linear-gradient(45deg,#15803d,#15803d 2px,#ffffff 2px,#ffffff 6px)' }}
                />
              ) : (
                <>
                  <div
                    className="h-full diagonal-stripes opacity-80 transition-all duration-500"
                    style={{ width: `${dayPct}%` }}
                  />
                  <div className="bg-surface-variant h-full transition-all duration-500" style={{ width: `${100 - dayPct}%` }} />
                </>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 mt-3">
              {pillars.map(p => (
                <span
                  key={p.key}
                  className={`font-label-sm text-label-sm uppercase truncate ${
                    p.met ? 'text-[#15803d]' : 'text-on-surface-variant'
                  }`}
                >
                  {p.met ? '✓' : '○'} {p.label}
                </span>
              ))}
            </div>
            {dayComplete && user?.id && (
              <SanghaNudgePanel userId={user.id} date={date} />
            )}
          </div>
        </div>
        <div className="hidden md:block shrink-0 text-right">
          <p className="font-label-sm text-label-sm uppercase bg-primary text-on-primary px-3 py-1">
            <span className="block">{dateLabel}</span>
            <span className="block tabular-nums normal-case">{timeLabel}</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <JapaMeditation
          ref={japaRef}
          item={japaItem}
          date={date}
          onCompleteChange={handleJapaComplete}
        />

        <div className="lg:col-span-4 flex flex-col gap-8">
          <button onClick={onOpenAky} className={`bg-surface border-4 p-6 woodcut-shadow relative overflow-hidden text-left transition-colors duration-500 ${akyMeta.border}`}>
            <div className="absolute -right-8 -top-8 w-32 h-32 halftone-bg opacity-20 rounded-full" />
            <div className="flex items-center justify-between relative z-10 mb-2">
              <h3 className="font-headline-sm text-headline-sm uppercase border-b-2 border-primary pb-2 flex-1">Atma Kriya</h3>
              {akyLevel !== 'none' && (
                <span className={`font-label-sm text-label-sm uppercase px-2 py-0.5 ml-2 ${akyMeta.badge}`}>
                  {akyMeta.label}
                </span>
              )}
            </div>
            <div className="relative z-10 flex items-end gap-2 mb-2">
              <span className="font-headline-lg text-headline-lg text-primary leading-none">{akyDone}</span>
              <span className="font-body-lg text-body-lg text-on-surface-variant pb-1">/ {akyTotal}</span>
            </div>
            <p className="font-label-sm text-label-sm uppercase mb-6 text-on-surface-variant relative z-10">Techniques Completed</p>
            <div className={`w-full h-6 border-2 flex relative z-10 overflow-hidden ${akyMeta.border}`}>
              {akyLevel === 'green' ? (
                <div className="h-full w-full" style={{ background: 'repeating-linear-gradient(45deg,#15803d,#15803d 2px,#ffffff 2px,#ffffff 6px)' }} />
              ) : akyLevel === 'orange' ? (
                <div className="h-full w-full" style={{ background: 'repeating-linear-gradient(45deg,#ea580c,#ea580c 2px,#ffffff 2px,#ffffff 6px)' }} />
              ) : (
                <>
                  <div className="h-full diagonal-stripes opacity-80" style={{ width: `${akyPct}%` }} />
                  <div className="bg-surface-variant h-full" style={{ width: `${100 - akyPct}%` }} />
                </>
              )}
            </div>
          </button>

          {waterItem && (
            <WaterTracker
              item={waterItem}
              date={date}
              onGlassToggle={async (goalMet) => {
                bumpPillars();
                const shouldComplete = goalMet;
                if (shouldComplete !== waterItem.completed) {
                  setChecklist(prev => prev.map(i =>
                    i.id === waterItem.id ? { ...i, completed: shouldComplete } : i
                  ));
                  try {
                    if (shouldComplete) {
                      await api.completeItem(waterItem.id);
                    } else {
                      await api.toggleItem(waterItem.id);
                    }
                  } catch {
                    setChecklist(prev => prev.map(i =>
                      i.id === waterItem.id ? { ...i, completed: !shouldComplete } : i
                    ));
                    bumpPillars();
                  }
                }
              }}
            />
          )}

          {exerciseItem && (
            <ExerciseTracker
              date={date}
              completed={exerciseItem.completed}
              onGoalChange={async (goalMet) => {
                bumpPillars();
                if (!goalMet) {
                  setChecklist(prev => {
                    const current = prev.find(i => i.id === exerciseItem.id);
                    if (!current?.completed) return prev;
                    (async () => {
                      try {
                        await api.toggleItem(exerciseItem.id);
                      } catch {
                        setChecklist(p => p.map(i =>
                          i.id === exerciseItem.id ? { ...i, completed: true } : i
                        ));
                        bumpPillars();
                      }
                    })();
                    return prev.map(i =>
                      i.id === exerciseItem.id ? { ...i, completed: false } : i
                    );
                  });
                  return;
                }
                setChecklist(prev => {
                  const current = prev.find(i => i.id === exerciseItem.id);
                  if (current?.completed) return prev;
                  (async () => {
                    try {
                      await api.completeItem(exerciseItem.id);
                    } catch {
                      setChecklist(p => p.map(i =>
                        i.id === exerciseItem.id ? { ...i, completed: false } : i
                      ));
                      bumpPillars();
                    }
                  })();
                  return prev.map(i =>
                    i.id === exerciseItem.id ? { ...i, completed: true } : i
                  );
                });
              }}
            />
          )}
        </div>

        {pillarToggleItems.length > 0 && (
        <div className="col-span-1 lg:col-span-12 grid grid-cols-2 gap-3 relative z-10">
          {pillarToggleItems.map(item => (
            <QuickToggleButton key={item.id} item={item} onToggle={handleToggle} />
          ))}
        </div>
        )}

        {hasOptionalSection && (
          <section className="col-span-1 lg:col-span-12 relative z-10">
            <h3 className="font-headline-sm text-headline-sm uppercase mb-3 border-b-2 border-primary pb-2">
              Optional
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {optionalToggleItems.map(item => (
                <QuickToggleButton key={item.id} item={item} onToggle={handleToggle} />
              ))}
              {customItems.map(item => (
                <CustomQuickToggle
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onEdit={() => openCustomEdit(item)}
                />
              ))}
            </div>
          </section>
        )}

        {editingCustom && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
            onClick={() => setEditingCustom(null)}
            role="presentation"
          >
            <form
              onSubmit={saveCustomLabel}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border-4 border-primary p-6 w-full max-w-sm"
              role="dialog"
              aria-labelledby="custom-label-title"
            >
              <h3 id="custom-label-title" className="font-headline-sm text-headline-sm text-primary mb-2">
                Name your practice
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                What do you want to track in this box?
              </p>
              <input
                type="text"
                value={customLabelDraft}
                onChange={(e) => setCustomLabelDraft(e.target.value)}
                placeholder="e.g. Pranayama, Reading, Walk…"
                maxLength={24}
                autoFocus
                className="w-full border-2 border-primary bg-surface-bright px-4 py-3 font-body-md text-body-md mb-3 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              {customLabelError && (
                <p className="font-label-sm text-label-sm text-secondary mb-3">{customLabelError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCustom(null)}
                  className="flex-1 border-2 border-primary py-3 font-label-sm text-label-sm uppercase hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomLabel}
                  className="flex-1 border-2 border-primary bg-primary text-on-primary py-3 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50"
                >
                  {savingCustomLabel ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
});

export default TodayScreen;

const QUICK_ICONS = {
  study: 'menu_book',
  abhishekam: 'water',
  music: 'music_note',
  'morning mantras': 'wb_twilight',
};

function CustomQuickToggle({ item, onToggle, onEdit }) {
  const name = item.name || 'Custom';
  const done = item.completed;
  const isDefault = name === 'Custom';
  const isLongLabel = name.length > 12;

  const handleClick = () => {
    if (isDefault) {
      onEdit();
      return;
    }
    onToggle(item.id);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className={`w-full border-2 p-3 sm:p-4 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-colors group min-h-[5.5rem] cursor-pointer touch-manipulation relative z-10 active:scale-[0.98] ${
          done
            ? 'border-[#15803d] bg-[#15803d] text-white woodcut-shadow-sm'
            : isDefault
              ? 'border-dashed border-primary bg-surface-bright hover:bg-surface-variant'
              : 'border-primary hover:bg-secondary hover:text-on-secondary hover:border-secondary bg-surface'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label={isDefault ? 'Name this optional activity' : `${name}${done ? ', completed' : ''}`}
      >
        <span
          className="material-symbols-outlined text-[28px] sm:text-[32px] group-hover:scale-110 transition-transform"
          style={{ fontVariationSettings: `'FILL' ${done ? 1 : 0}` }}
        >
          {isDefault ? 'add_circle' : 'star'}
        </span>
        <span className={`font-label-sm text-label-sm uppercase text-center leading-tight ${isLongLabel ? 'text-[10px] sm:text-label-sm' : ''} ${isDefault ? 'text-on-surface-variant' : ''}`}>
          {isDefault ? 'Custom' : name}{!isDefault && done ? ' ✓' : ''}
        </span>
        {isDefault && (
          <span className="font-label-sm text-[10px] uppercase text-on-surface-variant opacity-80">
            Tap to name
          </span>
        )}
      </button>
      {!isDefault && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-1 right-1 z-20 p-1 rounded-full hover:bg-surface-variant transition-colors"
          title="Rename practice"
          aria-label={`Rename ${name}`}
        >
          <span className="material-symbols-outlined text-base text-on-surface-variant">edit</span>
        </button>
      )}
    </div>
  );
}

function QuickToggleButton({ item, onToggle }) {
  const name = item.name || '';
  const done = item.completed;
  const icon = QUICK_ICONS[name.toLowerCase()] || 'check_circle';
  const isLongLabel = name.length > 12;

  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      className={`border-2 p-3 sm:p-4 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-colors group min-h-[5.5rem] cursor-pointer touch-manipulation relative z-10 active:scale-[0.98] ${
        done
          ? 'border-[#15803d] bg-[#15803d] text-white woodcut-shadow-sm'
          : 'border-primary hover:bg-secondary hover:text-on-secondary hover:border-secondary bg-surface'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className="material-symbols-outlined text-[28px] sm:text-[32px] group-hover:scale-110 transition-transform"
        style={{ fontVariationSettings: `'FILL' ${done ? 1 : 0}` }}
      >
        {icon}
      </span>
      <span className={`font-label-sm text-label-sm uppercase text-center leading-tight ${isLongLabel ? 'text-[10px] sm:text-label-sm' : ''}`}>
        {name}{done ? ' ✓' : ''}
      </span>
    </button>
  );
}

function ExerciseTracker({ date, completed, onGoalChange }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [pushups, setPushups] = useState(0);
  const syncedRef = useRef(false);
  const onGoalChangeRef = useRef(onGoalChange);
  onGoalChangeRef.current = onGoalChange;

  const goalReached = elapsed >= EXERCISE_GOAL_SEC;
  const pushupsDone = isPushupGoalMet(pushups);
  const isComplete = goalReached || pushupsDone;

  const syncGoal = (nextElapsed, nextPushups = pushups) => {
    const met = isExerciseGoalMet(nextElapsed) || isPushupGoalMet(nextPushups);
    if (met && !syncedRef.current) {
      syncedRef.current = true;
      onGoalChange(true);
    } else if (!met && syncedRef.current) {
      syncedRef.current = false;
      onGoalChange(false);
    }
  };

  useEffect(() => {
    if (!date) return;
    const state = getExerciseState(date);
    setElapsed(state.elapsed);
    setRunning(state.running && state.elapsed < EXERCISE_GOAL_SEC);
    setPushups(state.pushups);
    const localMet = isExerciseGoalMet(state.elapsed) || isPushupGoalMet(state.pushups);
    syncedRef.current = completed && localMet;
    if (localMet && !completed) {
      onGoalChangeRef.current(true);
    }
  }, [date, completed]);

  useEffect(() => {
    if (!running || !date) return;
    const id = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        const state = getExerciseState(date);
        setExerciseState(date, next, true, state.pushups);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, date]);

  useEffect(() => {
    if (!date) return;
    syncGoal(elapsed, pushups);
  }, [elapsed, pushups, date]);

  const persist = (nextElapsed, nextRunning, nextPushups = pushups) => {
    setElapsed(nextElapsed);
    setRunning(nextRunning);
    setPushups(nextPushups);
    setExerciseState(date, nextElapsed, nextRunning, nextPushups);
    syncGoal(nextElapsed, nextPushups);
  };

  const handleToggleRunning = () => {
    const next = !running;
    setRunning(next);
    setExerciseState(date, elapsed, next, pushups);
  };

  const handleAdjust = (deltaSec) => {
    const state = getExerciseState(date);
    const next = Math.max(0, state.elapsed + deltaSec);
    persist(next, false, state.pushups);
  };

  const handleSet10Min = () => {
    persist(EXERCISE_GOAL_SEC, false, pushups);
  };

  const handlePushupChange = (delta) => {
    const next = Math.min(PUSHUP_MAX, Math.max(0, pushups + delta));
    setPushups(next);
    setExercisePushups(date, next);
    syncGoal(elapsed, next);
  };

  const timerLabel = running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start';

  return (
    <div className={`border-4 p-4 woodcut-shadow transition-colors duration-700 ${
      isComplete ? 'border-[#15803d] bg-[#f0fdf4]' : 'border-primary bg-surface'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 1", color: isComplete ? '#15803d' : undefined }}
        >
          fitness_center
        </span>
        <h3 className="font-headline-sm text-headline-sm uppercase">Exercise</h3>
        {isComplete && (
          <span className="ml-auto font-label-sm text-label-sm uppercase px-2 py-0.5 bg-[#15803d] text-white">
            Done
          </span>
        )}
      </div>

      {/* Timer + start/pause */}
      <div className="flex items-stretch gap-2 mb-3">
        <div className="flex-1 text-center py-2.5 border-2 border-primary bg-surface-bright flex flex-col justify-center min-h-[4.5rem]">
          <span className={`font-headline-lg text-headline-lg tabular-nums leading-none ${
            goalReached ? 'text-[#15803d]' : 'text-primary'
          }`}>
            {formatJapaTime(elapsed)}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">/ 10 min</span>
        </div>
        <button
          type="button"
          onClick={handleToggleRunning}
          className="w-[4.5rem] shrink-0 border-2 border-primary flex flex-col items-center justify-center gap-1 font-label-sm text-label-sm uppercase hover:bg-secondary hover:text-on-secondary hover:border-secondary transition-colors woodcut-shadow-sm"
          aria-label={timerLabel}
        >
          <span className="material-symbols-outlined text-2xl">
            {running ? 'pause' : 'play_arrow'}
          </span>
          <span className="text-[10px] leading-none">{timerLabel}</span>
        </button>
      </div>

      {/* Time adjustment — subtract · goal · add */}
      <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1.5">Adjust time</p>
      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-2 gap-2">
          <TimeBtn label="−10 min" onClick={() => handleAdjust(-600)} />
          <TimeBtn label="−5 min" onClick={() => handleAdjust(-300)} />
        </div>
        <TimeBtn label="Set 10 min" onClick={handleSet10Min} accent className="w-full" />
        <div className="grid grid-cols-2 gap-2">
          <TimeBtn label="+5 min" onClick={() => handleAdjust(300)} />
          <TimeBtn label="+10 min" onClick={() => handleAdjust(600)} />
        </div>
      </div>

      <div
        className={`w-full border-2 p-3 flex items-center justify-between gap-3 transition-colors ${
          pushupsDone
            ? 'border-[#15803d] bg-[#15803d] text-white'
            : 'border-primary bg-surface'
        }`}
      >
        <span className="font-label-sm text-label-sm uppercase min-w-0">Aaradhaka&apos;s Push-Up</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <PushupButton
            label="Decrease push-ups"
            disabled={pushups <= 0}
            done={pushupsDone}
            onClick={() => handlePushupChange(-1)}
          >
            −
          </PushupButton>
          <span className="w-9 text-center font-label-sm text-label-sm tabular-nums leading-none">
            {pushups}
          </span>
          <PushupButton
            label="Increase push-ups"
            disabled={pushups >= PUSHUP_MAX}
            done={pushupsDone}
            onClick={() => handlePushupChange(1)}
          >
            +
          </PushupButton>
        </div>
      </div>
    </div>
  );
}

function PushupButton({ children, disabled, done, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-9 h-9 shrink-0 border-2 flex items-center justify-center font-label-sm text-label-sm leading-none transition-colors ${
        disabled
          ? done
            ? 'border-white/40 text-white/40 bg-transparent cursor-not-allowed'
            : 'border-primary text-outline-variant bg-surface-bright cursor-not-allowed'
          : done
            ? 'border-white text-white bg-transparent hover:bg-white/20'
            : 'border-primary bg-surface text-primary hover:bg-secondary hover:text-on-secondary hover:border-secondary'
      }`}
    >
      {children}
    </button>
  );
}

function TimeBtn({ label, onClick, accent, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-2 border-primary py-2 px-1 font-label-sm text-label-sm uppercase transition-colors woodcut-shadow-sm ${className} ${
        accent
          ? 'bg-primary text-on-primary hover:bg-secondary hover:border-secondary'
          : 'bg-surface hover:bg-surface-variant'
      }`}
    >
      {label}
    </button>
  );
}

function WaterTracker({ item, date, onGlassToggle }) {
  const [water, setWater] = useState(() => getWaterState(date));
  const ml = getWaterMl(water);
  const goalMet = isWaterGoalMet(water);

  useEffect(() => {
    setWater(getWaterState(date));
  }, [date]);

  const syncGoal = (state) => {
    setWater(state);
    onGlassToggle(isWaterGoalMet(state));
  };

  const handleGlassClick = (index) => {
    toggleWaterGlass(date, index);
    syncGoal(getWaterState(date));
  };

  const handleBottleClick = (index) => {
    toggleWaterBottle(date, index);
    syncGoal(getWaterState(date));
  };

  return (
    <div className={`border-4 p-4 woodcut-shadow transition-colors duration-700 ${
      goalMet ? 'border-[#15803d] bg-[#f0fdf4]' : 'border-primary bg-surface'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1", color: goalMet ? '#15803d' : '#2563eb' }}
          >
            water_drop
          </span>
          <h3 className="font-headline-sm text-headline-sm uppercase">Water</h3>
        </div>
        <span className={`font-label-sm text-label-sm uppercase tabular-nums ${
          goalMet ? 'text-[#15803d] font-bold' : 'text-on-surface-variant'
        }`}>
          {ml} / {WATER_GOAL_ML} ml
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {water.glasses.map((filled, i) => (
          <WaterGlass key={i} filled={filled} onClick={() => handleGlassClick(i)} />
        ))}
      </div>

      <p className="font-label-sm text-label-sm text-on-surface-variant mt-4 mb-2 text-center uppercase">
        750 ml bottles
      </p>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-[12rem] sm:max-w-none mx-auto sm:mx-0">
        {water.bottles.map((filled, i) => (
          <WaterBottle key={i} filled={filled} onClick={() => handleBottleClick(i)} />
        ))}
      </div>

      <p className={`font-label-sm text-label-sm mt-3 text-center ${
        goalMet ? 'text-[#15803d] font-bold' : 'text-on-surface-variant'
      }`}>
        {goalMet ? '2 litres — goal reached!' : 'Tap a glass (250 ml) or bottle (750 ml)'}
      </p>
    </div>
  );
}

function WaterGlass({ filled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-1 hover:scale-105 transition-transform active:scale-95"
      aria-label={filled ? '250ml drunk — tap to empty' : 'Empty glass — tap to fill'}
    >
      <svg viewBox="0 0 40 52" className="w-9 h-12" aria-hidden="true">
        {/* Simple glass — open top, straight sides, flat base */}
        <path
          d="M10 6 L14 46 H26 L30 6 Z"
          fill="white"
          stroke="#000"
          strokeWidth="2"
          strokeLinejoin="miter"
        />
        {/* Water */}
        {filled && (
          <rect x="14.5" y="22" width="11" height="23.5" fill="#3b82f6" />
        )}
        {/* Open rim */}
        <line x1="10" y1="6" x2="30" y2="6" stroke="#000" strokeWidth="2.5" strokeLinecap="square" />
      </svg>
      <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">250ml</span>
    </button>
  );
}

function WaterBottle({ filled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-1 hover:scale-105 transition-transform active:scale-95"
      aria-label={filled ? '750ml drunk — tap to empty' : 'Empty bottle — tap to fill'}
    >
      <svg viewBox="0 0 40 64" className="w-10 h-14" aria-hidden="true">
        {/* Bottle neck */}
        <rect x="16" y="4" width="8" height="10" fill="white" stroke="#000" strokeWidth="2" />
        {/* Bottle cap */}
        <rect x="14.5" y="2" width="11" height="4" fill="white" stroke="#000" strokeWidth="2" />
        {/* Bottle body */}
        <path
          d="M12 14 H28 C32 14 34 18 34 24 V56 C34 59 31 62 28 62 H12 C9 62 6 59 6 56 V24 C6 18 8 14 12 14 Z"
          fill="white"
          stroke="#000"
          strokeWidth="2"
          strokeLinejoin="miter"
        />
        {filled && (
          <rect x="9" y="30" width="22" height="29" rx="2" fill="#3b82f6" />
        )}
      </svg>
      <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">750ml</span>
    </button>
  );
}

const JAPA_GOAL_MIN = 60;
const JAPA_GOAL_SEC = JAPA_GOAL_MIN * 60;

function formatJapaTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const JapaMeditation = forwardRef(function JapaMeditation({ item, date, onCompleteChange }, ref) {
  const containerRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [marking, setMarking] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const syncedRef = useRef(false);

  const goalReached = elapsed >= JAPA_GOAL_SEC;
  const markedComplete = !!item?.completed;

  useEffect(() => {
    if (!date) return;
    const state = getJapaState(date);
    setElapsed(state.elapsed);
    setRunning(!!state.running);
    syncedRef.current = item?.completed ?? false;
  }, [date, item?.completed]);

  useImperativeHandle(ref, () => ({
    start: () => setRunning(true),
    scrollIntoView: () => containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  }));

  useEffect(() => {
    if (!running || !date) return;
    const id = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        setJapaState(date, next, true);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, date]);

  useEffect(() => {
    if (!date || !item || item.completed || syncedRef.current) return;
    if (elapsed >= JAPA_GOAL_SEC) {
      syncedRef.current = true;
      api.completeItem(item.id)
        .then(() => onCompleteChange?.(true))
        .catch(() => { syncedRef.current = false; });
    }
  }, [elapsed, date, item, onCompleteChange]);

  const handleToggleRunning = () => {
    const next = !running;
    setRunning(next);
    if (date) setJapaState(date, elapsed, next);
  };

  const handleMarkComplete = async () => {
    if (!item || item.completed || marking) return;
    setMarking(true);
    setRunning(false);
    setElapsed(JAPA_GOAL_SEC);
    if (date) setJapaState(date, JAPA_GOAL_SEC, false);
    syncedRef.current = true;
    try {
      await api.completeItem(item.id);
      onCompleteChange?.(true);
    } catch {
      syncedRef.current = false;
    } finally {
      setMarking(false);
    }
  };

  const handleAdjust = (deltaSec) => {
    setRunning(false);
    setElapsed(prev => {
      const next = Math.max(0, prev + deltaSec);
      if (date) setJapaState(date, next, false);
      return next;
    });
  };

  const handleAddCustomMinutes = () => {
    const mins = Number(customMinutes);
    if (!Number.isFinite(mins) || mins <= 0) return;
    handleAdjust(Math.round(mins * 60));
    setCustomMinutes('');
  };

  const pct = Math.min(100, (elapsed / JAPA_GOAL_SEC) * 100);
  const ringColor = goalReached ? '#15803d' : '#000000';
  const timerLabel = running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start';

  return (
    <div
      ref={containerRef}
      className={`lg:col-span-8 border-4 p-6 md:p-12 flex flex-col items-center justify-center relative woodcut-shadow transition-colors duration-700 ${
        goalReached
          ? 'border-[#15803d] bg-[#f0fdf4]'
          : markedComplete
            ? 'border-[#15803d] bg-surface'
            : 'border-primary bg-surface'
      }`}
    >
      <div className={`absolute top-4 left-4 px-2 py-1 font-label-sm text-label-sm uppercase ${
        goalReached ? 'bg-[#15803d] text-white' : 'bg-primary text-on-primary'
      }`}>
        JAPA MEDITATION
      </div>
      {goalReached && (
        <div className="absolute top-4 right-4 bg-[#15803d] text-white px-2 py-1 font-label-sm text-label-sm uppercase">
          60 Min Complete
        </div>
      )}
      {markedComplete && !goalReached && (
        <div className="absolute top-4 right-4 bg-[#15803d] text-white px-2 py-1 font-label-sm text-label-sm uppercase">
          Complete
        </div>
      )}
      <div className="relative w-60 h-60 md:w-80 md:h-80 flex items-center justify-center mt-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" fill="none" r="45" stroke={goalReached ? '#bbf7d0' : '#e2e2e2'} strokeWidth="4" />
          <circle
            cx="50" cy="50" fill="none" r="45"
            stroke={ringColor}
            strokeDasharray="283"
            strokeDashoffset={goalReached ? 0 : 283 - (pct / 100) * 283}
            strokeWidth="8"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center text-center">
          <span className={`font-headline-lg text-headline-lg tracking-tighter tabular-nums transition-colors duration-700 ${
            goalReached ? 'text-[#15803d]' : 'text-primary'
          }`}>
            {formatJapaTime(elapsed)}
          </span>
          <span className={`font-label-sm text-label-sm uppercase border-t-2 pt-1 mt-1 tabular-nums ${
            goalReached ? 'border-[#15803d] text-[#15803d]' : 'border-primary text-on-surface-variant'
          }`}>
            / 60 min
          </span>
        </div>
      </div>
      <div className="mt-6 w-full max-w-xs md:max-w-sm">
        <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1.5 text-center">Add time</p>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="Minutes"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomMinutes(); }}
            className="flex-1 min-w-0 border-2 border-primary bg-surface px-3 py-2 font-label-sm text-label-sm tabular-nums focus:outline-none focus:border-secondary placeholder:text-outline-variant"
            aria-label="Custom minutes to add"
          />
          <button
            type="button"
            onClick={handleAddCustomMinutes}
            disabled={!customMinutes || Number(customMinutes) <= 0}
            className="shrink-0 border-2 border-primary bg-primary text-on-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
      <div className="mt-8 md:mt-12 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={handleToggleRunning}
          className="bg-primary text-on-primary border-2 border-primary px-6 py-2 font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary hover:border-secondary transition-colors woodcut-shadow-sm"
        >
          {timerLabel}
        </button>
        {!goalReached && !markedComplete && (
          <button
            onClick={handleMarkComplete}
            disabled={marking}
            className="bg-surface text-primary border-4 border-primary px-8 md:px-10 py-3 md:py-4 font-headline-sm text-headline-sm uppercase tracking-widest hover:bg-[#15803d] hover:border-[#15803d] hover:text-white transition-colors woodcut-shadow-sm disabled:opacity-50"
          >
            {marking ? 'Saving…' : 'Completed'}
          </button>
        )}
        {goalReached && (
          <div className="flex items-center gap-2 text-[#15803d] font-headline-sm text-headline-sm uppercase">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {running ? '60 min goal reached — timer running' : '60 min goal reached'}
          </div>
        )}
        {markedComplete && !goalReached && (
          <div className="flex items-center gap-2 text-[#15803d] font-headline-sm text-headline-sm uppercase">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Japa done for today
          </div>
        )}
      </div>
    </div>
  );
});
