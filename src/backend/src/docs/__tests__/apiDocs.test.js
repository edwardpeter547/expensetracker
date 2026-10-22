/**
 * API documentation coverage tests.
 *
 * These tests verify that every implemented Express route has a matching
 * OpenAPI operation and that every documented operation maps to an implemented
 * route. The route inventory is built from the actual route modules rather
 * than by guessing Express internals.
 */

import { describe, expect, test } from '@jest/globals';

import apiRouter from '../../routes/index.js';
import authRoutes from '../../routes/v1/auth.routes.js';
import transactionRoutes from '../../routes/v1/transaction.routes.js';
import categoryRoutes from '../../routes/v1/category.routes.js';
import budgetRoutes from '../../routes/v1/budget.routes.js';
import userRoutes from '../../routes/v1/user.routes.js';
import notificationRoutes from '../../routes/v1/notification.routes.js';
import recurringRoutes from '../../routes/v1/recurring.routes.js';
import { loadOpenApiSpec } from '../apiDocs.js';

/**
 * Map of mount prefixes to the route modules mounted there.
 *
 * Express 5 does not retain mount-path strings on router layers, so this
 * registry is the single explicit source for the coverage check. A self-check
 * below fails if a router is mounted but missing from this map.
 */
const MOUNTED_ROUTERS = {
    '/api/v1/auth': authRoutes,
    '/api/v1/transactions': transactionRoutes,
    '/api/v1/categories': categoryRoutes,
    '/api/v1/budgets': budgetRoutes,
    '/api/v1/user': userRoutes,
    '/api/v1/notifications': notificationRoutes,
    '/api/v1/recurring': recurringRoutes,
};

/**
 * Normalize an Express route path into OpenAPI path form.
 *
 * @param {string} expressPath An Express path containing `:param` segments.
 * @returns {string} The path with parameters written as `{param}`.
 */
const normalizePath = (expressPath) => expressPath.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{$1}');

/**
 * Collect `METHOD path` endpoint strings from a router's direct route layers.
 *
 * @param {object} router An Express router.
 * @param {string} prefix Mount prefix to prepend to each route path.
 * @returns {Set<string>} Normalized endpoint strings.
 */
const collectEndpoints = (router, prefix) => {
    const endpoints = new Set();
    for (const layer of router.stack) {
        if (!layer.route) continue;
        const path = normalizePath(`${prefix}${layer.route.path}`).replace(/\/$/, '');
        for (const method of Object.keys(layer.route.methods)) {
            endpoints.add(`${method.toUpperCase()} ${path}`);
        }
    }
    return endpoints;
};

/**
 * Build the implemented endpoint inventory from the route modules.
 *
 * @returns {Set<string>} Normalized `METHOD path` endpoint strings.
 */
const buildImplementedEndpoints = () => {
    const endpoints = new Set();
    for (const [prefix, router] of Object.entries(MOUNTED_ROUTERS)) {
        for (const endpoint of collectEndpoints(router, prefix)) {
            endpoints.add(endpoint);
        }
    }
    // Direct routes on the API router (the health check).
    for (const endpoint of collectEndpoints(apiRouter, '/api/v1')) {
        endpoints.add(endpoint);
    }
    return endpoints;
};

/**
 * Build the documented endpoint inventory from the OpenAPI specification.
 *
 * @param {object} spec The parsed OpenAPI document.
 * @returns {Set<string>} Normalized `METHOD path` endpoint strings.
 */
const buildDocumentedEndpoints = (spec) => {
    const endpoints = new Set();
    for (const [path, item] of Object.entries(spec.paths || {})) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']) {
            if (item[method]) endpoints.add(`${method.toUpperCase()} ${path}`);
        }
    }
    return endpoints;
};

describe('OpenAPI documentation', () => {
    /**
     * The committed specification must parse and declare OpenAPI 3.1.0 with
     * at least one documented path.
     */
    test('loads a valid OpenAPI 3.1.0 document with paths', () => {
        const spec = loadOpenApiSpec();

        expect(spec.openapi).toBe('3.1.0');
        expect(spec.paths).toBeDefined();
        expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    });

    /**
     * Every router mounted in the application must be represented in the
     * explicit coverage registry, so a newly added router cannot silently
     * escape the coverage check.
     */
    test('coverage registry accounts for every mounted router', () => {
        const knownRouters = new Set(Object.values(MOUNTED_ROUTERS));

        for (const layer of apiRouter.stack) {
            if (layer.name === 'router') {
                expect(knownRouters.has(layer.handle)).toBe(true);
            }
        }
    });

    /**
     * The implemented and documented endpoint sets must match exactly, after
     * normalizing Express `:id` parameters to OpenAPI `{id}` parameters.
     */
    test('implemented routes and documented operations match exactly', () => {
        const implemented = buildImplementedEndpoints();
        const documented = buildDocumentedEndpoints(loadOpenApiSpec());

        const missingFromDocs = [...implemented].filter((endpoint) => !documented.has(endpoint)).sort();
        const undocumentedInApp = [...documented].filter((endpoint) => !implemented.has(endpoint)).sort();

        expect(missingFromDocs).toEqual([]);
        expect(undocumentedInApp).toEqual([]);
    });
});
