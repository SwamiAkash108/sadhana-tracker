#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/reset-password.js <email> <new-password>');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}

(async () => {
  const db = getDb();
  const result = await db.execute('SELECT id, name FROM users WHERE email = ?', [email]);
  const user = result.rows[0];
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  const hash = bcrypt.hashSync(password, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  console.log(`Password updated for ${user.name} (${email})`);
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
