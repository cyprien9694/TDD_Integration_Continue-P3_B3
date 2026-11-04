# syntax=docker/dockerfile:1

# Version épinglée (Dependabot "docker" la fera évoluer). Vérifier que le tag existe sur Docker Hub.
ARG NODE_VERSION=22.21.1
ARG ALPINE_VERSION=3.22

# ---- Étape 1 : dépendances de production uniquement ----
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Étape 2 : image finale ----
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
