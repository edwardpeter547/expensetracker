/**
 * Regression tests for sensitive-data projections in auth.service.js.
 *
 * These tests assert that user data fetched for API responses uses the
 * allowlisted projection and never selects the password hash or credential
 * metadata. They mock the Prisma client so no database is required.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

const mockPrisma = {
    user: { findFirst: jest.fn() },
    verificationToken: { findUnique: jest.fn() },
};

jest.unstable_mockModule(prismaModulePath, () => ({
    default: mockPrisma,
}));

const authService = await import('../auth.service.js');
const { USER_PUBLIC_SELECT } = await import('../../constants/user.select.js');

describe('auth.service sensitive-data projections', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('USER_PUBLIC_SELECT excludes password and credential metadata', () => {
        expect(USER_PUBLIC_SELECT.password).toBeUndefined();
        expect(USER_PUBLIC_SELECT.lastPasswordReset).toBeUndefined();
        expect(USER_PUBLIC_SELECT.passwordResetTokens).toBeUndefined();
        expect(USER_PUBLIC_SELECT.verificationTokens).toBeUndefined();
        expect(USER_PUBLIC_SELECT.email).toBe(true);
    });

    test('getSafeUser selects only the allowlisted fields', async () => {
        mockPrisma.user.findFirst.mockResolvedValue({ id: 1, email: 'a@b.c' });

        const user = await authService.getSafeUser({ email: 'a@b.c' });

        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
            where: { email: 'a@b.c' },
            select: USER_PUBLIC_SELECT,
        });
        expect(user).toEqual({ id: 1, email: 'a@b.c' });
    });

    test('getVerificationToken includes only the allowlisted user projection', async () => {
        mockPrisma.verificationToken.findUnique.mockResolvedValue({
            id: 'v1',
            token: 'tok',
            user: { id: 1, email: 'a@b.c' },
        });

        await authService.getVerificationToken('tok');

        expect(mockPrisma.verificationToken.findUnique).toHaveBeenCalledWith({
            where: { token: 'tok' },
            include: { user: { select: USER_PUBLIC_SELECT } },
        });
    });
});
