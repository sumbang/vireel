import { createClient } from "@supabase/supabase-js";
import { getRuntimeEnv } from "./runtimeEnv";

let client = null;

export function getSupabaseBrowserClient() {
    if (client) return client;

    const url = getRuntimeEnv("SUPABASE_URL");
    const anonKey = getRuntimeEnv("SUPABASE_ANON_KEY");

    if (!url || !anonKey) {
        throw new Error(
            "Missing SUPABASE_URL or SUPABASE_ANON_KEY (set them in the deployment's .env, " +
            "or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in dashboard/.env for local dev)"
        );
    }

    client = createClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });

    return client;
}