const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

router.post('/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!name) return res.status(422).json({ error: 'Please enter your name.' });
  if (!EMAIL_RE.test(email)) return res.status(422).json({ error: 'Please enter a valid email.' });
  if (password.length < 8) return res.status(422).json({ error: 'Password must be at least 8 characters.' });

  const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (existing.rowCount) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name, email, hash]
  );
  res.status(201).json({ token: signToken(rows[0].id), user: publicUser(rows[0]) });
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  // Same message for unknown email and wrong password, so emails can't be probed.
  const ok = rows[0] && (await bcrypt.compare(password, rows[0].password_hash));
  if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });
  res.json({ token: signToken(rows[0].id), user: publicUser(rows[0]) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT id, name, email FROM users WHERE id = $1', [req.userId]);
  if (!rows[0]) return res.status(401).json({ error: 'Please log in.' });
  res.json({ user: rows[0] });
});

module.exports = router;
