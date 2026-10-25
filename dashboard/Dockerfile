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
# This base image already runs as its own non-root "nginx" user (uid/gid
# 101) from FROM onward -- confirmed the hard way: a plain `COPY` (always
# root:root, regardless of the active USER) followed by `RUN chmod` on
# that file failed with "Operation not permitted", because the RUN step
# itself executes as that inherited non-root user, which can't chmod a
# file it doesn't own -- root privilege or file ownership are the only
# two ways to chmod, and this build has neither without the line below.
#
# `--chown=nginx:nginx` fixes that at the source: the copied files
# (including public/runtime-env.js's build-time placeholder, see that
# file's own comment) are owned by the same user the later `RUN chmod`
# -- and, at container start, docker-entrypoint.d/10-generate-runtime-
# env.sh -- run as, so chmod/write both succeed as the file's own owner,
# no root needed. Using the symbolic name rather than a guessed numeric
# uid also means a mismatch fails loudly at build time (unresolvable
# chown owner) instead of silently at container runtime (today's 404).
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
RUN chmod 666 /usr/share/nginx/html/runtime-env.js
COPY --chown=nginx:nginx docker-entrypoint.d/10-generate-runtime-env.sh /docker-entrypoint.d/10-generate-runtime-env.sh
RUN chmod +x /docker-entrypoint.d/10-generate-runtime-env.sh

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
