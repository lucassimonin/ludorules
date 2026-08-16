'use strict';

const { db } = require('./db');

// Réglages par défaut (site frais, sans configuration).
const DEFAULTS = {
  // Bloc « Où se le procurer » (liens d'affiliation Amazon / Fnac / Philibert)
  affiliateEnabled: true,
  amazonTag: '',
  // Emplacements publicitaires (AdSense / Ezoic)
  adsEnabled: false,
  adsenseClient: '',
  // Google Tag Manager (conteneur GTM-XXXXXXX)
  gtmEnabled: false,
  gtmId: '',
};

const BOOL_FIELDS = ['affiliateEnabled', 'adsEnabled', 'gtmEnabled'];
const STRING_FIELDS = ['amazonTag', 'adsenseClient', 'gtmId'];

function readRow() {
  return db.prepare('SELECT data FROM settings WHERE id = 1').get();
}

// Renvoie les réglages actuels, complétés par les valeurs par défaut
// (utile si de nouveaux champs sont ajoutés après coup).
function getSettings() {
  const row = readRow();
  if (!row) return { ...DEFAULTS };
  let stored = {};
  try { stored = JSON.parse(row.data) || {}; } catch (e) { stored = {}; }
  return { ...DEFAULTS, ...stored };
}

// Nettoie et fusionne un patch partiel avec les réglages existants, puis les persiste.
function updateSettings(patch) {
  const current = getSettings();
  const next = { ...current };

  for (const f of BOOL_FIELDS) {
    if (patch[f] != null) next[f] = !!patch[f];
  }
  for (const f of STRING_FIELDS) {
    if (patch[f] != null) next[f] = String(patch[f]).trim().slice(0, 200);
  }

  const json = JSON.stringify(next);
  db.prepare(
    `INSERT INTO settings (id, data, updated_at) VALUES (1, ?, datetime('now'))
     ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
  ).run(json);

  return next;
}

module.exports = { getSettings, updateSettings, DEFAULTS };
