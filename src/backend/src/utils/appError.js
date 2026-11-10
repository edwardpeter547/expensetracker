

/**
 * Custom error class for application-specific errors.
 * 
 * @class AppError
 * @extends Error
 * @param {string} message - The error message
 * @param {number} statusCode - HTTP status code (determines if error is 'fail' or 'error')
 * @param {*} errors - Optional error details or validation errors
 * @param {object} [options] - Optional structured error-contract metadata.
 * @param {string} [options.code] - Stable, language-independent error code.
 * @param {object} [options.params] - Safe interpolation parameters.
 * 
 * @description Creates an operational error with status classification based on HTTP status code.
 * Status codes starting with '4' are classified as 'fail', others as 'error'.
 * The optional fourth argument carries the additive `code`/`params` contract
 * fields; the original positional signature remains supported.
 */
class AppError  extends Error {
    constructor(message, statusCode, errors = null, options = {}){
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4')? 'fail' : 'error';
        this.isOperational = true;
        this.errors = errors;
        this.code = options?.code ?? null;
        this.params = options?.params ?? null;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
