import prisma from "../configurations/prisma.connect.js";
import { StatusCodes } from "http-status-codes";
import { USER_OWNER_SELECT } from "../constants/user.select.js";
import AppError from "../utils/appError.js";

/**
 * Create a transaction record for its owner.
 *
 * The response projection includes a safe nested owner and omits `amount` and
 * `transactionDate` (a known projection gap).
 *
 * @param {object} transactionData The transaction fields to persist.
 * @returns {Promise<object>} The created transaction.
 */
export const createTransactionRecord = async (transactionData) => {
    return prisma.transaction.create({
        data: {...transactionData},
        select: {
            id: true,
            user: { select: USER_OWNER_SELECT },
            userId: true,
            transType: true,
            category: true,
            categoryId: true,
            currency: true,
            description: true,
            receiptUrl: true,
            location: true,
            createdAt: true,
            updatedAt: true,
        }
    });
}

/**
 * List all transactions for a user.
 *
 * @param {number} userId The owning user id.
 * @returns {Promise<object[]>} The user's transactions (empty when none).
 */
export const getTransactionsbyUser = async (userId) => {
    const transactions = await prisma.transaction.findMany({where: {userId: userId}});
    return transactions ?? [];
}

/**
 * Fetch a single transaction scoped to its owner.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @returns {Promise<object|null>} The transaction or null.
 */
export const getTransactionById = async (transactionId, userId) => {
    const transaction = await prisma.transaction.findFirst({
        where: {id: transactionId, userId: userId}
    });
    return transaction ?? null;
}

/**
 * Atomically delete an owned transaction.
 *
 * `deleteMany` accepts the non-unique `{id, userId}` ownership filter, so a
 * caller can never delete another user's record. A non-owned or missing record
 * matches zero rows and is reported as a 404.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @returns {Promise<void>}
 * @throws {AppError} If no owned record matches the id.
 */
export const deleteTransactionById = async (transactionId, userId) => {
    const {count} = await prisma.transaction.deleteMany({
        where: {id: transactionId, userId: userId}
    });

    if(count === 0){
        throw new AppError('Transaction not found', StatusCodes.NOT_FOUND);
    }
}


/**
 * Atomically update an owned transaction.
 *
 * `updateMany` applies the non-unique `{id, userId}` ownership filter and is
 * followed by a scoped `findFirst` so the response always describes the
 * caller's own record.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @param {object} transactionData The fields to update.
 * @returns {Promise<object>} The updated transaction.
 * @throws {AppError} If no owned record matches the id.
 */
export const updateTransactionRecord = async (transactionId, userId, transactionData) => {
    const {count} = await prisma.transaction.updateMany({
        where: {id: transactionId, userId: userId},
        data: transactionData,
    });

    if(count === 0){
        throw new AppError('Transaction not found', StatusCodes.NOT_FOUND);
    }

    return prisma.transaction.findFirst({
        where: {id: transactionId, userId: userId},
        select: {
            id: true,
            amount: true,
            transType: true,
            category: true,
            categoryId: true,
            currency: true,
            description: true,
            receiptUrl: true,
            location: true,
            transactionDate: true,
            createdAt: true,
            updatedAt: true,
        }
    });
}

