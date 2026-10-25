# Production image: builds a real `vite build` static bundle and serves it
# with nginx. For local development with hot reload, see Dockerfile.dev
# (used by the root docker-compose.yml) instead.
#
# This used to just run `npm run dev` in production too, which shipped
# Vite's dev-only HMR client (its WebSocket can't resolve a port behind a
# reverse proxy -- "wss://localhost:undefined") and served some
# dependencies' worker/module chunks as blob-URL <script> elements, which
# the CSP's script-src (index.html; no 'unsafe-inline', no blob:) correctly
# refused to load. A real production build emits neither: no HMR client,
# and worker/module chunks as real same-origin hashed files.

# ============================================================
# Stage 1: build the static production bundle
# ============================================================
# No VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY (or VITE_API_URL/
# VITE_HIDE_SOCIAL_PLATFORMS) build args here on purpose: those are no
# longer baked into the bundle at build time, so this image never embeds
# environment-specific secrets and is safe to build once in CI and
# promote byte-for-byte from staging to production (see
# .github/workflows/promote-release.yml). They're supplied at container
# start instead -- see docker-entrypoint.d/10-generate-runtime-env.sh and
# src/lib/runtimeEnv.js.
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================================
# Stage 2: serve the built static files with nginx
# ============================================================
# nginxinc/nginx-unprivileged: same nginx image, pre-configured to listen
# on a high port and run as a non-root user (uid 101) out of the box
# (audit finding H14 -- avoid running any of this app's containers as
# root), unlike the stock nginx image which needs its own manual USER/
# permission setup to do the same thing.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
# --chown=101:101 (the image's own non-root "nginx" uid/gid): the static
# files must be owned by the user the container actually runs as, both so
# nginx can read them and so docker-entrypoint.d/10-generate-runtime-env.sh
# (which runs as that same non-root user) can write runtime-env.js into
# this directory at container start.
COPY --from=builder --chown=101:101 /app/dist /usr/share/nginx/html
COPY --chown=101:101 docker-entrypoint.d/10-generate-runtime-env.sh /docker-entrypoint.d/10-generate-runtime-env.sh
RUN chmod +x /docker-entrypoint.d/10-generate-runtime-env.sh

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
