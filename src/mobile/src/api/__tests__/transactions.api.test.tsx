/**
 * API contract tests for the transaction create adapter.
 *
 * These verify that the adapter returns the complete created record emitted by
 * the backend, preserving amount precision and date semantics, without a live
 * backend. The authenticated client is mocked so no device or network is
 * required.
 */

import {
    createTransaction,
    deleteTransaction,
    updateTransaction,
} from '@/api/transactions';
import { apiClient } from '@/api/client';
import type {
    CreateTransactionInput,
    TransactionRecord,
} from '@/types/transaction';

jest.mock('@/api/client', () => ({
    apiClient: { post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

const input: CreateTransactionInput = {
    amount: '1234.5600',
    title: 'Weekly groceries',
    type: 'EXPENSE',
    category: 'Food',
    categoryId: 'sys.food',
    description: 'Lunch',
    date: '2026-10-27T12:00:00.000Z',
    budgetId: 'budget-1',
    merchant: { name: 'FreshMart', address: '4 Market Lane', purchaseTime: '16:10', paymentMethod: 'Card' },
    items: [{ id: 'item-1', name: 'Milk', quantity: '2', unitPrice: '1.20' }],
};

const record: TransactionRecord = {
    id: 'tx-1',
    userId: 1,
    amount: '1234.5600',
    currency: 'USD',
    transType: 'EXPENSE',
    title: 'Weekly groceries',
    category: 'Food',
    categoryId: 'sys.food',
    description: 'Lunch',
    receiptUrl: null,
    location: null,
    transactionDate: '2026-10-27T12:00:00.000Z',
    createdAt: '2026-10-27T12:00:00.000Z',
    updatedAt: '2026-10-27T12:00:00.000Z',
};

describe('createTransaction', () => {
    beforeEach(() => {
        mockPost.mockReset();
    });

    it('returns the complete created record from the envelope', async () => {
        mockPost.mockResolvedValue({
            data: {
                success: true,
                message: 'Transaction created successfully.',
                data: { record },
                errors: null,
            },
        });

        await expect(createTransaction(input)).resolves.toEqual(record);
        expect(mockPost).toHaveBeenCalledWith('/transactions', input);
    });

    it('preserves the amount as a canonical decimal string', async () => {
        mockPost.mockResolvedValue({
            data: {
                success: true,
                message: 'ok',
                data: { record: { ...record, amount: '999999999999999.9999' } },
                errors: null,
            },
        });

        const result = await createTransaction(input);
        expect(result?.amount).toBe('999999999999999.9999');
    });

    it('keeps the transaction date unchanged', async () => {
        mockPost.mockResolvedValue({
            data: {
                success: true,
                message: 'ok',
                data: {
                    record: { ...record, transactionDate: '2026-10-26T23:59:59.999Z' },
                },
                errors: null,
            },
        });

        const result = await createTransaction(input);
        expect(result?.transactionDate).toBe('2026-10-26T23:59:59.999Z');
    });

    it('returns null when the envelope omits the record', async () => {
        mockPost.mockResolvedValue({
            data: { success: true, message: 'ok', data: {}, errors: null },
        });

        await expect(createTransaction(input)).resolves.toBeNull();
    });
});

describe('updateTransaction', () => {
    beforeEach(() => {
        mockPut.mockReset();
    });

    /**
     * The adapter must hit `PUT /transactions/:id` with the request-body names
     * the backend expects and forward merchant, items, and budget metadata.
     */
    it('calls PUT with the transaction id and a mapped update payload', async () => {
        mockPut.mockResolvedValue({
            data: {
                success: true,
                message: 'Transaction Updated',
                data: { transaction: record },
                errors: null,
            },
        });

        await expect(
            updateTransaction('tx-1', {
                amount: '99.99',
                title: 'Dinner',
                transType: 'EXPENSE',
                category: 'Food',
                categoryId: 'sys.food',
                description: 'Dinner',
                transactionDate: '2026-10-27T20:15:00.000Z',
                budgetId: 'budget-1',
                merchant: { name: 'The Bistro' },
                items: [
                    { id: 'item-1', name: 'Steak', quantity: '1', unitPrice: '99.99' },
                ],
            }),
        ).resolves.toEqual(record);

        expect(mockPut).toHaveBeenCalledWith('/transactions/tx-1', {
            amount: '99.99',
            title: 'Dinner',
            type: 'EXPENSE',
            category: 'Food',
            categoryId: 'sys.food',
            description: 'Dinner',
            date: '2026-10-27T20:15:00.000Z',
            budgetId: 'budget-1',
            merchant: { name: 'The Bistro' },
            items: [
                { id: 'item-1', name: 'Steak', quantity: '1', unitPrice: '99.99' },
            ],
        });
    });

    /**
     * Amounts must survive the round trip as canonical decimal strings rather
     * than being parsed into lossy JavaScript numbers.
     */
    it('preserves the amount as a canonical decimal string', async () => {
        mockPut.mockResolvedValue({
            data: {
                success: true,
                message: 'ok',
                data: {
                    transaction: { ...record, amount: '999999999999999.9999' },
                },
                errors: null,
            },
        });

        const result = await updateTransaction('tx-1', { amount: '999999999999999.9999' });
        expect(result?.amount).toBe('999999999999999.9999');
        expect(mockPut).toHaveBeenCalledWith('/transactions/tx-1', {
            amount: '999999999999999.9999',
        });
    });

    /**
     * A response without the nested transaction resolves to null, matching the
     * `TransactionDataSource.update` contract.
     */
    it('returns null when the envelope omits the transaction', async () => {
        mockPut.mockResolvedValue({
            data: { success: true, message: 'ok', data: {}, errors: null },
        });

        await expect(updateTransaction('tx-1', { amount: '5' })).resolves.toBeNull();
    });
});

describe('deleteTransaction', () => {
    beforeEach(() => {
        mockDelete.mockReset();
    });

    /**
     * The adapter must call `DELETE /transactions/:id` and treat a resolved
     * 2xx response as success without needing to inspect the null data body.
     */
    it('calls DELETE with the transaction id and resolves on success', async () => {
        mockDelete.mockResolvedValue({
            data: {
                success: true,
                message: 'Transaction Deleted',
                data: null,
                errors: null,
            },
        });

        await expect(deleteTransaction('tx-1')).resolves.toBeUndefined();
        expect(mockDelete).toHaveBeenCalledWith('/transactions/tx-1');
    });

    /**
     * Backend failures must propagate so the caller can preserve the visible
     * transaction and present the error instead of reporting success.
     */
    it('propagates backend failures', async () => {
        mockDelete.mockRejectedValue(
            Object.assign(new Error('Transaction not found'), {
                isAxiosError: true,
                response: {
                    status: 404,
                    data: { message: 'Transaction not found' },
                },
            }),
        );

        await expect(deleteTransaction('tx-1')).rejects.toThrow('Transaction not found');
    });
});
