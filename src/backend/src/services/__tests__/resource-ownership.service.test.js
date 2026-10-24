/**
 * Cross-user ownership regression tests for transaction, budget, and category
 * services.
 *
 * The mocked Prisma client simulates Prisma's ownership semantics: reads return
 * a record only when the `where` constraints match the owner, and conditional
 * mutations report a zero count when the owner does not match. This exercises
 * the real query boundary so a reverted owner filter fails these tests.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const OWNER_ID = 1;
const OTHER_ID = 2;

const OWNED_TRANSACTION = {
    id: 't1',
    userId: OWNER_ID,
    amount: 100,
    transType: 'INCOME',
    category: 'Salary',
};

const OWNED_BUDGET = {
    id: 'b1',
    userId: OWNER_ID,
    amount: 500,
    period: 'MONTHLY',
    categoryId: 'c1',
};

const OWNED_CATEGORY = {
    id: 'c1',
    userId: OWNER_ID,
    isSystem: false,
    name: 'Groceries',
};

const SYSTEM_CATEGORY = {
    id: 'c-system',
    userId: null,
    isSystem: true,
    name: 'Uncategorized',
};

const categoryMatchesWhere = (record, where) => {
    if (where.id !== undefined && record.id !== where.id) return false;
    if (Array.isArray(where.OR)) {
        return where.OR.some((condition) => {
            if (condition.isSystem === true) return record.isSystem === true;
            if (condition.userId !== undefined) return record.userId === condition.userId;
            return false;
        });
    }
    if (where.userId !== undefined) return record.userId === where.userId;
    return false;
};

const matchesIdAndUser = (where, record) => where.id === record.id && where.userId === record.userId;

const mockPrisma = {
    transaction: {
        findFirst: jest.fn(({ where }) => (
            matchesIdAndUser(where, OWNED_TRANSACTION) ? OWNED_TRANSACTION : null
        )),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(({ where }) => ({
            count: matchesIdAndUser(where, OWNED_TRANSACTION) ? 1 : 0,
        })),
        deleteMany: jest.fn(({ where }) => ({
            count: matchesIdAndUser(where, OWNED_TRANSACTION) ? 1 : 0,
        })),
    },
    budget: {
        findFirst: jest.fn(({ where }) => (
            matchesIdAndUser(where, OWNED_BUDGET) ? OWNED_BUDGET : null
        )),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(({ where }) => ({
            count: matchesIdAndUser(where, OWNED_BUDGET) ? 1 : 0,
        })),
    },
    category: {
        findFirst: jest.fn(({ where }) => {
            if (categoryMatchesWhere(OWNED_CATEGORY, where)) return OWNED_CATEGORY;
            if (categoryMatchesWhere(SYSTEM_CATEGORY, where)) return SYSTEM_CATEGORY;
            return null;
        }),
        findMany: jest.fn(),
        updateMany: jest.fn(({ where }) => ({
            count: matchesIdAndUser(where, OWNED_CATEGORY) ? 1 : 0,
        })),
        deleteMany: jest.fn(({ where }) => ({
            count: matchesIdAndUser(where, OWNED_CATEGORY) ? 1 : 0,
        })),
    },
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const transactionService = await import('../transaction.service.js');
const budgetService = await import('../budget.service.js');
const categoryService = await import('../category.service.js');

describe('transaction ownership', () => {
    beforeEach(() => jest.clearAllMocks());

    /**
     * A read must be scoped by `{id, userId}` and return null for another owner.
     */
    test('getTransactionById scopes the read by userId', async () => {
        const found = await transactionService.getTransactionById('t1', OWNER_ID);
        const denied = await transactionService.getTransactionById('t1', OTHER_ID);

        expect(mockPrisma.transaction.findFirst).toHaveBeenCalledWith({
            where: { id: 't1', userId: OWNER_ID },
        });
        expect(found).toEqual(OWNED_TRANSACTION);
        expect(denied).toBeNull();
    });

    /**
     * Delete must use a conditional `deleteMany` so a foreign owner matches
     * zero rows and is rejected with 404.
     */
    test('deleteTransactionById atomically enforces ownership', async () => {
        await expect(transactionService.deleteTransactionById('t1', OWNER_ID)).resolves.toBeUndefined();
        expect(mockPrisma.transaction.deleteMany).toHaveBeenCalledWith({
            where: { id: 't1', userId: OWNER_ID },
        });
        await expect(transactionService.deleteTransactionById('t1', OTHER_ID)).rejects.toMatchObject({ statusCode: 404 });
    });

    /**
     * Update must use a conditional `updateMany` and return the caller's own
     * updated record.
     */
    test('updateTransactionRecord atomically enforces ownership', async () => {
        await expect(transactionService.updateTransactionRecord('t1', OWNER_ID, { amount: 200 })).resolves.toBeTruthy();
        expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
            where: { id: 't1', userId: OWNER_ID },
            data: { amount: 200 },
        });
        await expect(transactionService.updateTransactionRecord('t1', OTHER_ID, { amount: 200 })).rejects.toMatchObject({ statusCode: 404 });
    });

    /**
     * Missing records yield null reads and 404 mutations for the owner.
     */
    test('missing transaction records yield null reads and 404 mutations for the owner', async () => {
        await expect(transactionService.getTransactionById('missing-id', OWNER_ID)).resolves.toBeNull();
        await expect(transactionService.updateTransactionRecord('missing-id', OWNER_ID, { amount: 1 })).rejects.toMatchObject({ statusCode: 404 });
        await expect(transactionService.deleteTransactionById('missing-id', OWNER_ID)).rejects.toMatchObject({ statusCode: 404 });
    });
});

describe('budget ownership', () => {
    beforeEach(() => jest.clearAllMocks());

    /**
     * Budget reads are scoped to the owner and return null for another owner.
     */
    test('getBudgetRecord scopes the read by userId', async () => {
        const found = await budgetService.getBudgetRecord(OWNER_ID, 'b1');
        const denied = await budgetService.getBudgetRecord(OTHER_ID, 'b1');

        expect(mockPrisma.budget.findFirst).toHaveBeenCalledWith({
            where: { id: 'b1', userId: OWNER_ID },
            include: { category: true },
        });
        expect(found).toEqual(OWNED_BUDGET);
        expect(denied).toBeNull();
    });

    /**
     * Budget update uses a conditional `updateMany` and a scoped follow-up read.
     */
    test('updateBudgetRecord atomically enforces ownership', async () => {
        await expect(budgetService.updateBudgetRecord('b1', OWNER_ID, { amount: 600 })).resolves.toBeTruthy();
        expect(mockPrisma.budget.updateMany).toHaveBeenCalledWith({
            where: { id: 'b1', userId: OWNER_ID },
            data: { amount: 600 },
        });
        await expect(budgetService.updateBudgetRecord('b1', OTHER_ID, { amount: 600 })).rejects.toMatchObject({ statusCode: 404 });
    });

    /**
     * Budget soft delete uses a conditional `updateMany` constrained by owner.
     */
    test('deleteBudgetRecord (soft delete) atomically enforces ownership', async () => {
        await expect(budgetService.deleteBudgetRecord('b1', OWNER_ID)).resolves.toBeUndefined();
        expect(mockPrisma.budget.updateMany).toHaveBeenCalledWith({
            where: { id: 'b1', userId: OWNER_ID },
            data: { isActive: false },
        });
        await expect(budgetService.deleteBudgetRecord('b1', OTHER_ID)).rejects.toMatchObject({ statusCode: 404 });
    });

    /**
     * Missing budget records yield null reads and 404 mutations for the owner.
     */
    test('missing budget records yield null reads and 404 mutations for the owner', async () => {
        await expect(budgetService.getBudgetRecord(OWNER_ID, 'missing-id')).resolves.toBeNull();
        await expect(budgetService.updateBudgetRecord('missing-id', OWNER_ID, { amount: 1 })).rejects.toMatchObject({ statusCode: 404 });
        await expect(budgetService.deleteBudgetRecord('missing-id', OWNER_ID)).rejects.toMatchObject({ statusCode: 404 });
    });
});

describe('category ownership', () => {
    beforeEach(() => jest.clearAllMocks());

    /**
     * Owned categories are private while system categories are shared.
     */
    test('getCategoryRecord denies another user but allows system categories', async () => {
        const found = await categoryService.getCategoryRecord('c1', OWNER_ID);
        const denied = await categoryService.getCategoryRecord('c1', OTHER_ID);
        const shared = await categoryService.getCategoryRecord('c-system', OTHER_ID);

        expect(found).toEqual(OWNED_CATEGORY);
        expect(denied).toBeNull();
        expect(shared).toEqual(SYSTEM_CATEGORY);
    });

    /**
     * Category update uses a conditional `updateMany` and a scoped follow-up read.
     */
    test('updateCategoryRecord atomically enforces ownership', async () => {
        await expect(categoryService.updateCategoryRecord({ name: 'Food' }, 'c1', OWNER_ID)).resolves.toBeTruthy();
        expect(mockPrisma.category.updateMany).toHaveBeenCalledWith({
            where: { id: 'c1', userId: OWNER_ID },
            data: { name: 'Food' },
        });
        await expect(categoryService.updateCategoryRecord({ name: 'Food' }, 'c1', OTHER_ID)).rejects.toMatchObject({ statusCode: 404 });
    });

    /**
     * Category delete uses a conditional `deleteMany` constrained by owner.
     */
    test('deleteCategoryRecord atomically enforces ownership', async () => {
        await expect(categoryService.deleteCategoryRecord('c1', OWNER_ID)).resolves.toBeUndefined();
        expect(mockPrisma.category.deleteMany).toHaveBeenCalledWith({
            where: { id: 'c1', userId: OWNER_ID },
        });
        await expect(categoryService.deleteCategoryRecord('c1', OTHER_ID)).rejects.toMatchObject({ statusCode: 404 });
    });

    /**
     * Missing category records yield null reads and 404 mutations for the owner.
     */
    test('missing category records yield null reads and 404 mutations for the owner', async () => {
        await expect(categoryService.getCategoryRecord('missing-id', OWNER_ID)).resolves.toBeNull();
        await expect(categoryService.updateCategoryRecord({ name: 'Food' }, 'missing-id', OWNER_ID)).rejects.toMatchObject({ statusCode: 404 });
        await expect(categoryService.deleteCategoryRecord('missing-id', OWNER_ID)).rejects.toMatchObject({ statusCode: 404 });
    });

    /**
     * Category conflict and usage counts remain scoped to the owner.
     */
    test('category conflict and usage counts are scoped to the owner', async () => {
        mockPrisma.budget.count.mockResolvedValue(0);
        mockPrisma.transaction.count.mockResolvedValue(0);

        await categoryService.countBudget(OWNER_ID, 'c1');
        await categoryService.countTransaction(OWNER_ID, 'Groceries');

        expect(mockPrisma.budget.count).toHaveBeenCalledWith({
            where: { userId: OWNER_ID, categoryId: 'c1' },
        });
        expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
            where: {
                userId: OWNER_ID,
                category: { equals: 'Groceries', mode: 'insensitive' },
            },
        });
    });
});
