#!/usr/bin/env node
/**
 * Wipe all user data and progress, then create a single admin account.
 * Usage: node server/scripts/reset-db.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, initSchema } = require('../db');

const ADMIN_EMAIL = 'admin@admin.admin';
const ADMIN_PASSWORD = 'admin';
const ADMIN_NAME = 'Admin';

(async () => {
  await initSchema();
  const db = getDb();

  await db.execute('DELETE FROM daily_progress');
  await db.execute('DELETE FROM friend_requests');
  await db.execute('DELETE FROM push_subscriptions');
  await db.execute('DELETE FROM users');

  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await db.execute(
    'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [uuidv4(), ADMIN_NAME, ADMIN_EMAIL, hash]
  );

  const counts = await db.batch([
    { sql: 'SELECT COUNT(*) as c FROM users' },
    { sql: 'SELECT COUNT(*) as c FROM daily_progress' },
    { sql: 'SELECT COUNT(*) as c FROM friend_requests' },
  ]);

  console.log('Database reset complete.');
  console.log(`  Users:     ${counts[0].rows[0].c}`);
  console.log(`  Progress:  ${counts[1].rows[0].c}`);
  console.log(`  Friends:   ${counts[2].rows[0].c}`);
  console.log('');
  console.log('  Admin login');
  console.log('  -----------');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('');
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
