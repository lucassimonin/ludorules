# Image Node.js pour Ludorules
# --------------------------------------------------------------
# node:20-bookworm-slim (glibc) plutôt qu'alpine : better-sqlite3
# a des binaires précompilés fiables sur glibc, ça évite les
# soucis de compilation native au build de l'image.

FROM node:20-bookworm-slim

WORKDIR /app

# On copie d'abord package*.json seuls pour profiter du cache Docker
# (npm install ne re-tourne que si ces fichiers changent).
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

# Le dossier data/ contient la base SQLite : à monter en volume
# pour ne pas perdre les données à chaque rebuild de l'image.
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "src/server.js"]
