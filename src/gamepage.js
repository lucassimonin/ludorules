'use strict';

// =============================================================================
// Rendu côté serveur (SSR) d'une page dédiée par jeu : /jeux/:slug
// Objectif SEO : Google lit tout le contenu directement dans le HTML (titre,
// règles, données structurées), au lieu de dépendre du JavaScript.
// =============================================================================

const SITE = 'https://ludorules.com';

// Zones EEE / UK / Suisse : consentement requis (Consent Mode v2).
const EEA = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];

// Échappement HTML (le contenu vient de l'admin, mais on sécurise toujours).
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Texte nettoyé pour <title>/meta/JSON (pas de balises, longueur limitée).
function clean(s, max) {
  let t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (max && t.length > max) t = t.slice(0, max - 1).trim() + '…';
  return t;
}

// Bloc <head> : SEO + Consent Mode + GTM + AdSense (selon les réglages admin).
function headTags(game, settings) {
  const url = `${SITE}/jeux/${esc(game.id)}`;
  const title = clean(`Règles de ${game.title} — Ludorules`, 65);
  const descSrc = game.tagline || game.objective || `Découvre les règles de ${game.title} : matériel, objectif, déroulé et astuces.`;
  const desc = clean(descSrc, 160);

  const consent = `
<meta name="google-adsense-account" content="ca-pub-3108772554550232" />
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});
  gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:${JSON.stringify(EEA)},wait_for_update:500});
</script>`;

  let gtm = '';
  if (settings && settings.gtmEnabled && settings.gtmId) {
    const id = esc(settings.gtmId);
    gtm = `\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>`;
  }
  let ads = '';
  if (settings && settings.adsEnabled && settings.adsenseClient) {
    ads = `\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(settings.adsenseClient)}" crossorigin="anonymous"></script>`;
  }

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: clean(game.title, 80), item: url },
        ],
      },
      {
        '@type': 'Game',
        name: clean(game.title, 100),
        description: desc,
        url,
        inLanguage: 'fr',
        numberOfPlayers: clean(game.playersLabel || game.players || '', 40) || undefined,
        publisher: { '@type': 'Organization', name: 'Ludorules', url: `${SITE}/` },
      },
    ],
  };

  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${url}" />
<meta name="theme-color" content="#0a3d26" />
<meta name="robots" content="index,follow" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Ludorules" />
<meta property="og:locale" content="fr_FR" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${SITE}/og-image.png" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>${consent}${gtm}${ads}
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = { theme: { extend: {
    colors: { felt:{DEFAULT:'#0f5132',deep:'#0a3d26',light:'#14663f'}, cream:'#f5f1e6', heart:'#e23b45', gold:'#f4c145' },
    fontFamily: { display:['"Playfair Display"','Georgia','serif'], sans:['"Inter"','system-ui','sans-serif'] },
  } } };
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  :root{color-scheme:dark}
  html{scroll-behavior:smooth}
  body{-webkit-font-smoothing:antialiased}
  .felt-bg{background:radial-gradient(1200px 600px at 20% -10%, rgba(244,193,69,.10), transparent 60%),radial-gradient(1000px 500px at 100% 0%, rgba(226,59,69,.10), transparent 55%),linear-gradient(160deg,#0a3d26,#0f5132 55%,#0a3d26)}
  .glass{background:rgba(255,255,255,.06);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.09)}
</style>`;
}

// Puce d'info (joueurs, durée, matériel…).
function chip(icon, text) {
  if (!text) return '';
  return `<span class="inline-flex items-center gap-1.5 text-sm text-cream/85 bg-black/20 border border-white/10 rounded-lg px-2.5 py-1">${icon} ${esc(text)}</span>`;
}

// Libellés FR (repris de l'accueil) pour afficher de vrais libellés, pas les codes internes.
const TIME_FR = { court: '< 15 min', moyen: '15-30 min', long: '45 min +' };
const MOOD_FR = {
  strategie: ['🧠', 'Stratégie'], ambiance: ['🎉', 'Fun'], enfants: ['🧸', 'Enfants'],
  soiree: ['🌙', 'Soirée'], alcool: ['🍻', 'Apéro'], solitaire: ['🧘', 'Solo'],
};
const DECK_FR = { '32': '32 cartes', '52': '52 cartes', tarot: 'Tarot', autre: 'Autre / spécial' };
const MATLBL_FR = { aucun: 'Sans matériel', gobelets: 'Gobelets', autre: 'Accessoires', cartes: 'Cartes', edite: 'Jeu édité' };

// Libellé court + icône du matériel principal (équivalent SSR de matInfo côté accueil).
function matShort(g) {
  if (g.type === 'des') return { icon: '🎲', label: g.dice || MATLBL_FR.cartes };
  if (g.type === 'edite') return { icon: '📦', label: MATLBL_FR.edite };
  if (g.type === 'aucun') return { icon: '🗣️', label: g.gear || MATLBL_FR.aucun };
  if (g.type === 'autre') {
    const gear = g.gear || '';
    if (gear.startsWith('🗣️')) return { icon: '🗣️', label: gear || MATLBL_FR.aucun };
    if (gear.startsWith('🥤')) return { icon: '🥤', label: gear || MATLBL_FR.gobelets };
    return { icon: '🎉', label: gear || MATLBL_FR.autre };
  }
  return { icon: '🃏', label: DECK_FR[g.deck] || MATLBL_FR.cartes };
}

// Page complète d'un jeu.
function renderGamePage(game, { settings = {}, otherGames = [] } = {}) {
  const emoji = game.emoji ? esc(game.emoji) + ' ' : '';
  const mat = matShort(game);
  const mood = MOOD_FR[game.mood] || ['🎯', game.mood];
  const rules = Array.isArray(game.rules) ? game.rules : [];
  const rulesHtml = rules.length
    ? `<ol class="mt-3 space-y-3">${rules.map((r, i) => `<li class="flex gap-3"><span class="flex-none w-7 h-7 rounded-lg bg-gold text-felt-deep font-display font-extrabold grid place-items-center">${i + 1}</span><span class="text-cream/90 leading-relaxed pt-0.5">${esc(r)}</span></li>`).join('')}</ol>`
    : '';
  const tips = game.tips
    ? `<section class="mt-8"><h2 class="font-display text-2xl font-bold text-gold flex items-center gap-2">💡 Astuces</h2><p class="mt-2 text-cream/85 leading-relaxed">${esc(game.tips)}</p></section>`
    : '';

  const others = (otherGames || []).slice(0, 6).map((g) =>
    `<a href="/jeux/${esc(g.id)}" class="glass rounded-xl px-4 py-3 hover:border-gold/40 transition flex items-center gap-2 text-cream/90"><span>${g.emoji ? esc(g.emoji) : '🎴'}</span><span class="font-semibold">${esc(g.title)}</span></a>`
  ).join('');

  const adNote = (settings && settings.adsEnabled) ? '<div class="my-8 min-h-[1px]"></div>' : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
${headTags(game, settings)}
</head>
<body class="felt-bg min-h-screen text-cream font-sans">
  <header class="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 group">
      <span class="text-2xl leading-none">🃏</span>
      <span class="font-display font-extrabold text-lg">Ludo<span class="text-gold">rules</span></span>
    </a>
    <a href="/" class="text-sm text-cream/70 hover:text-gold transition inline-flex items-center gap-1">← Tous les jeux</a>
  </header>

  <main class="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
    <nav class="text-xs text-cream/50 mb-4"><a href="/" class="hover:text-cream">Accueil</a> <span class="opacity-50">›</span> <span class="text-cream/70">${esc(game.title)}</span></nav>

    <h1 class="font-display font-extrabold text-4xl sm:text-5xl leading-tight tracking-tight">${emoji}${esc(game.title)}</h1>
    ${game.tagline ? `<p class="mt-3 text-lg text-cream/75">${esc(game.tagline)}</p>` : ''}

    <div class="mt-5 flex flex-wrap gap-2">
      ${chip('👥', game.playersLabel || game.players)}
      ${chip('⏱️', TIME_FR[game.time] || game.time)}
      ${chip(mat.icon, mat.label)}
      ${chip(mood[0], mood[1])}
    </div>

    ${adNote}

    ${game.objective ? `<section class="mt-8"><h2 class="font-display text-2xl font-bold flex items-center gap-2">🎯 Objectif</h2><p class="mt-2 text-cream/85 leading-relaxed">${esc(game.objective)}</p></section>` : ''}

    ${game.material ? `<section class="mt-8"><h2 class="font-display text-2xl font-bold flex items-center gap-2">🎴 Matériel</h2><p class="mt-2 text-cream/85 leading-relaxed">${esc(game.material)}</p></section>` : ''}

    ${rulesHtml ? `<section class="mt-8"><h2 class="font-display text-2xl font-bold flex items-center gap-2">📜 Règles du jeu</h2>${rulesHtml}</section>` : ''}

    ${tips}

    ${others ? `<section class="mt-12 pt-8 border-t border-white/10"><h2 class="font-display text-xl font-bold mb-4">🎲 D'autres jeux à découvrir</h2><div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${others}</div></section>` : ''}

    <div class="mt-10">
      <a href="/" class="inline-flex items-center gap-2 bg-gold text-felt-deep font-semibold text-sm px-5 py-2.5 rounded-full hover:brightness-105">← Voir tout le catalogue de jeux</a>
    </div>
  </main>

  <footer class="max-w-3xl mx-auto px-4 sm:px-6 py-10 border-t border-white/10 text-center text-cream/50 text-sm">
    <p class="font-display text-cream/70 text-base mb-1">Ludorules 🃏🎲</p>
    <nav class="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <a href="/mentions-legales.html" class="hover:text-gold transition">Mentions légales</a>
      <span class="opacity-40">·</span>
      <a href="/confidentialite.html" class="hover:text-gold transition">Confidentialité</a>
    </nav>
  </footer>
</body>
</html>`;
}

module.exports = { renderGamePage };
