/**
 * Unit tests for the dashboard data-mapping layer.
 *
 * These tests use local `Date` values as the reference `now` so the period
 * filtering assertions do not depend on the machine's timezone.
 */

import { buildDashboardData, type DashboardTransaction } from '@/utils/dashboardData';
import { buildBoundsForSelection } from '@/utils/dashboardPeriod';
import type { PeriodBounds } from '@/utils/dashboardPeriod';

const NOW = new Date(2026, 9, 15, 12);

/**
 * Resolve current and previous bounds for the This Month preset.
 *
 * @returns The bounds pair used by the test fixtures.
 */
const thisMonthBounds = (): { current: PeriodBounds; previous: PeriodBounds } =>
    buildBoundsForSelection({ kind: 'preset', period: 'This Month' }, NOW);

/**
 * Build a minimal transaction fixture.
 *
 * @param id - The record id.
 * @param overrides - Fields merged over the fixture defaults.
 * @returns A dashboard transaction fixture.
 */
const transaction = (
    id: string,
    overrides: Partial<DashboardTransaction> = {},
): DashboardTransaction => ({
    id,
    amount: '100',
    currency: 'USD',
    transType: 'EXPENSE',
    category: 'Food',
    transactionDate: new Date(2026, 9, 10),
    ...overrides,
});

describe('buildDashboardData', () => {
    it('maps a period into income, expenses, balance, and comparison', () => {
        const { current, previous } = thisMonthBounds();
        const result = buildDashboardData(
            [
                transaction('income', {
                    amount: '3200',
                    transType: 'INCOME',
                    category: 'Salary',
                    transactionDate: new Date(2026, 9, 5),
                }),
                transaction('food', {
                    amount: '450',
                    category: 'Food',
                    transactionDate: new Date(2026, 9, 10),
                }),
                transaction('transport', {
                    amount: '240',
                    category: 'Transport',
                    transactionDate: new Date(2026, 9, 11),
                }),
                transaction('shopping', {
                    amount: '180',
                    category: 'Shopping',
                    transactionDate: new Date(2026, 9, 12),
                }),
                transaction('bills', {
                    amount: '150',
                    category: 'Bills',
                    transactionDate: new Date(2026, 9, 13),
                }),
                transaction('other', {
                    amount: '214',
                    category: 'Other',
                    transactionDate: new Date(2026, 9, 14),
                }),
                transaction('previous', {
                    amount: '1100',
                    category: 'Food',
                    transactionDate: new Date(2026, 8, 20),
                }),
                transaction('euros', {
                    amount: '999',
                    currency: 'EUR',
                    category: 'Food',
                    transactionDate: new Date(2026, 9, 12),
                }),
            ],
            {
                firstname: 'John',
                avatar: {
                    url: 'http://localhost/api/v1/user/avatar',
                    initials: 'JD',
                    isDefault: false,
                },
            },
            'USD',
            current,
            previous,
            NOW,
        );

        expect(result.firstName).toBe('John');
        expect(result.income).toBe('3200');
        expect(result.expenses).toBe('1234');
        expect(result.remaining).toBe('1966');
        expect(result.totalSpending).toBe('1234');
        expect(result.monthlySpending).toBe('1234');
        expect(result.spendingGoal).toBe('1000');
        expect(result.spendingChangePercent).toBe(12);
        expect(result.avatarUri).toBe('http://localhost/api/v1/user/avatar');
        expect(result.categories.map((category) => category.name)).toEqual([
            'Food',
            'Transport',
            'Other',
            'Shopping',
            'Bills',
        ]);
        expect(result.categories[0]).toEqual({
            name: 'Food',
            amount: '450',
            color: '#FF8B31',
        });
    });

    it('returns zeros and an unavailable comparison for an empty period', () => {
        const { current, previous } = thisMonthBounds();
        const result = buildDashboardData(
            [],
            { firstname: 'Jane' },
            'USD',
            current,
            previous,
            NOW,
        );

        expect(result.income).toBe('0');
        expect(result.expenses).toBe('0');
        expect(result.remaining).toBe('0');
        expect(result.totalSpending).toBe('0');
        expect(result.monthlySpending).toBe('0');
        expect(result.spendingChangePercent).toBeNull();
        expect(result.categories).toEqual([]);
        expect(result.avatarUri).toBeUndefined();
    });

    it('groups missing category names as Uncategorized', () => {
        const { current, previous } = thisMonthBounds();
        const result = buildDashboardData(
            [
                transaction('blank', { amount: '50', category: '' }),
                transaction('null', { amount: '25', category: null }),
            ],
            { firstname: 'Jane' },
            'USD',
            current,
            previous,
            NOW,
        );

        expect(result.categories).toEqual([
            { name: 'Uncategorized', amount: '75', color: '#FF8B31' },
        ]);
    });

    it('excludes refunded categories from positive chart segments', () => {
        const { current, previous } = thisMonthBounds();
        const result = buildDashboardData(
            [
                transaction('refund', {
                    amount: '-50',
                    category: 'Food',
                    transactionDate: new Date(2026, 9, 10),
                }),
                transaction('food', {
                    amount: '200',
                    category: 'Food',
                    transactionDate: new Date(2026, 9, 11),
                }),
            ],
            { firstname: 'Jane' },
            'USD',
            current,
            previous,
            NOW,
        );

        expect(result.totalSpending).toBe('150');
        expect(result.categories).toEqual([
            { name: 'Food', amount: '150', color: '#FF8B31' },
        ]);
    });

    it('maps a custom inclusive date range', () => {
        const { current, previous } = buildBoundsForSelection(
            { kind: 'range', start: new Date(2026, 9, 10), end: new Date(2026, 9, 12) },
            NOW,
        );
        const result = buildDashboardData(
            [
                transaction('in-range', {
                    amount: '75',
                    category: 'Food',
                    transactionDate: new Date(2026, 9, 11),
                }),
                transaction('before-range', {
                    amount: '500',
                    category: 'Food',
                    transactionDate: new Date(2026, 9, 9),
                }),
                transaction('after-range', {
                    amount: '300',
                    category: 'Food',
                    transactionDate: new Date(2026, 9, 13),
                }),
            ],
            { firstname: 'Jane' },
            'USD',
            current,
            previous,
            NOW,
        );

        expect(result.totalSpending).toBe('75');
        expect(result.monthlySpending).toBe('875');
    });
});
