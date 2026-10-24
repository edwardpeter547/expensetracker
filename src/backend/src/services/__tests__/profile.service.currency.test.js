/**
 * Regression tests for currency-scoped dashboard aggregation.
 *
 * The mocked Prisma client records the `where` filters passed to each
 * aggregate, proving that income and expense totals never mix currencies.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const aggregateIncome = jest.fn();
const aggregateExpense = jest.fn();

const mockPrisma = {
    transaction: {
        aggregate: jest.fn(({ where }) => (
            where.transType === 'INCOME' ? aggregateIncome() : aggregateExpense()
        )),
        findMany: jest.fn(async () => []),
    },
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const profileService = await import('../profile.service.js');

describe('getUserSummary currency scoping', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        aggregateIncome.mockResolvedValue({ _sum: { amount: '100.00' } });
        aggregateExpense.mockResolvedValue({ _sum: { amount: '25.50' } });
    });

    /**
     * Both aggregates must be constrained to the requested currency and return
     * canonical string totals with an exact string balance.
     */
    test('aggregates only the requested currency', async () => {
        const summary = await profileService.getUserSummary(1, new Date('2026-01-01T00:00:00Z'), 'GBP');

        expect(mockPrisma.transaction.aggregate).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ currency: 'GBP' }),
        }));
        expect(summary).toMatchObject({
            currency: 'GBP',
            totalIncome: '100',
            totalExpenses: '25.5',
            balance: '74.5',
        });
    });
});
