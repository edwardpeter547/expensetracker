/**
 * Tests for boundary error-message localisation.
 *
 * The helper maps a stable error code to the negotiated locale catalogue and
 * falls back to the supplied message whenever the key is absent or the
 * translation input is unusable.
 */

import { describe, expect, test } from '@jest/globals';
import { localizeErrorMessage } from '../localize-error.js';

describe('localizeErrorMessage', () => {
    /**
     * A registered code must resolve to its English catalogue entry.
     */
    test('localizes a known code in English', () => {
        expect(localizeErrorMessage('TRANSACTION_NOT_FOUND', 'en', null, 'Transaction not found'))
            .toBe('Transaction not found');
    });

    /**
     * The same code must resolve to the French catalogue entry when the
     * negotiated locale is French.
     */
    test('localizes a known code in French', () => {
        expect(localizeErrorMessage('TRANSACTION_NOT_FOUND', 'fr', null, 'Transaction not found'))
            .toBe('Transaction introuvable');
    });

    /**
     * Interpolation parameters must be applied to the translated template.
     */
    test('interpolates safe parameters', () => {
        expect(localizeErrorMessage('CATEGORY_IN_USE', 'en', {budgetCount: 2, transactionCount: 5}, 'fallback'))
            .toBe('Category is in use by 2 budgets and 5 transactions');
    });

    /**
     * A code without a catalogue entry must return the supplied fallback.
     */
    test('falls back for an unregistered code', () => {
        expect(localizeErrorMessage('NOT_A_REAL_CODE', 'en', null, 'fallback message'))
            .toBe('fallback message');
    });

    /**
     * Non-string phrases must return the fallback without throwing.
     */
    test('falls back for a missing phrase', () => {
        expect(localizeErrorMessage(null, 'en', null, 'fallback message')).toBe('fallback message');
    });
});
