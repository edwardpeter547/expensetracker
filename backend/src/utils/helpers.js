import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import Config from '../configurations/env.config.js';
import AppError from './appError.js';

export const generateTokens = (userId, email) => {
    const accessToken = jwt.sign(
        {userId, email},
        Config.jwtSecret,
        {expiresIn: Config.jwtExpiresIn}
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    return {accessToken, refreshToken}
}


export const getDirectory = (url) => {
    const __filename = fileURLToPath(url)
    return path.dirname(__filename);
}


export const maskEmail = (emailAddress) => {
    if(!emailAddress || !emailAddress.includes('@')) return emailAddress;

    const [local, domain] = emailAddress.split('@');
    if(local.length <= 2) return `${local}***@${domain}`;
    return `${local.slice(0, 2)}***${local.slice(-2)}@${domain}`;
}


export const getAppLocale = (request) => {
    const requestLocale = request.headers['accept-language']?.split('-')[0] || request.query.lang;
    const userLocale = request.user?.language;
    const lang = userLocale || requestLocale || Config.defaultLocale;
    return lang;
}


export const parseDate = (dateString) => {
    if(!dateString) return new Date();

    const date = new Date(dateString);

    if(isNaN(date.getTime())){
        throw new AppError('Invalid date format', StatusCodes.BAD_REQUEST);
    }

    return date;
}