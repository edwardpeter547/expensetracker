import crypto from 'crypto';
import Config from '../configurations/env.config.js';

/**
 * Accepted shape for an incoming correlation id.
 *
 * The pattern permits URL-safe, non-whitespace identifiers of a bounded length.
 */
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

/**
 * Attach a correlation id to every request.
 *
 * A client-supplied `X-Request-Id` is preserved only when it matches the strict
 * pattern and the deployment explicitly trusts its reverse proxy (see
 * `TRUST_PROXY`). In every other case a fresh `crypto.randomUUID()` value is
 * generated so untrusted clients can never inject misleading identifiers.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @param {import('express').NextFunction} next Express next callback.
 * @returns {void}
 */
export const correlationIdHandler = (request, response, next) => {
    const incoming = request.get('X-Request-Id');
    const trusted = Boolean(Config.trustProxy) && typeof incoming === 'string' && CORRELATION_ID_PATTERN.test(incoming);

    request.id = trusted ? incoming : crypto.randomUUID();
    response.setHeader('X-Request-Id', request.id);

    next();
};
