const COUNTER_KEY = 'sadhana_counters';
const DONE_SESSIONS_KEY = 'sadhana_done_sessions';
const JAPA_KEY = 'sadhana_japa_timer';
const WATER_KEY = 'sadhana_water_glasses';
const EXERCISE_KEY = 'sadhana_exercise';

export const WATER_GLASS_ML = 250;
export const WATER_GLASS_COUNT = 8;
export const WATER_BOTTLE_ML = 750;
export const WATER_BOTTLE_COUNT = 3;
export const WATER_GOAL_ML = 2000;

function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function isAkyCategory(category) {
  const c = (category || '').toLowerCase();
  return c !== 'japa' && c !== 'quick';
}

/** Most AKY practices allow 2 done marks per day (AM + PM). */
export function getMaxDoneSessions(item) {
  if (isAkyCategory(item.category)) return 2;
  const type = item.item_type || 'toggle';
  if (type === 'toggle') return 1;
  return 2;
}

const ROUND_CAPS = {
  'main kriya': 6,
  'suka purvaka': 20,
  'nadhi shuddhi': 20,
  'maha mudra': 3,
  'simhasana': 5,
  'trinity meditation': 5,
};

/** Max rounds (or minutes for timers) per practice. */
export function getCounterMax(item) {
  const name = (item.name || '').toLowerCase();
  const type = item.item_type || 'toggle';

  if (type === 'timer') {
    if (name.includes('nada')) return 20 * 60;
    return item.target || 3600;
  }

  return ROUND_CAPS[name] ?? (item.target || 99);
}

export function getCounterDisplay(item, rawCount) {
  return (item.item_type || '') === 'timer' ? Math.floor(rawCount / 60) : rawCount;
}

export function getCounterMaxDisplay(item) {
  const max = getCounterMax(item);
  return (item.item_type || '') === 'timer' ? max / 60 : max;
}

export function getCounter(date, itemId) {
  return readStore(COUNTER_KEY)[`${date}:${itemId}`] ?? 0;
}

export function setCounter(date, itemId, value, item) {
  const store = readStore(COUNTER_KEY);
  const max = item ? getCounterMax(item) : Infinity;
  store[`${date}:${itemId}`] = Math.max(0, Math.min(max, value));
  writeStore(COUNTER_KEY, store);
  return store[`${date}:${itemId}`];
}

export function getDoneSessions(date, itemId) {
  return readStore(DONE_SESSIONS_KEY)[`${date}:${itemId}`] ?? 0;
}

export function markDoneSession(date, itemId, maxSessions) {
  const store = readStore(DONE_SESSIONS_KEY);
  const key = `${date}:${itemId}`;
  const current = store[key] ?? 0;
  if (current >= maxSessions) return current;
  store[key] = current + 1;
  writeStore(DONE_SESSIONS_KEY, store);
  return store[key];
}

export function isItemPracticedToday(date, itemId) {
  return getDoneSessions(date, itemId) > 0;
}

export function getJapaState(date) {
  const store = readStore(JAPA_KEY);
  if (store.date !== date) return { elapsed: 0, running: false };
  return { elapsed: store.elapsed ?? 0, running: !!store.running };
}

export function setJapaState(date, elapsed, running) {
  writeStore(JAPA_KEY, { date, elapsed, running: !!running });
}

function emptyWaterState() {
  return {
    glasses: Array(WATER_GLASS_COUNT).fill(false),
    bottles: Array(WATER_BOTTLE_COUNT).fill(false),
  };
}

function normalizeWaterState(saved) {
  if (Array.isArray(saved)) {
    const glasses = saved.length === WATER_GLASS_COUNT
      ? saved
      : Array(WATER_GLASS_COUNT).fill(false);
    return { glasses, bottles: Array(WATER_BOTTLE_COUNT).fill(false) };
  }
  if (saved && Array.isArray(saved.glasses)) {
    const glasses = saved.glasses.length === WATER_GLASS_COUNT
      ? saved.glasses
      : Array(WATER_GLASS_COUNT).fill(false);
    const bottles = Array.isArray(saved.bottles) && saved.bottles.length === WATER_BOTTLE_COUNT
      ? saved.bottles
      : Array(WATER_BOTTLE_COUNT).fill(false);
    return { glasses, bottles };
  }
  return emptyWaterState();
}

export function getWaterState(date) {
  const store = readStore(WATER_KEY);
  return normalizeWaterState(store[date]);
}

export function getWaterGlasses(date) {
  return getWaterState(date).glasses;
}

export function setWaterState(date, state) {
  const store = readStore(WATER_KEY);
  store[date] = state;
  writeStore(WATER_KEY, store);
  return state;
}

export function setWaterGlasses(date, glasses) {
  const state = getWaterState(date);
  state.glasses = glasses;
  return setWaterState(date, state);
}

export function toggleWaterGlass(date, index) {
  const state = getWaterState(date);
  state.glasses[index] = !state.glasses[index];
  return setWaterState(date, state);
}

export function toggleWaterBottle(date, index) {
  const state = getWaterState(date);
  state.bottles[index] = !state.bottles[index];
  return setWaterState(date, state);
}

export function getWaterMl(stateOrGlasses) {
  if (Array.isArray(stateOrGlasses)) {
    return stateOrGlasses.filter(Boolean).length * WATER_GLASS_ML;
  }
  const glassMl = stateOrGlasses.glasses.filter(Boolean).length * WATER_GLASS_ML;
  const bottleMl = stateOrGlasses.bottles.filter(Boolean).length * WATER_BOTTLE_ML;
  return glassMl + bottleMl;
}

export function isWaterGoalMet(stateOrGlasses) {
  if (Array.isArray(stateOrGlasses)) {
    return getWaterMl(stateOrGlasses) >= WATER_GOAL_ML;
  }
  return getWaterMl(stateOrGlasses) >= WATER_GOAL_ML;
}

export const EXERCISE_GOAL_SEC = 10 * 60;
export const PUSHUP_MAX = 10;

function normalizePushupCount(value) {
  if (value === true) return 1;
  if (value === false || value == null) return 0;
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.min(PUSHUP_MAX, Math.max(0, Math.floor(n)));
}

function defaultExerciseState() {
  return { elapsed: 0, running: false, pushups: 0 };
}

export function getExerciseState(date) {
  const store = readStore(EXERCISE_KEY);
  const saved = store[date];
  if (!saved) return defaultExerciseState();
  return {
    elapsed: saved.elapsed ?? 0,
    running: !!saved.running,
    pushups: normalizePushupCount(saved.pushups),
  };
}

export function setExerciseState(date, elapsed, running, pushups) {
  const store = readStore(EXERCISE_KEY);
  const current = getExerciseState(date);
  store[date] = {
    elapsed: Math.max(0, elapsed),
    running: !!running,
    pushups: pushups !== undefined ? normalizePushupCount(pushups) : current.pushups,
  };
  writeStore(EXERCISE_KEY, store);
  return store[date];
}

export function adjustExerciseElapsed(date, deltaSec) {
  const current = getExerciseState(date);
  const elapsed = Math.max(0, current.elapsed + deltaSec);
  return setExerciseState(date, elapsed, current.running, current.pushups);
}

export function setExercisePushups(date, count) {
  const current = getExerciseState(date);
  return setExerciseState(date, current.elapsed, current.running, normalizePushupCount(count));
}

export function isExerciseGoalMet(elapsed) {
  return elapsed >= EXERCISE_GOAL_SEC;
}

export function isPushupGoalMet(count) {
  return normalizePushupCount(count) >= 1;
}

/** Collect sadhana dates referenced in local timer/counter storage. */
function isValidDateStr(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '');
}

export function getAllActivityDates() {
  const dates = new Set();

  const counterStore = readStore(COUNTER_KEY);
  for (const key of Object.keys(counterStore)) {
    const [date] = key.split(':');
    if (isValidDateStr(date)) dates.add(date);
  }

  const doneStore = readStore(DONE_SESSIONS_KEY);
  for (const key of Object.keys(doneStore)) {
    const [date] = key.split(':');
    if (isValidDateStr(date)) dates.add(date);
  }

  const japaStore = readStore(JAPA_KEY);
  if (isValidDateStr(japaStore.date)) dates.add(japaStore.date);

  const waterStore = readStore(WATER_KEY);
  for (const date of Object.keys(waterStore)) {
    if (isValidDateStr(date)) dates.add(date);
  }

  const exerciseStore = readStore(EXERCISE_KEY);
  for (const date of Object.keys(exerciseStore)) {
    if (isValidDateStr(date)) dates.add(date);
  }

  return [...dates];
}

export function itemShouldBeComplete(item, doneSessions) {
  const max = getMaxDoneSessions(item);
  return doneSessions >= max;
}
