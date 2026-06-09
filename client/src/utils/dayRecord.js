import { getAkyCounts, getAkyGreenChecklist, getAkySessionLevel, getAkySessionMeta } from './akyCompletion';
import { getDayStatus, JAPA_GOAL_SEC } from './dayCompletion';
import {
  getCounter,
  getCounterDisplay,
  getCounterMaxDisplay,
  getDoneSessions,
  getExerciseState,
  getJapaState,
  getMaxDoneSessions,
  getWaterMl,
  getWaterState,
  isAkyCategory,
  isExerciseGoalMet,
  isItemPracticedToday,
  isPushupGoalMet,
} from './sadhanaStorage';

function formatMinutes(totalSec) {
  const mins = Math.floor(totalSec / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins} min`;
}

function hasAnyActivity(record) {
  if (record.metCount > 0) return true;
  if (record.akyPractices?.some(p => p.value)) return true;
  if (record.japa?.elapsed > 0) return true;
  if (record.water?.ml > 0) return true;
  if (record.exercise?.elapsed > 0 || record.exercise?.pushups > 0) return true;
  return false;
}

export function buildDayRecord({ items, date, completedIds = [] }) {
  const idSet = completedIds instanceof Set ? completedIds : new Set(completedIds);
  const checklist = items.map(item => ({
    ...item,
    completed: idSet.has(item.id),
  }));

  const dayStatus = getDayStatus({ items, date, completedIds: idSet });
  const akyItems = checklist.filter(i => isAkyCategory(i.category));
  const counts = getAkyCounts(akyItems, date);
  const akyMeta = getAkySessionMeta(dayStatus.akyLevel);
  const akyGreen = getAkyGreenChecklist(counts);

  const akyPractices = akyItems.map(item => {
    const name = item.name || '';
    const type = item.item_type || 'toggle';
    if (type === 'counter') {
      const raw = getCounter(date, item.id);
      const value = getCounterDisplay(item, raw);
      const max = getCounterMaxDisplay(item);
      return { name, value: value > 0 ? `${value}/${max}` : null };
    }
    const sessions = getDoneSessions(date, item.id);
    const max = getMaxDoneSessions(item);
    if (sessions > 0) {
      return { name, value: max > 1 ? `${sessions}/${max} sessions` : 'Done' };
    }
    if (isItemPracticedToday(date, item.id) || item.completed) {
      return { name, value: 'Done' };
    }
    return { name, value: null };
  }).filter(p => p.value);

  const japaState = getJapaState(date);
  const japaItem = checklist.find(i => (i.category || '').toLowerCase() === 'japa');
  const japaElapsed = japaState.elapsed || 0;
  const japaMet = japaElapsed >= JAPA_GOAL_SEC || !!japaItem?.completed;

  const waterState = getWaterState(date);
  const waterMl = getWaterMl(waterState);

  const exerciseState = getExerciseState(date);
  const exerciseMet =
    isExerciseGoalMet(exerciseState.elapsed) ||
    isPushupGoalMet(exerciseState.pushups);

  const pillars = dayStatus.pillars.map(p => {
    let detail = p.detail;
    if (p.key === 'aky') detail = akyMeta.label;
    if (p.key === 'japa' && japaElapsed > 0) detail = formatMinutes(japaElapsed);
    if (p.key === 'water' && waterMl > 0) detail = `${waterMl} ml`;
    if (p.key === 'exercise') {
      const parts = [];
      if (exerciseState.elapsed > 0) parts.push(formatMinutes(exerciseState.elapsed));
      if (exerciseState.pushups > 0) parts.push(`${exerciseState.pushups} push-ups`);
      if (parts.length) detail = parts.join(', ');
    }
    return { ...p, detail: detail || (p.met ? 'Done' : null) };
  });

  const record = {
    date,
    status: dayStatus.status,
    akyLevel: dayStatus.akyLevel,
    akyLabel: akyMeta.label,
    metCount: dayStatus.metCount,
    total: dayStatus.total,
    complete: dayStatus.complete,
    pillars,
    akyPractices,
    akyGreen,
    japa: {
      elapsed: japaElapsed,
      label: japaMet ? formatMinutes(Math.max(japaElapsed, JAPA_GOAL_SEC)) : formatMinutes(japaElapsed),
      met: japaMet,
    },
    water: { ml: waterMl, met: dayStatus.pillars.find(p => p.key === 'water')?.met },
    exercise: {
      elapsed: exerciseState.elapsed,
      pushups: exerciseState.pushups,
      met: exerciseMet,
      label: [
        exerciseState.elapsed > 0 ? formatMinutes(exerciseState.elapsed) : null,
        exerciseState.pushups > 0 ? `${exerciseState.pushups} push-ups` : null,
      ].filter(Boolean).join(', ') || null,
    },
  };

  record.hasActivity = hasAnyActivity(record);
  return record;
}

export function buildDayHistory(items, progressByDate, limit = 60) {
  const dates = new Set([
    ...Object.keys(progressByDate || {}),
  ]);

  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
    .map(date => buildDayRecord({ items, date, completedIds: progressByDate[date] || [] }))
    .filter(record => record.hasActivity);
}

export function mergeSnapshotRecord(localRecord, snapshot) {
  if (!snapshot) return localRecord;
  if (!localRecord?.hasActivity) return { ...snapshot, date: localRecord?.date || snapshot.date };
  return localRecord;
}

export function formatRecordDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
