import { describe, expect, test } from '@jest/globals';
import { changeOwnPasswordSchema, updateProfileSchema } from '../user.validation';

describe('updateProfileSchema', () => {
    /**
     * A fully populated update must validate when every value is supported:
     * a real ISO 4217 currency, a real IANA timezone, a supported language,
     * and a supported theme.
     */
    test('accepts supported currency, timezone, language, and theme values', () => {
        const { error, value } = updateProfileSchema.validate({
            currency: 'usd',
            timezone: 'Europe/London',
            language: 'fr',
            theme: 'system',
            username: 'Casey',
        });

        expect(error).toBeUndefined();
        expect(value.currency).toBe('USD');
    });

    /**
     * Arbitrary three-letter strings that are not ISO 4217 codes must be
     * rejected rather than silently persisted.
     */
    test('rejects a non-ISO 4217 currency code', () => {
        const { error } = updateProfileSchema.validate({ currency: 'XYZ' });

        expect(error).toBeDefined();
        expect(error.details[0].path).toContain('currency');
    });

    /**
     * An unknown timezone identifier must be rejected even when it is short
     * enough to pass the length rule.
     */
    test('rejects an unknown IANA timezone identifier', () => {
        const { error } = updateProfileSchema.validate({ timezone: 'Not/AZone' });

        expect(error).toBeDefined();
        expect(error.details[0].path).toContain('timezone');
    });

    /**
     * Only the three supported themes are accepted; an arbitrary value must
     * fail validation.
     */
    test('rejects an unsupported theme value', () => {
        const { error } = updateProfileSchema.validate({ theme: 'blue' });

        expect(error).toBeDefined();
        expect(error.details[0].path).toContain('theme');
    });

    /**
     * An empty update is rejected by the at-least-one-field rule.
     */
    test('rejects an empty update body', () => {
        const { error } = updateProfileSchema.validate({});

        expect(error).toBeDefined();
    });
});

describe('changeOwnPasswordSchema', () => {
    /**
     * Both passwords are required; a missing new password must fail.
     */
    test('requires currentPassword and newPassword', () => {
        const { error } = changeOwnPasswordSchema.validate({ currentPassword: 'current' });

        expect(error).toBeDefined();
        expect(error.details[0].path).toContain('newPassword');
    });

    /**
     * The new password must satisfy the same 8-100 character policy used for
     * registration and reset.
     */
    test('rejects a too-short new password', () => {
        const { error } = changeOwnPasswordSchema.validate({
            currentPassword: 'current',
            newPassword: 'short',
        });

        expect(error).toBeDefined();
        expect(error.details[0].path).toContain('newPassword');
    });
});
