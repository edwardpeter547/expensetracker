import { StatusCodes } from "http-status-codes";
import logger from "../configurations/logger.config.js";
import { BUDGET_ACTIONS } from "../constants/audit.actions.js";
import { addBudget, budgetExists, checkBudget, deleteBudgetRecord, getBudgetList, getBudgetRecord, getBudgetWithSpending, updateBudgetRecord } from "../services/budget.service.js";
import { getCategoryRecord } from "../services/category.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { maskEmail } from "../utils/helpers.js";


/**
 * List the authenticated user's budgets with computed spending.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getBudgets = catchAsync(async (request, response) => {
    const userId = request.user?.id; 
    const budgets = await getBudgetList(userId);

    // Calculate spending for each budget
    const currentDate = new Date();
    const budgetWithSpending = await getBudgetWithSpending(budgets, currentDate, userId);

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Budget List",
        data: budgetWithSpending,
        errors: null
    })
})


/**
 * Fetch a single budget scoped to the authenticated owner.
 *
 * @param {import('express').Request} request Express request with `params.id`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getBudget = catchAsync(async (request, response) => {
    const userId = request.user?.id;
    const budgetId = request.params?.id;
    const budget = await getBudgetRecord(userId, budgetId);
    if(!budget){
        logger.warn("Budget not found", {user: maskEmail(request.user?.email), action: BUDGET_ACTIONS.NOT_FOUND});
        throw new AppError("Budget not found", StatusCodes.NOT_FOUND)
    }   
    response.status(StatusCodes.OK).json({
        success: true,
        message: "Budget Details",
        data: budget,
        errors: null,
    })
})


/**
 * Create a budget for the authenticated user.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const createBudget = catchAsync(async (request, response) => {
    const { amount, categoryId, currency, period = "MONTHLY", startDate, endDate, alertThreshold = 80 } = request.body;
    const userId = request.user?.id;

    const category = await getCategoryRecord(categoryId, userId);
    if(!category){
        throw new AppError("Category not found", StatusCodes.NOT_FOUND);
    }

    const existing = await checkBudget(userId, categoryId, period);
    if(existing) {
        logger.error(
            "A budget already exists for this category and period", 
            {user: maskEmail(request.user?.email), action: BUDGET_ACTIONS.CONFLICT}
        );
        throw new AppError("A budget already exists for this category and period", StatusCodes.CONFLICT);
    }

    const budgetData = {
        amount,
        period,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        alertThreshold,
        userId,
        categoryId,
        currency: currency || request.user?.currency || 'USD',
    }

    const budget = await addBudget(budgetData);

    response.status(StatusCodes.CREATED).json({
        success: true,
        message: "Budget Created",
        data: budget,
        errors: null
    })

})


/**
 * Update an owned budget; the mutation is constrained by `{id, userId}`.
 *
 * @param {import('express').Request} request Express request with `params.id`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const updateBudget = catchAsync(async (request, response) => {
    const { amount, currency, period, startDate, endDate, alertThreshold, isActive} = request.body;
    const userId = request.user?.id;
    const budgetId = request.params?.id;

    const budget = await budgetExists(userId, budgetId);

    if(!budget){
        logger.error("Budget not found", {user: maskEmail(request.user?.email), action: BUDGET_ACTIONS.NOT_FOUND});
        throw new AppError("Budget not found", StatusCodes.NOT_FOUND);
    }

    const budgetData = {
        ...(amount !== undefined && { amount }),
        ...(currency !== undefined && { currency }),
        ...(period !== undefined && { period }),
        ...(startDate !== undefined && { startDate: new Date(startDate)}),
        ...(endDate !== undefined && { endDate: new Date(endDate)}),
        ...(alertThreshold !== undefined && {alertThreshold }),
        ...(isActive !== undefined && {isActive}),
    }

    const updatedBudget = await updateBudgetRecord(budgetId, userId, budgetData)

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Budget Updated",
        data: updatedBudget,
        errors: null
    });
})


/**
 * Soft-delete an owned budget by marking it inactive.
 *
 * @param {import('express').Request} request Express request with `params.id`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const deleteBudget = catchAsync(async (request, response) => {
    const userId = request.user?.id;
    const budgetId = request.params?.id;

    const budget = await budgetExists(userId, budgetId);

    if(!budget){
        logger.error("Budget not found", {user: maskEmail(request.user?.email), action: BUDGET_ACTIONS.NOT_FOUND});
        throw new AppError("Budget not found", StatusCodes.NOT_FOUND);
    }

    await deleteBudgetRecord(budgetId, userId);

    response.sendStatus(StatusCodes.NO_CONTENT);
})
