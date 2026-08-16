'use strict';

const { db } = require('./db');

// Champs autorisés d'un objet jeu (les optionnels peuvent être absents).
const STRING_FIELDS = [
  'title', 'emoji', 'color', 'players', 'playersLabel', 'mood', 'time',
  'deck', 'type', 'gear', 'dice', 'tagline', 'material', 'objective', 'tips',
];

const MOODS = ['strategie', 'ambiance', 'enfants', 'soiree', 'alcool', 'solitaire'];
const TIMES = ['court', 'moyen', 'long'];

function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'jeu';
}

function uniqueId(base) {
  let id = slugify(base);
  let candidate = id;
  let n = 2;
  while (db.prepare('SELECT 1 FROM games WHERE id = ?').get(candidate)) {
    candidate = `${id}-${n++}`;
  }
  return candidate;
}

// Nettoie et valide un objet jeu reçu. Renvoie { ok, game, errors }.
function sanitizeGame(input) {
  const errors = [];
  const g = {};

  for (const f of STRING_FIELDS) {
    if (input[f] != null && String(input[f]).trim() !== '') {
      g[f] = String(input[f]).trim();
    }
  }

  // Champs obligatoires minimaux
  if (!g.title) errors.push('Le titre est obligatoire.');
  if (!g.tagline) errors.push('L’accroche (tagline) est obligatoire.');
  if (!g.material) errors.push('Le matériel est obligatoire.');
  if (!g.objective) errors.push('L’objectif est obligatoire.');

  // Valeurs par défaut raisonnables
  g.emoji = g.emoji || '🃏';
  g.color = g.color || 'from-felt-light to-felt-deep';
  g.players = g.players || '2';
  g.playersLabel = g.playersLabel || `${g.players} joueurs`;

  if (!MOODS.includes(g.mood)) g.mood = 'ambiance';
  if (!TIMES.includes(g.time)) g.time = 'court';

  // alcool : booléen
  g.alcool = !!input.alcool;
  if (!g.alcool) delete g.alcool;
  // le mood 'alcool' implique 18+
  if (g.mood === 'alcool') g.alcool = true;

  // rules : tableau de chaînes non vides
  let rules = input.rules;
  if (typeof rules === 'string') {
    rules = rules.split('\n');
  }
  if (!Array.isArray(rules)) rules = [];
  g.rules = rules.map((r) => String(r).trim()).filter(Boolean);
  if (g.rules.length === 0) errors.push('Ajoutez au moins une règle.');

  g.tips = g.tips || '';

  // Traductions (anglais + espagnol). Reçues via input.en/input.es ou
  // input.translations.en/input.translations.es.
  // On ne conserve que les champs non vides ; les champs neutres (mood, time,
  // players, deck, alcool, emoji, color) ne se traduisent pas.
  const translations = {};
  for (const lg of ['en', 'es']) {
    const langIn = (input[lg] && typeof input[lg] === 'object') ? input[lg]
               : (input.translations && input.translations[lg]) ? input.translations[lg]
               : null;
    if (!langIn) continue;
    const tr = {};
    for (const f of ['title', 'tagline', 'material', 'objective', 'tips', 'playersLabel', 'gear', 'dice']) {
      if (langIn[f] != null && String(langIn[f]).trim() !== '') tr[f] = String(langIn[f]).trim();
    }
    let langRules = langIn.rules;
    if (typeof langRules === 'string') langRules = langRules.split('\n');
    if (Array.isArray(langRules)) {
      const cleaned = langRules.map((r) => String(r).trim()).filter(Boolean);
      if (cleaned.length) tr.rules = cleaned;
    }
    if (Object.keys(tr).length) translations[lg] = tr;
  }
  if (Object.keys(translations).length) g.translations = translations;

  // Achat personnalisé (bloc « Où se le procurer ») : remplace le calcul
  // automatique (matériel/prix/requête déduits du type de jeu) par des
  // valeurs choisies dans l'admin, et/ou des liens directs vers un produit
  // précis (au lieu d'une recherche générique Amazon/Fnac/Philibert).
  const buyIn = input.buy;
  if (buyIn && typeof buyIn === 'object') {
    const buy = {};
    for (const f of ['visual', 'material', 'price', 'query']) {
      if (buyIn[f] != null && String(buyIn[f]).trim() !== '') {
        buy[f] = String(buyIn[f]).trim().slice(0, 200);
      }
    }
    const linksIn = Array.isArray(buyIn.links) ? buyIn.links : [];
    const links = linksIn
      .map((l) => ({
        name: String((l && l.name) || '').trim().slice(0, 40),
        url: String((l && l.url) || '').trim().slice(0, 500),
      }))
      .filter((l) => l.name && l.url);
    if (links.length) buy.links = links;
    if (Object.keys(buy).length) g.buy = buy;
  }

  return { ok: errors.length === 0, game: g, errors };
}

function rowToGame(row) {
  const g = JSON.parse(row.data);
  g.id = row.id;
  return g;
}

// Liste publique : jeux publiés uniquement.
function listPublished() {
  const rows = db
    .prepare("SELECT id, data FROM games WHERE status = 'published' ORDER BY created_at ASC, rowid ASC")
    .all();
  return rows.map(rowToGame);
}

function listByStatus(status) {
  const rows = db
    .prepare('SELECT * FROM games WHERE status = ? ORDER BY created_at DESC, rowid DESC')
    .all(status);
  return rows.map((r) => ({
    ...rowToGame(r),
    _status: r.status,
    _submitter_name: r.submitter_name,
    _submitter_email: r.submitter_email,
    _submitter_note: r.submitter_note,
    _created_at: r.created_at,
    _updated_at: r.updated_at,
  }));
}

function getById(id) {
  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
  return row ? rowToGame(row) : null;
}

function getRow(id) {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(id);
}

function insertGame(game, { status = 'published', submitter = {} } = {}) {
  const id = uniqueId(game.title);
  db.prepare(
    `INSERT INTO games (id, data, status, submitter_name, submitter_email, submitter_note)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    JSON.stringify(game),
    status,
    submitter.name || null,
    submitter.email || null,
    submitter.note || null
  );
  return id;
}

function updateGame(id, game) {
  const row = getRow(id);
  if (!row) return false;
  db.prepare(
    "UPDATE games SET data = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(game), id);
  return true;
}

function setStatus(id, status, reviewedBy) {
  const row = getRow(id);
  if (!row) return false;
  db.prepare(
    "UPDATE games SET status = ?, reviewed_by = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, reviewedBy || null, id);
  return true;
}

function deleteGame(id) {
  const info = db.prepare('DELETE FROM games WHERE id = ?').run(id);
  return info.changes > 0;
}

function counts() {
  const rows = db
    .prepare('SELECT status, COUNT(*) AS n FROM games GROUP BY status')
    .all();
  const out = { published: 0, pending: 0, rejected: 0 };
  rows.forEach((r) => (out[r.status] = r.n));
  return out;
}

module.exports = {
  sanitizeGame,
  listPublished,
  listByStatus,
  getById,
  getRow,
  insertGame,
  updateGame,
  setStatus,
  deleteGame,
  counts,
  slugify,
};
