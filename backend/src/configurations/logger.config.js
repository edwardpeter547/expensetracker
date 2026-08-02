import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import Config from './env.config.js';
import { getDirectory } from '../utils/helpers.js'
import { APPLICATION_MODE } from '../constants/audit.actions.js';

const __dirname = getDirectory(import.meta.url)


/**
 * File logging format: combines timestamp, error stack traces, variable substitution, and JSON output
 * Used for file transports to capture complete structured logs
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    winston.format.errors({stack: true}),
    winston.format.splat(),
    winston.format.json()
);



/**
 * Console logging format: colorized output with timestamp and metadata
 * Used only in non-production environments for developer-friendly output
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} ${level}: ${Object.keys(meta).length ? JSON.stringify(meta): ''}`;
    })
);


/**
 * Winston logger instance configured with file and console transports
 * - Production: logs only 'info' level and above
 * - Development: logs 'debug' level and above
 * - Console output only enabled in non-production environments
 */


const logger = winston.createLogger({
    level: Config.nodeEnv === APPLICATION_MODE.PRODUCTION || Config.nodeEnv === APPLICATION_MODE.TESTING ? 'info' : 'debug',
    format: logFormat,
    transports: [
        // Write all logs to server.log
        new winston.transports.File({
            filename: path.join(__dirname, `../logs/${Config.serverLogFile}`),
            maxsize: Config.serverLogMaxSize, // 5MB
            maxFiles: Config.serverLogMaxFile
        }),
        // Write error logs to error.log
        new winston.transports.File({
            filename: path.join(__dirname, `../logs/${Config.errorLogFile}`),
            maxsize: Config.errorLogMaxSize,
            maxFiles: Config.errorLogMaxFile
        })
    ],
    // Dont exit on uncaught exceptions
    exitOnError: false
});

// Add console transport only in non-production environments
if(Config.nodeEnv !== APPLICATION_MODE.PRODUCTION || config.nodeEnv === APPLICATION_MODE.TESTING){
    logger.add(new winston.transports.Console({
        format: consoleFormat,
    }))
}

/**
 * Morgan stream adapter for integrating Express HTTP logger with Winston
 * Captures HTTP request logs and writes them through the logger
 */
export const morganStream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

export default logger;