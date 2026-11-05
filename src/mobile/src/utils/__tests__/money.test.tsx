/**
 * Unit tests for exact dashboard monetary arithmetic.
 *
 * The scenarios verify scaling, summing, subtraction, ordering, and
 * percentage change without binary floating-point error.
 */

import {
    addMoney,
    compareMoneyDescending,
    fromScaledInteger,
    percentageChange,
    subtractMoney,
    toScaledInteger,
} from '@/utils/money';

describe('toScaledInteger / fromScaledInteger', () => {
    it('round-trips decimal strings through integer scaling', () => {
        expect(toScaledInteger('1234.56')).toBe(12345600n);
        expect(fromScaledInteger(12345600n)).toBe('1234.56');
    });

    it('handles negative values and trailing zeroes', () => {
        expect(toScaledInteger('-0.05')).toBe(-500n);
        expect(fromScaledInteger(-500n)).toBe('-0.05');
        expect(fromScaledInteger(12340000n)).toBe('1234');
    });

    it('rejects malformed monetary strings', () => {
        expect(() => toScaledInteger('12.34.56')).toThrow(/Invalid monetary value/);
        expect(() => toScaledInteger('abc')).toThrow(/Invalid monetary value/);
    });
});

describe('addMoney and subtractMoney', () => {
    it('sums without floating-point drift', () => {
        expect(addMoney(['0.1', '0.2', '0.3'])).toBe('0.6');
    });

    it('subtracts one exact amount from another', () => {
        expect(subtractMoney('3200', '1234')).toBe('1966');
        expect(subtractMoney('10', '0.005')).toBe('9.995');
    });
});

describe('percentageChange', () => {
    it('computes a positive rounded percentage', () => {
        expect(percentageChange('1234', '1100')).toBe(12);
    });

    it('computes a negative rounded percentage', () => {
        expect(percentageChange('900', '1000')).toBe(-10);
    });

    it('returns null when the previous period is zero or negative', () => {
        expect(percentageChange('100', '0')).toBeNull();
        expect(percentageChange('100', '-5')).toBeNull();
    });
});

describe('compareMoneyDescending', () => {
    it('orders larger amounts first', () => {
        expect(compareMoneyDescending('450', '240')).toBeLessThan(0);
        expect(compareMoneyDescending('240', '450')).toBeGreaterThan(0);
        expect(compareMoneyDescending('100', '100')).toBe(0);
    });
});
