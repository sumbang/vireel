// Runtime-configurable frontend settings -- lets the SAME built Docker
// image (see ../../Dockerfile) serve staging and production with
// different Supabase projects/API URLs, the same way the backend reads
// its own .env at container start instead of baking secrets into the
// image. docker-entrypoint.d/10-generate-runtime-env.sh generates
// public/runtime-env.js from the container's own environment (populated
// via docker-compose's `env_file: - .env`, one file per VPS) right before
// nginx starts, and index.html loads that file before the app bundle.
//
// In local development (`vite dev`/a plain `vite build` without that
// entrypoint running), window.__RUNTIME_CONFIG__ is never set, so this
// transparently falls back to Vite's own build-time `import.meta.env
// .VITE_<key>` -- the existing local .env workflow (dashboard/.env, see
// docker-compose.yml) is unchanged.
export function getRuntimeEnv(key, fallback = "") {
    const runtime = typeof window !== "undefined" ? window.__RUNTIME_CONFIG__ : undefined;
    if (runtime && runtime[key]) return runtime[key];
    const buildTime = import.meta.env[`VITE_${key}`];
    return buildTime || fallback;
}
