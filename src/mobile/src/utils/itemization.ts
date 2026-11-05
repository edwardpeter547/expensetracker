/**
 * Safe money math for manually maintained purchased items.
 *
 * Quantity is treated as a whole number and money is computed through the
 * existing 1e-4 scaled-integer helpers, so item totals never pass through
 * binary floating point.
 */

import type { ItemizationTotals, PurchasedItem } from '@/types/transaction';
import {
    addMoney,
    fromScaledInteger,
    subtractMoney,
    toScaledInteger,
} from '@/utils/money';

/**
 * Return whether a quantity string is a positive whole number.
 *
 * @param {string} quantity The raw quantity.
 * @returns {boolean} True when valid.
 */
export const isValidQuantity = (quantity: string): boolean =>
    /^\d+$/.test(quantity.trim()) && Number(quantity) > 0;

/**
 * Return whether a unit price is a positive canonical decimal.
 *
 * @param {string} unitPrice The raw unit price.
 * @returns {boolean} True when valid.
 */
export const isValidUnitPrice = (unitPrice: string): boolean =>
    /^\d+(\.\d{1,4})?$/.test(unitPrice.trim()) && Number(unitPrice) > 0;

/**
 * Calculate one item total as quantity * unit price in scaled integer space.
 *
 * @param {string} quantity The item quantity.
 * @param {string} unitPrice The item unit price.
 * @returns {string} The exact item total.
 */
export const calculateItemTotal = (quantity: string, unitPrice: string): string => {
    const quantityScaled = BigInt(quantity.trim());
    const priceScaled = toScaledInteger(unitPrice);
    return fromScaledInteger(quantityScaled * priceScaled);
};

/**
 * Calculate the exact subtotal for a list of purchased items.
 *
 * @param {PurchasedItem[]} items The purchased items.
 * @returns {string} The subtotal as a canonical decimal string.
 */
export const calculateItemSubtotal = (items: PurchasedItem[]): string =>
    addMoney(
        items
            .filter((item) => isValidQuantity(item.quantity) && isValidUnitPrice(item.unitPrice))
            .map((item) => calculateItemTotal(item.quantity, item.unitPrice)),
    );

/**
 * Compare the transaction total with the itemized subtotal.
 *
 * A positive difference means the transaction is larger than the item
 * subtotal (for example taxes, delivery, or rounding).
 *
 * @param {string|number} transactionAmount The transaction amount.
 * @param {PurchasedItem[]} items The purchased items.
 * @returns {ItemizationTotals} The subtotal and signed difference.
 */
export const reconcileItemization = (
    transactionAmount: string | number,
    items: PurchasedItem[],
): ItemizationTotals => {
    const subtotal = calculateItemSubtotal(items);
    return {
        subtotal,
        difference: subtractMoney(transactionAmount, subtotal),
    };
};
