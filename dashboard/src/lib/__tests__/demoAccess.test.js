import { describe, expect, it } from 'vitest';
import { DEMO_ACCESS_RESTRICTED_DETAIL, isDemoAccessRestrictedResponse } from '../demoAccess';

describe('isDemoAccessRestrictedResponse', () => {
    it('recognizes the exact demo-block 403', () => {
        expect(isDemoAccessRestrictedResponse(403, DEMO_ACCESS_RESTRICTED_DETAIL)).toBe(true);
    });

    it('does not match a 403 with a different detail', () => {
        expect(isDemoAccessRestrictedResponse(403, 'Some other forbidden reason')).toBe(false);
    });

    it('does not match a non-403 status even with the same detail', () => {
        expect(isDemoAccessRestrictedResponse(401, DEMO_ACCESS_RESTRICTED_DETAIL)).toBe(false);
    });

    it('does not match when detail is missing', () => {
        expect(isDemoAccessRestrictedResponse(403, undefined)).toBe(false);
    });
});
