import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
    createClient: createClientMock,
}));

describe('getSupabaseBrowserClient', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        delete window.__RUNTIME_CONFIG__;
    });

    it('throws when required config is missing from both runtime and build-time env', async () => {
        vi.stubEnv('VITE_SUPABASE_URL', '');
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

        const { getSupabaseBrowserClient } = await import('../supabase-browser');

        expect(() => getSupabaseBrowserClient()).toThrow(/SUPABASE_URL/);
    });

    it('creates and memoizes supabase client from build-time VITE_* env (local dev fallback)', async () => {
        vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.example.co');
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

        const fakeClient = { id: 'client-1' };
        createClientMock.mockReturnValue(fakeClient);

        const { getSupabaseBrowserClient } = await import('../supabase-browser');

        const first = getSupabaseBrowserClient();
        const second = getSupabaseBrowserClient();

        expect(first).toBe(fakeClient);
        expect(second).toBe(fakeClient);
        expect(createClientMock).toHaveBeenCalledTimes(1);
        expect(createClientMock).toHaveBeenCalledWith(
            'https://supabase.example.co',
            'anon-key',
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                },
            },
        );
    });

    it('prefers the container-injected runtime config over build-time VITE_* env', async () => {
        // The deployed (staging/prod) case: window.__RUNTIME_CONFIG__ is
        // generated at container start from that VPS's own .env (see
        // docker-entrypoint.d/10-generate-runtime-env.sh) and must win
        // over whatever was baked in at build time, since the same image
        // is promoted byte-for-byte from staging to production.
        vi.stubEnv('VITE_SUPABASE_URL', 'https://build-time.example.co');
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'build-time-key');
        window.__RUNTIME_CONFIG__ = {
            SUPABASE_URL: 'https://runtime.example.co',
            SUPABASE_ANON_KEY: 'runtime-key',
        };

        const fakeClient = { id: 'client-2' };
        createClientMock.mockReturnValue(fakeClient);

        const { getSupabaseBrowserClient } = await import('../supabase-browser');
        getSupabaseBrowserClient();

        expect(createClientMock).toHaveBeenCalledWith(
            'https://runtime.example.co',
            'runtime-key',
            expect.any(Object),
        );
    });
});

