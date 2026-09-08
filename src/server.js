'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { db } = require('./db');
const auth = require('./auth');
const games = require('./games');
const settings = require('./settings');
const legal = require('./legal');

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

/* ============================================================
   API — AUTHENTIFICATION
   ============================================================ */

// Connexion
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }
  const user = auth.findUserByUsername(String(username).trim());
  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }
  const token = auth.issueToken(user);
  auth.setAuthCookie(res, token);
  res.json({ user: { id: user.id, username: user.username, email: user.email } });
});

// Déconnexion
app.post('/api/auth/logout', (req, res) => {
  auth.clearAuthCookie(res);
  res.json({ ok: true });
});

// Session courante
app.get('/api/auth/me', auth.requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Création d'un nouvel administrateur (réservé aux admins connectés)
app.post('/api/auth/users', auth.requireAuth, (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum.' });
  }
  if (auth.findUserByUsername(String(username).trim())) {
    return res.status(409).json({ error: 'Cet identifiant existe déjà.' });
  }
  try {
    const u = auth.createUser({ username: String(username).trim(), email, password });
    res.status(201).json({ user: u });
  } catch (e) {
    res.status(500).json({ error: 'Impossible de créer le compte.' });
  }
});

// Liste des administrateurs
app.get('/api/auth/users', auth.requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, username, email, created_at FROM users ORDER BY id ASC').all();
  res.json({ users: rows });
});

// Suppression d'un administrateur (impossible de supprimer le dernier / soi-même)
app.delete('/api/auth/users/:id', auth.requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }
  if (auth.countUsers() <= 1) {
    return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

/* ============================================================
   API — JEUX (PUBLIC)
   ============================================================ */

// Catalogue public : jeux publiés uniquement
app.get('/api/games', (req, res) => {
  res.json(games.listPublished());
});

app.get('/api/games/:id', (req, res) => {
  const g = games.getById(req.params.id);
  if (!g || (games.getRow(req.params.id) || {}).status !== 'published') {
    return res.status(404).json({ error: 'Jeu introuvable.' });
  }
  res.json(g);
});

/* ============================================================
   API — PROPOSITIONS (PUBLIC)
   ============================================================ */

// Un visiteur propose un jeu -> enregistré en statut 'pending'
app.post('/api/proposals', (req, res) => {
  const body = req.body || {};
  const { ok, game, errors } = games.sanitizeGame(body);
  if (!ok) {
    return res.status(400).json({ error: errors.join(' ') , errors });
  }
  const submitter = {
    name: (body.submitter_name || '').toString().trim().slice(0, 120) || null,
    email: (body.submitter_email || '').toString().trim().slice(0, 200) || null,
    note: (body.submitter_note || '').toString().trim().slice(0, 1000) || null,
  };
  const id = games.insertGame(game, { status: 'pending', submitter });
  res.status(201).json({ ok: true, id });
});

/* ============================================================
   API — ADMINISTRATION DES JEUX (PROTÉGÉ)
   ============================================================ */

// Liste des jeux par statut : ?status=published|pending|rejected
app.get('/api/admin/games', auth.requireAuth, (req, res) => {
  const status = req.query.status || 'published';
  if (!['published', 'pending', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  res.json({ games: games.listByStatus(status), counts: games.counts() });
});

app.get('/api/admin/games/:id', auth.requireAuth, (req, res) => {
  const row = games.getRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'Jeu introuvable.' });
  const g = games.getById(req.params.id);
  res.json({
    game: g,
    status: row.status,
    submitter: {
      name: row.submitter_name,
      email: row.submitter_email,
      note: row.submitter_note,
    },
  });
});

// Créer un jeu directement publié
app.post('/api/admin/games', auth.requireAuth, (req, res) => {
  const { ok, game, errors } = games.sanitizeGame(req.body || {});
  if (!ok) return res.status(400).json({ error: errors.join(' '), errors });
  const id = games.insertGame(game, { status: 'published' });
  res.status(201).json({ ok: true, id });
});

// Modifier un jeu
app.put('/api/admin/games/:id', auth.requireAuth, (req, res) => {
  const row = games.getRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'Jeu introuvable.' });
  const { ok, game, errors } = games.sanitizeGame(req.body || {});
  if (!ok) return res.status(400).json({ error: errors.join(' '), errors });
  games.updateGame(req.params.id, game);
  res.json({ ok: true });
});

// Supprimer un jeu / une proposition
app.delete('/api/admin/games/:id', auth.requireAuth, (req, res) => {
  const done = games.deleteGame(req.params.id);
  if (!done) return res.status(404).json({ error: 'Jeu introuvable.' });
  res.json({ ok: true });
});

// Valider une proposition -> published
app.post('/api/admin/games/:id/approve', auth.requireAuth, (req, res) => {
  const ok = games.setStatus(req.params.id, 'published', req.user.username);
  if (!ok) return res.status(404).json({ error: 'Proposition introuvable.' });
  res.json({ ok: true });
});

// Rejeter une proposition -> rejected
app.post('/api/admin/games/:id/reject', auth.requireAuth, (req, res) => {
  const ok = games.setStatus(req.params.id, 'rejected', req.user.username);
  if (!ok) return res.status(404).json({ error: 'Proposition introuvable.' });
  res.json({ ok: true });
});

// Remettre en ligne une proposition rejetée / dépublier un jeu
app.post('/api/admin/games/:id/status', auth.requireAuth, (req, res) => {
  const status = (req.body || {}).status;
  if (!['published', 'pending', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  const ok = games.setStatus(req.params.id, status, req.user.username);
  if (!ok) return res.status(404).json({ error: 'Jeu introuvable.' });
  res.json({ ok: true });
});

/* ============================================================
   API — RÉGLAGES (affiliation, publicité)
   ============================================================ */

// Lecture publique : le site public en a besoin pour savoir s'il doit
// afficher le bloc d'achat / les emplacements publicitaires.
app.get('/api/settings', (req, res) => {
  res.json(settings.getSettings());
});

// Modification (réservée aux admins connectés)
app.put('/api/admin/settings', auth.requireAuth, (req, res) => {
  const next = settings.updateSettings(req.body || {});
  res.json(next);
});

/* ============================================================
   API — PAGES LÉGALES (mentions légales / confidentialité)
   ============================================================ */

// Lecture publique : les pages légales statiques chargent leur contenu ici.
app.get('/api/legal/:slug/:lang', (req, res) => {
  const html = legal.getPage(req.params.slug, req.params.lang);
  if (html == null) return res.status(404).json({ error: 'Page ou langue invalide.' });
  res.json({ html });
});

// Lecture complète pour l'éditeur du BO (réservée aux admins connectés)
app.get('/api/admin/legal', auth.requireAuth, (req, res) => {
  res.json(legal.getAll());
});

// Modification d'une page/langue (réservée aux admins connectés)
app.put('/api/admin/legal/:slug/:lang', auth.requireAuth, (req, res) => {
  try {
    const html = legal.updatePage(req.params.slug, req.params.lang, (req.body || {}).html);
    res.json({ ok: true, html });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ============================================================
   FICHIERS STATIQUES
   ============================================================ */

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

// Démarrage
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Ludorules — serveur démarré`);
    console.log(`  → Site public : http://localhost:${PORT}`);
    console.log(`  → Espace admin : http://localhost:${PORT}/admin\n`);
    if (auth.countUsers() === 0) {
      console.log('  ⚠  Aucun compte admin. Créez-en un : npm run create-admin\n');
    }
  });
}

module.exports = app;
