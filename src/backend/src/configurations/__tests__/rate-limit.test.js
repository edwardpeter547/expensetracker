/**
 * Unit tests for the authentication rate-limit factory: 429 envelope,
 * Retry-After, and per-endpoint independence.
 */
import { describe, expect, jest, test } from '@jest/globals';
import { createAuthRateLimiter } from '../rate-limit.config.js';

const invoke = async (limiter, ip) => {
    const req = {
        ip,
        headers: {},
        socket: {remoteAddress: ip},
        app: {get: () => false},
    };
    const res = {
        statusCode: 200,
        setHeader: jest.fn(),
        status: jest.fn(function (code) {
            this.statusCode = code;
            return this;
        }),
        json: jest.fn(function () {
            return this;
        }),
    };
    const next = jest.fn();
    await limiter(req, res, next);
    return {req, res, next};
};

describe('authentication rate limiting', () => {
    test('returns the 429 envelope with Retry-After once the limit is exceeded', async () => {
        const limiter = createAuthRateLimiter({windowMs: 60000, limit: 3});

        for (let i = 0; i < 3; i += 1) {
            const {res, next} = await invoke(limiter, '10.0.0.1');
            expect(res.status).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
        }

        const {res, next} = await invoke(limiter, '10.0.0.1');
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            status: 429,
            errors: null,
        }));
        expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    test('limits are independent between endpoints', async () => {
        const first = createAuthRateLimiter({windowMs: 60000, limit: 3});
        const second = createAuthRateLimiter({windowMs: 60000, limit: 3});

        for (let i = 0; i < 3; i += 1) {
            await invoke(first, '10.0.0.2');
        }
        const exhausted = await invoke(first, '10.0.0.2');
        expect(exhausted.res.status).toHaveBeenCalledWith(429);

        const independent = await invoke(second, '10.0.0.2');
        expect(independent.next).toHaveBeenCalledTimes(1);
        expect(independent.res.status).not.toHaveBeenCalled();
    });
});
