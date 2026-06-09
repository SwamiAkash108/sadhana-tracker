import { api } from '../api';
import { buildDayRecord } from './dayRecord';
import { getAllActivityDates } from './sadhanaStorage';

let saveTimer = null;
let pendingSave = null;

export function scheduleDaySnapshot(items, date, completedIds) {
  pendingSave = { items, date, completedIds };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (pendingSave) flushDaySnapshot(pendingSave.items, pendingSave.date, pendingSave.completedIds);
    pendingSave = null;
  }, 1500);
}

export async function flushDaySnapshot(items, date, completedIds) {
  const record = buildDayRecord({ items, date, completedIds });
  if (!record.hasActivity) return;
  try {
    await api.saveDaySnapshot(date, record);
  } catch {
    // Offline or unauthenticated — local record still available on this device.
  }
}

export function buildHistoryFromSources(items, progressByDate, snapshotsByDate = {}, limit = 60) {
  const dates = new Set([
    ...Object.keys(progressByDate || {}),
    ...Object.keys(snapshotsByDate || {}),
    ...getAllActivityDates(),
  ]);

  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
    .map(date => {
      const local = buildDayRecord({ items, date, completedIds: progressByDate[date] || [] });
      const remote = snapshotsByDate[date];
      if (local.hasActivity) return local;
      if (remote?.hasActivity) return { ...remote, date };
      return local;
    })
    .filter(record => record.hasActivity);
}
