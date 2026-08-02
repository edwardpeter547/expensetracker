import { StatusCodes } from "http-status-codes";
import logger from "../configurations/logger.config.js";
import { CATEGORY_ACTIONS } from "../constants/audit.actions.js";
import {
    checkCategoryById,
    checkCategoryByName,
    checkConflict,
    countBudget,
    countTransaction,
    createCategoryRecord,
    deleteCategoryRecord,
    getCategoryList,
    getCategoryRecord,
    updateCategoryRecord
} from "../services/category.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { maskEmail } from "../utils/helpers.js";


export const getCategories = catchAsync(async (request, response) => {
    const userId = request.user?.id;

    const categories = await getCategoryList(userId);
    return response.status(StatusCodes.OK).json({
        success: true,
        message: "Category List",
        data: categories,
    })
});


export const getCategory = catchAsync(async (request, response) => {
    const categoryId = request.params?.id;
    const userId = request.user?.id;

    const category = getCategoryRecord(categoryId, userId);

    if(!category){
        logger.warn("Category not found", {user: maskEmail(request.user?.email), action: CATEGORY_ACTIONS.NOT_FOUND});
        throw new AppError("Category not found", StatusCodes.NOT_FOUND);
    }

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Category Record",
        data: category
    })
});


export const createCategory = catchAsync(async (request, response) => {
    console.log("I never made it to this point");
    const {name, icon} = request.body;
    const userId = request.user?.id;

    const existing = await checkCategoryByName(name, userId);

    if(existing){
        logger.warn("Category Already exist", {user: maskEmail(request.user?.email), action: CATEGORY_ACTIONS.ALREADY_EXIST});
        throw new AppError("Category Already exist", StatusCodes.CONFLICT)
    }

    const categoryData = {
        name,
        icon: icon || null,
        userId: userId
    }

    const category = await createCategoryRecord(categoryData);

    response.status(StatusCodes.CREATED).json({
        success: true,
        message: "Category created",
        data: category
    })
});


export const updateCategory = catchAsync(async (request, response) => {
    const {name, icon } = request.body;
    const categoryId  = request.params?.id;
    const userId = request.user?.id;

    const existingCategory = await checkCategoryById(userId, categoryId);

    if(!existing){
        logger.error("Category not found or cannot be edited.", {user: maskEmail(request.user?.email), action: CATEGORY_ACTIONS.NOT_FOUND});
        throw new AppError("Category not found or cannot be edited.", StatusCodes.NOT_FOUND);
    }

    // If renaming, check no conflict
    if(name && name !== existingCategory.name){
        const conflict = await checkConflict(categoryId, name, userId);
        if(conflict){
            logger.error("Category Already exist", {user: maskEmail(request.user?.email), action: CATEGORY_ACTIONS.ALREADY_EXIST});
            throw new AppError("Category Already exist", StatusCodes.CONFLICT);
        }
    }

    const categoryData = {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon })
    }

    const updated = await updateCategoryRecord(categoryData, categoryId);


    response.status(StatusCodes.OK).json({
        success: true,
        message: "Category Updated",
        data: updated
    });
});


export const deleteCategory = catchAsync(async (request, response) => {
    const categoryId = request.params?.id;
    const userId = request.user?.id;

    const category = await checkCategoryById(userId, categoryId);

    if(!category){
        logger.error("Category not found or cannot be deleted.", {user: maskEmail(request.user?.email), action: CATEGORY_ACTIONS.NOT_FOUND});
        throw new AppError("Category not found or cannot be deleted.", StatusCodes.NOT_FOUND);
    }

    const transactionCount = await countTransaction(category.name);
    const budgetCount = await countBudget(categoryId);

    if(budgetCount > 0 || transactionCount > 0 ){
        logger.warn(
            `Category is in use by ${budgetCount} budgets and ${transactionCount} transactions`,
            {user: maskEmail(request.user?.email), action: CATEGORY_ACTIONS.CONFLICT}
        )

        throw new AppError(`Category is in use by ${budgetCount} budgets and ${transactionCount} transactions`, StatusCodes.CONFLICT);
    }

    await deleteCategoryRecord(categoryId);

    response.status(StatusCodes.NO_CONTENT).json({
        success: true,
        message: "Category Deleted.",
        data: null
    });
})