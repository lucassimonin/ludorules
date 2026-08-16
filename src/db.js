'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.LUDO_DB_PATH || path.join(DATA_DIR, 'ludotheque.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/*
  Modèle de données
  -----------------
  Un jeu possède des champs de forme variable (deck, alcool, type, gear, dice
  ne sont pas tous présents). On stocke donc l'objet jeu complet en JSON dans
  la colonne `data`, et on garde quelques colonnes indexables à part
  (status, submitter...). Le front récupère la liste et filtre côté client,
  exactement comme dans la version d'origine.

  status :
    - 'published' : jeu visible sur le site public
    - 'pending'   : proposition en attente de validation
    - 'rejected'  : proposition refusée (conservée pour historique)
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id              TEXT PRIMARY KEY,
    data            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'published',
    submitter_name  TEXT,
    submitter_email TEXT,
    submitter_note  TEXT,
    reviewed_by     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Réglages globaux du site (affiliation, publicité...), une seule ligne (id = 1).
  CREATE TABLE IF NOT EXISTS settings (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Contenu éditable des pages légales (mentions légales / confidentialité),
  -- par langue. Tant qu'une ligne n'existe pas pour (slug, lang), le serveur
  -- retourne un contenu par défaut (voir src/legal.js).
  CREATE TABLE IF NOT EXISTS legal_pages (
    slug       TEXT NOT NULL,
    lang       TEXT NOT NULL,
    html       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (slug, lang)
  );
`);

module.exports = { db, DB_PATH };
