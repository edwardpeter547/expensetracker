import { StatusCodes } from "http-status-codes";
import {
    createTransactionRecord,
    deleteTransactionById,
    getTransactionById,
    getTransactionsbyUser,
    updateTransactionRecord
} from "../services/transaction.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { parseDate } from "../utils/helpers.js";


/**
 * List the authenticated user's transactions.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getTransactions = catchAsync(async (request, response) => {
    const userId = request.user?.id;
    const transactions = await getTransactionsbyUser(userId);
    response.status(StatusCodes.OK).json({
        success: true,
        message: "List Transactions",
        data: {
            transactions: transactions
        },
        errors: null
    });
});

/**
 * Fetch a single transaction scoped to the authenticated owner.
 *
 * @param {import('express').Request} request Express request with `params.id`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getTransaction = catchAsync(async (request, response) => {
    const { id } = request.params;
    const userId = request.user?.id;

    const transaction = await getTransactionById(id, userId);
    if(!transaction){
        throw new AppError("Transaction not found", StatusCodes.NOT_FOUND);
    }
    response.status(StatusCodes.OK).json({
        success: true,
        message: "Transaction Detail",
        data: {
            transaction: transaction
        },
        errors: null
    });

});

/**
 * Create a transaction for the authenticated user.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const createTransaction = catchAsync(async (request, response) => {

    const {amount, type, category, description, recieptUrl, date, location} = request.body;

    const transactionData = {
        userId: request.user?.id,
        amount: amount,
        transType: type,
        category: category,
        description: description,
        receiptUrl: recieptUrl ? recieptUrl : null,
        location: location ? location : null,
        transactionDate: parseDate(date)
    }

    const record = await createTransactionRecord(transactionData);

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Transaction created successfully.",
        data: {
            record: record
        },
        error: null
    })

});


/**
 * Delete an owned transaction; a non-owned record yields a Prisma P2025.
 *
 * @param {import('express').Request} request Express request with `params.id`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const deleteTransaction = catchAsync(async (request, response) => {
    const {id} = request.params;
    const userId = request.user?.id;
    await deleteTransactionById(id, userId);
    response.status(StatusCodes.OK).json({
        success: true,
        message: "Transaction Deleted",
        data: null,
        errors: null
    });
});


/**
 * Update an owned transaction; the mutation is constrained by `{id, userId}`.
 *
 * @param {import('express').Request} request Express request with `params.id`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const updateTransaction = catchAsync(async (request, response) => {
    const { id } = request.params;
    const userId = request.user?.id;
    const { amount, type, category, description, receiptUrl, date, location } = request.body;

    const transactionData = {
        ...(amount !== undefined && { amount }),
        ...(type !== undefined && {transType: type}),
        ...(category !== undefined && {category}),
        ...(description !== undefined && {description}),
        ...(receiptUrl !== undefined && {receiptUrl}),
        ...(location !== undefined && {location}),
        ...(date !== undefined && {transactionDate: parseDate(date)})
    }

    const updatedTransaction = await updateTransactionRecord(id, userId, transactionData);
    if(transactionData)
        

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Transaction Updated",
        data: {
            transaction: updatedTransaction
        },
        errors: null
    })
    
});
