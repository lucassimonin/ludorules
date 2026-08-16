'use strict';
const { db } = require('./db');

// Pages gérées : 'mentions' (mentions légales) et 'confidentialite' (politique
// de confidentialité), chacune en 'fr' / 'en' / 'es'.
const SLUGS = ['mentions', 'confidentialite'];
const LANGS = ['fr', 'en', 'es'];

// Contenu par défaut = celui déjà présent dans les pages statiques d'origine.
// Sert de valeur de repli tant qu'aucune modification n'a été enregistrée
// depuis l'admin, et de contenu initial affiché dans l'éditeur du BO.
const DEFAULTS = {
  mentions: {
    fr: `
      <p class="text-amber-200/90 text-sm bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
        ⚠️ <strong>À compléter avant la mise en ligne</strong> : remplace tous les champs surlignés <span class="todo">[ainsi]</span> par tes informations réelles. Si tu édites le site en tant que particulier, indique ton nom ; si tu es auto-entrepreneur/société, ajoute ton statut et ton numéro SIRET.
      </p>

      <h2>1. Éditeur du site</h2>
      <p>Le site <strong>Ludorules</strong> (ci-après « le Site »), accessible à l'adresse <a href="https://ludorules.com">https://ludorules.com</a>, est édité par :</p>
      <ul>
        <li>Nom / Raison sociale : <span class="todo">[Prénom NOM ou nom de la société]</span></li>
        <li>Statut : <span class="todo">[particulier / auto-entrepreneur / SAS…]</span></li>
        <li>Adresse : <span class="todo">[adresse postale]</span></li>
        <li>E-mail : <span class="todo">[contact@ludorules.com]</span></li>
        <li>N° SIRET (si professionnel) : <span class="todo">[000 000 000 00000]</span></li>
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p><span class="todo">[Prénom NOM]</span>, en qualité d'éditeur du Site.</p>

      <h2>3. Hébergeur</h2>
      <p>Le Site (application Node.js) est hébergé par :</p>
      <ul>
        <li><span class="todo">[Nom de l'hébergeur]</span></li>
        <li><span class="todo">[Adresse de l'hébergeur]</span></li>
        <li><span class="todo">[Site web / contact de l'hébergeur]</span></li>
      </ul>

      <h2>4. Propriété intellectuelle</h2>
      <p>La structure, le design, les textes de présentation et la sélection des contenus du Site sont la propriété de l'éditeur. Les règles des jeux présentées relèvent du domaine public ou sont des synthèses rédigées à titre informatif. Les marques et jeux édités cités (Uno®, Monopoly®, Scrabble®, etc.) appartiennent à leurs détenteurs respectifs et ne sont mentionnés qu'à des fins d'information et de référence.</p>

      <h2>5. Liens d'affiliation</h2>
      <p>Le Site peut contenir des liens d'affiliation (notamment vers Amazon, Fnac, Philibert). Un achat effectué via ces liens peut donner lieu au versement d'une commission à l'éditeur, sans surcoût pour l'utilisateur.</p>

      <h2>6. Responsabilité</h2>
      <p>Les règles publiées sont fournies à titre indicatif. Des variantes régionales ou « maison » existent pour de nombreux jeux. L'éditeur ne saurait être tenu responsable d'éventuelles erreurs ou d'une mauvaise interprétation des règles.</p>

      <h2>7. Contact</h2>
      <p>Pour toute question : <span class="todo">[contact@ludorules.com]</span>.</p>
    `.trim(),
    en: `
      <p class="text-amber-200/90 text-sm bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
        ⚠️ <strong>Complete before launch:</strong> replace every highlighted field with your real details.
      </p>

      <h2>1. Website publisher</h2>
      <p>Ludorules, available at <a href="https://ludorules.com">https://ludorules.com</a>, is published by:</p>
      <ul>
        <li>Name / company name: <span class="todo">[Full name or company]</span></li>
        <li>Legal status: <span class="todo">[Individual / sole trader / company]</span></li>
        <li>Postal address: <span class="todo">[Postal address]</span></li>
        <li>Email: <span class="todo">[contact@ludorules.com]</span></li>
        <li>Business registration number (if applicable): <span class="todo">[SIRET / company number]</span></li>
      </ul>

      <h2>2. Publication director</h2>
      <p><span class="todo">[Full name]</span>, as website publisher.</p>

      <h2>3. Hosting provider</h2>
      <p>This Node.js application is hosted by <span class="todo">[hosting provider name, address, contact]</span>.</p>

      <h2>4. Intellectual property</h2>
      <p>The website structure, design and original editorial content belong to the publisher. Game rules are public-domain rules or informative summaries. Mentioned trademarks and published games belong to their respective owners and are cited for information only.</p>

      <h2>5. Affiliate links</h2>
      <p>The website may include affiliate links to Amazon, Fnac, Philibert and other partners. Purchases made through those links may generate a commission for the publisher, at no additional cost to you.</p>

      <h2>6. Liability</h2>
      <p>Rules are supplied for information only. Regional and house variants may exist. The publisher cannot be held liable for errors or interpretations of the rules.</p>

      <h2>7. Contact</h2>
      <p>For any question: <span class="todo">[contact@ludorules.com]</span>.</p>
    `.trim(),
    es: `
      <p class="text-amber-200/90 text-sm bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
        ⚠️ <strong>Completar antes del lanzamiento:</strong> sustituye todos los campos resaltados por tus datos reales.
      </p>

      <h2>1. Editor del sitio</h2>
      <p>Ludorules, disponible en <a href="https://ludorules.com">https://ludorules.com</a>, es publicado por:</p>
      <ul>
        <li>Nombre / razón social: <span class="todo">[Nombre completo o empresa]</span></li>
        <li>Forma jurídica: <span class="todo">[Particular / autónomo / empresa]</span></li>
        <li>Dirección postal: <span class="todo">[Dirección postal]</span></li>
        <li>Correo electrónico: <span class="todo">[contact@ludorules.com]</span></li>
        <li>Número de registro (si procede): <span class="todo">[SIRET / número de empresa]</span></li>
      </ul>

      <h2>2. Director de la publicación</h2>
      <p><span class="todo">[Nombre completo]</span>, como editor del sitio.</p>

      <h2>3. Alojamiento</h2>
      <p>Esta aplicación Node.js está alojada por <span class="todo">[nombre, dirección y contacto del proveedor de alojamiento]</span>.</p>

      <h2>4. Propiedad intelectual</h2>
      <p>La estructura, el diseño y el contenido editorial original del sitio pertenecen al editor. Las reglas de los juegos son de dominio público o resúmenes informativos. Las marcas y juegos citados pertenecen a sus respectivos titulares y se mencionan únicamente con fines informativos.</p>

      <h2>5. Enlaces de afiliación</h2>
      <p>El sitio puede incluir enlaces de afiliación a Amazon, Fnac, Philibert y otros socios. Las compras efectuadas a través de ellos pueden generar una comisión para el editor, sin coste adicional para el usuario.</p>

      <h2>6. Responsabilidad</h2>
      <p>Las reglas se proporcionan con fines informativos. Pueden existir variantes regionales o caseras. El editor no se responsabiliza de errores ni de interpretaciones de las reglas.</p>

      <h2>7. Contacto</h2>
      <p>Para cualquier consulta: <span class="todo">[contact@ludorules.com]</span>.</p>
    `.trim(),
  },
  confidentialite: {
    fr: `
      <p class="text-amber-200/90 text-sm bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
        ⚠️ <strong>À compléter avant la mise en ligne</strong> : remplace les champs surlignés <span class="todo">[ainsi]</span>. Adapte la liste des cookies/outils selon ce que tu actives réellement (Google AdSense, Google Analytics, Ezoic…).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>Les données collectées sur <strong>Ludorules</strong> sont traitées par <span class="todo">[Prénom NOM / société]</span>, éditeur du Site. Contact : <span class="todo">[contact@ludorules.com]</span>.</p>

      <h2>2. Données que nous collectons</h2>
      <ul>
        <li><strong>Formulaire « Proposer un jeu »</strong> : le nom/pseudo et l'adresse e-mail que tu renseignes (facultatifs), ainsi que le contenu de ta proposition. Ces données sont stockées dans notre base et servent uniquement à traiter et publier ta contribution ; elles sont visibles par l'équipe d'administration jusqu'à validation ou rejet.</li>
        <li><strong>Favoris</strong> : tes jeux favoris et ta langue préférée sont enregistrés localement dans ton navigateur (<em>localStorage</em>) et ne sont <strong>jamais</strong> transmis à nos serveurs.</li>
        <li><strong>Comptes administrateurs</strong> : les identifiants des membres de l'équipe (identifiant, e-mail, mot de passe haché) sont conservés pour l'accès à l'espace d'administration.</li>
        <li><strong>Mesure d'audience &amp; publicité</strong> : avec ton consentement, des cookies peuvent collecter des données de navigation anonymisées (pages vues, appareil) et servir des publicités.</li>
      </ul>

      <h2>3. Finalités et base légale</h2>
      <ul>
        <li>Traiter et publier les propositions de jeux — base légale : ton consentement / notre intérêt légitime à enrichir le catalogue.</li>
        <li>Gérer l'espace d'administration — base légale : intérêt légitime (bon fonctionnement du service).</li>
        <li>Mesurer l'audience et financer le site par la publicité et l'affiliation — base légale : ton <strong>consentement</strong> (bandeau cookies).</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>Lors de ta première visite, un bandeau te permet d'<strong>accepter ou refuser</strong> les cookies non essentiels. Tu peux modifier ton choix à tout moment via le lien <em>« Cookies »</em> en bas de page. Aucun cookie de mesure d'audience ou de publicité n'est déposé sans ton accord. Un cookie de session (<code>ludo_token</code>) est utilisé pour l'authentification de l'espace admin ; il est strictement nécessaire et non soumis à consentement.</p>
      <p>Cookies susceptibles d'être utilisés (à adapter) :</p>
      <ul>
        <li><span class="todo">[Google AdSense]</span> — affichage de publicités.</li>
        <li><span class="todo">[Google Analytics / Ezoic]</span> — mesure d'audience.</li>
      </ul>

      <h2>5. Partenaires d'affiliation</h2>
      <p>En cliquant sur un lien d'achat (Amazon, Fnac, Philibert…), tu es redirigé vers le site partenaire, qui applique sa propre politique de confidentialité.</p>

      <h2>6. Durée de conservation</h2>
      <p>Les propositions de jeux (acceptées ou rejetées) sont conservées le temps de leur traitement puis <span class="todo">[durée, ex. 12 mois]</span>. Les cookies ont une durée de vie maximale de 13 mois.</p>

      <h2>7. Tes droits</h2>
      <p>Conformément au RGPD, tu disposes d'un droit d'accès, de rectification, d'effacement, d'opposition et de portabilité de tes données. Pour les exercer, écris à <span class="todo">[contact@ludorules.com]</span>.</p>
      <p>Tu peux également introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>.</p>
    `.trim(),
    en: `
      <p class="text-amber-200/90 text-sm bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
        ⚠️ <strong>Complete before launch:</strong> replace the highlighted fields. Adjust the cookies/tools list to match what you actually enable (Google AdSense, Google Analytics, Ezoic…).
      </p>

      <h2>1. Data controller</h2>
      <p>Data collected on <strong>Ludorules</strong> is processed by <span class="todo">[Full name / company]</span>, the website publisher. Contact: <span class="todo">[contact@ludorules.com]</span>.</p>

      <h2>2. Data we collect</h2>
      <ul>
        <li><strong>"Suggest a game" form</strong>: the name/nickname and email address you provide (optional), and the content of your submission. This data is stored in our database and used solely to process and publish your contribution; it is visible to the admin team until approved or rejected.</li>
        <li><strong>Favourites</strong>: your favourite games and preferred language are stored locally in your browser (<em>localStorage</em>) and are <strong>never</strong> sent to our servers.</li>
        <li><strong>Admin accounts</strong>: team member credentials (username, email, hashed password) are kept to access the admin area.</li>
        <li><strong>Audience measurement &amp; advertising</strong>: with your consent, cookies may collect anonymised browsing data (pages viewed, device) and serve ads.</li>
      </ul>

      <h2>3. Purposes and legal basis</h2>
      <ul>
        <li>Processing and publishing game submissions — legal basis: your consent / our legitimate interest in enriching the catalogue.</li>
        <li>Managing the admin area — legal basis: legitimate interest (proper functioning of the service).</li>
        <li>Measuring audience and funding the site through advertising and affiliation — legal basis: your <strong>consent</strong> (cookie banner).</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>On your first visit, a banner lets you <strong>accept or decline</strong> non-essential cookies. You can change your choice at any time via the <em>"Cookies"</em> link in the footer. No audience-measurement or advertising cookie is set without your consent. A session cookie (<code>ludo_token</code>) is used for admin authentication; it is strictly necessary and not subject to consent.</p>
      <p>Cookies that may be used (to adjust):</p>
      <ul>
        <li><span class="todo">[Google AdSense]</span> — displaying ads.</li>
        <li><span class="todo">[Google Analytics / Ezoic]</span> — audience measurement.</li>
      </ul>

      <h2>5. Affiliate partners</h2>
      <p>Clicking a purchase link (Amazon, Fnac, Philibert…) redirects you to the partner's site, which applies its own privacy policy.</p>

      <h2>6. Retention period</h2>
      <p>Game submissions (approved or rejected) are kept for the duration of their processing, then <span class="todo">[duration, e.g. 12 months]</span>. Cookies have a maximum lifetime of 13 months.</p>

      <h2>7. Your rights</h2>
      <p>Under GDPR, you have a right of access, rectification, erasure, objection and portability of your data. To exercise them, write to <span class="todo">[contact@ludorules.com]</span>.</p>
      <p>You may also lodge a complaint with your country's data protection authority (in France, the <a href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>).</p>
    `.trim(),
    es: `
      <p class="text-amber-200/90 text-sm bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
        ⚠️ <strong>Completar antes del lanzamiento:</strong> sustituye los campos resaltados y adapta la lista de cookies/herramientas según lo que actives realmente (Google AdSense, Google Analytics, Ezoic…).
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>Los datos recopilados en <strong>Ludorules</strong> son tratados por <span class="todo">[Nombre completo / empresa]</span>, editor del sitio. Contacto: <span class="todo">[contact@ludorules.com]</span>.</p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li><strong>Formulario «Proponer un juego»</strong>: el nombre/apodo y el correo electrónico que facilitas (opcionales), así como el contenido de tu propuesta. Estos datos se almacenan en nuestra base de datos y se usan únicamente para procesar y publicar tu contribución; son visibles para el equipo de administración hasta su validación o rechazo.</li>
        <li><strong>Favoritos</strong>: tus juegos favoritos y tu idioma preferido se guardan localmente en tu navegador (<em>localStorage</em>) y <strong>nunca</strong> se transmiten a nuestros servidores.</li>
        <li><strong>Cuentas de administrador</strong>: las credenciales del equipo (usuario, correo, contraseña cifrada) se conservan para acceder al panel de administración.</li>
        <li><strong>Medición de audiencia y publicidad</strong>: con tu consentimiento, las cookies pueden recopilar datos de navegación anonimizados (páginas vistas, dispositivo) y mostrar anuncios.</li>
      </ul>

      <h2>3. Finalidades y base legal</h2>
      <ul>
        <li>Procesar y publicar las propuestas de juegos — base legal: tu consentimiento / nuestro interés legítimo en enriquecer el catálogo.</li>
        <li>Gestionar el panel de administración — base legal: interés legítimo (buen funcionamiento del servicio).</li>
        <li>Medir la audiencia y financiar el sitio mediante publicidad y afiliación — base legal: tu <strong>consentimiento</strong> (banner de cookies).</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>En tu primera visita, un banner te permite <strong>aceptar o rechazar</strong> las cookies no esenciales. Puedes cambiar tu elección en cualquier momento mediante el enlace <em>«Cookies»</em> al pie de página. No se instala ninguna cookie de medición de audiencia o publicidad sin tu consentimiento. Una cookie de sesión (<code>ludo_token</code>) se usa para la autenticación del panel de administración; es estrictamente necesaria y no está sujeta a consentimiento.</p>
      <p>Cookies que pueden utilizarse (a adaptar):</p>
      <ul>
        <li><span class="todo">[Google AdSense]</span> — visualización de anuncios.</li>
        <li><span class="todo">[Google Analytics / Ezoic]</span> — medición de audiencia.</li>
      </ul>

      <h2>5. Socios de afiliación</h2>
      <p>Al hacer clic en un enlace de compra (Amazon, Fnac, Philibert…), serás redirigido al sitio del socio, que aplica su propia política de privacidad.</p>

      <h2>6. Plazo de conservación</h2>
      <p>Las propuestas de juegos (aprobadas o rechazadas) se conservan durante el tiempo de su tratamiento y después <span class="todo">[duración, ej. 12 meses]</span>. Las cookies tienen una vida máxima de 13 meses.</p>

      <h2>7. Tus derechos</h2>
      <p>De conformidad con el RGPD, dispones de un derecho de acceso, rectificación, supresión, oposición y portabilidad de tus datos. Para ejercerlos, escribe a <span class="todo">[contact@ludorules.com]</span>.</p>
      <p>También puedes presentar una reclamación ante la autoridad de protección de datos de tu país (en Francia, la <a href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>).</p>
    `.trim(),
  },
};

function readRow(slug, lang) {
  return db.prepare('SELECT html FROM legal_pages WHERE slug = ? AND lang = ?').get(slug, lang);
}

function getPage(slug, lang) {
  if (!SLUGS.includes(slug) || !LANGS.includes(lang)) return null;
  const row = readRow(slug, lang);
  if (row && typeof row.html === 'string' && row.html.trim() !== '') return row.html;
  return DEFAULTS[slug][lang];
}

// Renvoie tout le contenu (par défaut ou personnalisé) pour l'éditeur du BO :
// { mentions: { fr, en, es }, confidentialite: { fr, en, es } }
function getAll() {
  const out = {};
  for (const slug of SLUGS) {
    out[slug] = {};
    for (const lang of LANGS) out[slug][lang] = getPage(slug, lang);
  }
  return out;
}

function updatePage(slug, lang, html) {
  if (!SLUGS.includes(slug) || !LANGS.includes(lang)) {
    throw new Error('Page ou langue invalide.');
  }
  const clean = String(html || '').slice(0, 20000);
  db.prepare(
    `INSERT INTO legal_pages (slug, lang, html, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT (slug, lang) DO UPDATE SET html = excluded.html, updated_at = datetime('now')`
  ).run(slug, lang, clean);
  return getPage(slug, lang);
}

module.exports = { SLUGS, LANGS, DEFAULTS, getPage, getAll, updatePage };
