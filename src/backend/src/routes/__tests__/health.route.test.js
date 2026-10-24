/**
 * Unit tests for the lightweight API health handler.
 *
 * The handler is tested directly with a mock Express response so the suite
 * never opens a network listener and performs no database access.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { healthHandler } from '../index.js';

/**
 * Build a mock Express response capturing `status` and `json` calls.
 *
 * @returns {{status: jest.Mock, json: jest.Mock}} The response spies.
 */
const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { status, json };
};

describe('GET /api/v1/health handler', () => {
    /**
     * The liveness handler must return the documented minimal payload.
     */
    test('returns the documented process-liveness payload', () => {
        const response = makeResponse();

        healthHandler({}, response);

        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({
            status: 'ok',
            service: 'expensetracker-api',
        });
    });
});
