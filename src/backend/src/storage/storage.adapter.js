/**
 * Provider-independent storage contract.
 *
 * Every adapter implements `put`, `get`, `delete`, and `exists` against a
 * stable object interface so business logic never depends on filesystem paths,
 * S3 SDK types, or provider credentials.
 */

/**
 * A normalized storage failure.
 *
 * Adapters translate provider and filesystem errors into this type so callers
 * can map them to meaningful HTTP responses without importing provider code.
 */
export class StorageError extends Error {
    /**
     * @param {string} message Human-readable error message.
     * @param {{statusCode?: number, code?: string, cause?: Error}} [options]
     *   Optional status code, stable code, and underlying cause.
     */
    constructor(message, { statusCode = 503, code = 'STORAGE_ERROR', cause } = {}) {
        super(message);
        this.name = 'StorageError';
        this.statusCode = statusCode;
        this.code = code;
        if (cause !== undefined) this.cause = cause;
    }
}

/**
 * Whether a storage key is a safe provider-independent object identifier.
 *
 * Keys must be non-empty, under a fixed length, and composed of slash-separated
 * segments of alphanumeric characters plus `._-`. This rejects absolute paths,
 * `..` traversal, backslashes, empty segments, and control characters.
 *
 * @param {unknown} key The candidate key.
 * @returns {boolean} True when the key is safe.
 */
export const isSafeStorageKey = (key) => {
    if (typeof key !== 'string' || key.length === 0 || key.length > 1024) return false;
    if (key.includes('\0') || key.includes('\\')) return false;
    if (key.startsWith('/') || key.endsWith('/')) return false;

    return key.split('/').every((segment) => /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(segment));
};

/**
 * Throw when a storage key is unsafe.
 *
 * @param {unknown} key The candidate key.
 * @returns {void}
 * @throws {StorageError} With status 400 when the key is unsafe.
 */
export const assertSafeStorageKey = (key) => {
    if (!isSafeStorageKey(key)) {
        throw new StorageError('Invalid storage key', { statusCode: 400, code: 'INVALID_KEY' });
    }
};

/**
 * Abstract base contract for storage providers.
 */
export class StorageAdapter {
    /**
     * Store bytes under a key.
     *
     * @param {{key: string, buffer: Buffer, contentType: string}} params Object data.
     * @returns {Promise<{key: string, contentType: string}>} Stored object metadata.
     */
    async put() {
        throw new Error('Not implemented');
    }

    /**
     * Read an object by key.
     *
     * @param {string} key The object key.
     * @returns {Promise<{buffer: Buffer, contentType: string}>} Object bytes and type.
     */
    async get() {
        throw new Error('Not implemented');
    }

    /**
     * Delete an object by key, behaving predictably when it is already missing.
     *
     * @param {string} key The object key.
     * @returns {Promise<void>}
     */
    async delete() {
        throw new Error('Not implemented');
    }

    /**
     * Whether an object exists under a key.
     *
     * @param {string} key The object key.
     * @returns {Promise<boolean>} True when the object exists.
     */
    async exists() {
        throw new Error('Not implemented');
    }
}
