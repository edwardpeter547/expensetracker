import Joi from "joi";

/**
 * Schema for validating transaction creation requests
 * @type {Joi.ObjectSchema}
 * 
 * @property {number} amount - Transaction amount (must be positive). Required.
 * @property {string} type - Transaction type ('INCOME' or 'EXPENSE'). Required.
 * @property {string} category - Transaction category. Required.
 * @property {string} [description] - Optional transaction description (max 500 characters).
 * @property {Date} [date] - Optional transaction date in ISO 8601 format.
 * @property {string} [recieptUrl] - Optional receipt URL (must be valid URI).
 * @property {string} [location] - Optional transaction location.
 */
export const createTransactionSchema = Joi.object({
    amount: Joi.number().positive().required(),
    type: Joi.string().valid('INCOME', 'EXPENSE').required(),
    category: Joi.string().required(),
    description: Joi.string().max(500),
    date: Joi.date().iso(),
    recieptUrl: Joi.string().uri(),
    location: Joi.string()
});



/**
 * Schema for validating transaction update requests
 * @type {Joi.ObjectSchema}
 * 
 * @property {number} [amount] - Transaction amount (must be positive). Optional.
 * @property {string} [type] - Transaction type ('INCOME' or 'EXPENSE'). Optional.
 * @property {string} [category] - Transaction category. Optional.
 * @property {string} [description] - Optional transaction description (max 500 characters).
 * @property {Date} [date] - Optional transaction date in ISO 8601 format.
 * @property {string} [recieptUrl] - Optional receipt URL (must be valid URI).
 * @property {string} [location] - Optional transaction location.
 */
export const updateTransactionSchema = Joi.object({
    amount: Joi.number().positive(),
    type: Joi.string().valid('INCOME', 'EXPENSE'),
    category: Joi.string(),
    description: Joi.string().max(500),
    date: Joi.date().iso(),
    recieptUrl: Joi.string().uri(),
    location: Joi.string()
});



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


export const transactionIdSchema = Joi.object({
    id: Joi.string().required()
})