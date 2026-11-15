import prisma from "../configurations/prisma.connect.js";
import { StatusCodes } from "http-status-codes";
import { USER_OWNER_SELECT } from "../constants/user.select.js";
import AppError from "../utils/appError.js";
import { ERROR_CODES } from "../constants/error-codes.js";

/** Allowlisted projection for manually maintained transaction line items. */
const TRANSACTION_ITEM_SELECT = {
    id: true,
    name: true,
    quantity: true,
    unitPrice: true,
    category: true,
};

/** Allowlisted projection for the flat merchant columns. */
const MERCHANT_SELECT = {
    merchantName: true,
    merchantAddress: true,
    merchantPurchaseTime: true,
    merchantPaymentMethod: true,
    merchantReference: true,
};

/** Allowlisted projection for a budget's display label. */
const BUDGET_LABEL_SELECT = {
    select: {
        id: true,
        category: { select: { id: true, name: true } },
    },
};

/** Public transaction projection shared by create/update/detail reads. */
const TRANSACTION_PUBLIC_SELECT = {
    id: true,
    userId: true,
    amount: true,
    currency: true,
    transType: true,
    title: true,
    category: true,
    categoryId: true,
    description: true,
    receiptUrl: true,
    location: true,
    transactionDate: true,
    createdAt: true,
    updatedAt: true,
    budgetId: true,
    ...MERCHANT_SELECT,
    budget: BUDGET_LABEL_SELECT,
    items: { select: TRANSACTION_ITEM_SELECT },
};

/**
 * Map the flat merchant columns into the nested merchant view model.
 *
 * A null result means no merchant data was persisted, so the mobile client can
 * distinguish "no merchant" from a merchant with only some fields populated.
 *
 * @param {object} record The persisted transaction record.
 * @returns {object|null} The merchant view model or null.
 */
const toMerchant = (record) => {
    if (!record) return null;

    const name = record.merchantName?.trim() || null;
    const address = record.merchantAddress?.trim() || null;
    const purchaseTime = record.merchantPurchaseTime || null;
    const paymentMethod = record.merchantPaymentMethod?.trim() || null;
    const reference = record.merchantReference?.trim() || null;

    if (!name && !address && !purchaseTime && !paymentMethod && !reference) {
        return null;
    }

    return { name, address, purchaseTime, paymentMethod, reference };
};

/**
 * Shape a persisted transaction into the public API view model.
 *
 * Flat merchant columns are replaced with the nested `merchant` object and
 * `items` is always present as an array so callers can render it directly.
 *
 * @param {object|null|undefined} record The persisted transaction record.
 * @returns {object|null} The shaped transaction, or null.
 */
export const shapeTransaction = (record) => {
    if (!record) return null;

    const {
        merchantName,
        merchantAddress,
        merchantPurchaseTime,
        merchantPaymentMethod,
        merchantReference,
        ...rest
    } = record;

    return {
        ...rest,
        merchant: toMerchant(record),
        items: record.items ?? [],
    };
};

/**
 * Create a transaction record for its owner, optionally with line items.
 *
 * The transaction and its items are created atomically so a partial item list
 * can never be persisted on its own.
 *
 * @param {object} transactionData The transaction fields to persist.
 * @param {object[]|undefined} items The line items to create.
 * @returns {Promise<object>} The created transaction.
 */
export const createTransactionRecord = async (transactionData, items) => {
    const record = await prisma.transaction.create({
        data: {
            ...transactionData,
            items: items && items.length > 0
                ? {
                    create: items.map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        category: item.category ?? null,
                    })),
                }
                : undefined,
        },
        select: {
            ...TRANSACTION_PUBLIC_SELECT,
            user: { select: USER_OWNER_SELECT },
        },
    });

    return shapeTransaction(record);
};

/**
 * List all transactions for a user, including items and budget label.
 *
 * @param {number} userId The owning user id.
 * @returns {Promise<object[]>} The user's transactions (empty when none).
 */
export const getTransactionsbyUser = async (userId) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId: userId },
        include: {
            items: { select: TRANSACTION_ITEM_SELECT },
            budget: BUDGET_LABEL_SELECT,
        },
    });
    return transactions.map(shapeTransaction) ?? [];
};

/**
 * Fetch a single transaction scoped to its owner, including items and budget.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @returns {Promise<object|null>} The transaction or null.
 */
export const getTransactionById = async (transactionId, userId) => {
    const transaction = await prisma.transaction.findFirst({
        where: { id: transactionId, userId: userId },
        include: {
            items: { select: TRANSACTION_ITEM_SELECT },
            budget: BUDGET_LABEL_SELECT,
        },
    });
    return shapeTransaction(transaction);
};

/**
 * Atomically delete an owned transaction.
 *
 * `deleteMany` accepts the non-unique `{id, userId}` ownership filter, so a
 * caller can never delete another user's record. Related line items are
 * removed by the database's cascade rule.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @returns {Promise<void>}
 * @throws {AppError} If no owned record matches the id.
 */
export const deleteTransactionById = async (transactionId, userId) => {
    const { count } = await prisma.transaction.deleteMany({
        where: { id: transactionId, userId: userId }
    });

    if (count === 0) {
        throw new AppError('Transaction not found', StatusCodes.NOT_FOUND, null, { code: ERROR_CODES.TRANSACTION_NOT_FOUND });
    }
};

/**
 * Atomically update an owned transaction and, when supplied, replace its items.
 *
 * The scoped `{id, userId}` ownership filter is applied first, then items are
 * deleted and recreated inside the same database transaction so the response
 * always describes the caller's own complete record.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @param {object} transactionData The scalar fields to update.
 * @param {object[]|undefined} items The replacement line items, if supplied.
 * @returns {Promise<object>} The updated transaction.
 * @throws {AppError} If no owned record matches the id.
 */
export const updateTransactionRecord = async (transactionId, userId, transactionData, items) => {
    return prisma.$transaction(async (tx) => {
        let count;

        if (Object.keys(transactionData).length > 0) {
            const result = await tx.transaction.updateMany({
                where: { id: transactionId, userId: userId },
                data: transactionData,
            });
            count = result.count;
        } else {
            const existing = await tx.transaction.findFirst({
                where: { id: transactionId, userId: userId },
                select: { id: true },
            });
            count = existing ? 1 : 0;
        }

        if (count === 0) {
            throw new AppError('Transaction not found', StatusCodes.NOT_FOUND, null, { code: ERROR_CODES.TRANSACTION_NOT_FOUND });
        }

        if (items !== undefined) {
            await tx.transactionItem.deleteMany({ where: { transactionId: transactionId } });
            if (items.length > 0) {
                await tx.transactionItem.createMany({
                    data: items.map((item) => ({
                        transactionId: transactionId,
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        category: item.category ?? null,
                    })),
                });
            }
        }

        const record = await tx.transaction.findFirst({
            where: { id: transactionId, userId: userId },
            select: TRANSACTION_PUBLIC_SELECT,
        });
        return shapeTransaction(record);
    });
};
