import morgan from 'morgan';
import { morganStream } from './logger.config.js';
import Config from './env.config.js';
import { APPLICATION_MODE } from '../constants/audit.actions.js';


/**
 * Custom token: body
 * Extracts and serializes the request body for logging
 */
morgan.token('body', (request) => {
    return JSON.stringify(request.body);
});


/**
 * Custom token: user
 * Retrieves the authenticated user ID or defaults to 'anonymous'
 */
morgan.token('user', (request) => {
    return request.user?.id || 'anonymous'
});


/**
 * Determines the appropriate morgan logging format based on the environment
 * Production: Logs remote address, user, method, URL, status, and response time
 * Development: Logs method, URL, status, response time, content length, and user agent
 * 
 * @returns {string} The morgan format string for the current environment
 */
const getMorganFormat = () => {
    if(Config.nodeEnv === APPLICATION_MODE.PRODUCTION){
        return ':remote-addr - :user - :method :url :status :response-time ms';
    }else{
        return ':method :url :status :response-time ms - :res[content-length] - :user-agent';
    }
};


/**
 * Main morgan middleware for HTTP request logging
 * Logs all requests except health check endpoints (/health, /ping)
 * Uses environment-specific format and streams to configured logger
 */
export const morganMiddleware = morgan(getMorganFormat(), {
    stream: morganStream,
    skip: (request) => {
        // Skip logging for healthcheck endpoints
        return request.url === '/health' || request.url === '/ping';
    }
});


/**
 * Detailed morgan middleware for debugging
 * Uses 'combined' format for verbose request logging
 * Logs immediately upon request receipt
 */
export const morganDetailed = morgan('combined', {
    stream: morganStream,
    immediate: true, 
});