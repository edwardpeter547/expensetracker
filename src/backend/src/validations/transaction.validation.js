import Joi from "joi";
import { decimalAmount } from "./common.validation.js";

/**
 * Schema for validating transaction creation requests
 * @type {Joi.ObjectSchema}
 * 
 * @property {number} amount - Transaction amount (must be positive). Required.
 * @property {string} title - Transaction title. Required.
 * @property {string} type - Transaction type ('INCOME' or 'EXPENSE'). Required.
 * @property {string} category - Transaction category. Required.
 * @property {string} [description] - Optional transaction description (max 500 characters).
 * @property {Date} [date] - Optional transaction date in ISO 8601 format.
 * @property {string} [receiptUrl] - Optional receipt URL (must be valid URI).
 * @property {string} [location] - Optional transaction location.
 */
export const createTransactionSchema = Joi.object({
    amount: decimalAmount().required(),
    title: Joi.string().trim().min(1).max(120).required(),
    type: Joi.string().valid('INCOME', 'EXPENSE').required(),
    category: Joi.string().required(),
    categoryId: Joi.string(),
    description: Joi.string().max(500),
    date: Joi.date().iso(),
    receiptUrl: Joi.string().uri(),
    location: Joi.string(),
    budgetId: Joi.string(),
    merchant: Joi.object({
        name: Joi.string().trim().max(120),
        address: Joi.string().max(500),
        purchaseTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
        paymentMethod: Joi.string().max(80),
        reference: Joi.string().max(120)
    }),
    items: Joi.array().items(Joi.object({
        name: Joi.string().trim().min(1).max(120).required(),
        quantity: Joi.string().pattern(/^\d+$/).required(),
        unitPrice: decimalAmount().required(),
        category: Joi.string().max(120).allow(null)
    })).max(100)
});



/**
 * Schema for validating transaction update requests
 * @type {Joi.ObjectSchema}
 * 
 * @property {number} [amount] - Transaction amount (must be positive). Optional.
 * @property {string} [title] - Transaction title. Optional.
 * @property {string} [type] - Transaction type ('INCOME' or 'EXPENSE'). Optional.
 * @property {string} [category] - Transaction category. Optional.
 * @property {string} [description] - Optional transaction description (max 500 characters).
 * @property {Date} [date] - Optional transaction date in ISO 8601 format.
 * @property {string} [receiptUrl] - Optional receipt URL (must be valid URI).
 * @property {string} [location] - Optional transaction location.
 */
export const updateTransactionSchema = Joi.object({
    amount: decimalAmount(),
    title: Joi.string().trim().min(1).max(120),
    type: Joi.string().valid('INCOME', 'EXPENSE'),
    category: Joi.string(),
    categoryId: Joi.string(),
    description: Joi.string().max(500).allow(null),
    date: Joi.date().iso(),
    receiptUrl: Joi.string().uri().allow(null),
    location: Joi.string().allow(null),
    budgetId: Joi.string().allow(null),
    merchant: Joi.object({
        name: Joi.string().trim().max(120).allow(null),
        address: Joi.string().max(500).allow(null),
        purchaseTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow(null),
        paymentMethod: Joi.string().max(80).allow(null),
        reference: Joi.string().max(120).allow(null)
    }),
    items: Joi.array().items(Joi.object({
        name: Joi.string().trim().min(1).max(120).required(),
        quantity: Joi.string().pattern(/^\d+$/).required(),
        unitPrice: decimalAmount().required(),
        category: Joi.string().max(120).allow(null)
    })).max(100)
}).min(1);



/**
 * Schema for validating bulk transaction creation requests
 * @type {Joi.ObjectSchema}
 * 
 * @property {Array<Object>} transactions - Array of transaction objects to create. Required.
 *   - Must contain at least 1 transaction
 *   - Maximum 100 transactions per request
 *   - Each transaction must conform to createTransactionSchema
 */
export const bulkCreateSchema = Joi.object({
    transactions: Joi.array().items(createTransactionSchema).min(1).max(100).required()
})


/**
 * Validation schema for a transaction id path parameter.
 */
export const transactionIdSchema = Joi.object({
    id: Joi.string().required()
})
