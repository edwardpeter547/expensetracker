/**
 * Demonstration fixtures for the Transactions and Add Transaction screens.
 *
 * These values extend the existing dashboard demo-data system rather than
 * introducing a second toggle: the single `DEMO_MODE` switch in
 * `dashboardDemo.ts` remains the source of truth, and consumers import it
 * from there. The mutable list below supports the demo write path so a
 * transaction created while demo mode is on never touches the live backend.
 */

import type {
    Budget,
    Category,
    TransactionRecord,
    TransactionType,
} from '@/types/transaction';

/**
 * Build a local ISO timestamp `days` days before the current instant.
 *
 * @param {number} days The number of days to subtract.
 * @param {number} hour The local hour to use.
 * @param {number} minute The local minute to use.
 * @returns {string} An ISO 8601 timestamp.
 */
const isoDaysAgo = (days: number, hour: number, minute: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
};

/** Approved stable system categories used by the demo form. */
export const DEMO_CATEGORIES: Category[] = [
    { id: 'sys.salary', name: 'Salary', icon: 'cash-outline', isSystem: true, userId: null },
    { id: 'sys.investment', name: 'Investment', icon: 'trending-up', isSystem: true, userId: null },
    { id: 'sys.freelancing', name: 'Freelancing', icon: 'briefcase-outline', isSystem: true, userId: null },
    { id: 'sys.gifts', name: 'Gifts', icon: 'gift-outline', isSystem: true, userId: null },
    { id: 'sys.bonus', name: 'Bonus', icon: 'star-outline', isSystem: true, userId: null },
    { id: 'sys.food', name: 'Food', icon: 'restaurant-outline', isSystem: true, userId: null },
    { id: 'sys.transport', name: 'Transport', icon: 'car-outline', isSystem: true, userId: null },
    { id: 'sys.shopping', name: 'Shopping', icon: 'cart-outline', isSystem: true, userId: null },
    { id: 'sys.bills', name: 'Bills', icon: 'receipt-outline', isSystem: true, userId: null },
    { id: 'sys.entertainment', name: 'Entertainment', icon: 'game-controller-outline', isSystem: true, userId: null },
    { id: 'sys.health', name: 'Health', icon: 'heart-outline', isSystem: true, userId: null },
];

/** Representative transactions matching the approved list's density. */
export const DEMO_TRANSACTIONS: TransactionRecord[] = [
    {
        id: 'demo-tx-01',
        userId: 1,
        amount: '4.5',
        currency: 'USD',
        transType: 'EXPENSE',
        category: 'Food',
        categoryId: 'sys.food',
        description: 'Coffee Shop',
        receiptUrl: null,
        location: null,
        transactionDate: isoDaysAgo(0, 8, 25),
        merchant: {
            name: 'Brew & Bean',
            address: '18 High Street',
            purchaseTime: '08:25',
            paymentMethod: 'Debit card',
            reference: 'BB-1048',
        },
        items: [
            { id: 'item-coffee-1', name: 'Cappuccino', quantity: '1', unitPrice: '4.50', category: 'Food' },
        ],
        receipt: {
            id: 'receipt-demo-01',
            source: 'scanner',
            name: 'brew-and-bean-receipt.jpg',
            kind: 'image',
            mimeType: 'image/jpeg',
            sizeBytes: 148_000,
            thumbnailUri: null,
        },
    },
    {
        id: 'demo-tx-02',
        userId: 1,
        amount: '12.4',
        currency: 'USD',
        transType: 'EXPENSE',
        category: 'Transport',
        categoryId: 'sys.transport',
        description: 'Uber',
        receiptUrl: null,
        location: null,
        transactionDate: isoDaysAgo(0, 7, 40),
    },
    {
        id: 'demo-tx-03',
        userId: 1,
        amount: '3200',
        currency: 'USD',
        transType: 'INCOME',
        category: 'Salary',
        categoryId: 'sys.salary',
        description: 'Monthly Salary',
        receiptUrl: null,
        location: null,
        transactionDate: isoDaysAgo(1, 9, 0),
    },
    {
        id: 'demo-tx-04',
        userId: 1,
        amount: '38',
        currency: 'USD',
        transType: 'EXPENSE',
        category: 'Shopping',
        categoryId: 'sys.shopping',
        description: 'Groceries',
        receiptUrl: null,
        location: null,
        transactionDate: isoDaysAgo(1, 16, 10),
        merchant: {
            name: 'FreshMart',
            address: '4 Market Lane',
            purchaseTime: '16:10',
            paymentMethod: 'Credit card',
            reference: 'FM-2231',
        },
        items: [
            { id: 'item-grocery-1', name: 'Milk', quantity: '2', unitPrice: '1.20', category: 'Food' },
            { id: 'item-grocery-2', name: 'Bread', quantity: '1', unitPrice: '2.10', category: 'Food' },
            { id: 'item-grocery-3', name: 'Eggs', quantity: '1', unitPrice: '3.40', category: 'Food' },
        ],
    },
    {
        id: 'demo-tx-05',
        userId: 1,
        amount: '120',
        currency: 'USD',
        transType: 'EXPENSE',
        category: 'Bills',
        categoryId: 'sys.bills',
        description: 'Electricity Bill',
        receiptUrl: null,
        location: null,
        transactionDate: isoDaysAgo(2, 10, 5),
    },
    {
        id: 'demo-tx-06',
        userId: 1,
        amount: '250',
        currency: 'USD',
        transType: 'INCOME',
        category: 'Freelancing',
        categoryId: 'sys.freelancing',
        description: 'Design Invoice',
        receiptUrl: null,
        location: null,
        transactionDate: isoDaysAgo(4, 14, 30),
    },
];

/** Demonstration budgets used by the optional budget selector. */
export const DEMO_BUDGETS: Budget[] = [
    {
        id: 'demo-budget-food',
        amount: '300',
        currency: 'USD',
        period: 'MONTHLY',
        startDate: new Date().toISOString(),
        endDate: null,
        alertThreshold: 80,
        isActive: true,
        userId: 1,
        categoryId: 'sys.food',
        category: DEMO_CATEGORIES.find((category) => category.id === 'sys.food') ?? null,
        spent: '54.9',
        remaining: '245.1',
        percentage: 18,
        isOverBudget: false,
    },
    {
        id: 'demo-budget-transport',
        amount: '150',
        currency: 'USD',
        period: 'MONTHLY',
        startDate: new Date().toISOString(),
        endDate: null,
        alertThreshold: 80,
        isActive: true,
        userId: 1,
        categoryId: 'sys.transport',
        category: DEMO_CATEGORIES.find((category) => category.id === 'sys.transport') ?? null,
        spent: '12.4',
        remaining: '137.6',
        percentage: 8,
        isOverBudget: false,
    },
];

/** Mutable demo transaction store; appends appear first in the list. */
let demoTransactions: TransactionRecord[] = [...DEMO_TRANSACTIONS];

/** Fields supplied when a demo transaction is created. */
export interface DemoTransactionDraft {
    amount: string;
    type: TransactionType;
    category: Category;
    date: string;
    currency: string;
    description?: string;
}

/**
 * Return the current demo transaction list.
 *
 * @returns {TransactionRecord[]} The current in-memory demo transactions.
 */
export const getDemoTransactions = (): TransactionRecord[] => demoTransactions;

/**
 * Append a locally-created demo transaction without touching the backend.
 *
 * @param {DemoTransactionDraft} draft The entered transaction fields.
 * @returns {TransactionRecord} The created demo record.
 */
export const addDemoTransaction = (draft: DemoTransactionDraft): TransactionRecord => {
    const now = new Date().toISOString();
    const record: TransactionRecord = {
        id: `demo-tx-${Date.now()}`,
        userId: 1,
        amount: draft.amount,
        currency: draft.currency,
        transType: draft.type,
        category: draft.category.name,
        categoryId: draft.category.id,
        description: draft.description?.trim() || null,
        receiptUrl: null,
        location: null,
        transactionDate: draft.date,
        createdAt: now,
        updatedAt: now,
    };

    demoTransactions = [record, ...demoTransactions];
    return record;
};

/**
 * Return one demo transaction by id.
 *
 * @param {string} id The transaction id.
 * @returns {TransactionRecord|undefined} The matching transaction.
 */
export const getDemoTransaction = (id: string): TransactionRecord | undefined =>
    demoTransactions.find((transaction) => transaction.id === id);

/**
 * Update a demo transaction in place without touching the backend.
 *
 * @param {string} id The transaction id.
 * @param {Partial<TransactionRecord>} patch The fields to update.
 * @returns {TransactionRecord|null} The updated transaction or null.
 */
export const updateDemoTransaction = (
    id: string,
    patch: Partial<TransactionRecord>,
): TransactionRecord | null => {
    let updated: TransactionRecord | null = null;
    demoTransactions = demoTransactions.map((transaction) => {
        if (transaction.id !== id) return transaction;
        updated = { ...transaction, ...patch, updatedAt: new Date().toISOString() };
        return updated;
    });
    return updated;
};

/**
 * Remove a demo transaction without touching the backend.
 *
 * @param {string} id The transaction id.
 * @returns {boolean} True when a transaction was removed.
 */
export const deleteDemoTransaction = (id: string): boolean => {
    const previousLength = demoTransactions.length;
    demoTransactions = demoTransactions.filter((transaction) => transaction.id !== id);
    return demoTransactions.length < previousLength;
};

/**
 * Reset the demo store back to its initial fixture.
 *
 * Useful for tests and for future demo-session resets.
 */
export const resetDemoTransactions = (): void => {
    demoTransactions = [...DEMO_TRANSACTIONS];
};

/** Mutable demo category store; starts from the shared system fixtures. */
let demoCategories: Category[] = [...DEMO_CATEGORIES];

/**
 * Return the current demo category list.
 *
 * @returns {Category[]} The current in-memory demo categories.
 */
export const getDemoCategories = (): Category[] => demoCategories;

/**
 * Append a locally-created demo custom category without touching the backend.
 *
 * @param {{name: string}} draft The entered category name.
 * @returns {Category} The created demo category.
 */
export const addDemoCategory = (draft: { name: string }): Category => {
    const category: Category = {
        id: `demo-cat-${Date.now()}`,
        name: draft.name,
        icon: 'pricetag-outline',
        isSystem: false,
        userId: 1,
    };
    demoCategories = [...demoCategories, category];
    return category;
};

/**
 * Rename a demo custom category without touching the backend.
 *
 * System categories are immutable and therefore never match this path.
 *
 * @param {string} id The category id.
 * @param {{name: string}} draft The updated category name.
 * @returns {Category|null} The updated category, or null when not found.
 */
export const updateDemoCategory = (
    id: string,
    draft: { name: string },
): Category | null => {
    let updated: Category | null = null;
    demoCategories = demoCategories.map((category) => {
        if (category.id !== id || category.isSystem) return category;
        updated = { ...category, name: draft.name };
        return updated;
    });
    return updated;
};

/**
 * Remove a demo custom category without touching the backend.
 *
 * @param {string} id The category id.
 * @returns {boolean} True when a custom category was removed.
 */
export const deleteDemoCategory = (id: string): boolean => {
    const target = demoCategories.find((category) => category.id === id);
    if (!target || target.isSystem) return false;

    const previousLength = demoCategories.length;
    demoCategories = demoCategories.filter((category) => category.id !== id);
    return demoCategories.length < previousLength;
};

/**
 * Reset the demo category store back to its initial system fixtures.
 *
 * @returns {void}
 */
export const resetDemoCategories = (): void => {
    demoCategories = [...DEMO_CATEGORIES];
};
