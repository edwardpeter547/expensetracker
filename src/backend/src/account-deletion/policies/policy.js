/**
 * Policy actions that can be applied to an individual data category.
 */
export const ERASE = 'ERASE';
export const RETAIN = 'RETAIN';
export const REVIEW = 'REVIEW';

/**
 * Decides whether a data category may be erased, retained, or needs review.
 *
 * This is deliberately minimal and jurisdiction-neutral. It implements only the
 * reviewed initial rules: erase by default, retain only on an explicitly
 * recorded and approved exception, and require human review for an unresolved
 * exception. It never infers jurisdiction from IP, currency, timezone, or
 * language.
 */
export class DeletionPolicy {
    /**
     * @param {{version?: number}} [options] The policy version.
     */
    constructor({ version = 1 } = {}) {
        this.version = version;
    }

    /**
     * Resolve the action for a data category.
     *
     * @param {object} params Decision inputs.
     * @param {string} [params.requestType] The request type (VOLUNTARY/STATUTORY).
     * @param {string} [params.dataCategory] The data category.
     * @param {{action?: string, reason?: string, reviewer?: string}} [params.retentionDecision]
     *   An optional recorded retention decision.
     * @returns {{action: string}} The resolved action.
     */
    resolve({ requestType, dataCategory, retentionDecision }) {
        if (retentionDecision?.action === RETAIN) {
            return { action: RETAIN, ...retentionDecision };
        }
        if (retentionDecision?.action === REVIEW) {
            return { action: REVIEW };
        }
        return { action: ERASE };
    }
}

/**
 * Build the initial reviewed deletion policy.
 *
 * @returns {DeletionPolicy} The default policy.
 */
export const createDefaultDeletionPolicy = () => new DeletionPolicy({ version: 1 });
