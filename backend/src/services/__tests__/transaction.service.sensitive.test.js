/**
 * Regression tests for the nested owner projection on transaction creation.
 *
 * `createTransactionRecord` must return a safe owner projection rather than
 * `user: true`, which previously serialized the full user (including the
 * password hash) inside the transaction-create response.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

const mockPrisma = {
    transaction: { create: jest.fn() },
};

jest.unstable_mockModule(prismaModulePath, () => ({
    default: mockPrisma,
}));

const transactionService = await import('../transaction.service.js');
const { USER_PUBLIC_SELECT } = await import('../../constants/user.select.js');

describe('transaction.service safe owner projection', () => {
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    test('createTransactionRecord selects a safe nested user, not user: true', async () => {
        mockPrisma.transaction.create.mockResolvedValue({ id: 1 });

        await transactionService.createTransactionRecord({ userId: 1, amount: 10 });

        expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(1);
        const args = mockPrisma.transaction.create.mock.calls[0][0];

        expect(args.select.user).not.toBe(true);
        expect(args.select.user).toEqual({ select: USER_PUBLIC_SELECT });
        expect(USER_PUBLIC_SELECT.password).toBeUndefined();
    });
});
