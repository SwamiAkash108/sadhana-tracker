const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
router.use(authMiddleware);

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

router.get('/today', async (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const itemsResult = await db.execute('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC');
    const items = itemsResult.rows;
    const progressResult = await db.execute('SELECT item_id FROM daily_progress WHERE user_id = ? AND date = ?', [req.userId, today]);
    const completedIds = new Set(progressResult.rows.map(p => p.item_id));
    const checklist = items.map(item => ({ ...item, completed: completedIds.has(item.id) }));
    res.json({ date: today, checklist, summary: { total: items.length, done: completedIds.size, remaining: items.length - completedIds.size } });
  } catch (err) {
    console.error('Today error:', err);
    res.status(500).json({ error: 'Failed to fetch today data.' });
  }
});

router.post('/toggle', async (req, res) => {
  try {
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id is required.' });
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
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

router.get('/stats', async (req, res) => {
  try {
    const db = getDb();
    const days = parseInt(req.query.days) || 30;
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const totalResult = await db.execute('SELECT COUNT(*) as cnt FROM sadhana_items WHERE active = 1');
    const totalItems = totalResult.rows[0].cnt;
    const progressResult = await db.execute('SELECT date, COUNT(*) as completed_count FROM daily_progress WHERE user_id = ? AND date >= ? GROUP BY date ORDER BY date ASC', [req.userId, dates[0]]);
    const progressMap = {};
    for (const row of progressResult.rows) { progressMap[row.date] = row.completed_count; }
    const dailyData = dates.map(date => ({
      date, completed: progressMap[date] || 0, total: totalItems,
      percentage: totalItems > 0 ? Math.round(((progressMap[date] || 0) / totalItems) * 100) : 0
    }));
    let streak = 0;
    const today = dates[dates.length - 1];
    for (let i = dates.length - 1; i >= 0; i--) {
      if ((progressMap[dates[i]] || 0) >= totalItems) streak++;
      else if (dates[i] !== today) break;
    }
    const totalCompleted = dailyData.reduce((sum, d) => sum + d.completed, 0);
    const overallRate = (totalItems * days) > 0 ? Math.round((totalCompleted / (totalItems * days)) * 100) : 0;
    const bestDay = dailyData.reduce((best, d) => d.completed > best.completed ? d : best, dailyData[0] || { date: '', completed: 0 });
    res.json({ days, totalItems, streak, overallRate, bestDay: { date: bestDay.date, completed: bestDay.completed }, dailyData });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

router.get('/team', async (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const totalResult = await db.execute('SELECT COUNT(*) as cnt FROM sadhana_items WHERE active = 1');
    const totalItems = totalResult.rows[0].cnt;
    const usersResult = await db.execute('SELECT id, name, email FROM users ORDER BY name ASC');
    const users = usersResult.rows;
    const teamData = await Promise.all(users.map(async user => {
      const compResult = await db.execute('SELECT COUNT(*) as cnt FROM daily_progress WHERE user_id = ? AND date = ?', [user.id, today]);
      const completed = compResult.rows[0].cnt;
      return { ...user, completed, total: totalItems, percentage: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0 };
    }));
    res.json({ date: today, totalItems, members: teamData });
  } catch (err) {
    console.error('Team error:', err);
    res.status(500).json({ error: 'Failed to fetch team data.' });
  }
});

router.get('/history/:userId', async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.params;
    const days = parseInt(req.query.days) || 7;
    const userResult = await db.execute('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const itemsResult = await db.execute('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC');
    const items = itemsResult.rows;
    const progressResult = await db.execute('SELECT date, item_id FROM daily_progress WHERE user_id = ? AND date >= ? ORDER BY date ASC', [userId, dates[0]]);
    const progressByDate = {};
    for (const row of progressResult.rows) {
      if (!progressByDate[row.date]) progressByDate[row.date] = new Set();
      progressByDate[row.date].add(row.item_id);
    }
    const history = dates.map(date => ({
      date, items: items.map(item => ({ ...item, completed: (progressByDate[date] || new Set()).has(item.id) }))
    }));
    res.json({ user, days, items, history });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

module.exports = router;