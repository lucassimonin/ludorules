'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const COOKIE_NAME = 'ludo_token';
const TOKEN_TTL = '7d';

// Secret de signature JWT : depuis l'env si fourni, sinon généré et
// persisté dans data/.jwt-secret pour survivre aux redémarrages.
function loadSecret() {
  if (process.env.LUDO_JWT_SECRET) return process.env.LUDO_JWT_SECRET;
  const p = path.join(__dirname, '..', 'data', '.jwt-secret');
  try {
    return fs.readFileSync(p, 'utf8').trim();
  } catch (e) {
    const secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(p, secret, { mode: 0o600 });
    return secret;
  }
}
const SECRET = loadSecret();

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function createUser({ username, email, password }) {
  const stmt = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
  );
  const info = stmt.run(username, email || null, hashPassword(password));
  return { id: info.lastInsertRowid, username, email: email || null };
}

function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function issueToken(user) {
  return jwt.sign({ uid: user.id, username: user.username }, SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Middleware : refuse la requête si pas de session admin valide.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db
      .prepare('SELECT id, username, email FROM users WHERE id = ?')
      .get(payload.uid);
    if (!user) return res.status(401).json({ error: 'Session invalide' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expirée' });
  }
}

function countUsers() {
  return db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  createUser,
  findUserByUsername,
  issueToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  countUsers,
};
