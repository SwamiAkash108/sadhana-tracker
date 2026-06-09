const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sadhana-tracker-secret-change-in-production';
const JWT_EXPIRY = '30d';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const db = getDb();
    const existing = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    await db.execute('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [id, name, email, passwordHash]);
    const token = jwt.sign({ userId: id, name, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ token, user: { id, name, email, commitmentAccepted: false } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const db = getDb();
    const result = await db.execute(
      'SELECT id, name, email, password_hash, commitment_accepted_at FROM users WHERE email = ?',
      [email]
    );
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ userId: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        commitmentAccepted: !!user.commitment_accepted_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(
      'SELECT id, name, email, commitment_accepted_at FROM users WHERE id = ?',
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        commitmentAccepted: !!user.commitment_accepted_at,
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

router.post('/commitment', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    await db.execute(
      "UPDATE users SET commitment_accepted_at = datetime('now') WHERE id = ? AND commitment_accepted_at IS NULL",
      [req.userId]
    );
    const result = await db.execute(
      'SELECT id, name, email, commitment_accepted_at FROM users WHERE id = ?',
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        commitmentAccepted: !!user.commitment_accepted_at,
      },
    });
  } catch (err) {
    console.error('Commitment error:', err);
    res.status(500).json({ error: 'Failed to save commitment.' });
  }
});

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userName = decoded.name;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { router, authMiddleware };