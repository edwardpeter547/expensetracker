import { Prisma } from '../generated/client.js';

/**
 * Convert an amount input into a canonical decimal string.
 *
 * Uses Prisma's Decimal (decimal.js) so no binary floating-point arithmetic is
 * involved. Strings are the preferred input because JSON numbers can already
 * be lossy.
 *
 * @param {string|number|Prisma.Decimal} value The amount to normalize.
 * @param {number} [maxDecimalPlaces=4] Maximum accepted decimal places.
 * @returns {string} The canonical decimal string.
 * @throws {Error} When the value is not finite or has too many decimal places.
 */
export const toCanonicalDecimal = (value, maxDecimalPlaces = 4) => {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite()) throw new Error('Amount must be a finite number');

    const decimalPlaces = decimal.decimalPlaces();
    if (decimalPlaces > maxDecimalPlaces) {
        throw new Error(`Amount may have at most ${maxDecimalPlaces} decimal places`);
    }

    return decimal.toString();
};

/**
 * Sum any number of amount values exactly.
 *
 * @param {(string|number|Prisma.Decimal)[]} values The values to sum.
 * @returns {Prisma.Decimal} The exact sum.
 */
export const sumMoney = (values) => {
    return values.reduce(
        (total, value) => total.plus(new Prisma.Decimal(value ?? 0)),
        new Prisma.Decimal(0),
    );
};
