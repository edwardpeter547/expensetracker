/**
 * Domain types for the Transactions and Add Transaction screens.
 *
 * Amounts mirror the backend `Decimal(19, 4)` serialization and are therefore
 * treated as canonical decimal strings (or raw numbers when an external
 * caller has already parsed them). Presentation code formats these values
 * with the existing locale-aware money helpers.
 */

import type { ReceiptFileInfo } from '@/types/receipt';

/** A transaction's direction in the ExpenseTracker domain. */
export type TransactionType = 'INCOME' | 'EXPENSE';

/** The three approved list filters. */
export type TransactionFilter = 'ALL' | 'INCOME' | 'EXPENSE';

/** Optional merchant details shown on transaction details and edit forms. */
export interface MerchantDetails {
    name?: string;
    address?: string;
    purchaseTime?: string;
    paymentMethod?: string;
    reference?: string;
}

/** One manually maintained purchased item. */
export interface PurchasedItem {
    id: string;
    name: string;
    quantity: string;
    unitPrice: string;
    category?: string;
}

/** Itemization reconciliation result computed in minor units. */
export interface ItemizationTotals {
    subtotal: string;
    difference: string;
}

/** A transaction record returned by `GET /api/v1/transactions`. */
export interface TransactionRecord {
    /** Stable record id. */
    id: string;
    /** Owning user id. */
    userId: number;
    /** Canonical decimal amount, e.g. `"1234.56"`. */
    amount: string | number;
    /** ISO 4217 currency when stored on the row. */
    currency?: string | null;
    /** Income or expense. */
    transType: TransactionType;
    /** Stored category label. */
    category: string;
    /** Optional category reference. */
    categoryId?: string | null;
    /** Free-text description. */
    description?: string | null;
    /** Optional receipt URL. */
    receiptUrl?: string | null;
    /** Optional location string. */
    location?: string | null;
    /** Transaction date/time as an ISO string. */
    transactionDate: string;
    /** Created timestamp. */
    createdAt?: string;
    /** Last-updated timestamp. */
    updatedAt?: string;
    /** Optional merchant information. */
    merchant?: MerchantDetails | null;
    /** Optional itemized purchases. */
    items?: PurchasedItem[] | null;
    /** Optional receipt metadata. */
    receipt?: ReceiptFileInfo | null;
}

/** A system or user category returned by `GET /api/v1/categories`. */
export interface Category {
    id: string;
    name: string;
    /** Ionicons glyph name when supplied by the backend. */
    icon?: string | null;
    isSystem?: boolean;
    userId?: number | null;
}

/** The supported budget periods. */
export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/** A budget returned by `GET /api/v1/budgets`. */
export interface Budget {
    id: string;
    amount: string | number;
    currency?: string | null;
    period: BudgetPeriod;
    startDate?: string | null;
    endDate?: string | null;
    alertThreshold?: number;
    isActive?: boolean;
    userId?: number;
    categoryId: string;
    category?: Category | null;
    spent?: string | number;
    remaining?: string | number;
    percentage?: number;
    isOverBudget?: boolean;
}

/** Request body for `POST /api/v1/transactions`. */
export interface CreateTransactionInput {
    amount: string;
    type: TransactionType;
    category: string;
    categoryId?: string;
    description?: string;
    date?: string;
    receiptUrl?: string;
    location?: string;
}
