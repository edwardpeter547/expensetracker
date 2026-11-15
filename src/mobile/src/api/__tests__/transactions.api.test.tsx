/**
 * API contract tests for the transaction create adapter.
 *
 * These verify that the adapter returns the complete created record emitted by
 * the backend, preserving amount precision and date semantics, without a live
 * backend. The authenticated client is mocked so no device or network is
 * required.
 */

import { createTransaction } from '@/api/transactions';
import { apiClient } from '@/api/client';
import type {
    CreateTransactionInput,
    TransactionRecord,
} from '@/types/transaction';

jest.mock('@/api/client', () => ({
    apiClient: { post: jest.fn() },
}));

const mockPost = apiClient.post as jest.Mock;

const input: CreateTransactionInput = {
    amount: '1234.5600',
    type: 'EXPENSE',
    category: 'Food',
    categoryId: 'sys.food',
    description: 'Lunch',
    date: '2026-10-27T12:00:00.000Z',
};

const record: TransactionRecord = {
    id: 'tx-1',
    userId: 1,
    amount: '1234.5600',
    currency: 'USD',
    transType: 'EXPENSE',
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
