const express = require('express');
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sadhana-tracker.local';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

router.get('/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC) return res.status(503).json({ error: 'Push notifications not configured on server.' });
  res.json({ publicKey: VAPID_PUBLIC });
});

router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription object is required.' });
    const db = getDb();
    await db.execute('DELETE FROM push_subscriptions WHERE user_id = ?', [req.userId]);
    await db.execute('INSERT INTO push_subscriptions (id, user_id, subscription) VALUES (?, ?, ?)', [uuidv4(), req.userId, JSON.stringify(subscription)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe.' });
  }
});

router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    await db.execute('DELETE FROM push_subscriptions WHERE user_id = ?', [req.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe.' });
  }
});

router.post('/send-reminder', authMiddleware, async (req, res) => {
  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return res.status(503).json({ error: 'Push notifications not configured.' });
    const db = getDb();
    const result = await db.execute('SELECT * FROM push_subscriptions');
    const subs = result.rows;
    if (subs.length === 0) return res.json({ sent: 0, message: 'No subscribers.' });
    const payload = JSON.stringify({
      title: '🙏 Sadhana Reminder',
      body: 'Have you completed your sadhana today? Open the tracker to check in.',
      icon: '/icons/icon-192.png', badge: '/icons/icon-72.png',
      data: { url: '/' }, vibrate: [200, 100, 200],
      tag: 'sadhana-reminder', requireInteraction: true
    });
    let sent = 0, failed = 0;
    await Promise.all(subs.map(sub =>
      webpush.sendNotification(JSON.parse(sub.subscription), payload)
        .then(() => { sent++; })
        .catch(async err => {
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
          }
        })
    ));
    res.json({ sent, failed });
  } catch (err) {
    console.error('Send reminder error:', err);
    res.status(500).json({ error: 'Failed to send reminders.' });
  }
});

module.exports = router;