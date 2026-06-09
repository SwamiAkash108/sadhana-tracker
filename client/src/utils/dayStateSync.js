import { api } from '../api';

const COUNTER_KEY = 'sadhana_counters';
const DONE_SESSIONS_KEY = 'sadhana_done_sessions';
const JAPA_KEY = 'sadhana_japa_timer';
const WATER_KEY = 'sadhana_water_glasses';
const EXERCISE_KEY = 'sadhana_exercise';

export const WATER_GLASS_COUNT = 8;
export const WATER_BOTTLE_COUNT = 3;

const cache = {};
const saveTimers = {};

function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function emptyWaterState() {
  return {
    glasses: Array(WATER_GLASS_COUNT).fill(false),
    bottles: Array(WATER_BOTTLE_COUNT).fill(false),
  };
}

export function normalizeWaterState(saved) {
  if (!saved) return emptyWaterState();
  if (Array.isArray(saved)) {
    const glasses = saved.length === WATER_GLASS_COUNT ? saved : Array(WATER_GLASS_COUNT).fill(false);
    return { glasses, bottles: Array(WATER_BOTTLE_COUNT).fill(false) };
  }
  const glasses = Array.isArray(saved.glasses) && saved.glasses.length === WATER_GLASS_COUNT
    ? saved.glasses
    : Array(WATER_GLASS_COUNT).fill(false);
  const bottles = Array.isArray(saved.bottles) && saved.bottles.length === WATER_BOTTLE_COUNT
    ? saved.bottles
    : Array(WATER_BOTTLE_COUNT).fill(false);
  return { glasses, bottles };
}

export function emptyDayState() {
  return {
    japa: { elapsed: 0, running: false },
    exercise: { elapsed: 0, running: false, pushups: 0 },
    water: emptyWaterState(),
    counters: {},
    doneSessions: {},
  };
}

export function normalizeDayState(state) {
  const base = emptyDayState();
  if (!state || typeof state !== 'object') return base;
  return {
    japa: {
      elapsed: Math.max(0, Number(state.japa?.elapsed) || 0),
      running: !!state.japa?.running,
    },
    exercise: {
      elapsed: Math.max(0, Number(state.exercise?.elapsed) || 0),
      running: !!state.exercise?.running,
      pushups: Math.max(0, Number(state.exercise?.pushups) || 0),
    },
    water: normalizeWaterState(state.water),
    counters: { ...(state.counters || {}) },
    doneSessions: { ...(state.doneSessions || {}) },
  };
}

function mergeWater(remote, local) {
  const a = normalizeWaterState(remote);
  const b = normalizeWaterState(local);
  return {
    glasses: a.glasses.map((v, i) => v || b.glasses[i]),
    bottles: a.bottles.map((v, i) => v || b.bottles[i]),
  };
}

function mergeMaxMaps(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = {};
  for (const key of keys) {
    out[key] = Math.max(Number(a[key]) || 0, Number(b[key]) || 0);
  }
  return out;
}

function mergeStates(remote, local) {
  const r = normalizeDayState(remote);
  const l = normalizeDayState(local);
  return normalizeDayState({
    japa: {
      elapsed: Math.max(r.japa.elapsed, l.japa.elapsed),
      running: r.japa.running || l.japa.running,
    },
    exercise: {
      elapsed: Math.max(r.exercise.elapsed, l.exercise.elapsed),
      running: r.exercise.running || l.exercise.running,
      pushups: Math.max(r.exercise.pushups, l.exercise.pushups),
    },
    water: mergeWater(r.water, l.water),
    counters: mergeMaxMaps(r.counters, l.counters),
    doneSessions: mergeMaxMaps(r.doneSessions, l.doneSessions),
  });
}

function readLegacyLocalState(date) {
  const counters = readStore(COUNTER_KEY);
  const doneSessions = readStore(DONE_SESSIONS_KEY);
  const counterMap = {};
  const sessionMap = {};
  for (const [key, value] of Object.entries(counters)) {
    const [d, itemId] = key.split(':');
    if (d === date) counterMap[itemId] = value;
  }
  for (const [key, value] of Object.entries(doneSessions)) {
    const [d, itemId] = key.split(':');
    if (d === date) sessionMap[itemId] = value;
  }

  const japaStore = readStore(JAPA_KEY);
  const japa = japaStore.date === date
    ? { elapsed: japaStore.elapsed ?? 0, running: !!japaStore.running }
    : { elapsed: 0, running: false };

  const waterStore = readStore(WATER_KEY);
  const exerciseStore = readStore(EXERCISE_KEY);
  const exercise = exerciseStore[date] || { elapsed: 0, running: false, pushups: 0 };

  return normalizeDayState({
    japa,
    exercise,
    water: waterStore[date],
    counters: counterMap,
    doneSessions: sessionMap,
  });
}

function writeLegacyFromState(date, state) {
  const normalized = normalizeDayState(state);

  writeStore(JAPA_KEY, {
    date,
    elapsed: normalized.japa.elapsed,
    running: normalized.japa.running,
  });

  const waterStore = readStore(WATER_KEY);
  waterStore[date] = normalized.water;
  writeStore(WATER_KEY, waterStore);

  const exerciseStore = readStore(EXERCISE_KEY);
  exerciseStore[date] = normalized.exercise;
  writeStore(EXERCISE_KEY, exerciseStore);

  const counterStore = readStore(COUNTER_KEY);
  for (const [itemId, value] of Object.entries(normalized.counters)) {
    counterStore[`${date}:${itemId}`] = value;
  }
  writeStore(COUNTER_KEY, counterStore);

  const doneStore = readStore(DONE_SESSIONS_KEY);
  for (const [itemId, value] of Object.entries(normalized.doneSessions)) {
    doneStore[`${date}:${itemId}`] = value;
  }
  writeStore(DONE_SESSIONS_KEY, doneStore);
}

function hasMeaningfulState(state) {
  const s = normalizeDayState(state);
  if (s.japa.elapsed > 0 || s.japa.running) return true;
  if (s.exercise.elapsed > 0 || s.exercise.pushups > 0 || s.exercise.running) return true;
  if (s.water.glasses.some(Boolean) || s.water.bottles.some(Boolean)) return true;
  if (Object.keys(s.counters).length > 0) return true;
  if (Object.keys(s.doneSessions).length > 0) return true;
  return false;
}

export function getDayState(date) {
  if (!date) return emptyDayState();
  if (!cache[date]) {
    cache[date] = readLegacyLocalState(date);
  }
  return cache[date];
}

export function setDayState(date, nextState) {
  if (!date) return emptyDayState();
  cache[date] = normalizeDayState(nextState);
  writeLegacyFromState(date, cache[date]);
  scheduleDayStateSave(date);
  return cache[date];
}

export function updateDayState(date, updater) {
  const current = normalizeDayState(getDayState(date));
  return setDayState(date, updater(current));
}

export function hydrateDayState(date, remote) {
  if (!date) return emptyDayState();
  const local = readLegacyLocalState(date);
  const remoteNorm = normalizeDayState(remote);
  const merged = mergeStates(remoteNorm, local);
  cache[date] = merged;
  writeLegacyFromState(date, merged);

  const remoteEmpty = !hasMeaningfulState(remoteNorm);
  const localHasData = hasMeaningfulState(local);
  if (remoteEmpty && localHasData) {
    scheduleDayStateSave(date, true);
  } else if (hasMeaningfulState(merged)) {
    scheduleDayStateSave(date);
  }

  return merged;
}

export function scheduleDayStateSave(date, immediate = false) {
  if (!date) return;
  if (immediate) {
    clearTimeout(saveTimers[date]);
    flushDayStateSave(date);
    return;
  }
  clearTimeout(saveTimers[date]);
  saveTimers[date] = setTimeout(() => flushDayStateSave(date), 500);
}

export async function flushDayStateSave(date) {
  if (!date || !cache[date]) return;
  try {
    const result = await api.saveDayState(date, cache[date]);
    if (result?.dayState) {
      cache[date] = normalizeDayState(result.dayState);
      writeLegacyFromState(date, cache[date]);
    }
  } catch {
    /* offline — local backup remains */
  }
}

export async function pullDayStateFromServer(date) {
  if (!date) return emptyDayState();
  try {
    const data = await api.getDayState(date);
    return hydrateDayState(date, data.dayState);
  } catch {
    return getDayState(date);
  }
}

export function getAllActivityDatesFromCache() {
  const dates = new Set();
  for (const date of Object.keys(cache)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
  }
  return [...dates];
}
