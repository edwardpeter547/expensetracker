import Config from './env.config.js';

/**
 * CORS options with an explicit, credentialed origin allow-list.
 *
 * Requests without an Origin header (native mobile, curl) are allowed; browser
 * requests are allowed only when their Origin is in Config.clientOrigins.
 * Returning `false` for unknown origins omits CORS headers so the browser
 * blocks the response. A wildcard origin is never used.
 */
export const corsOptions = {
    credentials: true,
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        callback(null, Config.clientOrigins.includes(origin));
    },
};

/**
 * HSTS options applied only when TLS terminates at a trusted reverse proxy.
 */
export const hstsOptions = {
    maxAge: Config.hstsMaxAge,
    includeSubDomains: true,
};
