/**
 * Transactions, categories, and budgets data access for the mobile client.
 *
 * These functions reuse the existing authenticated Axios client, so token
 * refresh, error normalization, and base-URL resolution are inherited rather
 * than duplicated. Response envelopes are mapped into the shared domain types
 * in `src/types/transaction.ts`.
 */

import { apiClient } from '@/api/client';
import type {
    Budget,
    Category,
    CreateTransactionInput,
    TransactionRecord,
} from '@/types/transaction';

/** Envelope returned by the transaction list endpoint. */
interface TransactionListEnvelope {
    success: boolean;
    message: string;
    data: { transactions: TransactionRecord[] };
    errors: unknown;
}

/** Envelope returned by the category list endpoint. */
interface CategoryListEnvelope {
    success: boolean;
    message: string;
    data: Category[];
    errors: unknown;
}

/** Envelope returned by the budget list endpoint. */
interface BudgetListEnvelope {
    success: boolean;
    message: string;
    data: Budget[];
    errors: unknown;
}

/** Envelope returned by the category create/update endpoints. */
interface CategoryEnvelope {
    success: boolean;
    message: string;
    data: Category;
    errors: unknown;
}

/** Envelope returned by the transaction create endpoint. */
interface CreateTransactionEnvelope {
    success: boolean;
    message: string;
    data: { record?: TransactionRecord | null };
    errors: unknown;
}

/** Envelope returned by the transaction update endpoint. */
interface UpdateTransactionEnvelope {
    success: boolean;
    message: string;
    data: { transaction?: TransactionRecord | null };
    errors: unknown;
}

/**
 * Fetch every transaction owned by the authenticated user.
 *
 * @returns {Promise<TransactionRecord[]>} The user's transactions.
 */
export const fetchTransactions = async (): Promise<TransactionRecord[]> => {
    const response = await apiClient.get<TransactionListEnvelope>('/transactions');
    return response.data?.data?.transactions ?? [];
};

/**
 * Create a transaction for the authenticated user.
 *
 * The backend's create response is a complete public transaction record
 * (including `amount` and `transactionDate`), so callers may consume it
 * directly. List and dashboard refreshes are still performed on focus to keep
 * server-derived totals consistent.
 *
 * @param {CreateTransactionInput} input The transaction fields to persist.
 * @returns {Promise<TransactionRecord|null>} The created record, when present.
 */
export const createTransaction = async (
    input: CreateTransactionInput,
): Promise<TransactionRecord | null> => {
    const response = await apiClient.post<CreateTransactionEnvelope>('/transactions', input);
    return response.data?.data?.record ?? null;
};

/**
 * Convert a `Partial<TransactionRecord>` patch into the backend update payload.
 *
 * The transaction data-source contract exposes persisted record fields
 * (`transType`, `transactionDate`), whereas the backend update endpoint
 * accepts the request-body names `type` and `date`. Merchant details, line
 * items, and the linked budget are now persisted and therefore forwarded.
 *
 * @param {Partial<TransactionRecord>} patch The transaction fields to update.
 * @returns {Record<string, unknown>} The backend-compatible payload.
 */
const toUpdatePayload = (patch: Partial<TransactionRecord>): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};

    if (patch.amount !== undefined) payload.amount = patch.amount;
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.transType !== undefined) payload.type = patch.transType;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.categoryId !== undefined) payload.categoryId = patch.categoryId;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.receiptUrl !== undefined) payload.receiptUrl = patch.receiptUrl;
    if (patch.location !== undefined) payload.location = patch.location;
    if (patch.budgetId !== undefined) payload.budgetId = patch.budgetId;
    if (patch.merchant !== undefined) payload.merchant = patch.merchant;
    if (patch.items !== undefined) payload.items = patch.items;
    if (patch.transactionDate !== undefined) payload.date = patch.transactionDate;

    return payload;
};

/**
 * Update a transaction owned by the authenticated user.
 *
 * Only backend-supported fields are forwarded; the response is the updated
 * public transaction record. Amounts remain canonical decimal strings and
 * dates remain ISO 8601 strings through the round trip.
 *
 * @param {string} id The transaction id.
 * @param {Partial<TransactionRecord>} patch The fields to update.
 * @returns {Promise<TransactionRecord|null>} The updated record, when present.
 */
export const updateTransaction = async (
    id: string,
    patch: Partial<TransactionRecord>,
): Promise<TransactionRecord | null> => {
    const response = await apiClient.put<UpdateTransactionEnvelope>(
        `/transactions/${id}`,
        toUpdatePayload(patch),
    );
    return response.data?.data?.transaction ?? null;
};

/**
 * Delete a transaction owned by the authenticated user.
 *
 * The backend returns a 200 success envelope with a null data payload, so a
 * resolved call means the transaction was removed and need not be inspected.
 *
 * @param {string} id The transaction id.
 * @returns {Promise<void>} Resolves after the backend confirms deletion.
 */
export const deleteTransaction = async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
};

/**
 * Fetch system categories plus the authenticated user's categories.
 *
 * @returns {Promise<Category[]>} The categories available for selection.
 */
export const fetchCategories = async (): Promise<Category[]> => {
    const response = await apiClient.get<CategoryListEnvelope>('/categories');
    return Array.isArray(response.data?.data) ? response.data.data : [];
};

/**
 * Create a user-owned custom category.
 *
 * The backend category model has no income/expense type, so the created
 * category is direction-agnostic and offered for both transaction types.
 *
 * @param {{name: string, icon?: string|null}} input The category fields.
 * @returns {Promise<Category>} The created category.
 */
export const createCategory = async (input: {
    name: string;
    icon?: string | null;
}): Promise<Category> => {
    const response = await apiClient.post<CategoryEnvelope>('/categories', input);
    return response.data.data;
};

/**
 * Update a user-owned custom category.
 *
 * @param {string} id The category id.
 * @param {{name?: string, icon?: string|null}} input The fields to update.
 * @returns {Promise<Category>} The updated category.
 */
export const updateCategory = async (
    id: string,
    input: { name?: string; icon?: string | null },
): Promise<Category> => {
    const response = await apiClient.put<CategoryEnvelope>(`/categories/${id}`, input);
    return response.data.data;
};

/**
 * Delete a user-owned custom category that is not referenced by budgets or
 * transactions.
 *
 * @param {string} id The category id.
 * @returns {Promise<void>} Resolves with a 204 response on success.
 */
export const deleteCategory = async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
};

/**
 * Fetch the authenticated user's active budgets with computed spending.
 *
 * @returns {Promise<Budget[]>} The user's active budgets.
 */
export const fetchBudgets = async (): Promise<Budget[]> => {
    const response = await apiClient.get<BudgetListEnvelope>('/budgets');
    return Array.isArray(response.data?.data) ? response.data.data : [];
};
