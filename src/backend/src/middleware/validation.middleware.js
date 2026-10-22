import AppError from "../utils/appError.js";

/**
 * Middleware factory function for validating request body against a Joi schema.
 * 
 * @param {Object} schema - A Joi schema object used to validate the request body
 * @returns {Function} Express middleware function that validates incoming requests
 * 
 * @description
 * Creates a validation middleware that:
 * - Validates the request body using the provided Joi schema
 * - Collects all validation errors (abortEarly: false)
 * - Strips unknown fields from the request body (stripUnknown: true)
 * - Transforms validation errors into a structured format with field names and messages
 * - Passes control to the next middleware if validation succeeds
 * - Returns a 400 Bad Request error with detailed error information if validation fails
 * 
 * @example
 * // Usage in route definition:
 * import { validate } from './validation.middleware.js';
 * import { expenseSchema } from './schemas.js';
 * 
 * router.post('/expenses', validate(expenseSchema), expenseController.create);
 */
export const validate = (schema) => {
    return (request, response, next) => {
        const {error, value} = schema.validate(request.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if(error){
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return next(new AppError('Validation failed', 400, errors));
        }

        request.body = value;
        next();
    }
}



/**
 * Middleware factory function for validating query parameters against a Joi schema.
 * 
 * @param {Object} schema - A Joi schema object used to validate query parameters
 * @returns {Function} Express middleware function that validates incoming requests
 * 
 * @description
 * Creates a validation middleware that:
 * - Validates the request query parameters using the provided Joi schema
 * - Returns all validation errors at once (default abortEarly behavior)
 * - Passes control to the next middleware if validation succeeds
 * - Returns a 400 Bad Request error if validation fails
 * 
 * @example
 * // Usage in route definition:
 * import { validateQuery } from './validation.middleware.js';
 * import { querySchema } from './schemas.js';
 * 
 * router.get('/expenses', validateQuery(querySchema), expenseController.list);
 */
export const validateQuery = (schema) => {
    return (request, response, next) => {
        const {error, value} = schema.validate(request.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if(error){
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
            return next(new AppError('Invalid Query parameters', 400, errors));
        }

        request.query = value;
        next();
    }
}



/**
 * Middleware factory function for validating route parameters against a Joi schema.
 * 
 * @param {Object} schema - A Joi schema object used to validate route parameters
 * @returns {Function} Express middleware function that validates incoming requests
 * 
 * @description
 * Creates a validation middleware that:
 * - Validates the request route parameters using the provided Joi schema
 * - Returns validation error on first failure (default abortEarly behavior)
 * - Passes control to the next middleware if validation succeeds
 * - Returns a 400 Bad Request error if validation fails
 * 
 * @example
 * // Usage in route definition:
 * import { validateParams } from './validation.middleware.js';
 * import { paramsSchema } from './schemas.js';
 * 
 * router.get('/expenses/:id', validateParams(paramsSchema), expenseController.getById);
 */
export const validateParams = (schema) => {
    return (request, response, next) => {
        const {error, value} = schema.validate(request.params, {
            abortEarly: false,
            stripUnknown: true
        });
        if(error){
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
            return next(new AppError('Invalid parameters', 400, errors));
        }

        request.params = value;
        next();
    }
}