const express = require('express');
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');
const { getDb, getSadhanaDate } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
router.use(authMiddleware);

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sadhana-tracker.local';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const DAY_PILLAR_COUNT = 6;

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

function buildMemberProgress(user, items, totalItems, completedIds) {
  const completed = completedIds.size;
  const itemStatus = items.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    completed: completedIds.has(item.id),
  }));
  const akyItems = items.filter(i => !['japa', 'quick'].includes((i.category || '').toLowerCase()));
  const akyDone = akyItems.filter(i => completedIds.has(i.id)).length;
  const japaDone = items.some(i => (i.category || '').toLowerCase() === 'japa' && completedIds.has(i.id));
  const quickItems = items.filter(i => (i.category || '').toLowerCase() === 'quick');
  const quickDone = quickItems.filter(i => completedIds.has(i.id)).length;
  const dayPillars = computeDayPillarsFromServer(items, completedIds);

  return {
    ...user,
    completed,
    total: totalItems,
    percentage: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0,
    items: itemStatus,
    akyDone,
    akyTotal: akyItems.length,
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

// GET /api/sadhana/today
router.get('/today', async (req, res) => {
  try {
    const db = getDb();
    const today = getSadhanaDate();

    const itemsResult = await db.execute('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC');
    const items = itemsResult.rows;

    const progressResult = await db.execute('SELECT item_id FROM daily_progress WHERE user_id = ? AND date = ?', [req.userId, today]);
    const completedIds = new Set(progressResult.rows.map(p => p.item_id));

    const checklist = items.map(item => ({
      ...item,
      completed: completedIds.has(item.id)
    }));

    res.json({ date: today, checklist, summary: { total: items.length, done: completedIds.size, remaining: items.length - completedIds.size } });
  } catch (err) {
    console.error('Today error:', err);
    res.status(500).json({ error: 'Failed to fetch today data.' });
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

    res.json({ status: 'removed' });
  } catch (err) {
    console.error('Friend remove error:', err);
    res.status(500).json({ error: 'Failed to remove friend.' });
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
    const memberIds = [req.userId, ...friendIds];
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

    const teamData = users.map(user => {
      const completedIds = progressByUser[user.id] || new Set();
      return buildMemberProgress(user, items, totalItems, completedIds);
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

module.exports = router;