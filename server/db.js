const { createClient } = require('@libsql/client/http');
const { v4: uuidv4 } = require('uuid');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let db;

function getDb() {
  if (!db) {
    if (!TURSO_URL || !TURSO_TOKEN) {
      throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment');
    }
    db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return db;
}

async function initSchema() {
  const client = getDb();
  const ddl = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS sadhana_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      emoji TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      category TEXT DEFAULT '',
      item_type TEXT DEFAULT 'toggle',
      target INTEGER DEFAULT 0,
      am_pm INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS daily_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      completed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES sadhana_items(id),
      UNIQUE(user_id, item_id, date)
    )`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subscription TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date)`,
  ];

  for (const sql of ddl) {
    await client.execute(sql);
  }

  const result = await client.execute('SELECT COUNT(*) as cnt FROM sadhana_items');
  const count = result.rows[0].cnt;
  if (count === 0) {
    const defaults = [
      { name: 'Suka Purvaka', description: 'Easy breathing — 20 rounds', emoji: '🌬️', sort_order: 1, category: 'pranayama', type: 'counter', target: 20 },
      { name: 'Nadhi Shuddhi', description: 'Alternate nostril cleansing', emoji: '🫧', sort_order: 2, category: 'pranayama', type: 'counter', target: 20 },
      { name: 'Main Kriya', description: 'Atma Kriya rounds', emoji: '🔥', sort_order: 3, category: 'kriya', type: 'counter', target: 6, am_pm: true },
      { name: 'Khecari Mudra', description: 'Tongue lock gesture', emoji: '👁️', sort_order: 4, category: 'mudras', type: 'toggle' },
      { name: 'Maha Mudra', description: 'Great seal pose — 3 rounds', emoji: '🤲', sort_order: 5, category: 'mudras', type: 'counter', target: 3 },
      { name: 'Kurmasana', description: 'Tortoise pose', emoji: '🐢', sort_order: 6, category: 'mudras', type: 'toggle' },
      { name: 'Simhasana', description: 'Lion pose — 5 rounds', emoji: '🦁', sort_order: 7, category: 'mudras', type: 'counter', target: 5 },
      { name: 'Svastikasana', description: 'Auspicious pose', emoji: '🪷', sort_order: 8, category: 'mudras', type: 'toggle' },
      { name: 'Shavasana', description: 'Corpse pose relaxation', emoji: '🧎', sort_order: 9, category: 'mudras', type: 'toggle' },
      { name: 'Trinity Meditation', description: 'Triple focus meditation — 5 rounds', emoji: '🧘', sort_order: 10, category: 'meditation', type: 'counter', target: 5 },
      { name: 'Nada Kriya', description: 'Sound meditation — up to 20 min', emoji: '🎵', sort_order: 11, category: 'meditation', type: 'timer', target: 1200 },
      { name: 'Kriya Level 2', description: 'Advanced kriya practice', emoji: '⭐', sort_order: 12, category: 'advanced', type: 'toggle' },
      { name: 'Japa', description: 'Hare Krishna mahamantra chanting — 60 min', emoji: '📿', sort_order: 13, category: 'japa', type: 'timer', target: 3600 },
      { name: 'Exercise', description: 'Physical workout — 10 min minimum', emoji: '🏃', sort_order: 14, category: 'quick', type: 'toggle' },
      { name: 'Water', description: 'Hydration — 2 litres', emoji: '💧', sort_order: 15, category: 'quick', type: 'toggle' },
      { name: 'Study', description: 'Scriptural study & reflection', emoji: '📖', sort_order: 16, category: 'quick', type: 'toggle' },
      { name: 'Abhishekam', description: 'Sacred bathing ritual', emoji: '🪷', sort_order: 17, category: 'quick', type: 'toggle' },
    ];

    const stmts = defaults.map(item => ({
      sql: 'INSERT INTO sadhana_items (id, name, description, emoji, sort_order, category, item_type, target, am_pm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [uuidv4(), item.name, item.description, item.emoji, item.sort_order, item.category, item.type, item.target || 0, item.am_pm ? 1 : 0],
    }));
    await client.batch(stmts);
  }
}

/**
 * Returns the sadhana-calendar date string (YYYY-MM-DD).
 * Sadhana days end at 4:30 AM, not midnight — if the current time is
 * before 4:30 AM, the previous calendar date is used.
 */
function getSadhanaDate() {
  const now = new Date();
  const offsetMinutes = 4 * 60 + 30; // 4 hours 30 minutes
  const adjusted = new Date(now.getTime() - offsetMinutes * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
}

module.exports = { getDb, initSchema, getSadhanaDate };