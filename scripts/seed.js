'use strict';

// Amorce la base avec les 136 jeux (FR + traduction EN).
// - Insère les jeux absents.
// - Pour un jeu déjà présent SANS traduction anglaise, ajoute translations.en
//   depuis le seed (non destructif : n'écrase aucun autre champ). Cela permet
//   de mettre à jour une base créée avant l'ajout du bilingue, sans repartir
//   de zéro.

const fs = require('fs');
const path = require('path');
const { db } = require('../src/db');

const SEED_FILE = path.join(__dirname, 'games.seed.json');
const seedGames = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));

const getStmt = db.prepare('SELECT id, data FROM games WHERE id = ?');
const insertStmt = db.prepare(
  "INSERT INTO games (id, data, status) VALUES (?, ?, 'published')"
);
const updateStmt = db.prepare(
  "UPDATE games SET data = ?, updated_at = datetime('now') WHERE id = ?"
);

let inserted = 0;
let translated = 0;
let skipped = 0;

const tx = db.transaction((list) => {
  for (const g of list) {
    const { id, ...rest } = g; // l'id vit dans la colonne, pas dans le JSON
    const row = getStmt.get(id);
    if (!row) {
      insertStmt.run(id, JSON.stringify(rest));
      inserted++;
      continue;
    }
    // Jeu existant : on ajoute la traduction EN si elle manque.
    const data = JSON.parse(row.data);
    if (!data.translations || !data.translations.en) {
      if (rest.translations && rest.translations.en) {
        data.translations = { en: rest.translations.en };
        updateStmt.run(JSON.stringify(data), id);
        translated++;
        continue;
      }
    }
    skipped++;
  }
});

tx(seedGames);

console.log(
  `Seed terminé : ${inserted} inséré(s), ${translated} traduction(s) EN ajoutée(s), ${skipped} inchangé(s).`
);
