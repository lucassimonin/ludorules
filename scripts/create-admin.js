'use strict';

// Crée un compte administrateur.
// Usage :
//   npm run create-admin -- <identifiant> <mot_de_passe> [email]
//   ou variables d'env : ADMIN_USER, ADMIN_PASS, ADMIN_EMAIL
//   ou sans argument -> mode interactif (question à l'écran)

const readline = require('readline');
const auth = require('../src/auth');

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      const stdout = process.stdout;
      rl._writeToOutput = (str) => {
        if (str.includes(question)) stdout.write(str);
        else stdout.write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let username = args[0] || process.env.ADMIN_USER;
  let password = args[1] || process.env.ADMIN_PASS;
  let email = args[2] || process.env.ADMIN_EMAIL || '';

  if (!username) username = await ask('Identifiant admin : ');
  if (!password) password = await ask('Mot de passe : ', { hidden: true });
  if (!email && !args[2] && !process.env.ADMIN_EMAIL) {
    email = await ask('\nEmail (facultatif) : ');
  }

  if (!username || !password) {
    console.error('\nIdentifiant et mot de passe obligatoires.');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('\nMot de passe : 6 caractères minimum.');
    process.exit(1);
  }
  if (auth.findUserByUsername(username)) {
    console.error(`\nL'identifiant « ${username} » existe déjà.`);
    process.exit(1);
  }

  const user = auth.createUser({ username, email, password });
  console.log(`\n✓ Administrateur « ${user.username} » créé (id ${user.id}).`);
  process.exit(0);
}

main();
