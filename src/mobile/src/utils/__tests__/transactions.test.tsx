/**
 * Unit tests for the pure transaction presentation and validation helpers.
 *
 * These run under Jest and exercise search/filter, day grouping, signed amount
 * formatting, category filtering, and form validation without a renderer.
 */

import type {
    Category,
    TransactionRecord,
} from '@/types/transaction';
import {
    filterCategoriesForType,
    filterTransactions,
    formatSignedAmount,
    groupTransactionsByDay,
    validateTransactionForm,
} from '@/utils/transactions';

/**
 * Build a transaction fixture.
 *
 * @param overrides - Fields merged over the defaults.
 * @returns A transaction record.
 */
const transaction = (
    overrides: Partial<TransactionRecord> = {},
): TransactionRecord => ({
    id: 'tx-1',
    userId: 1,
    amount: '10.00',
    currency: 'USD',
    transType: 'EXPENSE',
    category: 'Food',
    categoryId: 'sys.food',
    description: 'Lunch',
    transactionDate: '2026-10-27T12:00:00.000Z',
    ...overrides,
});

describe('filterTransactions', () => {
    const rows = [
        transaction({ id: 'a', description: 'Coffee', category: 'Food', transType: 'EXPENSE' }),
        transaction({ id: 'b', description: 'Salary', category: 'Income', transType: 'INCOME' }),
    ];

    it('keeps every transaction for the All filter and empty query', () => {
        expect(filterTransactions(rows, 'ALL', '')).toHaveLength(2);
    });

    it('filters by transaction direction', () => {
        expect(filterTransactions(rows, 'INCOME', '')).toHaveLength(1);
        expect(filterTransactions(rows, 'INCOME', '')[0].id).toBe('b');
    });

    it('searches the title and category case-insensitively', () => {
        expect(filterTransactions(rows, 'ALL', 'COFFEE')).toHaveLength(1);
        expect(filterTransactions(rows, 'ALL', 'food')).toHaveLength(1);
        expect(filterTransactions(rows, 'ALL', 'missing')).toHaveLength(0);
    });
});

describe('groupTransactionsByDay', () => {
    const now = new Date('2026-10-27T10:00:00.000Z');

    it('produces Today, Yesterday, and a formatted date section', () => {
        const rows = [
            transaction({
                id: 'today',
                transactionDate: '2026-10-27T09:00:00.000Z',
            }),
            transaction({
                id: 'yesterday',
                transactionDate: '2026-10-26T09:00:00.000Z',
            }),
            transaction({
                id: 'older',
                transactionDate: '2026-10-20T09:00:00.000Z',
            }),
        ];

        const sections = groupTransactionsByDay(rows, now, 'en-US');
        expect(sections.map((section) => section.title)).toEqual([
            'Today',
            'Yesterday',
            expect.any(String),
        ]);
        expect(sections[0].data[0].id).toBe('today');
    });

    it('sorts transactions newest first within a day', () => {
        const rows = [
            transaction({
                id: 'earlier',
                transactionDate: '2026-10-27T08:00:00.000Z',
            }),
            transaction({
                id: 'later',
                transactionDate: '2026-10-27T09:00:00.000Z',
            }),
        ];

        const sections = groupTransactionsByDay(rows, now, 'en-US');
        expect(sections[0].data.map((row) => row.id)).toEqual(['later', 'earlier']);
    });
});

describe('formatSignedAmount', () => {
    it('prefixes income with + and expenses with -', () => {
        expect(formatSignedAmount('12.5', 'INCOME', 'en-US', 'USD')).toContain('+$12.50');
        expect(formatSignedAmount('12.5', 'EXPENSE', 'en-US', 'USD')).toContain('-$12.50');
    });

    it('ignores a stored negative sign', () => {
        expect(formatSignedAmount('-12.5', 'INCOME', 'en-US', 'USD')).toContain('+$12.50');
    });
});

describe('filterCategoriesForType', () => {
    const categories: Category[] = [
        { id: 'sys.food', name: 'Food' },
        { id: 'sys.salary', name: 'Salary' },
        { id: 'user-custom', name: 'Custom' },
    ];

    it('keeps known system categories only for the selected direction', () => {
        const expenses = filterCategoriesForType(categories, 'EXPENSE');
        expect(expenses.some((category) => category.id === 'sys.food')).toBe(true);
        expect(expenses.some((category) => category.id === 'sys.salary')).toBe(false);
    });

    it('keeps user categories for both directions', () => {
        const income = filterCategoriesForType(categories, 'INCOME');
        expect(income.some((category) => category.id === 'user-custom')).toBe(true);
    });
});

describe('validateTransactionForm', () => {
    it('accepts a positive amount, category, and short description', () => {
        const errors = validateTransactionForm(
            { amount: '12.50', categoryId: 'sys.food', description: 'Lunch' },
            'en-US',
        );
        expect(errors).toEqual({});
    });

    it('rejects missing and invalid amounts', () => {
        expect(
            validateTransactionForm({ amount: '', categoryId: 'sys.food' }, 'en-US').amount,
        ).toBeTruthy();
        expect(
            validateTransactionForm({ amount: '0', categoryId: 'sys.food' }, 'en-US').amount,
        ).toBeTruthy();
    });

    it('requires a category and bounds the description', () => {
        expect(
            validateTransactionForm({ amount: '1', categoryId: '' }, 'en-US').category,
        ).toBeTruthy();
        expect(
            validateTransactionForm(
                { amount: '1', categoryId: 'sys.food', description: 'x'.repeat(501) },
                'en-US',
            ).description,
        ).toBeTruthy();
    });

    it('accepts up to four decimal places', () => {
        expect(
            validateTransactionForm({ amount: '1.2345', categoryId: 'sys.food' }, 'en-US'),
        ).toEqual({});
    });
});

