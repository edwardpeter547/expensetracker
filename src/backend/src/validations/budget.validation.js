import Joi from 'joi';
import { decimalAmount } from './common.validation.js';

/**
 * Validation schema for creating a budget.
 */
export const createBudgetSchema = Joi.object({
    amount: decimalAmount().required(),
    categoryId: Joi.string().required(),
    currency: Joi.string().uppercase().length(3),
    period: Joi.string().valid("WEEKLY", "MONTHLY", "YEARLY").default("MONTHLY"),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")),
    alertThreshold: Joi.number().integer().min(1).max(100).default(80)
});

/**
 * Validation schema for updating a budget (at least one field required).
 */
export const updateBudgetSchema = Joi.object({
    amount: decimalAmount(),
    currency: Joi.string().uppercase().length(3),
    period: Joi.string().valid("WEEKLY", "MONTHLY", "YEARLY"),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")),
    alertThreshold: Joi.number().integer().min(1).max(100),
    isActive: Joi.boolean()
}).min(1);


/**
 * Validation schema for a budget id path parameter.
 */
export const budgetIdSchema = Joi.object({
    id: Joi.string().required()
})


/**
 * Validation schema for creating a category.
 */
export const createCategorySchema = Joi.object({
    name: Joi.string().required().min(1).max(50),
    icon: Joi.string().max(50),
    isSystem: Joi.boolean().default(false)
});

/**
 * Validation schema for updating a category (at least one field required).
 */
export const updateCategorySchema = Joi.object({
    name: Joi.string().min(1).max(50),
    icon: Joi.string().max(50)
}).min(1);

/**
 * Validation schema for a category id path parameter.
 */
export const categoryIdSchema = Joi.object({
    id: Joi.string().required()
})

