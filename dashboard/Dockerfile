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
# Default file permissions from COPY (world-readable) are enough for
# nginx -- running as non-root, whatever its exact uid -- to read the
# static files. runtime-env.js is the one exception: it's rewritten at
# container start by docker-entrypoint.d/10-generate-runtime-env.sh,
# which runs as that same non-root user, so it needs write access without
# this Dockerfile having to guess that uid (it's shipped as a build-time
# placeholder -- see public/runtime-env.js -- precisely so this chmod has
# an existing file to target). 666 rather than relying on directory
# ownership: writing to an *existing* file only needs write permission on
# the file itself, not on its containing (root-owned) directory.
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chmod 666 /usr/share/nginx/html/runtime-env.js
COPY docker-entrypoint.d/10-generate-runtime-env.sh /docker-entrypoint.d/10-generate-runtime-env.sh
RUN chmod +x /docker-entrypoint.d/10-generate-runtime-env.sh

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
