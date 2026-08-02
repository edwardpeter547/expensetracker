/**
 * @file app.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Express application entry point — configures middleware, routes, and error handling
 *
 * Sets up the Express server with security middleware (helmet, cors, rate limiting),
 * request parsing (JSON, URL-encoded, cookies), internationalization (i18n), logging,
 * and API routes. Includes a health check endpoint and centralized error handling.
 *
 * @module app
 */

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import Config from './configurations/env.config.js';
import i18n from './configurations/i18n.config.js';
import { morganMiddleware } from './configurations/morgan.config.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { langHandler } from './middleware/lang.middleware.js';
import router from './routes/index.js';
import { getDirectory } from './utils/helpers.js';

const app = express();


// Security Middleware
app.use(helmet());
app.use(cors({origin: Config.clientUrl, credentials: true}));
app.use(compression());
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));
app.use(cookieParser());
app.use(morganMiddleware);

// Initialize i18n and language handler middleware
app.use(i18n.init);
app.use(langHandler);

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
})


// Api Routes
app.use('/static', express.static(path.join(getDirectory(import.meta.url), '../public')));
app.use('/api', limiter);
app.use('/api/v1', router);

// 404 handler
app.use(notFoundHandler);

// Global Error handler
app.use(errorHandler);

export default app;
