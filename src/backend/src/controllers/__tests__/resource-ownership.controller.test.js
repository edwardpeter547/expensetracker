/**
 * Controller-level ownership regression tests for transactions, budgets, and
 * categories.
 *
 * These tests verify that controllers derive `userId` from the trusted
 * authentication context (`request.user`) rather than any client-supplied
 * value, and that missing or non-owned records produce a 404 rather than a
 * successful response.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const prismaNotFound = () => {
    const error = new Error('Record to update/delete does not exist');
    error.code = 'P2025';
    return error;
};

const mockTransactionService = {
    getTransactionsbyUser: jest.fn(),
    getTransactionById: jest.fn(),
    createTransactionRecord: jest.fn(),
    deleteTransactionById: jest.fn(),
    updateTransactionRecord: jest.fn(),
};

const mockBudgetService = {
    addBudget: jest.fn(),
    budgetExists: jest.fn(),
    checkBudget: jest.fn(),
    deleteBudgetRecord: jest.fn(),
    getBudgetList: jest.fn(),
    getBudgetRecord: jest.fn(),
    getBudgetWithSpending: jest.fn(),
    updateBudgetRecord: jest.fn(),
};

const mockCategoryService = {
    checkCategoryById: jest.fn(),
    checkCategoryByName: jest.fn(),
    checkConflict: jest.fn(),
    countBudget: jest.fn(),
    countTransaction: jest.fn(),
    createCategoryRecord: jest.fn(),
    deleteCategoryRecord: jest.fn(),
    getCategoryList: jest.fn(),
    getCategoryRecord: jest.fn(),
    updateCategoryRecord: jest.fn(),
};

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

jest.unstable_mockModule(path.join(servicesDirectory, 'transaction.service.js'), () => mockTransactionService);
jest.unstable_mockModule(path.join(servicesDirectory, 'budget.service.js'), () => mockBudgetService);
jest.unstable_mockModule(path.join(servicesDirectory, 'category.service.js'), () => mockCategoryService);

const transactionController = await import('../transaction.controller.js');
const budgetController = await import('../budget.controller.js');
const categoryController = await import('../category.controller.js');

const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const sendStatus = jest.fn();
    return { json, status, sendStatus };
};

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('transaction controller ownership', () => {
    beforeEach(() => jest.clearAllMocks());

    test('getTransaction uses request.user id and returns the record for the owner', async () => {
        mockTransactionService.getTransactionById.mockResolvedValue({ id: 't1', userId: 1 });
        const { json, status } = makeResponse();
        const req = { params: { id: 't1' }, body: { userId: 999 }, user: { id: 1 } };

        await transactionController.getTransaction(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockTransactionService.getTransactionById).toHaveBeenCalledWith('t1', 1);
        expect(status).toHaveBeenCalledWith(200);
        expect(json.mock.calls[0][0].data.transaction).toEqual({ id: 't1', userId: 1 });
    });

    test('getTransaction returns 404 for a non-owned transaction', async () => {
        mockTransactionService.getTransactionById.mockResolvedValue(null);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { params: { id: 't1' }, body: { userId: 999 }, user: { id: 2 } };

        await transactionController.getTransaction(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });

    test('deleteTransaction enforces ownership through the atomic service call', async () => {
        mockTransactionService.deleteTransactionById.mockResolvedValue({ id: 't1' });
        const { json, status } = makeResponse();
        const req = { params: { id: 't1' }, user: { id: 1 } };

        await transactionController.deleteTransaction(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockTransactionService.deleteTransactionById).toHaveBeenCalledWith('t1', 1);
        expect(status).toHaveBeenCalledWith(200);
    });

    test('deleteTransaction propagates the not-found error for a non-owned record', async () => {
        mockTransactionService.deleteTransactionById.mockRejectedValue(prismaNotFound());
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { params: { id: 't1' }, user: { id: 2 } };

        await transactionController.deleteTransaction(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toMatchObject({ code: 'P2025' });
    });

    test('updateTransaction passes the trusted userId to the service', async () => {
        mockTransactionService.updateTransactionRecord.mockResolvedValue({ id: 't1' });
        const { json, status } = makeResponse();
        const req = { params: { id: 't1' }, body: { amount: 200, userId: 999 }, user: { id: 1 } };

        await transactionController.updateTransaction(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockTransactionService.updateTransactionRecord).toHaveBeenCalledWith('t1', 1, expect.any(Object));
        expect(status).toHaveBeenCalledWith(200);
    });

    /**
     * Transaction creation maps the corrected receipt field name, derives the
     * user from auth context, and responds 201 with the standard envelope.
     */
    test('createTransaction maps receiptUrl and responds 201', async () => {
        mockTransactionService.createTransactionRecord.mockResolvedValue({ id: 't1' });
        const { json, status } = makeResponse();
        const req = {
            body: {
                amount: 100,
                type: 'EXPENSE',
                category: 'Food',
                receiptUrl: 'https://example.com/receipt.png',
                date: '2026-01-01T00:00:00.000Z',
            },
            user: { id: 1 },
        };

        await transactionController.createTransaction(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockTransactionService.createTransactionRecord).toHaveBeenCalledWith(expect.objectContaining({
            userId: 1,
            transType: 'EXPENSE',
            receiptUrl: 'https://example.com/receipt.png',
        }));
        expect(status).toHaveBeenCalledWith(201);
        expect(json.mock.calls[0][0].errors).toBeNull();
    });
});

describe('budget controller ownership', () => {
    beforeEach(() => jest.clearAllMocks());

    test('getBudget calls the corrected getBudgetRecord with the trusted userId', async () => {
        mockBudgetService.getBudgetRecord.mockResolvedValue({ id: 'b1', userId: 1 });
        const { json, status } = makeResponse();
        const req = { params: { id: 'b1' }, user: { id: 1 } };

        await budgetController.getBudget(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockBudgetService.getBudgetRecord).toHaveBeenCalledWith(1, 'b1');
        expect(status).toHaveBeenCalledWith(200);
        expect(json.mock.calls[0][0].data).toEqual({ id: 'b1', userId: 1 });
    });

    test('getBudget returns 404 for a non-owned budget', async () => {
        mockBudgetService.getBudgetRecord.mockResolvedValue(null);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { params: { id: 'b1' }, user: { id: 2 } };

        await budgetController.getBudget(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });

    test('updateBudget rejects a non-owned budget with 404', async () => {
        mockBudgetService.budgetExists.mockResolvedValue(null);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { params: { id: 'b1' }, body: { amount: 600 }, user: { id: 2 } };

        await budgetController.updateBudget(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });

    /**
     * A period-only update must persist `period`, never mistakenly write the
     * period string into the numeric `amount` field.
     */
    test('updateBudget maps period to the period field', async () => {
        mockBudgetService.budgetExists.mockResolvedValue({ id: 'b1', userId: 1 });
        mockBudgetService.updateBudgetRecord.mockResolvedValue({ id: 'b1' });
        const { json, status } = makeResponse();
        const req = { params: { id: 'b1' }, body: { period: 'WEEKLY' }, user: { id: 1 } };

        await budgetController.updateBudget(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockBudgetService.updateBudgetRecord).toHaveBeenCalledWith('b1', 1, expect.objectContaining({ period: 'WEEKLY' }));
        expect(mockBudgetService.updateBudgetRecord.mock.calls[0][2]).not.toHaveProperty('amount');
    });

    /**
     * Budget creation must reject a category the user cannot access rather
     * than silently linking the budget to another user's category.
     */
    test('createBudget rejects a category the user cannot access', async () => {
        mockCategoryService.getCategoryRecord.mockResolvedValue(null);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { body: { amount: 100, categoryId: 'other', period: 'MONTHLY' }, user: { id: 1 } };

        await budgetController.createBudget(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });

    test('deleteBudget passes the trusted userId into the soft delete', async () => {
        mockBudgetService.budgetExists.mockResolvedValue({ id: 'b1', userId: 1 });
        mockBudgetService.deleteBudgetRecord.mockResolvedValue(undefined);
        const { json, sendStatus } = makeResponse();
        const req = { params: { id: 'b1' }, user: { id: 1 } };

        await budgetController.deleteBudget(req, { sendStatus, json }, jest.fn());
        await flushAsync();

        expect(mockBudgetService.deleteBudgetRecord).toHaveBeenCalledWith('b1', 1);
        expect(sendStatus).toHaveBeenCalledWith(204);
    });

    test('deleteBudget rejects a non-owned budget with 404', async () => {
        mockBudgetService.budgetExists.mockResolvedValue(null);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { params: { id: 'b1' }, user: { id: 2 } };

        await budgetController.deleteBudget(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });
});

describe('category controller ownership', () => {
    beforeEach(() => jest.clearAllMocks());

    test('getCategory awaits the service and returns the owned record', async () => {
        mockCategoryService.getCategoryRecord.mockResolvedValue({ id: 'c1', userId: 1, name: 'Groceries' });
        const { json, status } = makeResponse();
        const req = { params: { id: 'c1' }, user: { id: 1 } };

        await categoryController.getCategory(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockCategoryService.getCategoryRecord).toHaveBeenCalledWith('c1', 1);
        expect(json.mock.calls[0][0].data).toEqual({ id: 'c1', userId: 1, name: 'Groceries' });
    });

    test('getCategory returns 404 for a non-owned category', async () => {
        mockCategoryService.getCategoryRecord.mockResolvedValue(null);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { params: { id: 'c1' }, user: { id: 2 } };

        await categoryController.getCategory(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });

    test('updateCategory passes the trusted userId into the atomic mutation', async () => {
        mockCategoryService.checkCategoryById.mockResolvedValue({ id: 'c1', userId: 1, name: 'Groceries' });
        mockCategoryService.checkConflict.mockResolvedValue(null);
        mockCategoryService.updateCategoryRecord.mockResolvedValue({ id: 'c1', name: 'Food' });
        const { json, status } = makeResponse();
        const req = { params: { id: 'c1' }, body: { name: 'Food' }, user: { id: 1 } };

        await categoryController.updateCategory(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockCategoryService.updateCategoryRecord).toHaveBeenCalledWith({ name: 'Food' }, 'c1', 1);
        expect(status).toHaveBeenCalledWith(200);
    });

    test('updateCategory rejects a non-owned category with 404', async () => {
        mockCategoryService.checkCategoryById.mockResolvedValue(null);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { params: { id: 'c1' }, body: { name: 'Food' }, user: { id: 2 } };

        await categoryController.updateCategory(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });

    test('deleteCategory passes the trusted userId into the atomic delete', async () => {
        mockCategoryService.checkCategoryById.mockResolvedValue({ id: 'c1', userId: 1, name: 'Groceries' });
        mockCategoryService.countTransaction.mockResolvedValue(0);
        mockCategoryService.countBudget.mockResolvedValue(0);
        mockCategoryService.deleteCategoryRecord.mockResolvedValue({ id: 'c1' });
        const { json, sendStatus } = makeResponse();
        const req = { params: { id: 'c1' }, user: { id: 1 } };

        await categoryController.deleteCategory(req, { sendStatus, json }, jest.fn());
        await flushAsync();

        expect(mockCategoryService.deleteCategoryRecord).toHaveBeenCalledWith('c1', 1);
        expect(mockCategoryService.countTransaction).toHaveBeenCalledWith(1, 'Groceries');
        expect(mockCategoryService.countBudget).toHaveBeenCalledWith(1, 'c1');
        expect(sendStatus).toHaveBeenCalledWith(204);
    });

    test('deleteCategory rejects a non-owned category with 404', async () => {
        mockCategoryService.checkCategoryById.mockResolvedValue(null);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { params: { id: 'c1' }, user: { id: 2 } };

        await categoryController.deleteCategory(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next.mock.calls[0][0].statusCode).toBe(404);
    });
});
