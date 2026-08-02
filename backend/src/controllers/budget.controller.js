import { StatusCodes } from "http-status-codes";
import logger from "../configurations/logger.config.js";
import { BUDGET_ACTIONS } from "../constants/audit.actions.js";
import { addBudget, budgetExists, checkBudget, deleteBudgetRecord, getBudgetList, getBudgetWithSpending } from "../services/budget.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { maskEmail } from "../utils/helpers.js";


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


export const getBudget = catchAsync(async (request, response) => {
    const userId = request.user?.id;
    const budgetId = request.params?.id;
    const budget = await getBugetRecord(userId, budgetId);
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


export const createBudget = catchAsync(async (request, response) => {
    const { amount, categoryId, period = "MONTHLY", startDate, endDate, alertThreshold = 80 } = request.body;
    const userId = request.user?.id;

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
        categoryId
    }

    const budget = await addBudget(budgetData);

    response.status(StatusCodes.CREATED).json({
        success: true,
        message: "Budget Created",
        data: budget,
        errors: null
    })

})


export const updateBudget = catchAsync(async (request, response) => {
    const { amount, period, startDate, endDate, alertThreshold, isActive} = request.body;
    const userId = request.user?.id;
    const budgetId = request.params?.id;

    const budget = await budgetExists(userId, budgetId);

    if(!budget){
        logger.error("Budget not found", {user: request.user?.email, action: BUDGET_ACTIONS.NOT_FOUND});
        throw new AppError("Budget not found", StatusCodes.NOT_FOUND);
    }

    const budgetData = {
        ...(amount !== undefined && { amount }),
        ...(period !== undefined && { amount }),
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


export const deleteBudget = catchAsync(async (request, response) => {
    const userId = request.user?.id;
    const budgetId = request.params?.id;

    const budget = await budgetExists(userId, budgetId);

    if(!budget){
        logger.error("Budget not found", {user: request.user?.email, action: BUDGET_ACTIONS.NOT_FOUND});
        throw new AppError("Budget not found", StatusCodes.NOT_FOUND);
    }

    await deleteBudgetRecord(budgetId, userId);

    response.status(StatusCodes.NO_CONTENT).json({
        success: true,
        message: "Budget Deleted",
        data: null,
        errors: null
    })
})