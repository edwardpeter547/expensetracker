import prisma from "../configurations/prisma.connect.js";
import { USER_OWNER_SELECT } from "../constants/user.select.js";

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

    console.log(JSON.stringify(transactionData));

    const record = prisma.transaction.create({
        data: {...transactionData},
        select: {
            id: true,
            user: { select: USER_OWNER_SELECT },
            userId: true,
            transType: true,
            category: true,
            description: true,
            receiptUrl: true,
            location: true,
            createdAt: true,
            updatedAt: true,
        }
    })

    return record;

}

/**
 * List all transactions for a user.
 *
 * @param {number} userId The owning user id.
 * @returns {Promise<object[]>} The user's transactions (empty when none).
 */
export const getTransactionsbyUser = async (userId) => {
    const transactions = await prisma.transaction.findMany({where: {userId: userId}});
    if(!transactions) return [];
    return transactions;
}

/**
 * Fetch a single transaction scoped to its owner.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @returns {Promise<object|null>} The transaction or null.
 */
export const getTransactionById = async (transactionId, userId) => {
    const transaction = await prisma.transaction.findUnique({where: {id: transactionId, userId: userId}});
    if(!transaction) return null;
    return transaction;
}

/**
 * Atomically delete an owned transaction using `{id, userId}`.
 *
 * A non-owned or missing record raises a Prisma `P2025` error, which the
 * central error handler maps to 404.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @returns {Promise<object>} The deleted transaction.
 */
export const deleteTransactionById = async (transactionId, userId) => {
    
    return await prisma.transaction.delete({ where: {id: transactionId, userId: userId}});
}


/**
 * Atomically update an owned transaction using `{id, userId}`.
 *
 * @param {string} transactionId The transaction id.
 * @param {number} userId The owning user id.
 * @param {object} transactionData The fields to update.
 * @returns {Promise<object>} The updated transaction.
 */
export const updateTransactionRecord = async (transactionId, userId, transactionData) => {
    
    const updatedTransaction = prisma.transaction.update({
        where: {id: transactionId, userId: userId},
        data: transactionData,
        select: {
            id: true,
            amount: true,
            transType: true,
            category: true,
            description: true,
            receiptUrl: true,
            location: true,
            transactionDate: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    if(!updatedTransaction) return null;
    return updatedTransaction;
}

