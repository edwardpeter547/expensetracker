/**
 * Unit tests for the six-month spending trend bucketing.
 *
 * The reference `now` is a local date so the assertions are timezone
 * independent.
 */

import { buildSpendingTrend, type TrendTransaction } from '@/utils/spendingTrend';

const NOW = new Date(2026, 9, 15, 12);

/**
 * Build a minimal trend transaction fixture.
 *
 * @param id - The record id.
 * @param overrides - Fields merged over the fixture defaults.
 * @returns A trend transaction fixture.
 */
const transaction = (
    id: string,
    overrides: Partial<TrendTransaction> = {},
): TrendTransaction => ({
    amount: '100',
    currency: 'USD',
    transType: 'EXPENSE',
    transactionDate: new Date(2026, 9, 10),
    ...overrides,
});

describe('buildSpendingTrend', () => {
    it('returns six buckets from oldest to newest', () => {
        const trend = buildSpendingTrend([], 'USD', NOW);

        expect(trend).toHaveLength(6);
        expect(trend.map((point) => point.month)).toEqual([
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
        ]);
        expect(trend.every((point) => point.income === '0')).toBe(true);
        expect(trend.every((point) => point.expenses === '0')).toBe(true);
    });

    it('sums income and expenses per month and ignores other currencies', () => {
        const trend = buildSpendingTrend(
            [
                transaction('income-oct', {
                    amount: '3200',
                    transType: 'INCOME',
                    transactionDate: new Date(2026, 9, 5),
                }),
                transaction('expense-oct', {
                    amount: '450',
                    transactionDate: new Date(2026, 9, 10),
                }),
                transaction('expense-sep', {
                    amount: '200',
                    transactionDate: new Date(2026, 8, 10),
                }),
                transaction('euros', {
                    amount: '999',
                    currency: 'EUR',
                    transactionDate: new Date(2026, 9, 12),
                }),
            ],
            'USD',
            NOW,
        );

        expect(trend[5]).toEqual({
            month: 'Oct',
            income: '3200',
            expenses: '450',
        });
        expect(trend[4]).toEqual({
            month: 'Sep',
            income: '0',
            expenses: '200',
        });
    });
});
