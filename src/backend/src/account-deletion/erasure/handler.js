/**
 * Common contract for account-data erasure handlers.
 *
 * A handler owns exactly one data category and implements `erase(context)`.
 * Handlers are idempotent, tolerate already-deleted records, and never perform
 * policy decisions; the policy layer decides whether and when a category may be
 * erased.
 */
export class ErasureHandler {
    /**
     * @param {{name: string, dependencies?: string[]}} options Handler metadata.
     */
    constructor({ name, dependencies = [] }) {
        if (new.target === ErasureHandler) {
            throw new Error('Cannot instantiate abstract ErasureHandler');
        }
        if (typeof name !== 'string' || name.length === 0) {
            throw new Error('ErasureHandler requires a non-empty name');
        }
        this.name = name;
        this.dependencies = [...dependencies];
    }

    /**
     * Erase this handler's data category for the user in `context`.
     *
     * @param {object} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase() {
        throw new Error('erase() must be implemented');
    }
}
