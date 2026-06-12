const express = require('express');
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');
const { getDb, getSadhanaDate } = require('../db');
const { authMiddleware } = require('./auth');
const {
  MAX_STREAK_FREEZES,
  FREEZE_EARN_EVERY_DAYS,
  addDays,
  computeStreakWithFreezes,
  daysUntilNextFreeze,
  getUserFreezeRow,
  getFrozenDates,
  awardFreezesForStreak,
  tryAutoFreezeYesterday,
  applyFreezeForDate,
  isStreakDayStatus,
  setUserFreezeCount,
} = require('../streakFreezeLogic');

const router = express.Router();
router.use(authMiddleware);

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sadhana-tracker.local';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const DAY_PILLAR_COUNT = 6;
const JAPA_GOAL_SEC = 60 * 60;
const EXERCISE_GOAL_SEC = 10 * 60;
const WATER_GLASS_ML = 250;
const WATER_BOTTLE_ML = 750;
const WATER_GOAL_ML = 2000;
const WATER_GLASS_COUNT = 8;
const WATER_BOTTLE_COUNT = 3;

function parseDayStateJson(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function emptyWaterState() {
  return {
    glasses: Array(WATER_GLASS_COUNT).fill(false),
    bottles: Array(WATER_BOTTLE_COUNT).fill(false),
  };
}

function normalizeWaterState(saved) {
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

function emptyDayState() {
  return {
    japa: { elapsed: 0, running: false },
    exercise: { elapsed: 0, running: false, pushups: 0 },
    water: emptyWaterState(),
    counters: {},
    doneSessions: {},
  };
}

function normalizeDayState(state) {
  const base = emptyDayState();
  if (!state || typeof state !== 'object') return base;
  return {
    japa: { ...base.japa, ...(state.japa || {}) },
    exercise: {
      elapsed: Math.max(0, Number(state.exercise?.elapsed) || 0),
      running: !!state.exercise?.running,
      pushups: Math.max(0, Number(state.exercise?.pushups) || 0),
    },
    water: normalizeWaterState(state.water),
    counters: { ...base.counters, ...(state.counters || {}) },
    doneSessions: { ...base.doneSessions, ...(state.doneSessions || {}) },
  };
}

function waterGoalMetFromState(water) {
  const normalized = normalizeWaterState(water);
  const ml =
    normalized.glasses.filter(Boolean).length * WATER_GLASS_ML +
    normalized.bottles.filter(Boolean).length * WATER_BOTTLE_ML;
  return ml >= WATER_GOAL_ML;
}

function isAkyItemCategory(category) {
  const c = (category || '').toLowerCase();
  return c !== 'japa' && c !== 'quick';
}

function itemCompleteFromDayState(item, dayState) {
  if (!item || !dayState) return false;
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const counters = dayState.counters || {};
  const sessions = dayState.doneSessions || {};

  if (name === 'exercise') {
    return (dayState.exercise?.elapsed || 0) >= EXERCISE_GOAL_SEC || (dayState.exercise?.pushups || 0) >= 1;
  }
  if (name === 'japa') {
    return (dayState.japa?.elapsed || 0) >= JAPA_GOAL_SEC;
  }
  if (name === 'water') {
    return waterGoalMetFromState(dayState.water);
  }
  if (isAkyItemCategory(cat)) {
    if ((sessions[item.id] || 0) > 0) return true;
    if ((counters[item.id] || 0) > 0 && (item.item_type || '') === 'counter') return true;
    if (name === 'main kriya' && (counters[item.id] || 0) >= 1) return true;
  }
  return false;
}

function mergedCompletedIds(items, completedIds, dayState) {
  const merged = new Set(completedIds);
  if (!dayState) return merged;
  for (const item of items) {
    if (itemCompleteFromDayState(item, dayState)) merged.add(item.id);
  }
  return merged;
}

function computeAkyLevelFromServer(items, completedIds) {
  const isDone = (name) => items.some(
    i => (i.name || '').toLowerCase() === name.toLowerCase() && completedIds.has(i.id)
  );
  const isGreen =
    isDone('Main Kriya') &&
    isDone('Kriya Level 2') &&
    isDone('Trinity Meditation') &&
    isDone('Suka Purvaka') &&
    isDone('Nadhi Shuddhi');
  if (isGreen) return 'green';
  if (isDone('Main Kriya') && isDone('Kriya Level 2')) return 'orange';
  return 'none';
}

function computeDayPillarsFromServer(items, completedIds) {
  const isDone = (name) => items.some(
    i => (i.name || '').toLowerCase() === name.toLowerCase() && completedIds.has(i.id)
  );
  const akyMet = isDone('Main Kriya') && isDone('Kriya Level 2');
  const pillars = [
    { key: 'aky', label: 'Atma Kriya', met: akyMet },
    { key: 'japa', label: 'Japa', met: isDone('Japa') },
    { key: 'water', label: 'Water', met: isDone('Water') },
    { key: 'exercise', label: 'Exercise', met: isDone('Exercise') },
    { key: 'study', label: 'Study', met: isDone('Study') },
    { key: 'abhishekam', label: 'Abhishekam', met: isDone('Abhishekam') },
  ];
  const metCount = pillars.filter(p => p.met).length;
  return {
    pillars,
    metCount,
    total: DAY_PILLAR_COUNT,
    pct: Math.round((metCount / DAY_PILLAR_COUNT) * 100),
    complete: metCount === DAY_PILLAR_COUNT,
  };
}

async function sendPushToUser(db, userId, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  const result = await db.execute('SELECT id, subscription FROM push_subscriptions WHERE user_id = ?', [userId]);
  if (result.rows.length === 0) return false;
  const body = JSON.stringify(payload);
  let sent = false;
  await Promise.all(result.rows.map(sub =>
    webpush.sendNotification(JSON.parse(sub.subscription), body)
      .then(() => { sent = true; })
      .catch(async err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        }
      })
  ));
  return sent;
}

function computeAkyLevelMerged(items, completedIds, dayState) {
  const merged = mergedCompletedIds(items, completedIds, dayState);
  return computeAkyLevelFromServer(items, merged);
}

function computeDayPillarsMerged(items, completedIds, dayState) {
  const merged = mergedCompletedIds(items, completedIds, dayState);
  return computeDayPillarsFromServer(items, merged);
}

async function getDayStateForUser(db, userId, date) {
  const result = await db.execute(
    'SELECT state FROM user_day_state WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  if (!result.rows[0]) return emptyDayState();
  return normalizeDayState(parseDayStateJson(result.rows[0].state));
}

async function getDayStatesForUsers(db, userIds, date) {
  if (userIds.length === 0) return {};
  const placeholders = userIds.map(() => '?').join(', ');
  const result = await db.execute(
    `SELECT user_id, state FROM user_day_state WHERE date = ? AND user_id IN (${placeholders})`,
    [date, ...userIds]
  );
  const map = {};
  for (const row of result.rows) {
    map[row.user_id] = normalizeDayState(parseDayStateJson(row.state));
  }
  return map;
}

async function saveDayStateForUser(db, userId, date, state) {
  const normalized = normalizeDayState(state);
  await db.execute(
    `INSERT INTO user_day_state (user_id, date, state, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, date) DO UPDATE SET
       state = excluded.state,
       updated_at = excluded.updated_at`,
    [userId, date, JSON.stringify(normalized)]
  );
  return normalized;
}

async function syncProgressFromDayState(db, userId, date, items, dayState) {
  if (!dayState) return;
  for (const item of items) {
    if (!itemCompleteFromDayState(item, dayState)) continue;
    await db.execute(
      `INSERT OR IGNORE INTO daily_progress (id, user_id, item_id, date, completed) VALUES (?, ?, ?, ?, 1)`,
      [uuidv4(), userId, item.id, date]
    );
  }
}

function buildMemberProgress(user, items, totalItems, completedIds, customLabelsForUser = {}, dayState = null) {
  const merged = mergedCompletedIds(items, completedIds, dayState);
  const completed = completedIds.size;
  const itemStatus = items.map(item => ({
    id: item.id,
    name: (item.category || '').toLowerCase() === 'custom'
      ? (customLabelsForUser[item.id] || 'Custom')
      : item.name,
    category: item.category,
    completed: merged.has(item.id),
  }));
  const akyItems = items.filter(i => !['japa', 'quick'].includes((i.category || '').toLowerCase()));
  const akyDone = akyItems.filter(i => merged.has(i.id)).length;
  const japaDone = items.some(i => (i.category || '').toLowerCase() === 'japa' && merged.has(i.id));
  const quickItems = items.filter(i => (i.category || '').toLowerCase() === 'quick');
  const quickDone = quickItems.filter(i => merged.has(i.id)).length;
  const dayPillars = computeDayPillarsMerged(items, completedIds, dayState);
  const akyLevel = computeAkyLevelMerged(items, completedIds, dayState);

  return {
    ...user,
    completed: merged.size,
    total: totalItems,
    percentage: totalItems > 0 ? Math.round((merged.size / totalItems) * 100) : 0,
    items: itemStatus,
    akyDone,
    akyTotal: akyItems.length,
    akyLevel,
    japaDone,
    quickDone,
    quickTotal: quickItems.length,
    pillarsMet: dayPillars.metCount,
    pillarsTotal: dayPillars.total,
    dayComplete: dayPillars.complete,
    pillars: dayPillars.pillars,
  };
}

async function getFriendIds(db, userId) {
  const result = await db.execute(
    `SELECT requester_id, recipient_id FROM friend_requests
     WHERE status = 'accepted' AND (requester_id = ? OR recipient_id = ?)`,
    [userId, userId]
  );
  return result.rows.map(row => (row.requester_id === userId ? row.recipient_id : row.requester_id));
}

async function getRelationMap(db, userId) {
  const result = await db.execute(
    `SELECT id, requester_id, recipient_id, status FROM friend_requests
     WHERE requester_id = ? OR recipient_id = ?`,
    [userId, userId]
  );
  const map = {};
  for (const row of result.rows) {
    const otherId = row.requester_id === userId ? row.recipient_id : row.requester_id;
    if (row.status === 'accepted') {
      map[otherId] = 'friend';
    } else if (row.status === 'pending') {
      map[otherId] = row.requester_id === userId ? 'pending_outgoing' : 'pending_incoming';
    }
  }
  return map;
}

async function canViewUserProgress(db, viewerId, targetUserId) {
  if (viewerId === targetUserId) return true;
  const friendIds = await getFriendIds(db, viewerId);
  return friendIds.includes(targetUserId);
}

// GET /api/sadhana/items
router.get('/items', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC');
    res.json({ items: result.rows });
  } catch (err) {
    console.error('Items error:', err);
    res.status(500).json({ error: 'Failed to fetch items.' });
  }
});

async function getCustomLabelsForUser(db, userId) {
  const result = await db.execute(
    'SELECT item_id, label FROM user_custom_labels WHERE user_id = ?',
    [userId]
  );
  return Object.fromEntries(result.rows.map(row => [row.item_id, row.label]));
}

async function getCustomLabelsForUsers(db, userIds) {
  if (userIds.length === 0) return {};
  const placeholders = userIds.map(() => '?').join(', ');
  const result = await db.execute(
    `SELECT user_id, item_id, label FROM user_custom_labels WHERE user_id IN (${placeholders})`,
    userIds
  );
  const map = {};
  for (const row of result.rows) {
    if (!map[row.user_id]) map[row.user_id] = {};
    map[row.user_id][row.item_id] = row.label;
  }
  return map;
}


// GET /api/sadhana/today
router.get('/today', async (req, res) => {
  try {
    const db = getDb();
    const today = getSadhanaDate();

    const itemsResult = await db.execute('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC');
    const items = itemsResult.rows;

    const progressResult = await db.execute('SELECT item_id FROM daily_progress WHERE user_id = ? AND date = ?', [req.userId, today]);
    const completedIds = new Set(progressResult.rows.map(p => p.item_id));
    const customLabels = await getCustomLabelsForUser(db, req.userId);

    const checklist = items.map(item => ({
      ...item,
      name: (item.category || '').toLowerCase() === 'custom'
        ? (customLabels[item.id] || 'Custom')
        : item.name,
      completed: completedIds.has(item.id),
    }));

    const dayState = await getDayStateForUser(db, req.userId, today);

    res.json({
      date: today,
      checklist,
      dayState,
      summary: { total: items.length, done: completedIds.size, remaining: items.length - completedIds.size },
    });
  } catch (err) {
    console.error('Today error:', err);
    res.status(500).json({ error: 'Failed to fetch today data.' });
  }
});

// PUT /api/sadhana/custom-label { item_id, label }
router.put('/custom-label', async (req, res) => {
  try {
    const db = getDb();
    const { item_id: itemId, label } = req.body;
    const trimmed = (label || '').trim();
    if (!itemId) return res.status(400).json({ error: 'item_id is required.' });
    if (!trimmed) return res.status(400).json({ error: 'Label is required.' });
    if (trimmed.length > 24) return res.status(400).json({ error: 'Label is too long (24 max).' });

    const itemResult = await db.execute(
      "SELECT id FROM sadhana_items WHERE id = ? AND lower(category) = 'custom' AND active = 1",
      [itemId]
    );
    if (!itemResult.rows[0]) return res.status(404).json({ error: 'Custom practice not found.' });

    await db.execute(
      `INSERT INTO user_custom_labels (user_id, item_id, label) VALUES (?, ?, ?)
       ON CONFLICT(user_id, item_id) DO UPDATE SET label = excluded.label`,
      [req.userId, itemId, trimmed]
    );

    res.json({ item_id: itemId, label: trimmed });
  } catch (err) {
    console.error('Custom label error:', err);
    res.status(500).json({ error: 'Failed to save label.' });
  }
});

// POST /api/sadhana/toggle
router.post('/toggle', async (req, res) => {
  try {
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id is required.' });

    const db = getDb();
    const today = getSadhanaDate();

    const existing = await db.execute('SELECT id FROM daily_progress WHERE user_id = ? AND item_id = ? AND date = ?', [req.userId, item_id, today]);

    if (existing.rows.length > 0) {
      await db.execute('DELETE FROM daily_progress WHERE id = ?', [existing.rows[0].id]);
      res.json({ completed: false });
    } else {
      await db.execute('INSERT INTO daily_progress (id, user_id, item_id, date) VALUES (?, ?, ?, ?)', [uuidv4(), req.userId, item_id, today]);
      res.json({ completed: true });
    }
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle item.' });
  }
});

// POST /api/sadhana/complete { item_id } — idempotent mark-done (no accidental un-complete)
router.post('/complete', async (req, res) => {
  try {
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id is required.' });

    const db = getDb();
    const today = getSadhanaDate();

    const existing = await db.execute(
      'SELECT id FROM daily_progress WHERE user_id = ? AND item_id = ? AND date = ?',
      [req.userId, item_id, today]
    );

    if (existing.rows.length === 0) {
      await db.execute(
        'INSERT INTO daily_progress (id, user_id, item_id, date) VALUES (?, ?, ?, ?)',
        [uuidv4(), req.userId, item_id, today]
      );
    }

    res.json({ completed: true });
  } catch (err) {
    console.error('Complete error:', err);
    res.status(500).json({ error: 'Failed to mark item complete.' });
  }
});

function computeStreakFromMap(sortedDates, progressMap, totalItems) {
  let streak = 0;
  const today = sortedDates[sortedDates.length - 1];
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const d = sortedDates[i];
    if ((progressMap[d] || 0) >= totalItems) {
      streak++;
    } else if (d !== today) {
      break;
    }
  }
  return streak;
}

function computeLongestStreak(allDates, progressMap, totalItems) {
  let longest = 0;
  let current = 0;
  for (const date of allDates) {
    if ((progressMap[date] || 0) >= totalItems) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

// GET /api/sadhana/stats
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();
    const days = parseInt(req.query.days) || 30;

    const dates = [];
    const sadhanaToday = getSadhanaDate();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(sadhanaToday);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const itemsResult = await db.execute('SELECT id, category FROM sadhana_items WHERE active = 1');
    const allItems = itemsResult.rows;
    const totalItems = allItems.length;
    const akyItemIds = new Set(allItems.filter(i => !['japa', 'quick'].includes((i.category || '').toLowerCase())).map(i => i.id));
    const japaItemIds = new Set(allItems.filter(i => (i.category || '').toLowerCase() === 'japa').map(i => i.id));

    const progressResult = await db.execute(
      'SELECT date, item_id FROM daily_progress WHERE user_id = ? AND date >= ? ORDER BY date ASC',
      [req.userId, dates[0]]
    );

    const progressMap = {};
    const akyProgressMap = {};
    const japaDays = new Set();
    for (const row of progressResult.rows) {
      progressMap[row.date] = (progressMap[row.date] || 0) + 1;
      if (akyItemIds.has(row.item_id)) {
        akyProgressMap[row.date] = (akyProgressMap[row.date] || 0) + 1;
      }
      if (japaItemIds.has(row.item_id)) japaDays.add(row.date);
    }

    const dailyData = dates.map(date => ({
      date,
      completed: progressMap[date] || 0,
      total: totalItems,
      percentage: totalItems > 0 ? Math.round(((progressMap[date] || 0) / totalItems) * 100) : 0
    }));

    const streak = computeStreakFromMap(dates, progressMap, totalItems);

    const allProgressResult = await db.execute(
      'SELECT date, COUNT(*) as completed_count FROM daily_progress WHERE user_id = ? GROUP BY date ORDER BY date ASC',
      [req.userId]
    );
    const allProgressMap = {};
    for (const row of allProgressResult.rows) {
      allProgressMap[row.date] = row.completed_count;
    }
    const allDates = allProgressResult.rows.map(r => r.date);
    const longestStreak = computeLongestStreak(allDates, allProgressMap, totalItems);

    let longestStreakEndDate = '';
    if (longestStreak > 0) {
      let run = 0;
      for (const date of allDates) {
        if ((allProgressMap[date] || 0) >= totalItems) {
          run++;
          if (run === longestStreak) longestStreakEndDate = date;
        } else {
          run = 0;
        }
      }
    }

    const akyTotal = akyItemIds.size;
    let akyCompletionSum = 0;
    for (const date of dates) {
      akyCompletionSum += akyTotal > 0 ? ((akyProgressMap[date] || 0) / akyTotal) * 100 : 0;
    }
    const akyCompletionRate = days > 0 ? Math.round(akyCompletionSum / days) : 0;
    const japaCompletionRate = days > 0 ? Math.round((japaDays.size / days) * 100) : 0;

    const totalCompleted = dailyData.reduce((sum, d) => sum + d.completed, 0);
    const totalPossible = totalItems * days;
    const overallRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    const bestDay = dailyData.reduce((best, d) => d.completed > best.completed ? d : best, dailyData[0] || { date: '', completed: 0 });

    res.json({
      days,
      totalItems,
      akyTotal,
      streak,
      longestStreak,
      longestStreakEndDate,
      akyCompletionRate,
      japaCompletionRate,
      overallRate,
      bestDay: { date: bestDay.date, completed: bestDay.completed },
      dailyData,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/sadhana/stats/month?year=2026&month=6
router.get('/stats/month', async (req, res) => {
  try {
    const db = getDb();
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const dates = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const totalResult = await db.execute('SELECT COUNT(*) as cnt FROM sadhana_items WHERE active = 1');
    const totalItems = totalResult.rows[0].cnt;

    const progressResult = await db.execute(
      'SELECT date, COUNT(*) as completed_count FROM daily_progress WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY date',
      [req.userId, dates[0], dates[dates.length - 1]]
    );

    const progressMap = {};
    for (const row of progressResult.rows) {
      progressMap[row.date] = row.completed_count;
    }

    const dailyData = dates.map(date => ({
      date,
      completed: progressMap[date] || 0,
      total: totalItems,
      percentage: totalItems > 0 ? Math.round(((progressMap[date] || 0) / totalItems) * 100) : 0,
    }));

    res.json({ year, month, totalItems, dailyData });
  } catch (err) {
    console.error('Month stats error:', err);
    res.status(500).json({ error: 'Failed to fetch month stats.' });
  }
});

// GET /api/sadhana/progress/range?from=&to=
router.get('/progress/range', async (req, res) => {
  try {
    const db = getDb();
    const { from, to } = req.query;

    let sql = 'SELECT date, item_id FROM daily_progress WHERE user_id = ?';
    const params = [req.userId];
    if (from) {
      sql += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND date <= ?';
      params.push(to);
    }
    sql += ' ORDER BY date ASC';

    const result = await db.execute(sql, params);
    const progress = {};
    for (const row of result.rows) {
      if (!progress[row.date]) progress[row.date] = [];
      progress[row.date].push(row.item_id);
    }

    res.json({ progress });
  } catch (err) {
    console.error('Progress range error:', err);
    res.status(500).json({ error: 'Failed to fetch progress history.' });
  }
});

// GET /api/sadhana/snapshots
router.get('/snapshots', async (req, res) => {
  try {
    const db = getDb();
    const { from, to } = req.query;

    let sql = 'SELECT date, snapshot, updated_at FROM day_snapshots WHERE user_id = ?';
    const params = [req.userId];
    if (from) {
      sql += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND date <= ?';
      params.push(to);
    }
    sql += ' ORDER BY date DESC';

    const result = await db.execute(sql, params);
    const snapshots = {};
    for (const row of result.rows) {
      try {
        snapshots[row.date] = JSON.parse(row.snapshot);
      } catch {
        // skip malformed rows
      }
    }

    res.json({ snapshots });
  } catch (err) {
    console.error('Snapshots fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch practice history.' });
  }
});

// PUT /api/sadhana/snapshots/:date
router.put('/snapshots/:date', async (req, res) => {
  try {
    const db = getDb();
    const { date } = req.params;
    const snapshot = req.body;

    if (!date || !snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ error: 'Valid date and snapshot body required.' });
    }

    await db.execute(
      `INSERT INTO day_snapshots (user_id, date, snapshot, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, date) DO UPDATE SET
         snapshot = excluded.snapshot,
         updated_at = excluded.updated_at`,
      [req.userId, date, JSON.stringify(snapshot)]
    );

    res.json({ saved: true, date });
  } catch (err) {
    console.error('Snapshot save error:', err);
    res.status(500).json({ error: 'Failed to save practice history.' });
  }
});

// GET /api/sadhana/day-state/:date
router.get('/day-state/:date', async (req, res) => {
  try {
    const db = getDb();
    const dayState = await getDayStateForUser(db, req.userId, req.params.date);
    res.json({ date: req.params.date, dayState });
  } catch (err) {
    console.error('Day state fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch day state.' });
  }
});

// PUT /api/sadhana/day-state/:date { state }
router.put('/day-state/:date', async (req, res) => {
  try {
    const db = getDb();
    const { date } = req.params;
    const { state } = req.body;
    if (!date || !state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Valid date and state body required.' });
    }

    const itemsResult = await db.execute('SELECT id, name, category, item_type FROM sadhana_items WHERE active = 1');
    const items = itemsResult.rows;
    const saved = await saveDayStateForUser(db, req.userId, date, state);
    await syncProgressFromDayState(db, req.userId, date, items, saved);

    res.json({ saved: true, date, dayState: saved });
  } catch (err) {
    console.error('Day state save error:', err);
    res.status(500).json({ error: 'Failed to save day state.' });
  }
});

// GET /api/sadhana/friends/directory — all practitioners on the server
router.get('/friends/directory', async (req, res) => {
  try {
    const db = getDb();
    const usersResult = await db.execute(
      `SELECT id, name, email FROM users
       WHERE id != ?
       ORDER BY name ASC`,
      [req.userId]
    );

    const relationMap = await getRelationMap(db, req.userId);
    const users = usersResult.rows.map(user => ({
      ...user,
      relation: relationMap[user.id] || 'none',
    }));

    res.json({ users });
  } catch (err) {
    console.error('Friend directory error:', err);
    res.status(500).json({ error: 'Failed to load practitioners.' });
  }
});

// GET /api/sadhana/friends/search?q=
router.get('/friends/search', async (req, res) => {
  try {
    const db = getDb();
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ users: [] });
    }

    const like = `%${q}%`;
    const usersResult = await db.execute(
      `SELECT id, name, email FROM users
       WHERE id != ? AND (name LIKE ? OR email LIKE ?)
       ORDER BY name ASC LIMIT 20`,
      [req.userId, like, like]
    );

    const relationMap = await getRelationMap(db, req.userId);
    const users = usersResult.rows.map(user => ({
      ...user,
      relation: relationMap[user.id] || 'none',
    }));

    res.json({ users });
  } catch (err) {
    console.error('Friend search error:', err);
    res.status(500).json({ error: 'Failed to search practitioners.' });
  }
});

// GET /api/sadhana/friends/requests
router.get('/friends/requests', async (req, res) => {
  try {
    const db = getDb();

    const incomingResult = await db.execute(
      `SELECT fr.id, fr.created_at, u.id as user_id, u.name, u.email
       FROM friend_requests fr
       JOIN users u ON u.id = fr.requester_id
       WHERE fr.recipient_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [req.userId]
    );

    const outgoingResult = await db.execute(
      `SELECT fr.id, fr.created_at, u.id as user_id, u.name, u.email
       FROM friend_requests fr
       JOIN users u ON u.id = fr.recipient_id
       WHERE fr.requester_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [req.userId]
    );

    res.json({
      incoming: incomingResult.rows,
      outgoing: outgoingResult.rows,
    });
  } catch (err) {
    console.error('Friend requests error:', err);
    res.status(500).json({ error: 'Failed to fetch friend requests.' });
  }
});

// POST /api/sadhana/friends/request { user_id }
router.post('/friends/request', async (req, res) => {
  try {
    const db = getDb();
    const { user_id: recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'user_id is required.' });
    }
    if (recipientId === req.userId) {
      return res.status(400).json({ error: 'You cannot add yourself.' });
    }

    const userResult = await db.execute('SELECT id FROM users WHERE id = ?', [recipientId]);
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const existing = await db.execute(
      `SELECT id, requester_id, recipient_id, status FROM friend_requests
       WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)`,
      [req.userId, recipientId, recipientId, req.userId]
    );
    const row = existing.rows[0];

    if (row) {
      if (row.status === 'accepted') {
        return res.status(409).json({ error: 'Already in your sangha.' });
      }
      if (row.status === 'pending') {
        if (row.requester_id === recipientId) {
          await db.execute(
            `UPDATE friend_requests SET status = 'accepted', updated_at = datetime('now') WHERE id = ?`,
            [row.id]
          );
          return res.json({ status: 'accepted', mutual: true });
        }
        return res.status(409).json({ error: 'Request already sent.' });
      }
      if (row.requester_id === req.userId) {
        await db.execute(
          `UPDATE friend_requests SET status = 'pending', updated_at = datetime('now') WHERE id = ?`,
          [row.id]
        );
        return res.json({ status: 'pending' });
      }
    }

    const id = uuidv4();
    await db.execute(
      `INSERT INTO friend_requests (id, requester_id, recipient_id, status) VALUES (?, ?, ?, 'pending')`,
      [id, req.userId, recipientId]
    );

    res.json({ status: 'pending', id });
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ error: 'Failed to send request.' });
  }
});

// POST /api/sadhana/friends/accept { request_id }
router.post('/friends/accept', async (req, res) => {
  try {
    const db = getDb();
    const { request_id: requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'request_id is required.' });
    }

    const result = await db.execute(
      `SELECT id FROM friend_requests WHERE id = ? AND recipient_id = ? AND status = 'pending'`,
      [requestId, req.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    await db.execute(
      `UPDATE friend_requests SET status = 'accepted', updated_at = datetime('now') WHERE id = ?`,
      [requestId]
    );

    res.json({ status: 'accepted' });
  } catch (err) {
    console.error('Friend accept error:', err);
    res.status(500).json({ error: 'Failed to accept request.' });
  }
});

// POST /api/sadhana/friends/decline { request_id }
router.post('/friends/decline', async (req, res) => {
  try {
    const db = getDb();
    const { request_id: requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: 'request_id is required.' });
    }

    const result = await db.execute(
      `SELECT id FROM friend_requests WHERE id = ? AND recipient_id = ? AND status = 'pending'`,
      [requestId, req.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    await db.execute(
      `UPDATE friend_requests SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`,
      [requestId]
    );

    res.json({ status: 'rejected' });
  } catch (err) {
    console.error('Friend decline error:', err);
    res.status(500).json({ error: 'Failed to decline request.' });
  }
});

// POST /api/sadhana/friends/remove { user_id }
router.post('/friends/remove', async (req, res) => {
  try {
    const db = getDb();
    const { user_id: friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'user_id is required.' });
    }
    if (friendId === req.userId) {
      return res.status(400).json({ error: 'You cannot remove yourself.' });
    }

    const result = await db.execute(
      `SELECT id FROM friend_requests
       WHERE status = 'accepted'
       AND ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))`,
      [req.userId, friendId, friendId, req.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Not in your sangha.' });
    }

    await db.execute('DELETE FROM friend_requests WHERE id = ?', [result.rows[0].id]);
    await db.execute(
      `DELETE FROM sangha_group_members
       WHERE user_id = ? AND group_id IN (SELECT id FROM sangha_groups WHERE user_id = ?)`,
      [friendId, req.userId]
    );
    await db.execute(
      `UPDATE sangha_group_invites SET status = 'declined', updated_at = datetime('now')
       WHERE invitee_id = ? AND status = 'pending'
       AND group_id IN (SELECT id FROM sangha_groups WHERE user_id = ?)`,
      [friendId, req.userId]
    );

    res.json({ status: 'removed' });
  } catch (err) {
    console.error('Friend remove error:', err);
    res.status(500).json({ error: 'Failed to remove friend.' });
  }
});

async function getGroupById(db, groupId) {
  const result = await db.execute(
    'SELECT id, name, sort_order, user_id as admin_id FROM sangha_groups WHERE id = ?',
    [groupId]
  );
  return result.rows[0] || null;
}

async function isGroupAdmin(db, groupId, userId) {
  const group = await getGroupById(db, groupId);
  return group?.admin_id === userId;
}

async function isGroupMember(db, groupId, userId) {
  const group = await getGroupById(db, groupId);
  if (!group) return false;
  if (group.admin_id === userId) return true;
  const result = await db.execute(
    'SELECT 1 FROM sangha_group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  return result.rows.length > 0;
}

async function getGroupCoMemberIds(db, userId) {
  const result = await db.execute(
    `SELECT DISTINCT sgm2.user_id
     FROM sangha_group_members sgm1
     JOIN sangha_group_members sgm2 ON sgm1.group_id = sgm2.group_id
     WHERE sgm1.user_id = ? AND sgm2.user_id != ?`,
    [userId, userId]
  );
  return result.rows.map(row => row.user_id);
}

async function assertGroupInviteAllowed(db, adminId, inviteeId) {
  if (inviteeId === adminId) {
    const err = new Error('You are already in this sangha.');
    err.status = 400;
    throw err;
  }
  const friendIds = await getFriendIds(db, adminId);
  if (!friendIds.includes(inviteeId)) {
    const err = new Error('Can only invite people in your sangha.');
    err.status = 400;
    throw err;
  }
}

async function fetchGroupsForUser(db, userId) {
  const groupsResult = await db.execute(
    `SELECT DISTINCT g.id, g.name, g.sort_order, g.user_id as admin_id
     FROM sangha_groups g
     LEFT JOIN sangha_group_members m ON m.group_id = g.id
     WHERE g.user_id = ? OR m.user_id = ?
     ORDER BY g.sort_order ASC, g.name ASC`,
    [userId, userId]
  );
  const groups = groupsResult.rows;
  if (groups.length === 0) return [];

  const groupIds = groups.map(g => g.id);
  const placeholders = groupIds.map(() => '?').join(', ');

  const membersResult = await db.execute(
    `SELECT group_id, user_id FROM sangha_group_members WHERE group_id IN (${placeholders})`,
    groupIds
  );
  const pendingResult = await db.execute(
    `SELECT id, group_id, invitee_id FROM sangha_group_invites
     WHERE group_id IN (${placeholders}) AND status = 'pending'`,
    groupIds
  );

  const membersByGroup = Object.fromEntries(groupIds.map(id => [id, []]));
  for (const row of membersResult.rows) {
    membersByGroup[row.group_id].push(row.user_id);
  }

  const pendingByGroup = Object.fromEntries(groupIds.map(id => [id, []]));
  for (const row of pendingResult.rows) {
    pendingByGroup[row.group_id].push({ id: row.id, user_id: row.invitee_id });
  }

  return groups.map(g => {
    const memberIds = [...new Set([g.admin_id, ...(membersByGroup[g.id] || [])])];
    return {
      id: g.id,
      name: g.name,
      sort_order: g.sort_order,
      admin_id: g.admin_id,
      is_admin: g.admin_id === userId,
      member_ids: memberIds,
      pending_invites: g.admin_id === userId ? (pendingByGroup[g.id] || []) : [],
    };
  });
}

// GET /api/sadhana/groups
router.get('/groups', async (req, res) => {
  try {
    const db = getDb();
    const groups = await fetchGroupsForUser(db, req.userId);
    res.json({ groups });
  } catch (err) {
    console.error('Groups list error:', err);
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
});

// GET /api/sadhana/groups/invitations
router.get('/groups/invitations', async (req, res) => {
  try {
    const db = getDb();
    const incomingResult = await db.execute(
      `SELECT gi.id, gi.group_id, gi.inviter_id, gi.created_at,
              g.name as group_name, u.name as inviter_name
       FROM sangha_group_invites gi
       JOIN sangha_groups g ON g.id = gi.group_id
       JOIN users u ON u.id = gi.inviter_id
       WHERE gi.invitee_id = ? AND gi.status = 'pending'
       ORDER BY gi.created_at DESC`,
      [req.userId]
    );

    const outgoingResult = await db.execute(
      `SELECT gi.id, gi.group_id, gi.invitee_id, gi.created_at,
              g.name as group_name, u.name as invitee_name
       FROM sangha_group_invites gi
       JOIN sangha_groups g ON g.id = gi.group_id
       JOIN users u ON u.id = gi.invitee_id
       WHERE gi.inviter_id = ? AND gi.status = 'pending'
       ORDER BY gi.created_at DESC`,
      [req.userId]
    );

    res.json({
      incoming: incomingResult.rows,
      outgoing: outgoingResult.rows,
    });
  } catch (err) {
    console.error('Group invitations error:', err);
    res.status(500).json({ error: 'Failed to fetch group invitations.' });
  }
});

// POST /api/sadhana/groups { name }
router.post('/groups', async (req, res) => {
  try {
    const db = getDb();
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Group name is required.' });
    if (name.length > 40) return res.status(400).json({ error: 'Group name is too long.' });

    const countResult = await db.execute(
      'SELECT COUNT(*) as cnt FROM sangha_groups WHERE user_id = ?',
      [req.userId]
    );
    const sortOrder = Number(countResult.rows[0]?.cnt || 0);
    const id = uuidv4();

    await db.execute(
      'INSERT INTO sangha_groups (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)',
      [id, req.userId, name, sortOrder]
    );
    await db.execute(
      'INSERT OR IGNORE INTO sangha_group_members (group_id, user_id) VALUES (?, ?)',
      [id, req.userId]
    );

    const groups = await fetchGroupsForUser(db, req.userId);
    res.json({ group: groups.find(g => g.id === id) });
  } catch (err) {
    console.error('Group create error:', err);
    res.status(500).json({ error: 'Failed to create group.' });
  }
});

// PATCH /api/sadhana/groups/:id { name }
router.patch('/groups/:id', async (req, res) => {
  try {
    const db = getDb();
    if (!await isGroupAdmin(db, req.params.id, req.userId)) {
      return res.status(403).json({ error: 'Only the sangha admin can rename this group.' });
    }

    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Group name is required.' });
    if (name.length > 40) return res.status(400).json({ error: 'Group name is too long.' });

    await db.execute('UPDATE sangha_groups SET name = ? WHERE id = ?', [name, req.params.id]);
    const groups = await fetchGroupsForUser(db, req.userId);
    res.json({ group: groups.find(g => g.id === req.params.id) });
  } catch (err) {
    console.error('Group update error:', err);
    res.status(500).json({ error: 'Failed to update group.' });
  }
});

// DELETE /api/sadhana/groups/:id
router.delete('/groups/:id', async (req, res) => {
  try {
    const db = getDb();
    if (!await isGroupAdmin(db, req.params.id, req.userId)) {
      return res.status(403).json({ error: 'Only the sangha admin can delete this group.' });
    }

    await db.execute('DELETE FROM sangha_group_invites WHERE group_id = ?', [req.params.id]);
    await db.execute('DELETE FROM sangha_group_members WHERE group_id = ?', [req.params.id]);
    await db.execute('DELETE FROM sangha_groups WHERE id = ?', [req.params.id]);
    res.json({ status: 'deleted' });
  } catch (err) {
    console.error('Group delete error:', err);
    res.status(500).json({ error: 'Failed to delete group.' });
  }
});

// POST /api/sadhana/groups/:id/invite { user_id }
router.post('/groups/:id/invite', async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.id;
    if (!await isGroupAdmin(db, groupId, req.userId)) {
      return res.status(403).json({ error: 'Only the sangha admin can invite members.' });
    }

    const inviteeId = req.body.user_id;
    if (!inviteeId) return res.status(400).json({ error: 'user_id is required.' });

    await assertGroupInviteAllowed(db, req.userId, inviteeId);

    if (await isGroupMember(db, groupId, inviteeId)) {
      return res.status(409).json({ error: 'Already in this sangha.' });
    }

    const pending = await db.execute(
      `SELECT id FROM sangha_group_invites
       WHERE group_id = ? AND invitee_id = ? AND status = 'pending'`,
      [groupId, inviteeId]
    );
    if (pending.rows[0]) {
      return res.status(409).json({ error: 'Invitation already sent.' });
    }

    const inviteId = uuidv4();
    await db.execute(
      `INSERT INTO sangha_group_invites (id, group_id, inviter_id, invitee_id, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [inviteId, groupId, req.userId, inviteeId]
    );

    const group = await getGroupById(db, groupId);
    const inviterResult = await db.execute('SELECT name FROM users WHERE id = ?', [req.userId]);
    const inviterName = inviterResult.rows[0]?.name || 'Someone';
    await sendPushToUser(db, inviteeId, {
      title: '👥 Sangha invitation',
      body: `${inviterName} invited you to join "${group?.name || 'a sangha'}"`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: { url: '/' },
      vibrate: [200, 100, 200],
      tag: `sangha-invite-${inviteId}`,
      requireInteraction: false,
    });

    const groups = await fetchGroupsForUser(db, req.userId);
    res.json({ group: groups.find(g => g.id === groupId), invitation_id: inviteId });
  } catch (err) {
    console.error('Group invite error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to send invitation.' });
  }
});

// POST /api/sadhana/groups/invitations/accept { invitation_id }
router.post('/groups/invitations/accept', async (req, res) => {
  try {
    const db = getDb();
    const invitationId = req.body.invitation_id;
    if (!invitationId) return res.status(400).json({ error: 'invitation_id is required.' });

    const result = await db.execute(
      `SELECT id, group_id, invitee_id FROM sangha_group_invites
       WHERE id = ? AND invitee_id = ? AND status = 'pending'`,
      [invitationId, req.userId]
    );
    const invite = result.rows[0];
    if (!invite) return res.status(404).json({ error: 'Invitation not found.' });

    await db.execute(
      'INSERT OR IGNORE INTO sangha_group_members (group_id, user_id) VALUES (?, ?)',
      [invite.group_id, req.userId]
    );
    await db.execute(
      `UPDATE sangha_group_invites SET status = 'accepted', updated_at = datetime('now') WHERE id = ?`,
      [invitationId]
    );

    const groups = await fetchGroupsForUser(db, req.userId);
    res.json({ status: 'accepted', groups });
  } catch (err) {
    console.error('Group accept error:', err);
    res.status(500).json({ error: 'Failed to accept invitation.' });
  }
});

// POST /api/sadhana/groups/invitations/decline { invitation_id }
router.post('/groups/invitations/decline', async (req, res) => {
  try {
    const db = getDb();
    const invitationId = req.body.invitation_id;
    if (!invitationId) return res.status(400).json({ error: 'invitation_id is required.' });

    const result = await db.execute(
      `SELECT id FROM sangha_group_invites
       WHERE id = ? AND invitee_id = ? AND status = 'pending'`,
      [invitationId, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Invitation not found.' });

    await db.execute(
      `UPDATE sangha_group_invites SET status = 'declined', updated_at = datetime('now') WHERE id = ?`,
      [invitationId]
    );

    res.json({ status: 'declined' });
  } catch (err) {
    console.error('Group decline error:', err);
    res.status(500).json({ error: 'Failed to decline invitation.' });
  }
});

// DELETE /api/sadhana/groups/:id/members/:userId
router.delete('/groups/:id/members/:userId', async (req, res) => {
  try {
    const db = getDb();
    const groupId = req.params.id;
    const memberId = req.params.userId;

    if (!await isGroupAdmin(db, groupId, req.userId)) {
      return res.status(403).json({ error: 'Only the sangha admin can remove members.' });
    }

    const group = await getGroupById(db, groupId);
    if (memberId === group.admin_id) {
      return res.status(400).json({ error: 'The admin cannot be removed from the sangha.' });
    }

    await db.execute(
      'DELETE FROM sangha_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, memberId]
    );

    const groups = await fetchGroupsForUser(db, req.userId);
    res.json({ group: groups.find(g => g.id === groupId) });
  } catch (err) {
    console.error('Group remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

// GET /api/sadhana/team
router.get('/team', async (req, res) => {
  try {
    const db = getDb();
    const today = getSadhanaDate();

    const itemsResult = await db.execute('SELECT id, name, category FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC');
    const items = itemsResult.rows;
    const totalItems = items.length;

    const friendIds = await getFriendIds(db, req.userId);
    const groupCoMemberIds = await getGroupCoMemberIds(db, req.userId);
    const memberIds = [...new Set([req.userId, ...friendIds, ...groupCoMemberIds])];
    const placeholders = memberIds.map(() => '?').join(', ');

    const usersResult = await db.execute(
      `SELECT id, name, email FROM users WHERE id IN (${placeholders}) ORDER BY name ASC`,
      memberIds
    );
    const users = usersResult.rows;

    const progressResult = await db.execute(
      'SELECT user_id, item_id FROM daily_progress WHERE date = ?',
      [today]
    );

    const progressByUser = {};
    for (const row of progressResult.rows) {
      if (!progressByUser[row.user_id]) progressByUser[row.user_id] = new Set();
      progressByUser[row.user_id].add(row.item_id);
    }

    const customLabelsByUser = await getCustomLabelsForUsers(db, memberIds);
    const dayStatesByUser = await getDayStatesForUsers(db, memberIds, today);

    const teamData = users.map(user => {
      const completedIds = progressByUser[user.id] || new Set();
      return buildMemberProgress(
        user,
        items,
        totalItems,
        completedIds,
        customLabelsByUser[user.id] || {},
        dayStatesByUser[user.id] || null
      );
    });

    res.json({ date: today, totalItems, members: teamData });
  } catch (err) {
    console.error('Team error:', err);
    res.status(500).json({ error: 'Failed to fetch team data.' });
  }
});

// GET /api/sadhana/history/:userId
router.get('/history/:userId', async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.params;
    const days = parseInt(req.query.days) || 7;

    const userResult = await db.execute('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const allowed = await canViewUserProgress(db, req.userId, userId);
    if (!allowed) return res.status(403).json({ error: 'Not in your sangha.' });

    const dates = [];
    const sadhanaToday = getSadhanaDate();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(sadhanaToday);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const itemsResult = await db.execute('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC');
    const items = itemsResult.rows;

    const progressResult = await db.execute(
      'SELECT date, item_id FROM daily_progress WHERE user_id = ? AND date >= ? ORDER BY date ASC',
      [userId, dates[0]]
    );

    const progressByDate = {};
    for (const row of progressResult.rows) {
      if (!progressByDate[row.date]) progressByDate[row.date] = new Set();
      progressByDate[row.date].add(row.item_id);
    }

    const history = dates.map(date => ({
      date,
      items: items.map(item => ({
        ...item,
        completed: (progressByDate[date] || new Set()).has(item.id)
      }))
    }));

    res.json({ user, days, items, history });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// GET /api/sadhana/nudges/received — nudges you received today
router.get('/nudges/received', async (req, res) => {
  try {
    const db = getDb();
    const today = getSadhanaDate();
    const result = await db.execute(
      `SELECT sn.id, sn.created_at, u.id as user_id, u.name
       FROM sangha_nudges sn
       JOIN users u ON u.id = sn.from_user_id
       WHERE sn.to_user_id = ? AND sn.date = ?
       ORDER BY sn.created_at DESC`,
      [req.userId, today]
    );
    res.json({ date: today, nudges: result.rows });
  } catch (err) {
    console.error('Received nudges error:', err);
    res.status(500).json({ error: 'Failed to fetch received nudges.' });
  }
});

// GET /api/sadhana/nudges — nudges sent today by current user
router.get('/nudges', async (req, res) => {
  try {
    const db = getDb();
    const today = getSadhanaDate();
    const result = await db.execute(
      'SELECT to_user_id FROM sangha_nudges WHERE from_user_id = ? AND date = ?',
      [req.userId, today]
    );
    res.json({ date: today, nudgedUserIds: result.rows.map(r => r.to_user_id) });
  } catch (err) {
    console.error('Nudges list error:', err);
    res.status(500).json({ error: 'Failed to fetch nudges.' });
  }
});

async function recordAndSendNudge(db, fromUserId, toUserId, fromName) {
  const today = getSadhanaDate();
  const friendIds = await getFriendIds(db, fromUserId);
  if (!friendIds.includes(toUserId)) {
    const err = new Error('Not in your sangha.');
    err.status = 403;
    throw err;
  }

  const existing = await db.execute(
    'SELECT id FROM sangha_nudges WHERE from_user_id = ? AND to_user_id = ? AND date = ?',
    [fromUserId, toUserId, today]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Already nudged today.');
    err.status = 409;
    throw err;
  }

  await db.execute(
    'INSERT INTO sangha_nudges (id, from_user_id, to_user_id, date) VALUES (?, ?, ?, ?)',
    [uuidv4(), fromUserId, toUserId, today]
  );

  const pushed = await sendPushToUser(db, toUserId, {
    title: '🙏 Sangha nudge',
    body: `${fromName} finished today — time for your sadhana!`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: '/' },
    vibrate: [200, 100, 200],
    tag: 'sangha-nudge',
    requireInteraction: false,
  });

  return { pushed };
}

// POST /api/sadhana/nudge { user_id }
router.post('/nudge', async (req, res) => {
  try {
    const { user_id: toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ error: 'user_id is required.' });
    if (toUserId === req.userId) return res.status(400).json({ error: 'Cannot nudge yourself.' });

    const db = getDb();
    const me = await db.execute('SELECT name FROM users WHERE id = ?', [req.userId]);
    const fromName = me.rows[0]?.name || 'A sangha friend';

    const result = await recordAndSendNudge(db, req.userId, toUserId, fromName);
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Nudge error:', err);
    res.status(500).json({ error: 'Failed to send nudge.' });
  }
});

// POST /api/sadhana/nudge-all
router.post('/nudge-all', async (req, res) => {
  try {
    const db = getDb();
    const today = getSadhanaDate();
    const me = await db.execute('SELECT name FROM users WHERE id = ?', [req.userId]);
    const fromName = me.rows[0]?.name || 'A sangha friend';

    const itemsResult = await db.execute('SELECT id, name, category FROM sadhana_items WHERE active = 1');
    const items = itemsResult.rows;
    const friendIds = await getFriendIds(db, req.userId);

    const progressResult = await db.execute('SELECT user_id, item_id FROM daily_progress WHERE date = ?', [today]);
    const progressByUser = {};
    for (const row of progressResult.rows) {
      if (!progressByUser[row.user_id]) progressByUser[row.user_id] = new Set();
      progressByUser[row.user_id].add(row.item_id);
    }

    const already = await db.execute(
      'SELECT to_user_id FROM sangha_nudges WHERE from_user_id = ? AND date = ?',
      [req.userId, today]
    );
    const nudgedSet = new Set(already.rows.map(r => r.to_user_id));

    let sent = 0;
    let skipped = 0;
    for (const friendId of friendIds) {
      const completedIds = progressByUser[friendId] || new Set();
      const { complete } = computeDayPillarsFromServer(items, completedIds);
      if (complete || nudgedSet.has(friendId)) {
        skipped++;
        continue;
      }
      try {
        await recordAndSendNudge(db, req.userId, friendId, fromName);
        nudgedSet.add(friendId);
        sent++;
      } catch (err) {
        if (err.status === 409) skipped++;
      }
    }

    res.json({ ok: true, sent, skipped });
  } catch (err) {
    console.error('Nudge-all error:', err);
    res.status(500).json({ error: 'Failed to nudge sangha.' });
  }
});

function dayStatusFromMergedProgress(items, completedIds, dayState) {
  const pillars = computeDayPillarsMerged(items, completedIds, dayState);
  if (!pillars.complete) return 'none';
  const akyLevel = computeAkyLevelMerged(items, completedIds, dayState);
  return akyLevel === 'green' ? 'green' : 'orange';
}

async function buildUserStatusByDate(db, userId, today) {
  const from = addDays(today, -120);
  const itemsResult = await db.execute(
    'SELECT id, name, category, item_type FROM sadhana_items WHERE active = 1'
  );
  const items = itemsResult.rows;

  const progressResult = await db.execute(
    'SELECT date, item_id FROM daily_progress WHERE user_id = ? AND date >= ? AND date <= ?',
    [userId, from, today]
  );
  const progressByDate = {};
  for (const row of progressResult.rows) {
    if (!progressByDate[row.date]) progressByDate[row.date] = new Set();
    progressByDate[row.date].add(row.item_id);
  }

  const dates = Object.keys(progressByDate);
  const userDayStates = {};
  const stateResult = await db.execute(
    'SELECT date, state FROM user_day_state WHERE user_id = ? AND date >= ? AND date <= ?',
    [userId, from, today]
  );
  for (const row of stateResult.rows) {
    userDayStates[row.date] = normalizeDayState(parseDayStateJson(row.state));
  }

  const statusByDate = {};
  const allDates = new Set([...dates, ...Object.keys(userDayStates), today]);
  for (const date of allDates) {
    const completedIds = progressByDate[date] || new Set();
    statusByDate[date] = dayStatusFromMergedProgress(
      items,
      completedIds,
      userDayStates[date] || null
    );
  }

  return statusByDate;
}

// GET /api/sadhana/streak-freezes — sync, balance, streak, help requests
router.get('/streak-freezes', async (req, res) => {
  try {
    const db = getDb();
    const today = getSadhanaDate();
    const statusByDate = await buildUserStatusByDate(db, req.userId, today);

    const autoApplied = await tryAutoFreezeYesterday(db, req.userId, statusByDate, today);
    const frozenDates = await getFrozenDates(db, req.userId);
    const frozenSet = new Set(frozenDates);

    let streak = computeStreakWithFreezes(statusByDate, frozenSet, today);
    let { count, milestone } = await getUserFreezeRow(db, req.userId);

    if (isStreakDayStatus(statusByDate[today])) {
      const award = await awardFreezesForStreak(db, req.userId, streak);
      count = award.count;
      milestone = award.milestone;
    }

    const incomingResult = await db.execute(
      `SELECT hr.id, hr.requester_id, hr.created_at, u.name as requester_name
       FROM streak_freeze_help_requests hr
       JOIN users u ON u.id = hr.requester_id
       WHERE hr.status = 'pending'
       AND hr.requester_id != ?
       AND EXISTS (
         SELECT 1 FROM friend_requests fr
         WHERE fr.status = 'accepted'
         AND (
           (fr.requester_id = ? AND fr.recipient_id = hr.requester_id)
           OR (fr.recipient_id = ? AND fr.requester_id = hr.requester_id)
         )
       )
       ORDER BY hr.created_at DESC`,
      [req.userId, req.userId, req.userId]
    );

    const outgoingResult = await db.execute(
      `SELECT id, created_at FROM streak_freeze_help_requests
       WHERE requester_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [req.userId]
    );

    res.json({
      balance: count,
      max: MAX_STREAK_FREEZES,
      frozenDates,
      autoApplied,
      currentStreak: streak,
      daysUntilNextFreeze: daysUntilNextFreeze(streak),
      earnEvery: FREEZE_EARN_EVERY_DAYS,
      incomingHelp: incomingResult.rows,
      outgoingHelp: outgoingResult.rows[0] || null,
    });
  } catch (err) {
    console.error('Streak freezes fetch error:', err);
    res.status(500).json({ error: 'Failed to load streak freezes.' });
  }
});

// POST /api/sadhana/streak-freezes/help-request
router.post('/streak-freezes/help-request', async (req, res) => {
  try {
    const db = getDb();
    const { count } = await getUserFreezeRow(db, req.userId);
    if (count > 0) {
      return res.status(400).json({ error: 'You still have streak freezes available.' });
    }

    const pending = await db.execute(
      `SELECT id FROM streak_freeze_help_requests WHERE requester_id = ? AND status = 'pending'`,
      [req.userId]
    );
    if (pending.rows[0]) {
      return res.status(409).json({ error: 'You already have a pending help request.' });
    }

    const friendIds = await getFriendIds(db, req.userId);
    if (friendIds.length === 0) {
      return res.status(400).json({ error: 'Add sangha friends before requesting help.' });
    }

    const id = uuidv4();
    await db.execute(
      `INSERT INTO streak_freeze_help_requests (id, requester_id, status) VALUES (?, ?, 'pending')`,
      [id, req.userId]
    );

    const requesterName = (await db.execute('SELECT name FROM users WHERE id = ?', [req.userId])).rows[0]?.name || 'A sangha friend';
    for (const friendId of friendIds) {
      await sendPushToUser(db, friendId, {
        title: '❄️ Streak freeze needed',
        body: `${requesterName} is out of streak freezes and needs your help.`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        data: { url: '/' },
        tag: 'streak-freeze-help',
        requireInteraction: false,
      });
    }

    res.json({ id, status: 'pending' });
  } catch (err) {
    console.error('Streak help request error:', err);
    res.status(500).json({ error: 'Failed to request help.' });
  }
});

// POST /api/sadhana/streak-freezes/help-requests/:id/accept
router.post('/streak-freezes/help-requests/:id/accept', async (req, res) => {
  try {
    const db = getDb();
    const requestId = req.params.id;

    const result = await db.execute(
      `SELECT id, requester_id, status FROM streak_freeze_help_requests WHERE id = ?`,
      [requestId]
    );
    const row = result.rows[0];
    if (!row || row.status !== 'pending') {
      return res.status(404).json({ error: 'Help request not found.' });
    }
    if (row.requester_id === req.userId) {
      return res.status(400).json({ error: 'You cannot accept your own request.' });
    }

    const friendIds = await getFriendIds(db, req.userId);
    if (!friendIds.includes(row.requester_id)) {
      return res.status(403).json({ error: 'Only sangha friends can help.' });
    }

    const helper = await getUserFreezeRow(db, req.userId);
    if (helper.count <= 0) {
      return res.status(400).json({ error: 'You need at least one streak freeze to share.' });
    }

    const requester = await getUserFreezeRow(db, row.requester_id);
    if (requester.count >= MAX_STREAK_FREEZES) {
      return res.status(400).json({ error: 'Their freeze bank is already full.' });
    }

    await setUserFreezeCount(db, req.userId, helper.count - 1, helper.milestone);
    await setUserFreezeCount(db, row.requester_id, requester.count + 1, requester.milestone);

    await db.execute(
      `UPDATE streak_freeze_help_requests
       SET status = 'accepted', helper_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [req.userId, requestId]
    );

    const helperName = (await db.execute('SELECT name FROM users WHERE id = ?', [req.userId])).rows[0]?.name || 'A friend';

    await sendPushToUser(db, row.requester_id, {
      title: '❄️ Streak freeze received',
      body: `${helperName} shared a streak freeze with you.`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: { url: '/' },
      tag: 'streak-freeze-gift',
      requireInteraction: false,
    });

    res.json({ status: 'accepted' });
  } catch (err) {
    console.error('Streak help accept error:', err);
    res.status(500).json({ error: 'Failed to send streak freeze.' });
  }
});

// POST /api/sadhana/streak-freezes/help-requests/:id/decline
router.post('/streak-freezes/help-requests/:id/decline', async (req, res) => {
  try {
    const db = getDb();
    const requestId = req.params.id;

    const result = await db.execute(
      `SELECT id, requester_id, status FROM streak_freeze_help_requests WHERE id = ?`,
      [requestId]
    );
    const row = result.rows[0];
    if (!row || row.status !== 'pending') {
      return res.status(404).json({ error: 'Help request not found.' });
    }

    const friendIds = await getFriendIds(db, req.userId);
    if (row.requester_id !== req.userId && !friendIds.includes(row.requester_id)) {
      return res.status(403).json({ error: 'Not allowed.' });
    }

    await db.execute(
      `UPDATE streak_freeze_help_requests SET status = 'declined', updated_at = datetime('now') WHERE id = ?`,
      [requestId]
    );

    res.json({ status: 'declined' });
  } catch (err) {
    console.error('Streak help decline error:', err);
    res.status(500).json({ error: 'Failed to decline request.' });
  }
});

module.exports = router;