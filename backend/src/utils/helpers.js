import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import Config from '../configurations/env.config.js';
import AppError from './appError.js';

/**
 * Generate an access/refresh token pair for an authenticated user.
 *
 * The access token is a signed HS256 JWT; the refresh token is a random
 * 80-character hex string that is only ever returned here, never persisted
 * directly (callers hash it before storage).
 *
 * @param {number|string} userId The user's unique identifier.
 * @param {string} email The user's email address.
 * @returns {{accessToken: string, refreshToken: string}} The token pair.
 */
export const generateTokens = (userId, email) => {
    const accessToken = jwt.sign(
        {userId, email},
        Config.jwtSecret,
        {expiresIn: Config.jwtExpiresIn}
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    return {accessToken, refreshToken}
}


/**
 * Resolve the directory of a module from its `import.meta.url`.
 *
 * @param {string} url A `file://` URL, typically `import.meta.url`.
 * @returns {string} The absolute directory path.
 */
export const getDirectory = (url) => {
    const __filename = fileURLToPath(url)
    return path.dirname(__filename);
}


/**
 * Partially mask an email address for logging.
 *
 * @param {string|undefined} emailAddress The email address to mask.
 * @returns {string|undefined} The masked address, or the input when absent or
 *   too short to mask safely.
 */
export const maskEmail = (emailAddress) => {
    if(!emailAddress || !emailAddress.includes('@')) return emailAddress;

    const [local, domain] = emailAddress.split('@');
    if(local.length <= 2) return `${local}***@${domain}`;
    return `${local.slice(0, 2)}***${local.slice(-2)}@${domain}`;
}


/**
 * Resolve the effective locale for a request.
 *
 * Prefers the authenticated user's language, then the `Accept-Language`
 * header or query `lang`, then the configured default.
 *
 * @param {import('express').Request} request The Express request.
 * @returns {string} The resolved locale code.
 */
export const getAppLocale = (request) => {
    const requestLocale = request.headers['accept-language']?.split('-')[0] || request.query.lang;
    const userLocale = request.user?.language;
    const lang = userLocale || requestLocale || Config.defaultLocale;
    return lang;
}


/**
 * Parse a date string, falling back to now and rejecting invalid input.
 *
 * @param {string|undefined} dateString The date string, or nothing.
 * @returns {Date} The parsed date.
 * @throws {AppError} If the date string is invalid.
 */
export const parseDate = (dateString) => {
    if(!dateString) return new Date();

    const date = new Date(dateString);

    if(isNaN(date.getTime())){
        throw new AppError('Invalid date format', StatusCodes.BAD_REQUEST);
    }

    return date;
}
