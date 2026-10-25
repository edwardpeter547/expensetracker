/**
 * HTTP-level integration tests for HSTS header gating.
 *
 * The `.integration.test.js` suffix keeps these supertest checks out of the
 * database-free unit run (which cannot open a network listener in the local
 * sandbox) and runs them under the integration harness.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';

const RUN_DB = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN_DB ? describe : describe.skip;
const originalEnableHsts = process.env.ENABLE_HSTS;

describeDb('HSTS header configuration', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.resetModules();
        if (originalEnableHsts === undefined) {
            delete process.env.ENABLE_HSTS;
        } else {
            process.env.ENABLE_HSTS = originalEnableHsts;
        }
    });

    /**
     * When HSTS is disabled, Helmet must not emit its default
     * Strict-Transport-Security header.
     */
    test('omits HSTS when ENABLE_HSTS is false', async () => {
        process.env.ENABLE_HSTS = 'false';
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
        const { default: app } = await import('../../app.js');

        const response = await request(app).get('/api/v1/health');

        expect(response.status).toBe(200);
        expect(response.headers['strict-transport-security']).toBeUndefined();
    });

    /**
     * When HSTS is enabled, the configured max-age and includeSubDomains
     * directive must be present.
     */
    test('emits HSTS when ENABLE_HSTS is true', async () => {
        process.env.ENABLE_HSTS = 'true';
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
        const { default: app } = await import('../../app.js');

        const response = await request(app).get('/api/v1/health');

        expect(response.status).toBe(200);
        expect(response.headers['strict-transport-security']).toMatch(/^max-age=\d+; includeSubDomains$/);
    });
});
