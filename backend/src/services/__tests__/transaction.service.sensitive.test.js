/**
 * Regression tests for the nested owner projection on transaction creation.
 *
 * The mocked Prisma client faithfully applies the requested `select` shape to
 * a fully populated record, so these tests exercise the real query boundary:
 * a nested password hash or personal field can only leak if it re-enters the
 * projection.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
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
};

const FULL_TRANSACTION = {
    id: 10,
    userId: FULL_USER.id,
    user: FULL_USER,
    transType: 'INCOME',
    category: 'Salary',
    description: 'Monthly salary',
    receiptUrl: null,
    location: null,
    amount: 1000,
    transactionDate: new Date('2026-01-01T00:00:00Z'),
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
    transaction: {
        create: jest.fn(async ({ select }) => applySelect(FULL_TRANSACTION, select)),
    },
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({
    default: mockPrisma,
}));

const transactionService = await import('../transaction.service.js');
const { USER_OWNER_SELECT } = await import('../../constants/user.select.js');

describe('transaction.service safe owner projection', () => {
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    test('createTransactionRecord returns a safe owner without password or personal data', async () => {
        const record = await transactionService.createTransactionRecord({ userId: 1, amount: 1000 });

        expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(1);
        const args = mockPrisma.transaction.create.mock.calls[0][0];

        expect(args.select.user).not.toBe(true);
        expect(args.select.user).toEqual({ select: USER_OWNER_SELECT });
        expect(USER_OWNER_SELECT.password).toBeUndefined();

        expect(record.user).not.toHaveProperty('password');
        expect(record.user).not.toHaveProperty('dateOfBirth');
        expect(record.user).not.toHaveProperty('mobileNumber');
        expect(record.user).toHaveProperty('email', 'a@b.c');
        expect(record.user).toHaveProperty('username', 'a');
    });
});
