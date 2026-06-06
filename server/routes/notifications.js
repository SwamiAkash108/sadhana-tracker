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
  if (!VAPID_PUBLIC) {
    return res.status(503).json({ error: 'Push notifications not configured on server.' });
  }
  res.json({ publicKey: VAPID_PUBLIC });
});

router.post('/subscribe', authMiddleware, (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Subscription object is required.' });
  const db = getDb();
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.userId);
  db.prepare('INSERT INTO push_subscriptions (id, user_id, subscription) VALUES (?, ?, ?)').run(uuidv4(), req.userId, JSON.stringify(subscription));
  res.json({ ok: true });
});

router.post('/unsubscribe', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.userId);
  res.json({ ok: true });
});

router.post('/send-reminder', authMiddleware, (req, res) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(503).json({ error: 'Push notifications not configured.' });
  }
  const db = getDb();
  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  if (subs.length === 0) {
    return res.json({ sent: 0, message: 'No subscribers.' });
  }
  const payload = JSON.stringify({
    title: '🙏 Sadhana Reminder',
    body: 'Have you completed your sadhana today? Open the tracker to check in.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: '/' },
    vibrate: [200, 100, 200],
    tag: 'sadhana-reminder',
    requireInteraction: true
  });
  let sent = 0;
  let failed = 0;
  const sendPromises = subs.map(sub => {
    return webpush.sendNotification(JSON.parse(sub.subscription), payload)
      .then(() => { sent++; })
      .catch(err => {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        }
      });
  });
  Promise.all(sendPromises).then(() => {
    res.json({ sent, failed });
  });
});

module.exports = router;