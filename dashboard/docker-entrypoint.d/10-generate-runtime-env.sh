#!/bin/sh
# Generates /usr/share/nginx/html/runtime-env.js from THIS CONTAINER's own
# environment (see docker-compose.{staging,prod}.yml's `frontend` service,
# which now reads its own .env on the VPS, same as `backend` already did)
# -- runs automatically before nginx starts, via the base nginx image's
# standard /docker-entrypoint.d/*.sh convention (nginxinc/nginx-unprivileged
# inherits it from the official nginx image).
#
# This is what lets the SAME frontend Docker image (built once in CI, then
# promoted byte-for-byte from staging to production -- see
# .github/workflows/promote-release.yml) serve staging and production with
# different Supabase projects/API URLs, instead of baking one fixed set of
# values into the JS bundle at build time. See dashboard/src/lib/
# runtimeEnv.js for how the app reads this file's output, and index.html
# for where it's loaded.
set -eu

OUT_FILE="/usr/share/nginx/html/runtime-env.js"

# Minimal escaping (backslash, double-quote) -- these are operator-set
# deployment secrets/URLs, not arbitrary user input, so this is sufficient
# to keep the generated file valid JS.
json_escape() {
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

{
    printf 'window.__RUNTIME_CONFIG__ = {\n'
    printf '  "SUPABASE_URL": "%s",\n' "$(json_escape "${SUPABASE_URL:-}")"
    printf '  "SUPABASE_ANON_KEY": "%s",\n' "$(json_escape "${SUPABASE_ANON_KEY:-}")"
    printf '  "API_URL": "%s",\n' "$(json_escape "${VITE_API_URL:-}")"
    printf '  "HIDE_SOCIAL_PLATFORMS": "%s"\n' "$(json_escape "${VITE_HIDE_SOCIAL_PLATFORMS:-}")"
    printf '};\n'
} > "$OUT_FILE"

echo "Generated $OUT_FILE from the container's environment"
