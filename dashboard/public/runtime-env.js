// Default/fallback config, shipped as part of the build itself (Vite
// copies everything under public/ into dist/ as-is) -- overwritten at
// container start by docker-entrypoint.d/10-generate-runtime-env.sh with
// this deployment's real values (see dashboard/src/lib/runtimeEnv.js).
//
// Serving this placeholder instead of a 404 when the entrypoint script
// hasn't (for whatever reason) overwritten it yet makes a misconfigured
// deployment fail softly and diagnosably -- a clear "Missing SUPABASE_URL
// or SUPABASE_ANON_KEY" error from getSupabaseBrowserClient() -- instead
// of looking like an unrelated missing-static-file problem.
window.__RUNTIME_CONFIG__ = window.__RUNTIME_CONFIG__ || {};
