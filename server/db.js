const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

  const count = db.prepare('SELECT COUNT(*) as cnt FROM sadhana_items').get();
  if (count.cnt === 0) {
    const defaults = [
      { name: 'Japa', description: 'Chanting rounds of the Hare Krishna mahamantra', emoji: '📿', sort_order: 1 },
      { name: 'Kirtan', description: 'Congregational chanting or personal kirtan', emoji: '🎵', sort_order: 2 },
      { name: 'Śrīmad Bhāgavatam', description: 'Reading or hearing Śrīmad Bhāgavatam', emoji: '📖', sort_order: 3 },
      { name: 'Bhagavad Gītā', description: 'Reading or studying Bhagavad Gītā', emoji: '📔', sort_order: 4 },
      { name: 'Meditation', description: 'Silent meditation or contemplation', emoji: '🧘', sort_order: 5 },
      { name: 'Yoga / Āsanas', description: 'Physical yoga practice', emoji: '🤸', sort_order: 6 },
      { name: 'Sevā', description: 'Selfless service or volunteering', emoji: '🙏', sort_order: 7 },
      { name: 'Guru Pūjā', description: 'Offering worship to the spiritual master', emoji: '🪷', sort_order: 8 },
      { name: 'Maṅgala Ārati', description: 'Early morning worship ceremony', emoji: '🕯️', sort_order: 9 },
      { name: 'Tulasī Pūjā', description: 'Worship of Tulasī Devī', emoji: '🌿', sort_order: 10 },
      { name: 'Prasādam', description: 'Offering and honoring sanctified food', emoji: '🍃', sort_order: 11 },
      { name: 'Study / Śāstra', description: 'General scriptural study and reflection', emoji: '📚', sort_order: 12 },
    ];

    const insert = db.prepare('INSERT INTO sadhana_items (id, name, description, emoji, sort_order) VALUES (?, ?, ?, ?, ?)');
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(uuidv4(), item.name, item.description, item.emoji, item.sort_order);
      }
    });
    insertMany(defaults);
  }
}

module.exports = { getDb };