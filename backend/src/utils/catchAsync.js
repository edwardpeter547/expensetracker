
/**
 * Higher-order function that wraps async route handlers to catch errors.
 * @param {Function} fn - An async function that takes (request, response, next) parameters
 * @returns {Function} A middleware function that catches any errors thrown by fn and passes them to the error handler
 */
const catchAsync = (fn) => {
    return (request, response, next) => {
        fn(request, response, next).catch(next);
    };
};

export default catchAsync;