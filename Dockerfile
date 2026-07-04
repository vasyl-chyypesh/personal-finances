# syntax=docker/dockerfile:1

# Multi-target build: compose selects `target: api` or `target: ui`.
# Debian-based images (not alpine) because better-sqlite3 ships glibc
# prebuilt binaries; musl would force a source compile.
ARG NODE_VERSION=25

# deps: full install once, shared by both builds
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# The prepare script is husky's git-hook install — .husky/ isn't shipped into
# the image, so drop it. Not --ignore-scripts: better-sqlite3's install script
# must still run to fetch its prebuilt binary.
RUN --mount=type=cache,target=/root/.npm \
    npm pkg delete scripts.prepare && npm ci

# build-api: tsc -> dist/api + dist/cli
FROM deps AS build-api
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# build-ui: vite -> dist/ui
FROM deps AS build-ui
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build:ui

# prod-deps: production node_modules only
FROM node:${NODE_VERSION}-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# Same prepare-script removal as the deps stage (see comment there).
RUN --mount=type=cache,target=/root/.npm \
    npm pkg delete scripts.prepare && npm ci --omit=dev

# api: runtime image
FROM node:${NODE_VERSION}-slim AS api
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DB_PATH=/data/finance.db
WORKDIR /app
# Volume mountpoint must be writable by the non-root `node` user (WAL mode
# writes .db-wal/.db-shm siblings next to the db file).
RUN mkdir -p /data && chown node:node /data
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build-api --chown=node:node /app/dist ./dist
# package.json carries "type": "module" — required to run dist as ESM.
COPY --chown=node:node package.json ./
USER node
EXPOSE 3001
CMD ["node", "dist/api/index.js"]

# ui: nginx serving the SPA and proxying /api to the api service
FROM nginxinc/nginx-unprivileged:1.29-alpine AS ui
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-ui /app/dist/ui /usr/share/nginx/html
EXPOSE 8080
