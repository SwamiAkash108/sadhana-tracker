const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/items', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC').all();
  res.json({ items });
});

router.get('/today', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const items = db.prepare('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC').all();
  const progress = db.prepare('SELECT item_id FROM daily_progress WHERE user_id = ? AND date = ?').all(req.userId, today);
  const completedIds = new Set(progress.map(p => p.item_id));
  const checklist = items.map(item => ({ ...item, completed: completedIds.has(item.id) }));
  const total = items.length;
  const done = completedIds.size;
  res.json({ date: today, checklist, summary: { total, done, remaining: total - done } });
});

router.post('/toggle', (req, res) => {
  const { item_id } = req.body;
  if (!item_id) return res.status(400).json({ error: 'item_id is required.' });
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT id FROM daily_progress WHERE user_id = ? AND item_id = ? AND date = ?').get(req.userId, item_id, today);
  if (existing) {
    db.prepare('DELETE FROM daily_progress WHERE id = ?').run(existing.id);
    res.json({ completed: false });
  } else {
    db.prepare('INSERT INTO daily_progress (id, user_id, item_id, date) VALUES (?, ?, ?, ?)').run(uuidv4(), req.userId, item_id, today);
    res.json({ completed: true });
  }
});

router.get('/stats', (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days) || 30;
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  const totalItems = db.prepare('SELECT COUNT(*) as cnt FROM sadhana_items WHERE active = 1').get().cnt;
  const progressRows = db.prepare(`SELECT date, COUNT(*) as completed_count FROM daily_progress WHERE user_id = ? AND date >= ? GROUP BY date ORDER BY date ASC`).all(req.userId, dates[0]);
  const progressMap = {};
  for (const row of progressRows) { progressMap[row.date] = row.completed_count; }
  const dailyData = dates.map(date => ({ date, completed: progressMap[date] || 0, total: totalItems, percentage: totalItems > 0 ? Math.round(((progressMap[date] || 0) / totalItems) * 100) : 0 }));
  let streak = 0;
  const today = dates[dates.length - 1];
  for (let i = dates.length - 1; i >= 0; i--) {
    const d = dates[i];
    if ((progressMap[d] || 0) >= totalItems) { streak++; }
    else if (d !== today || (progressMap[d] || 0) < totalItems) { break; }
    else { break; }
  }
  const totalCompleted = dailyData.reduce((sum, d) => sum + d.completed, 0);
  const totalPossible = totalItems * days;
  const overallRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  const bestDay = dailyData.reduce((best, d) => d.completed > best.completed ? d : best, dailyData[0] || { date: '', completed: 0 });
  res.json({ days, totalItems, streak, overallRate, bestDay: { date: bestDay.date, completed: bestDay.completed }, dailyData });
});

router.get('/team', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const totalItems = db.prepare('SELECT COUNT(*) as cnt FROM sadhana_items WHERE active = 1').get().cnt;
  const users = db.prepare('SELECT id, name, email FROM users ORDER BY name ASC').all();
  const teamData = users.map(user => {
    const completed = db.prepare('SELECT COUNT(*) as cnt FROM daily_progress WHERE user_id = ? AND date = ?').get(user.id, today).cnt;
    return { ...user, completed, total: totalItems, percentage: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0 };
  });
  res.json({ date: today, totalItems, members: teamData });
});

router.get('/history/:userId', (req, res) => {
  const db = getDb();
  const { userId } = req.params;
  const days = parseInt(req.query.days) || 7;
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  const items = db.prepare('SELECT * FROM sadhana_items WHERE active = 1 ORDER BY sort_order ASC').all();
  const progressRows = db.prepare(`SELECT date, item_id FROM daily_progress WHERE user_id = ? AND date >= ? ORDER BY date ASC`).all(userId, dates[0]);
  const progressByDate = {};
  for (const row of progressRows) {
    if (!progressByDate[row.date]) progressByDate[row.date] = new Set();
    progressByDate[row.date].add(row.item_id);
  }
  const history = dates.map(date => ({ date, items: items.map(item => ({ ...item, completed: (progressByDate[date] || new Set()).has(item.id) })) }));
  res.json({ user, days, items, history });
});

module.exports = router;