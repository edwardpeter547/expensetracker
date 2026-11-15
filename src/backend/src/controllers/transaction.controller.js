import { StatusCodes } from "http-status-codes";
import {
    createTransactionRecord,
    deleteTransactionById,
    getTransactionById,
    getTransactionsbyUser,
    updateTransactionRecord
} from "../services/transaction.service.js";
import { getCategoryRecord } from "../services/category.service.js";
import { budgetExists } from "../services/budget.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { parseDate } from "../utils/helpers.js";
import { ERROR_CODES } from "../constants/error-codes.js";


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
        throw new AppError("Transaction not found", StatusCodes.NOT_FOUND, null, {code: ERROR_CODES.TRANSACTION_NOT_FOUND});
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

    const {amount, title, type, category, categoryId, description, receiptUrl, date, location, merchant, items, budgetId} = request.body;
    const userId = request.user?.id;

    let resolvedCategoryId = categoryId ?? null;
    let resolvedCategoryName = category;
    if(categoryId){
        const categoryRecord = await getCategoryRecord(categoryId, userId);
        if(!categoryRecord){
            throw new AppError("Category not found", StatusCodes.NOT_FOUND, null, {code: ERROR_CODES.CATEGORY_NOT_FOUND});
        }
        resolvedCategoryId = categoryRecord.id;
        resolvedCategoryName = categoryRecord.name;
    }

    if(budgetId){
        const budget = await budgetExists(userId, budgetId);
        if(!budget){
            throw new AppError("Budget not found", StatusCodes.NOT_FOUND, null, {code: ERROR_CODES.BUDGET_NOT_FOUND});
        }
    }

    const transactionData = {
        userId: userId,
        amount: amount,
        currency: request.user?.currency || 'USD',
        transType: type,
        title: title,
        category: resolvedCategoryName,
        categoryId: resolvedCategoryId,
        description: description,
        receiptUrl: receiptUrl ? receiptUrl : null,
        location: location ? location : null,
        merchantName: merchant?.name?.trim() || null,
        merchantAddress: merchant?.address?.trim() || null,
        merchantPurchaseTime: merchant?.purchaseTime || null,
        merchantPaymentMethod: merchant?.paymentMethod?.trim() || null,
        merchantReference: merchant?.reference?.trim() || null,
        budgetId: budgetId ?? null,
        transactionDate: parseDate(date)
    }

    const record = await createTransactionRecord(transactionData, items);

    response.status(StatusCodes.CREATED).json({
        success: true,
        message: "Transaction created successfully.",
        data: {
            record: record
        },
        errors: null
    })

});


/**
 * Delete an owned transaction; a non-owned record yields a 404.
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
    const { 
        amount, 
        title, 
        type, 
        category, 
        categoryId, 
        description, 
        receiptUrl, 
        date, 
        location, 
        merchant, 
        items, 
        budgetId } = request.body;

    let resolvedCategory = {};
    if(categoryId){
        const categoryRecord = await getCategoryRecord(categoryId, userId);
        if(!categoryRecord){
            throw new AppError("Category not found", StatusCodes.NOT_FOUND, null, {code: ERROR_CODES.CATEGORY_NOT_FOUND});
        }
        resolvedCategory = {
            category: categoryRecord.name,
            categoryId: categoryRecord.id,
        };
    }

    if(budgetId !== undefined){
        if(budgetId){
            const budget = await budgetExists(userId, budgetId);
            if(!budget){
                throw new AppError("Budget not found", StatusCodes.NOT_FOUND, null, {code: ERROR_CODES.BUDGET_NOT_FOUND});
            }
        }
    }

    const transactionData = {
        ...(amount !== undefined && { amount }),
        ...(title !== undefined && { title }),
        ...(type !== undefined && {transType: type}),
        ...(category !== undefined && {category}),
        ...resolvedCategory,
        ...(description !== undefined && {description}),
        ...(receiptUrl !== undefined && {receiptUrl}),
        ...(location !== undefined && {location}),
        ...(budgetId !== undefined && {budgetId}),
        ...(merchant !== undefined && {
            merchantName: merchant?.name?.trim() || null,
            merchantAddress: merchant?.address?.trim() || null,
            merchantPurchaseTime: merchant?.purchaseTime || null,
            merchantPaymentMethod: merchant?.paymentMethod?.trim() || null,
            merchantReference: merchant?.reference?.trim() || null,
        }),
        ...(date !== undefined && {transactionDate: parseDate(date)})
    }

    const updatedTransaction = await updateTransactionRecord(id, userId, transactionData, items);

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Transaction Updated",
        data: {
            transaction: updatedTransaction
        },
        errors: null
    })
    
});
