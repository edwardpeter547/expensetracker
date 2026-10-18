/**
 * Cross-user ownership regression tests for transaction, budget, and category
 * services.
 *
 * The mocked Prisma client simulates Prisma's ownership semantics: reads return
 * a record only when the `where` constraints match the owner, and single-record
 * mutations throw the P2025 "record not found" error when the owner does not
 * match. This exercises the real query boundary so a reverted owner filter
 * fails these tests.
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

const prismaNotFound = () => {
    const error = new Error('Record to update/delete does not exist');
    error.code = 'P2025';
    return error;
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

const mockPrisma = {
    transaction: {
        findUnique: jest.fn(({ where }) => (
            where.id === OWNED_TRANSACTION.id && where.userId === OWNED_TRANSACTION.userId
                ? OWNED_TRANSACTION
                : null
        )),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(({ where, data }) => {
            if (where.id !== OWNED_TRANSACTION.id || where.userId !== OWNED_TRANSACTION.userId) throw prismaNotFound();
            return { ...OWNED_TRANSACTION, ...data };
        }),
        delete: jest.fn(({ where }) => {
            if (where.id !== OWNED_TRANSACTION.id || where.userId !== OWNED_TRANSACTION.userId) throw prismaNotFound();
            return OWNED_TRANSACTION;
        }),
    },
    budget: {
        findFirst: jest.fn(({ where }) => (
            where.id === OWNED_BUDGET.id && where.userId === OWNED_BUDGET.userId
                ? OWNED_BUDGET
                : null
        )),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(({ where, data }) => {
            if (where.id !== OWNED_BUDGET.id || where.userId !== OWNED_BUDGET.userId) throw prismaNotFound();
            return { ...OWNED_BUDGET, ...data };
        }),
    },
    category: {
        findFirst: jest.fn(({ where }) => {
            if (categoryMatchesWhere(OWNED_CATEGORY, where)) return OWNED_CATEGORY;
            if (categoryMatchesWhere(SYSTEM_CATEGORY, where)) return SYSTEM_CATEGORY;
            return null;
        }),
        findMany: jest.fn(),
        update: jest.fn(({ where, data }) => {
            if (where.id !== OWNED_CATEGORY.id || where.userId !== OWNED_CATEGORY.userId) throw prismaNotFound();
            return { ...OWNED_CATEGORY, ...data };
        }),
        delete: jest.fn(({ where }) => {
            if (where.id !== OWNED_CATEGORY.id || where.userId !== OWNED_CATEGORY.userId) throw prismaNotFound();
            return OWNED_CATEGORY;
        }),
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

    test('getTransactionById scopes the read by userId', async () => {
        const found = await transactionService.getTransactionById('t1', OWNER_ID);
        const denied = await transactionService.getTransactionById('t1', OTHER_ID);

        expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
            where: { id: 't1', userId: OWNER_ID },
        });
        expect(found).toEqual(OWNED_TRANSACTION);
        expect(denied).toBeNull();
    });

    test('deleteTransactionById atomically enforces ownership', async () => {
        await expect(transactionService.deleteTransactionById('t1', OWNER_ID)).resolves.toBeTruthy();
        expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
            where: { id: 't1', userId: OWNER_ID },
        });
        await expect(transactionService.deleteTransactionById('t1', OTHER_ID)).rejects.toMatchObject({ code: 'P2025' });
    });

    test('updateTransactionRecord atomically enforces ownership', async () => {
        await expect(transactionService.updateTransactionRecord('t1', OWNER_ID, { amount: 200 })).resolves.toBeTruthy();
        expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 't1', userId: OWNER_ID } })
        );
        await expect(transactionService.updateTransactionRecord('t1', OTHER_ID, { amount: 200 })).rejects.toMatchObject({ code: 'P2025' });
    });

    test('missing transaction records yield null reads and P2025 mutations for the owner', async () => {
        await expect(transactionService.getTransactionById('missing-id', OWNER_ID)).resolves.toBeNull();
        await expect(transactionService.updateTransactionRecord('missing-id', OWNER_ID, { amount: 1 })).rejects.toMatchObject({ code: 'P2025' });
        await expect(transactionService.deleteTransactionById('missing-id', OWNER_ID)).rejects.toMatchObject({ code: 'P2025' });
    });
});

describe('budget ownership', () => {
    beforeEach(() => jest.clearAllMocks());

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

    test('updateBudgetRecord atomically enforces ownership', async () => {
        await expect(budgetService.updateBudgetRecord('b1', OWNER_ID, { amount: 600 })).resolves.toBeTruthy();
        expect(mockPrisma.budget.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'b1', userId: OWNER_ID } })
        );
        await expect(budgetService.updateBudgetRecord('b1', OTHER_ID, { amount: 600 })).rejects.toMatchObject({ code: 'P2025' });
    });

    test('deleteBudgetRecord (soft delete) atomically enforces ownership', async () => {
        await expect(budgetService.deleteBudgetRecord('b1', OWNER_ID)).resolves.toBeUndefined();
        expect(mockPrisma.budget.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'b1', userId: OWNER_ID } })
        );
        await expect(budgetService.deleteBudgetRecord('b1', OTHER_ID)).rejects.toMatchObject({ code: 'P2025' });
    });

    test('missing budget records yield null reads and P2025 mutations for the owner', async () => {
        await expect(budgetService.getBudgetRecord(OWNER_ID, 'missing-id')).resolves.toBeNull();
        await expect(budgetService.updateBudgetRecord('missing-id', OWNER_ID, { amount: 1 })).rejects.toMatchObject({ code: 'P2025' });
        await expect(budgetService.deleteBudgetRecord('missing-id', OWNER_ID)).rejects.toMatchObject({ code: 'P2025' });
    });
});

describe('category ownership', () => {
    beforeEach(() => jest.clearAllMocks());

    test('getCategoryRecord denies another user but allows system categories', async () => {
        const found = await categoryService.getCategoryRecord('c1', OWNER_ID);
        const denied = await categoryService.getCategoryRecord('c1', OTHER_ID);
        const shared = await categoryService.getCategoryRecord('c-system', OTHER_ID);

        expect(found).toEqual(OWNED_CATEGORY);
        expect(denied).toBeNull();
        expect(shared).toEqual(SYSTEM_CATEGORY);
    });

    test('updateCategoryRecord atomically enforces ownership', async () => {
        await expect(categoryService.updateCategoryRecord({ name: 'Food' }, 'c1', OWNER_ID)).resolves.toBeTruthy();
        expect(mockPrisma.category.update).toHaveBeenCalledWith({
            where: { id: 'c1', userId: OWNER_ID },
            data: { name: 'Food' },
        });
        await expect(categoryService.updateCategoryRecord({ name: 'Food' }, 'c1', OTHER_ID)).rejects.toMatchObject({ code: 'P2025' });
    });

    test('deleteCategoryRecord atomically enforces ownership', async () => {
        await expect(categoryService.deleteCategoryRecord('c1', OWNER_ID)).resolves.toBeTruthy();
        expect(mockPrisma.category.delete).toHaveBeenCalledWith({
            where: { id: 'c1', userId: OWNER_ID },
        });
        await expect(categoryService.deleteCategoryRecord('c1', OTHER_ID)).rejects.toMatchObject({ code: 'P2025' });
    });

    test('missing category records yield null reads and P2025 mutations for the owner', async () => {
        await expect(categoryService.getCategoryRecord('missing-id', OWNER_ID)).resolves.toBeNull();
        await expect(categoryService.updateCategoryRecord({ name: 'Food' }, 'missing-id', OWNER_ID)).rejects.toMatchObject({ code: 'P2025' });
        await expect(categoryService.deleteCategoryRecord('missing-id', OWNER_ID)).rejects.toMatchObject({ code: 'P2025' });
    });

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
