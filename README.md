# Ludorules — catalogue trilingue de jeux de cartes & de dés

Le catalogue de jeux de cartes et de dés, **dynamique** et **trilingue (FR/EN/ES)** :
les jeux vivent dans une base de données, un **espace d'administration** permet
de les gérer et de les traduire, et les visiteurs peuvent **proposer un jeu**
via un formulaire soumis à validation avant publication.

> Anciennement « Ludothèque Flash », puis « pick-game ». Le site a été renommé
> **Ludorules** pour correspondre au nom de domaine (ludorules.com).
>
> Le design, l'ergonomie et plusieurs fonctionnalités (catégorie « Jeux
> édités », navigation précédent/suivant dans la fiche, bloc d'achat affilié,
> bandeau cookies, pages légales, espagnol) ont été repris de la maquette
> statique la plus aboutie (« ludorules-site ») et branchés sur la base de
> données dynamique de Ludorules.

## Fonctionnalités

- **136 jeux** stockés en base **SQLite**, chargés via une API (`/api/games`).
- **Trilingue FR / EN / ES** : un sélecteur de langue bascule toute l'interface
  *et* le contenu des fiches (titres, règles, astuces…). La langue du
  navigateur est détectée à la première visite, puis le choix est mémorisé.
- **6 catégories de matériel** : Cartes, Dés, Accessoires, Sans matériel,
  Gobelets (rangés sous Accessoires) et **Jeux édités** (jeux de société en
  boîte du commerce).
- **Fiche de jeu enrichie** : navigation **Précédent / Suivant** (flèches
  latérales + clavier ← →) pour parcourir tous les jeux filtrés sans revenir à
  la grille, et bloc **« Où se le procurer »** avec liens d'affiliation
  (Amazon / Fnac / Philibert — activable/désactivable et configurable depuis
  l'admin, voir « Monétisation » ci-dessous).
- Bouton **« Proposer un jeu » / « Suggest a game » / « Proponer un juego »** :
  un formulaire (avec sélecteur de matériel) envoie la proposition dans une
  file d'attente de validation. Le formulaire est en une seule langue ; c'est
  l'admin qui rédige la traduction avant publication.
- Bouton **« Inspire-moi ! » / « Surprise me! » / « ¡Sorpréndeme! »** conservé
  (tirage au hasard).
- **Espace admin** (`/admin`) avec comptes utilisateurs : connexion, gestion des
  jeux (créer / modifier / supprimer / dépublier), **édition trilingue**
  (champs FR, EN et ES), sélection du **type de matériel** (dont « édité »),
  validation des propositions (valider / rejeter / éditer), et un onglet
  **« Réglages »** pour l'affiliation et la publicité.
- **Bandeau cookies (RGPD/CNIL)** et **pages légales** (mentions légales,
  confidentialité) en FR/EN/ES, prêtes à compléter avant mise en ligne.
- **Emplacements publicitaires** (AdSense/Ezoic) : invisibles par défaut,
  activables depuis l'onglet **« Réglages »** de l'admin une fois un compte et
  un identifiant obtenus (voir « Monétisation » ci-dessous).

## Prérequis

- **Node.js 18 ou plus** (`node -v` pour vérifier).

## Installation

```bash
cd ludotech
npm install                 # installe les dépendances
npm run seed                # importe les 136 jeux (FR + EN) dans la base
npm run create-admin -- monidentifiant monmotdepasse mon@email.fr
npm start                   # démarre le serveur
```

Puis ouvrez :

- Site public : http://localhost:3000
- Espace admin : http://localhost:3000/admin

### Créer un compte admin (et choisir son mot de passe)

`npm run create-admin` accepte trois façons de définir l'identifiant et **le
mot de passe de ton choix** — la commande ne génère jamais de mot de passe
à ta place :

1. **En arguments** (rapide, à usage local/CI) :
   ```bash
   npm run create-admin -- monidentifiant monmotdepasse mon@email.fr
   ```
2. **Via des variables d'environnement** (pratique pour un script de
   déploiement, sans laisser le mot de passe dans l'historique du shell) :
   ```bash
   ADMIN_USER=monidentifiant ADMIN_PASS=monmotdepasse ADMIN_EMAIL=mon@email.fr npm run create-admin
   ```
3. **En mode interactif**, sans rien passer en argument : la commande demande
   l'identifiant puis le mot de passe (saisie masquée à l'écran) :
   ```bash
   npm run create-admin
   ```

Le mot de passe doit faire **6 caractères minimum**. Cette commande peut être
relancée à tout moment (y compris après le premier lancement) pour créer un
compte admin supplémentaire.

## L'espace admin

- **Jeux publiés** : tous les jeux en ligne, avec recherche. Un badge **EN ✓**
  (ou **EN —**) indique si la traduction anglaise existe. Boutons *Éditer*,
  *Dépublier* et *Supprimer*.
- **À valider** : les jeux proposés par les visiteurs (avec nom et email du
  proposeur). Boutons *Valider* (publie), *Éditer* (compléter/traduire avant de
  publier) et *Rejeter*.
- **Rejetés** : historique des refus, avec *Republier* ou *Supprimer*.
- **Comptes** : liste, création et suppression des administrateurs.
- **Nouveau jeu** : ajoute un jeu directement publié.

### Traduire un jeu

Dans l'éditeur d'un jeu, dépliez la section **« Version anglaise (EN) »** et/ou
**« Version espagnole (ES) »** et remplissez les champs correspondants. Les
champs laissés vides utilisent automatiquement le français par défaut
(fallback). C'est ainsi que l'on traduit une proposition reçue via le
formulaire public.

### Type de matériel

Le champ **« Type de matériel »** de l'éditeur détermine l'onglet dans lequel
le jeu apparaît sur le site public : Cartes, Dés, Accessoires / gobelets, Sans
matériel ou **Jeu édité** (boîte du commerce). C'est aussi ce champ qui pilote
le bloc d'achat affilié affiché sur la fiche du jeu.

## Structure du projet

```
ludotech/
├── package.json
├── src/
│   ├── server.js      # serveur Express + routes API
│   ├── db.js          # SQLite + schéma (games, users, settings)
│   ├── auth.js        # comptes, bcrypt, session JWT (cookie)
│   ├── games.js       # logique métier (validation, CRUD, statuts, traductions)
│   └── settings.js    # réglages globaux (affiliation, publicité)
├── scripts/
│   ├── seed.js        # importe games.seed.json dans la base
│   ├── create-admin.js
│   └── games.seed.json# les 136 jeux, chacun avec sa traduction EN
├── public/
│   ├── index.html          # site public trilingue (FR/EN/ES)
│   ├── admin.html          # espace d'administration
│   ├── mentions-legales.html, confidentialite.html   # pages légales FR
│   ├── en/legal-notice.html, en/privacy.html         # pages légales EN
│   └── es/aviso-legal.html, es/privacidad.html       # pages légales ES
└── data/              # créé au 1er lancement : base SQLite + secret de session
```

## Modèle de données (traductions)

Chaque jeu est stocké en JSON. Les champs de base sont en français ; les
traductions vivent sous `translations.en` et `translations.es` :

```json
{
  "title": "Belote", "mood": "strategie", "time": "moyen", "emoji": "🃏",
  "type": "cartes", "rules": ["…"], "tips": "…",
  "translations": {
    "en": { "title": "Belote", "rules": ["…"], "tips": "…" },
    "es": { "title": "Belote", "rules": ["…"], "tips": "…" }
  }
}
```

Champs traduisibles : `title`, `tagline`, `material`, `objective`, `tips`,
`playersLabel`, `rules`, et `gear`/`dice` (le préfixe emoji est conservé, car il
sert à classer le jeu par matériel). Les champs neutres (`mood`, `time`,
`players`, `deck`, `type`, `alcool`, `emoji`, `color`) ne se traduisent pas.

Le champ `type` accepte : `cartes` (défaut), `des`, `autre` (accessoires —
gobelets si `gear` commence par 🥤, aucun matériel si `gear` commence par 🗣️),
`aucun`, ou `edite` (jeu de société en boîte).

Pour ajouter une 4ᵉ langue plus tard : ajouter un dictionnaire dans l'objet
`I18N` de `public/index.html`, un bouton dans le sélecteur de langue, une
entrée dans `LANGS`, et une clé sous `translations` (ex. `translations.de`) —
côté serveur, ajouter la langue à la boucle `for (const lg of ['en', 'es'])`
dans `src/games.js`.

## API (résumé)

| Méthode | Route | Accès | Rôle |
|--------|-------|-------|------|
| GET | `/api/games` | public | catalogue publié (avec `translations.en`) |
| POST | `/api/proposals` | public | proposer un jeu (statut « en attente ») |
| POST | `/api/auth/login` · `/logout` | public | connexion / déconnexion |
| GET | `/api/admin/games?status=` | admin | jeux par statut |
| POST · PUT · DELETE | `/api/admin/games[/:id]` | admin | créer / modifier (FR+EN) / supprimer |
| POST | `/api/admin/games/:id/approve` · `/reject` | admin | valider / rejeter |
| GET · POST · DELETE | `/api/auth/users` | admin | gérer les comptes |
| GET | `/api/settings` | public | réglages courants (affiliation, publicité) |
| PUT | `/api/admin/settings` | admin | modifier les réglages (onglet « Réglages ») |

## Notes techniques

- **Mots de passe** hachés avec bcrypt ; **session** via cookie `httpOnly` signé
  (JWT). Le secret est généré dans `data/.jwt-secret` au 1er lancement (ou fourni
  via `LUDO_JWT_SECRET`).
- Design (Tailwind + icônes Lucide) chargé depuis CDN, comme la version
  d'origine : une connexion internet est nécessaire côté navigateur.

## Monétisation (affiliation & publicité) — à configurer

Ces réglages se pilotent désormais **depuis l'espace admin**, onglet
**« Réglages »** (`/admin`) — aucune modification de code n'est nécessaire au
quotidien. Ils sont stockés en base (table `settings`) et exposés
publiquement en lecture via `GET /api/settings` (le site public en a besoin
pour savoir quoi afficher).

- **Bloc « Où se le procurer »** (liens d'affiliation Amazon / Fnac /
  Philibert) : une case à cocher permet de l'afficher ou de le masquer
  entièrement sur le site public, et un champ **« Tag d'affilié Amazon »**
  ajoute ton identifiant (paramètre `tag=`) à tous les liens de recherche
  Amazon générés. Laisse ce champ vide pour des liens Amazon sans tag
  d'affilié. Le bloc ne s'affiche de toute façon jamais pour la catégorie
  « Sans matériel ».
- **Emplacements publicitaires** : masqués par défaut. Une case à cocher les
  active, et un champ **« Identifiant AdSense »** reçoit ton identifiant
  `ca-pub-…` fourni par Google. Les publicités ne se chargent que si les deux
  conditions sont réunies **et** que le visiteur a accepté les cookies.
- **Bandeau cookies** : demande le consentement dès la première visite
  (accepter/refuser) et ne charge les scripts publicitaires qu'après
  acceptation. Le choix est mémorisé dans `localStorage`
  (`ludo_cookie_consent`) et peut être rouvert via le lien « Cookies » du pied
  de page.
- **Pages légales** (`mentions-legales.html`, `confidentialite.html` et leurs
  équivalents `en/`, `es/`) contiennent des champs `[à compléter]` à
  remplacer par tes informations réelles (éditeur, hébergeur, contact, durées
  de conservation…) avant toute mise en ligne.

## Production (pistes)

- Lancez avec `NODE_ENV=production` (cookie `secure`, à servir en HTTPS).
- Définissez `PORT` et `LUDO_JWT_SECRET` via l'environnement.
- Placez un reverse proxy (Nginx) devant, ou utilisez PM2.
