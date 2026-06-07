import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'sadhana.db')
  : path.join(__dirname, 'sadhana.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sadhana_items (
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
    );

    CREATE TABLE IF NOT EXISTS daily_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      completed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES sadhana_items(id),
      UNIQUE(user_id, item_id, date)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subscription TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date);
  `);

  // Seed default sadhana items if table is empty
  const count = db.prepare('SELECT COUNT(*) as cnt FROM sadhana_items').get();
  if (count.cnt === 0) {
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

    const insert = db.prepare('INSERT INTO sadhana_items (id, name, description, emoji, sort_order, category, item_type, target, am_pm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(uuidv4(), item.name, item.description, item.emoji, item.sort_order, item.category, item.type, item.target || 0, item.am_pm ? 1 : 0);
      }
    });
    insertMany(defaults);
  }
}

export default { getDb };