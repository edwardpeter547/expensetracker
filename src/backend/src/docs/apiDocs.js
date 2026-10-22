/**
 * OpenAPI/Swagger documentation loader and route registration.
 *
 * Loads the committed `src/backend/openapi/openapi.yaml` once and, when API
 * documentation is enabled, exposes:
 * - `GET /api/docs` (interactive Swagger UI), and
 * - `GET /api/openapi.json` (the machine-readable specification).
 *
 * Documentation is disabled by default in production and is controlled by
 * `ENABLE_API_DOCS=true`. When disabled these routes are never mounted, so the
 * specification is not exposed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

import Config from '../configurations/env.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = path.resolve(__dirname, '../../openapi/openapi.yaml');

let cachedSpec = null;

/**
 * Read and parse the committed OpenAPI specification.
 *
 * The result is cached so the file is read at most once per process. A missing
 * or malformed file throws a clear error rather than serving partial content.
 *
 * @returns {object} The parsed OpenAPI document.
 * @throws {Error} If the specification file is missing or is not valid YAML.
 */
export const loadOpenApiSpec = () => {
    if (cachedSpec) return cachedSpec;

    if (!fs.existsSync(OPENAPI_PATH)) {
        throw new Error(`OpenAPI specification not found: ${OPENAPI_PATH}`);
    }

    let parsed;
    try {
        parsed = yaml.load(fs.readFileSync(OPENAPI_PATH, 'utf8'));
    } catch (error) {
        throw new Error(`Failed to parse OpenAPI specification: ${error.message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('OpenAPI specification did not parse to an object');
    }

    cachedSpec = parsed;
    return cachedSpec;
};

/**
 * Mount the documentation endpoints on the Express application.
 *
 * This is intentionally a no-op when `Config.enableApiDocs` is false so the
 * specification is never exposed in production unless explicitly enabled.
 *
 * @param {import('express').Express} app The Express application.
 * @returns {void}
 */
export const registerApiDocs = (app) => {
    if (!Config.enableApiDocs) return;

    const spec = loadOpenApiSpec();

    app.get('/api/openapi.json', (request, response) => {
        response.json(spec);
    });

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'ExpenseTracker API' }));
};
