const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let db;

function getDb() {
  if (!db) {
    if (TURSO_URL && TURSO_TOKEN) {
      const { createClient } = require('@libsql/client/http');
      db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
    } else {
      const { createClient } = require('@libsql/client');
      const dbPath = path.join(__dirname, 'data', 'sadhana.db');
      db = createClient({ url: `file:${dbPath}` });
      console.log(`Local dev mode — using SQLite at ${dbPath}`);
    }
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
    `CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id),
      UNIQUE(requester_id, recipient_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(date)`,
    `CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON friend_requests(recipient_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester_id, status)`,
    `CREATE TABLE IF NOT EXISTS sangha_nudges (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id),
      UNIQUE(from_user_id, to_user_id, date)
    )`,
    `CREATE TABLE IF NOT EXISTS day_snapshots (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_day_state (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sangha_groups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sangha_group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES sangha_groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sangha_group_invites (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES sangha_groups(id),
      FOREIGN KEY (inviter_id) REFERENCES users(id),
      FOREIGN KEY (invitee_id) REFERENCES users(id),
      UNIQUE(group_id, invitee_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sangha_groups_user ON sangha_groups(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sangha_group_invites_invitee ON sangha_group_invites(invitee_id, status)`,
    `CREATE TABLE IF NOT EXISTS user_custom_labels (
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT 'Custom',
      PRIMARY KEY (user_id, item_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES sadhana_items(id)
    )`,
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
      { name: 'Kriya Level 2', description: 'Advanced kriya practice', emoji: '⭐', sort_order: 4, category: 'kriya', type: 'toggle' },
      { name: 'Kriya Level 3', description: 'Advanced kriya practice', emoji: '✨', sort_order: 5, category: 'kriya', type: 'toggle' },
      { name: 'Khecari Mudra', description: 'Tongue lock gesture', emoji: '👁️', sort_order: 6, category: 'mudras', type: 'toggle' },
      { name: 'Maha Mudra', description: 'Great seal pose — 3 rounds', emoji: '🤲', sort_order: 7, category: 'mudras', type: 'counter', target: 3 },
      { name: 'Kurmasana', description: 'Tortoise pose', emoji: '🐢', sort_order: 8, category: 'mudras', type: 'toggle' },
      { name: 'Simhasana', description: 'Lion pose — 5 rounds', emoji: '🦁', sort_order: 9, category: 'mudras', type: 'counter', target: 5 },
      { name: 'Svastikasana', description: 'Auspicious pose', emoji: '🪷', sort_order: 10, category: 'mudras', type: 'toggle' },
      { name: 'Shavasana', description: 'Corpse pose relaxation', emoji: '🧎', sort_order: 11, category: 'mudras', type: 'toggle' },
      { name: 'Trinity Meditation', description: 'Triple focus meditation — 5 rounds', emoji: '🧘', sort_order: 12, category: 'meditation', type: 'counter', target: 5 },
      { name: 'Nada Kriya', description: 'Sound meditation — up to 20 min', emoji: '🎵', sort_order: 13, category: 'meditation', type: 'timer', target: 1200 },
      { name: 'Japa', description: 'Hare Krishna mahamantra chanting — 60 min', emoji: '📿', sort_order: 14, category: 'japa', type: 'timer', target: 3600 },
      { name: 'Exercise', description: 'Physical workout — 10 min minimum', emoji: '🏃', sort_order: 15, category: 'quick', type: 'toggle' },
      { name: 'Water', description: 'Hydration — 2 litres', emoji: '💧', sort_order: 16, category: 'quick', type: 'toggle' },
      { name: 'Study', description: 'Scriptural study & reflection', emoji: '📖', sort_order: 17, category: 'quick', type: 'toggle' },
      { name: 'Abhishekam', description: 'Sacred bathing ritual', emoji: '🪷', sort_order: 18, category: 'quick', type: 'toggle' },
      { name: 'Music', description: 'Kirtan & devotional music', emoji: '🎵', sort_order: 19, category: 'quick', type: 'toggle' },
      { name: 'Morning Mantras', description: 'Morning mantra practice', emoji: '🌅', sort_order: 20, category: 'quick', type: 'toggle' },
    ];

    const stmts = defaults.map(item => ({
      sql: 'INSERT INTO sadhana_items (id, name, description, emoji, sort_order, category, item_type, target, am_pm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [uuidv4(), item.name, item.description, item.emoji, item.sort_order, item.category, item.type, item.target || 0, item.am_pm ? 1 : 0],
    }));
    await client.batch(stmts);
  }

  await migrateKriyaLevels(client);
  await migrateQuickItems(client);
  await migrateCommitment(client);
  await migrateCustomItems(client);
  await migrateGroupInvites(client);
}

async function migrateCommitment(client) {
  try {
    await client.execute('ALTER TABLE users ADD COLUMN commitment_accepted_at TEXT');
  } catch {
    // column already exists
  }
}

async function migrateCustomItems(client) {
  const specs = [
    { name: 'Custom 1', description: 'Your personal practice', emoji: '✨', sort_order: 21 },
    { name: 'Custom 2', description: 'Your personal practice', emoji: '✨', sort_order: 22 },
  ];

  for (const spec of specs) {
    const existing = await client.execute({
      sql: 'SELECT id FROM sadhana_items WHERE lower(name) = lower(?)',
      args: [spec.name],
    });

    if (existing.rows.length === 0) {
      await client.execute({
        sql: 'INSERT INTO sadhana_items (id, name, description, emoji, sort_order, category, item_type, target, am_pm, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [uuidv4(), spec.name, spec.description, spec.emoji, spec.sort_order, 'custom', 'toggle', 0, 0, 1],
      });
    }
  }
}

async function migrateGroupInvites(client) {
  const groups = await client.execute('SELECT id, user_id FROM sangha_groups');
  for (const group of groups.rows) {
    await client.execute(
      'INSERT OR IGNORE INTO sangha_group_members (group_id, user_id) VALUES (?, ?)',
      [group.id, group.user_id]
    );
  }
}

async function migrateQuickItems(client) {
  const specs = [
    { name: 'Music', description: 'Kirtan & devotional music', emoji: '🎵', sort_order: 19 },
    { name: 'Morning Mantras', description: 'Morning mantra practice', emoji: '🌅', sort_order: 20 },
  ];

  for (const spec of specs) {
    const existing = await client.execute({
      sql: 'SELECT id FROM sadhana_items WHERE lower(name) = lower(?)',
      args: [spec.name],
    });

    if (existing.rows.length === 0) {
      await client.execute({
        sql: 'INSERT INTO sadhana_items (id, name, description, emoji, sort_order, category, item_type, target, am_pm, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [uuidv4(), spec.name, spec.description, spec.emoji, spec.sort_order, 'quick', 'toggle', 0, 0, 1],
      });
    }
  }
}

async function migrateKriyaLevels(client) {
  const specs = [
    { name: 'Kriya Level 2', emoji: '⭐', sort_order: 4 },
    { name: 'Kriya Level 3', emoji: '✨', sort_order: 5 },
  ];

  for (const spec of specs) {
    const existing = await client.execute({
      sql: 'SELECT id FROM sadhana_items WHERE lower(name) = lower(?)',
      args: [spec.name],
    });

    if (existing.rows.length === 0) {
      await client.execute({
        sql: 'INSERT INTO sadhana_items (id, name, description, emoji, sort_order, category, item_type, target, am_pm, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [uuidv4(), spec.name, 'Advanced kriya practice', spec.emoji, spec.sort_order, 'kriya', 'toggle', 0, 0, 1],
      });
    } else {
      await client.execute({
        sql: "UPDATE sadhana_items SET category = 'kriya', sort_order = ?, active = 1 WHERE lower(name) = lower(?)",
        args: [spec.sort_order, spec.name],
      });
    }
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