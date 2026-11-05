/**
 * Exact monetary arithmetic for the mobile dashboard.
 *
 * Backend amounts are Prisma `Decimal(19, 4)` values serialized as strings, so
 * they can carry up to four fractional digits. All aggregation here scales
 * those strings into integer units (1e-4 units) and uses `bigint`, which keeps
 * every financial sum free of binary floating-point error. Display rounding is
 * applied once at the formatting boundary, never during intermediate sums.
 */

/** Internal scaling: 4 fractional digits matches the database column. */
const MONEY_SCALE = 4;

/** Decimal string accepted by the scaling parser. */
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Convert a canonical decimal amount into an integer scaled by 10^scale.
 *
 * @param {string|number} value The amount to scale.
 * @param {number} [scale=4] Number of fractional digits to preserve.
 * @returns {bigint} The scaled integer representation.
 * @throws {Error} When the value is not a finite decimal string/number.
 */
export const toScaledInteger = (value: string | number, scale: number = MONEY_SCALE): bigint => {
    const raw = typeof value === 'number' ? String(value) : String(value ?? '');
    const text = raw.trim();
    if (!DECIMAL_PATTERN.test(text)) {
        throw new Error(`Invalid monetary value: ${text}`);
    }

    const negative = text.startsWith('-');
    const unsigned = negative ? text.slice(1) : text;
    const [whole = '0', fraction = ''] = unsigned.split('.');
    const factor = 10n ** BigInt(scale);
    const paddedFraction = (fraction + '0'.repeat(scale)).slice(0, scale) || '0';

    const scaled = BigInt(whole) * factor + BigInt(paddedFraction);
    return negative ? -scaled : scaled;
};

/**
 * Convert a scaled integer back into a canonical decimal string.
 *
 * Trailing zeroes are stripped so `"1234.5600"` normalizes to `"1234.56"`.
 *
 * @param {bigint} value The scaled integer.
 * @param {number} [scale=4] Number of fractional digits to emit.
 * @returns {string} The canonical decimal string.
 */
export const fromScaledInteger = (value: bigint, scale: number = MONEY_SCALE): string => {
    const negative = value < 0n;
    const absolute = negative ? -value : value;
    const factor = 10n ** BigInt(scale);
    const whole = absolute / factor;
    const remainder = absolute % factor;

    let text = whole.toString();
    if (scale > 0 && remainder > 0n) {
        const fraction = remainder.toString().padStart(scale, '0').replace(/0+$/, '');
        if (fraction) text += `.${fraction}`;
    }

    return negative ? `-${text}` : text;
};

/**
 * Sum any number of monetary amounts exactly.
 *
 * @param {Array<string|number>} values The amounts to add.
 * @returns {string} The exact sum as a canonical decimal string.
 */
export const addMoney = (values: (string | number)[]): string => {
    const total = values.reduce(
        (sum, value) => sum + toScaledInteger(value),
        0n,
    );
    return fromScaledInteger(total);
};

/**
 * Subtract one monetary amount from another exactly.
 *
 * @param {string|number} minuend The amount to subtract from.
 * @param {string|number} subtrahend The amount to subtract.
 * @returns {string} The exact difference as a canonical decimal string.
 */
export const subtractMoney = (minuend: string | number, subtrahend: string | number): string => {
    return fromScaledInteger(toScaledInteger(minuend) - toScaledInteger(subtrahend));
};

/**
 * Compute the whole-number percentage change between two monetary amounts.
 *
 * The division happens in scaled-integer space with half-up rounding, so the
 * result never depends on floating-point precision. A non-positive previous
 * amount makes the comparison undefined and yields `null`.
 *
 * @param {string|number} current The current-period amount.
 * @param {string|number} previous The previous-period amount.
 * @returns {number|null} Rounded percentage change, or null when undefined.
 */
export const percentageChange = (
    current: string | number,
    previous: string | number,
): number | null => {
    const previousScaled = toScaledInteger(previous);
    if (previousScaled <= 0n) return null;

    const currentScaled = toScaledInteger(current);
    const delta = currentScaled - previousScaled;
    const numerator = delta * 100n;
    const half = previousScaled / 2n;
    const rounded = (numerator + (numerator >= 0n ? half : -half)) / previousScaled;

    return Number(rounded);
};

/**
 * Compare two canonical decimal amounts for descending numeric ordering.
 *
 * @param {string} left The left operand.
 * @param {string} right The right operand.
 * @returns {number} Negative when `left` is greater, positive when smaller.
 */
export const compareMoneyDescending = (left: string, right: string): number => {
    const leftScaled = toScaledInteger(left);
    const rightScaled = toScaledInteger(right);
    if (leftScaled > rightScaled) return -1;
    if (leftScaled < rightScaled) return 1;
    return 0;
};
