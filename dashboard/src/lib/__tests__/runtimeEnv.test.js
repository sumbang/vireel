import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRuntimeEnv } from '../runtimeEnv';

describe('getRuntimeEnv', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        delete window.__RUNTIME_CONFIG__;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        delete window.__RUNTIME_CONFIG__;
    });

    it('returns the fallback when neither runtime config nor build-time env is set', () => {
        expect(getRuntimeEnv('SOME_KEY', 'fallback-value')).toBe('fallback-value');
    });

    it('defaults the fallback to an empty string', () => {
        expect(getRuntimeEnv('SOME_KEY')).toBe('');
    });

    it('falls back to the build-time VITE_<key> env var when runtime config is absent', () => {
        vi.stubEnv('VITE_API_URL', 'https://build-time.example.co');
        expect(getRuntimeEnv('API_URL')).toBe('https://build-time.example.co');
    });

    it('prefers the container-injected runtime config over the build-time env var', () => {
        vi.stubEnv('VITE_API_URL', 'https://build-time.example.co');
        window.__RUNTIME_CONFIG__ = { API_URL: 'https://runtime.example.co' };
        expect(getRuntimeEnv('API_URL')).toBe('https://runtime.example.co');
    });

    it('ignores an empty string in runtime config and falls through to build-time env', () => {
        vi.stubEnv('VITE_API_URL', 'https://build-time.example.co');
        window.__RUNTIME_CONFIG__ = { API_URL: '' };
        expect(getRuntimeEnv('API_URL')).toBe('https://build-time.example.co');
    });
});
