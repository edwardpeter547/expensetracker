/**
 * Unit tests for safe purchased-item money math.
 */

import type { PurchasedItem } from '@/types/transaction';
import {
    calculateItemSubtotal,
    calculateItemTotal,
    reconcileItemization,
} from '@/utils/itemization';

describe('itemization money helpers', () => {
    it('calculates quantity times unit price without floating point drift', () => {
        expect(calculateItemTotal('3', '0.10')).toBe('0.3');
        expect(calculateItemTotal('2', '1.99')).toBe('3.98');
    });

    it('calculates an exact subtotal', () => {
        const items: PurchasedItem[] = [
            { id: '1', name: 'Milk', quantity: '2', unitPrice: '1.20' },
            { id: '2', name: 'Bread', quantity: '1', unitPrice: '2.10' },
        ];
        expect(calculateItemSubtotal(items)).toBe('4.5');
    });

    it('reconciles transaction amount against the item subtotal', () => {
        const items: PurchasedItem[] = [
            { id: '1', name: 'Coffee', quantity: '1', unitPrice: '4.50' },
        ];
        expect(reconcileItemization('5.50', items)).toEqual({
            subtotal: '4.5',
            difference: '1',
        });
    });
});
