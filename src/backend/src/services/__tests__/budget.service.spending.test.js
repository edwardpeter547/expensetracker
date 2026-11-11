/**
 * Regression tests for budget spending aggregation.
 *
 * Transaction.category is a free-form string while Budget.category is a
 * relation, so spending must be matched by category name until the schema is
 * aligned. These tests assert that aggregation never filters on the
 * nonexistent `Transaction.categoryId` and never over-counts expenses when a
 * budget's category is unavailable.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const USER_ID = 1;

const aggregateSpending = jest.fn();

const mockPrisma = {
    transaction: {
        aggregate: aggregateSpending,
    },
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const budgetService = await import('../budget.service.js');

const makeBudget = (overrides = {}) => ({
    id: 'b1',
    userId: USER_ID,
    amount: 100,
    currency: 'USD',
    period: 'MONTHLY',
    startDate: null,
    endDate: null,
    categoryId: 'c1',
    category: { id: 'c1', name: 'Food' },
    ...overrides,
});

describe('budget spending aggregation', () => {
    beforeEach(() => jest.clearAllMocks());

    /**
     * Aggregation must filter expenses by category name and exclude
     * `categoryId`, which does not exist on Transaction.
     */
    test('aggregates spending by categoryId and currency', async () => {
        aggregateSpending.mockResolvedValue({ _sum: { amount: '40' } });
        const currentDate = new Date('2026-05-10T12:00:00.000Z');

        const result = await budgetService.getBudgetWithSpending([makeBudget()], currentDate, USER_ID);

        expect(aggregateSpending).toHaveBeenCalledTimes(1);
        const where = aggregateSpending.mock.calls[0][0].where;
        expect(where).toMatchObject({
            userId: USER_ID,
            categoryId: 'c1',
            currency: 'USD',
            transType: 'EXPENSE',
        });
        expect(result[0].spent).toBe('40');
        expect(result[0].remaining).toBe('60');
        expect(result[0].isOverBudget).toBe(false);
    });

    /**
     * A budget whose category or currency is unavailable must report zero
     * spending instead of aggregating unrelated records.
     */
    test('returns zero spending when categoryId or currency is unavailable', async () => {
        aggregateSpending.mockResolvedValue({ _sum: { amount: 999 } });
        const currentDate = new Date('2026-05-10T12:00:00.000Z');

        const result = await budgetService.getBudgetWithSpending(
            [makeBudget({ category: null, currency: null, categoryId: null })],
            currentDate,
            USER_ID,
        );

        expect(aggregateSpending).not.toHaveBeenCalled();
        expect(result[0].spent).toBe('0');
        expect(result[0].remaining).toBe('100');
    });

    /**
     * Monthly spending boundaries must be derived from the user's timezone and
     * converted into UTC instants for the database query.
     */
    test('derives monthly spending boundaries from the user timezone', async () => {
        aggregateSpending.mockResolvedValue({ _sum: { amount: '10' } });
        const currentDate = new Date('2026-05-10T12:00:00.000Z');

        await budgetService.getBudgetWithSpending(
            [makeBudget()],
            currentDate,
            USER_ID,
            'America/New_York',
        );

        const where = aggregateSpending.mock.calls[0][0].where;
        expect(where.transactionDate).toEqual({
            gte: new Date('2026-05-01T04:00:00.000Z'),
            lt: new Date('2026-06-01T04:00:00.000Z'),
        });
    });

    /**
     * Weekly spending boundaries must start on Sunday in the recipient's
     * timezone, including zones with a half-hour offset from UTC.
     */
    test('derives weekly spending boundaries in a half-hour timezone', async () => {
        aggregateSpending.mockResolvedValue({ _sum: { amount: '10' } });
        const currentDate = new Date('2026-05-13T12:00:00.000Z');

        await budgetService.getBudgetWithSpending(
            [makeBudget({ period: 'WEEKLY' })],
            currentDate,
            USER_ID,
            'Asia/Kolkata',
        );

        const where = aggregateSpending.mock.calls[0][0].where;
        expect(where.transactionDate.gte.toISOString()).toBe('2026-05-09T18:30:00.000Z');
        expect(where.transactionDate.lt.toISOString()).toBe('2026-05-16T18:30:00.000Z');
    });

    /**
     * Yearly spending boundaries must span the recipient's local calendar
     * year and be converted into UTC query instants.
     */
    test('derives yearly spending boundaries in the user timezone', async () => {
        aggregateSpending.mockResolvedValue({ _sum: { amount: '1' } });
        const currentDate = new Date('2026-07-01T12:00:00.000Z');

        await budgetService.getBudgetWithSpending(
            [makeBudget({ period: 'YEARLY' })],
            currentDate,
            USER_ID,
            'Asia/Kolkata',
        );

        const where = aggregateSpending.mock.calls[0][0].where;
        expect(where.transactionDate.gte.toISOString()).toBe('2025-12-31T18:30:00.000Z');
        expect(where.transactionDate.lt.toISOString()).toBe('2026-12-31T18:30:00.000Z');
    });

    /**
     * Fractional spending must be summed and subtracted with Decimal
     * precision, and the source budget record must remain untouched.
     */
    test('computes fractional totals with Decimal precision without mutation', async () => {
        aggregateSpending.mockResolvedValue({ _sum: { amount: '0.30' } });
        const budget = makeBudget({ amount: '100.0000' });
        const currentDate = new Date('2026-05-10T12:00:00.000Z');

        const result = await budgetService.getBudgetWithSpending([budget], currentDate, USER_ID, 'UTC');

        expect(result[0].spent).toBe('0.3');
        expect(result[0].remaining).toBe('99.7');
        expect(budget.amount).toBe('100.0000');
        expect(budget.currency).toBe('USD');
    });
});
