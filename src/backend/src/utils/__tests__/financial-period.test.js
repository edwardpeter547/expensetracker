/**
 * Regression tests for timezone-aware financial period boundaries.
 *
 * These tests pin the fix for audit finding BK-12: period boundaries must be
 * derived from the user's IANA timezone and returned as UTC instants, with a
 * safe UTC fallback for missing or invalid preferences.
 */

import { describe, expect, test } from '@jest/globals';
import {
    DEFAULT_TIME_ZONE,
    getPeriodBounds,
    resolveTimeZone,
    startOfMonthInTimeZone,
} from '../financial-period.js';

describe('resolveTimeZone', () => {
    /**
     * A recognized IANA timezone must be returned unchanged.
     */
    test('returns a valid timezone unchanged', () => {
        expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
        expect(resolveTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata');
    });

    /**
     * Missing, empty, and unrecognized preferences must fall back to UTC.
     */
    test('falls back to UTC for missing or invalid values', () => {
        expect(resolveTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
        expect(resolveTimeZone(null)).toBe(DEFAULT_TIME_ZONE);
        expect(resolveTimeZone('')).toBe(DEFAULT_TIME_ZONE);
        expect(resolveTimeZone('Not/AZone')).toBe(DEFAULT_TIME_ZONE);
    });
});

describe('startOfMonthInTimeZone', () => {
    /**
     * The month start must reflect each timezone's offset and be returned as a
     * UTC instant.
     */
    test('derives the month start in the user timezone', () => {
        const reference = new Date('2026-05-10T12:00:00.000Z');

        expect(startOfMonthInTimeZone(reference, 'UTC').toISOString())
            .toBe('2026-05-01T00:00:00.000Z');
        expect(startOfMonthInTimeZone(reference, 'America/New_York').toISOString())
            .toBe('2026-05-01T04:00:00.000Z');
        expect(startOfMonthInTimeZone(reference, 'Asia/Kolkata').toISOString())
            .toBe('2026-04-30T18:30:00.000Z');
    });

    /**
     * A missing preference must fall back to UTC rather than the server clock.
     */
    test('uses UTC when the timezone preference is missing', () => {
        const reference = new Date('2026-05-10T12:00:00.000Z');
        expect(startOfMonthInTimeZone(reference, undefined).toISOString())
            .toBe('2026-05-01T00:00:00.000Z');
    });
});

describe('getPeriodBounds', () => {
    /**
     * A December monthly period must end at the following January in the same
     * timezone, covering the year transition.
     */
    test('rolls monthly boundaries across the year transition', () => {
        const reference = new Date('2026-12-31T23:00:00.000Z');
        const bounds = getPeriodBounds(reference, 'MONTHLY', 'America/New_York');

        expect(bounds.start.toISOString()).toBe('2026-12-01T05:00:00.000Z');
        expect(bounds.end.toISOString()).toBe('2027-01-01T05:00:00.000Z');
    });

    /**
     * Month starts must use the offset in effect in that month, so standard
     * and daylight-saving offsets differ as expected.
     */
    test('applies daylight-saving offsets to month starts', () => {
        const january = getPeriodBounds(
            new Date('2026-01-15T12:00:00.000Z'),
            'MONTHLY',
            'America/New_York',
        );
        const july = getPeriodBounds(
            new Date('2026-07-15T12:00:00.000Z'),
            'MONTHLY',
            'America/New_York',
        );

        expect(january.start.toISOString()).toBe('2026-01-01T05:00:00.000Z');
        expect(july.start.toISOString()).toBe('2026-07-01T04:00:00.000Z');
    });

    /**
     * Weekly periods must keep the existing Sunday-start semantics while
     * resolving the local midnight in the user timezone.
     */
    test('starts weeks on Sunday in the user timezone', () => {
        const reference = new Date('2026-09-06T16:00:00.000Z');
        const bounds = getPeriodBounds(reference, 'WEEKLY', 'America/New_York');

        expect(bounds.start.toISOString()).toBe('2026-09-06T04:00:00.000Z');
        expect(bounds.end.toISOString()).toBe('2026-09-13T04:00:00.000Z');
    });

    /**
     * Unsupported period identifiers must fail loudly rather than silently
     * defaulting to a calendar period.
     */
    test('rejects unsupported periods', () => {
        expect(() => getPeriodBounds(
            new Date('2026-01-01T00:00:00.000Z'),
            'QUARTERLY',
            'UTC',
        )).toThrow(RangeError);
    });
});
