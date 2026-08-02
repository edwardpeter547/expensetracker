

/**
 * Custom error class for application-specific errors.
 * 
 * @class AppError
 * @extends Error
 * @param {string} message - The error message
 * @param {number} statusCode - HTTP status code (determines if error is 'fail' or 'error')
 * @param {*} errors - Optional error details or validation errors
 * 
 * @description Creates an operational error with status classification based on HTTP status code.
 * Status codes starting with '4' are classified as 'fail', others as 'error'.
 */
class AppError  extends Error {
    constructor(message, statusCode, errors = null){
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4')? 'fail' : 'error';
        this.isOperational = true;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;