import { describe, expect, test } from '@jest/globals';
import { DeletionPolicy, ERASE, REVIEW, RETAIN } from '../policy.js';

describe('DeletionPolicy', () => {
    const policy = new DeletionPolicy({ version: 1 });

    /**
     * With no recorded retention decision, a category erases by default.
     */
    test('erases by default', () => {
        expect(policy.resolve({ requestType: 'VOLUNTARY', dataCategory: 'transactions' }).action).toBe(ERASE);
    });

    /**
     * An approved retention decision returns RETAIN.
     */
    test('retains when an approved exception is recorded', () => {
        expect(policy.resolve({
            requestType: 'STATUTORY',
            dataCategory: 'transactions',
            retentionDecision: { action: RETAIN, reason: 'legal' },
        }).action).toBe(RETAIN);
    });

    /**
     * An unresolved exception requires human review.
     */
    test('requires review for an unresolved exception', () => {
        expect(policy.resolve({
            requestType: 'STATUTORY',
            dataCategory: 'transactions',
            retentionDecision: { action: REVIEW },
        }).action).toBe(REVIEW);
    });
});
