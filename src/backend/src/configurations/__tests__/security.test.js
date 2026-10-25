/**
 * Unit tests for CORS allow-list and HSTS options.
 */
import { describe, expect, test } from '@jest/globals';
import Config from '../env.config.js';
import { corsOptions, hstsOptions } from '../security.config.js';

describe('CORS allow-list', () => {
    test('allows requests without an Origin header', (done) => {
        corsOptions.origin(undefined, (error, allowed) => {
            expect(error).toBeNull();
            expect(allowed).toBe(true);
            done();
        });
    });

    test('allows a configured origin', (done) => {
        corsOptions.origin(Config.clientOrigins[0], (error, allowed) => {
            expect(error).toBeNull();
            expect(allowed).toBe(true);
            done();
        });
    });

    test('rejects an unconfigured origin without an error', (done) => {
        corsOptions.origin('https://evil.example.com', (error, allowed) => {
            expect(error).toBeNull();
            expect(allowed).toBe(false);
            done();
        });
    });
});

describe('HSTS options', () => {
    test('uses a positive max age and includes subdomains', () => {
        expect(hstsOptions.maxAge).toBeGreaterThan(0);
        expect(hstsOptions.includeSubDomains).toBe(true);
    });
});
