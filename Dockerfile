
# syntax=docker/dockerfile:1

# Versions de Node.js et Alpine
ARG NODE_VERSION=22
ARG ALPINE_VERSION=3.22

# Étape 1 : installation des dépendances de production
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Étape 2 : construction de l'image finale
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}

# Mise à jour des paquets système et suppression des outils inutiles en production
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/lib/node_modules/corepack \
              /opt/yarn-v1.22.22 \
    && rm -f /usr/local/bin/npm \
             /usr/local/bin/npx \
             /usr/local/bin/corepack \
             /usr/local/bin/yarn \
             /usr/local/bin/yarnpkg

# Configuration de l'environnement
ENV NODE_ENV=production

WORKDIR /app

# Copie des dépendances installées
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copie des fichiers de l'application
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src

# Exécution avec un utilisateur non privilégié
USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
