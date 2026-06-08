#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@local.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sadhana123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Local Admin';

(async () => {
  const db = getDb();
  const existing = await db.execute('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]);
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  if (existing.rows.length > 0) {
    await db.execute('UPDATE users SET password_hash = ?, name = ? WHERE email = ?', [hash, ADMIN_NAME, ADMIN_EMAIL]);
    console.log('Updated existing admin account.');
  } else {
    try {
      await db.execute(
        'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
        [uuidv4(), ADMIN_NAME, ADMIN_EMAIL, hash]
      );
      console.log('Created admin account.');
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        await db.execute('UPDATE users SET password_hash = ?, name = ? WHERE email = ?', [hash, ADMIN_NAME, ADMIN_EMAIL]);
        console.log('Updated existing admin account.');
      } else {
        throw err;
      }
    }
  }

  console.log('');
  console.log('  Local admin credentials');
  console.log('  -----------------------');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('');
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
