/**
 * Sanitization for interpolation parameters on the API error envelope.
 *
 * Translation parameters are interpolated into localised messages, never
 * executed or rendered as HTML. This module reduces an arbitrary params value
 * to a small, JSON-serialisable object of primitive values so an error path
 * can never leak nested structures, functions, or unbounded input through the
 * response boundary.
 */

/**
 * Maximum number of interpolation entries retained per error or field error.
 */
const MAX_PARAM_ENTRIES = 20;

/**
 * Maximum character length retained for a string interpolation value.
 */
const MAX_VALUE_LENGTH = 200;

/**
 * Shape of an acceptable parameter key.
 */
const PARAM_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/**
 * Report whether a value is safe to serialise as an interpolation parameter.
 *
 * Only finite numbers, booleans, strings, and null survive. Arrays, objects,
 * `undefined`, symbols, and non-finite numbers are rejected because they
 * cannot be interpolated predictably and may carry internal state.
 *
 * @param {*} value The candidate value.
 * @returns {boolean} True when the value is a safe primitive.
 */
const isSafeParamValue = (value) => {
    if (value === null) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return true;
    return false;
};

/**
 * Reduce an arbitrary value to safe, bounded interpolation parameters.
 *
 * Non-plain objects (arrays, dates, class instances) and absent values yield
 * `null`. Object keys that do not match the documented key shape are skipped,
 * as are unsafe values and values beyond the configured length/count bounds.
 *
 * @param {*} params The candidate params value.
 * @returns {object|null} A bounded plain object of safe primitives, or null.
 */
export const sanitizeErrorParams = (params) => {
    if (params === null || params === undefined) return null;
    if (typeof params !== 'object' || Array.isArray(params)) return null;

    const sanitized = {};
    let count = 0;

    for (const [key, value] of Object.entries(params)) {
        if (count >= MAX_PARAM_ENTRIES) break;
        if (!PARAM_KEY_PATTERN.test(key)) continue;
        if (!isSafeParamValue(value)) continue;

        let normalized = value;
        if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) {
            normalized = value.slice(0, MAX_VALUE_LENGTH);
        }

        sanitized[key] = normalized;
        count += 1;
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
};
