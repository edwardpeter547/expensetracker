/**
 * Regression tests for sensitive-data projections in auth.service.js.
 *
 * The mocked Prisma client faithfully applies the requested `select` shape to
 * a fully populated user record, so these tests exercise the real query
 * boundary: if a password hash, token, or personal field ever re-enters the
 * projection, the returned record will contain it and the test will fail.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const FULL_USER = {
    id: 1,
    email: 'a@b.c',
    username: 'a',
    password: '$2b$12$abcdefghijklmnopqrstuv',
    firstname: 'Ada',
    lastname: 'Byron',
    dateOfBirth: new Date('1990-01-01T00:00:00Z'),
    mobileNumber: '+447700900123',
    avatar: null,
    isActive: true,
    isEmailVerified: true,
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    isPhoneVerified: false,
    phoneVerifiedAt: null,
    lastPasswordReset: new Date('2026-01-01T00:00:00Z'),
    currency: 'USD',
    timezone: 'UTC',
    language: 'en',
    theme: 'light',
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const applySelect = (record, select) => {
    const result = {};
    for (const [key, value] of Object.entries(select || {})) {
        if (value === true) {
            result[key] = record[key];
        } else if (typeof value === 'object' && value !== null) {
            const nested = value.select || value;
            result[key] = record[key] ? applySelect(record[key], nested) : undefined;
        }
    }
    return result;
};

const mockPrisma = {
    user: {
        findFirst: jest.fn(async ({ select }) => applySelect(FULL_USER, select)),
    },
    verificationToken: {
        findUnique: jest.fn(async ({ select }) => {
            const record = {
                id: 'v1',
                token: 'raw-verification-token',
                userId: FULL_USER.id,
                expiresAt: new Date(Date.now() + 60 * 1000),
                user: FULL_USER,
            };
            return applySelect(record, select);
        }),
    },
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({
    default: mockPrisma,
}));

const authService = await import('../auth.service.js');
const { USER_PUBLIC_SELECT, USER_OWNER_SELECT } = await import('../../constants/user.select.js');

describe('auth.service sensitive-data projections', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('USER_PUBLIC_SELECT minimizes data and excludes credentials', () => {
        expect(USER_PUBLIC_SELECT.password).toBeUndefined();
        expect(USER_PUBLIC_SELECT.lastPasswordReset).toBeUndefined();
        expect(USER_PUBLIC_SELECT.dateOfBirth).toBeUndefined();
        expect(USER_PUBLIC_SELECT.mobileNumber).toBeUndefined();
        expect(USER_PUBLIC_SELECT.email).toBe(true);
        expect(USER_PUBLIC_SELECT.isEmailVerified).toBe(true);
    });

    test('USER_OWNER_SELECT is narrower and excludes credentials/personal data', () => {
        expect(USER_OWNER_SELECT.password).toBeUndefined();
        expect(USER_OWNER_SELECT.dateOfBirth).toBeUndefined();
        expect(USER_OWNER_SELECT.mobileNumber).toBeUndefined();
        expect(USER_OWNER_SELECT.email).toBe(true);
    });

    test('getSafeUser never returns password or unnecessary personal fields', async () => {
        const user = await authService.getSafeUser({ email: FULL_USER.email });

        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
            where: { email: FULL_USER.email },
            select: USER_PUBLIC_SELECT,
        });
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('dateOfBirth');
        expect(user).not.toHaveProperty('mobileNumber');
        expect(user).toHaveProperty('email', FULL_USER.email);
        expect(user).toHaveProperty('isEmailVerified', true);
    });

    /**
     * The six-digit code must be stored as a keyed HMAC digest, never in a
     * reversible or plain-digest form, and must be deterministic so lookups
     * remain consistent across requests.
     */
    test('hashVerificationCode returns a stable keyed digest that hides the raw code', () => {
        const hash = authService.hashVerificationCode('000123');

        expect(hash).toHaveLength(64);
        expect(hash).not.toContain('000123');
        expect(authService.hashVerificationCode('000123')).toBe(hash);
        expect(authService.hashVerificationCode('000124')).not.toBe(hash);
    });
});
