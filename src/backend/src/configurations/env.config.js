import dotenv from 'dotenv';
import {fileURLToPath} from 'url';
import {resolve, dirname} from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const nodeEnvironment = process.env.NODE_ENV || "development";

let environ = '.env';

if(nodeEnvironment === 'development'){
    environ = 'dev.env';
}else if(nodeEnvironment === 'testing'){
    environ = 'test.env';
}else{
    environ = '.env'
}

const envPath = resolve(__dirname, '..', 'environment', environ);

dotenv.config({path: envPath});

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error('JWT_SECRET must be set to a non-empty value before the server starts.');
}

const Config = {

    // Server Environment Variables
    port: process.env.PORT || 3000,
    // Development binds all interfaces so physical devices on the LAN can
    // reach the API. Staging/production default to loopback and are expected
    // to sit behind a reverse proxy or be explicitly configured.
    host: process.env.HOST || (nodeEnvironment === 'development' ? '0.0.0.0' : '127.0.0.1'),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
    // Explicit, credentialed CORS allow-list. CLIENT_URLS (comma-separated)
    // overrides the single CLIENT_URL value. No wildcard is used.
    clientOrigins: (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),

    // HSTS is enabled only behind a trusted reverse proxy in production.
    enableHsts: process.env.ENABLE_HSTS === 'true',
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '15552000', 10),

    //Database Environment Variables
    databaseUrl: process.env.DATABASE_URL,

    // Auth Environment variables
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || process.env.jwtExpiresIn || "15m",
    jwtIssuer: process.env.JWT_ISSUER || 'expensetracker-api',
    jwtAudience: process.env.JWT_AUDIENCE || 'expensetracker',

    // Logging Environment Variables
    serverLogFile: process.env.SERVER_LOG_FILENAME || "server.log",
    serverLogMaxSize: process.env.SERVER_LOG_MAXSIZE || 5242880,
    serverLogMaxFile: process.env.SERVER_LOG_MAXFILE || 4,

    errorLogFile: process.env.ERROR_LOG_FILENAME || "error.log",
    errorLogMaxSize: process.env.ERROR_LOG_MAXSIZE || 5242880,
    errorLogMaxFile: process.env.ERROR_LOG_MAXFILE || 4,

    // Localization Settings
    defaultLocale: process.env.DEFAULT_LOCALE || 'en',

    // File storage. `driver` selects local filesystem, S3/compatible object
    // storage, or disabled. Storage is opt-in: leaving it unset disables
    // upload persistence while keeping the deterministic default avatar.
    storageDriver: process.env.STORAGE_DRIVER || 'disabled',
    storageLocalRoot: process.env.STORAGE_LOCAL_ROOT || '',
    storageS3Bucket: process.env.STORAGE_S3_BUCKET || '',
    storageS3Region: process.env.STORAGE_S3_REGION || '',
    storageS3Endpoint: process.env.STORAGE_S3_ENDPOINT || '',

    // Avatar uploads.
    avatarUploadLimitBytes: parseInt(process.env.AVATAR_UPLOAD_LIMIT_BYTES || '5242880', 10),
    avatarRateLimit: {
        windowMs: parseInt(process.env.AVATAR_RATE_LIMIT_WINDOW_MS || '3600000', 10),
        limit: parseInt(process.env.AVATAR_RATE_LIMIT_MAX || '30', 10),
    },

    // Account-deletion recovery reauthentication and durable worker.
    deletionRecoveryRateLimit: {
        windowMs: parseInt(process.env.DELETION_RECOVERY_RATE_LIMIT_WINDOW_MS || '3600000', 10),
        limit: parseInt(process.env.DELETION_RECOVERY_RATE_LIMIT_MAX || '5', 10),
    },
    deletionWorker: {
        intervalMs: parseInt(process.env.DELETION_WORKER_INTERVAL_MS || '60000', 10),
        leaseTtlMs: parseInt(process.env.DELETION_WORKER_LEASE_TTL_MS || '60000', 10),
        maxRetries: parseInt(process.env.DELETION_WORKER_MAX_RETRIES || '5', 10),
    },

    // SMTP Settings
    smtpFrom: process.env.SMTP_FROM || "noreply@expensetracker.co.uk",


    // Application Settings
    verificationTokenExpiryMinutes: parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_MINUTES || '10'),
    passwordResetTokenExpiryMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || '10'),
    brandName: process.env.SERVICE_BRAND_NAME || 'EXPENSE TRACKER',
    developerName: process.env.DEVELOPER_NAME || 'Retep Systems',

    serverDomain: process.env.HOST_DOMAIN || 'localhost',
    protocol: process.env.HOST_PROTOCOL || 'http',

    // Reverse-proxy trust. Off by default so arbitrary client-controlled
    // X-Forwarded-* headers cannot spoof IPs used by rate limiting. Set to the
    // number of trusted proxy hops (or a documented subnet/name) only when the
    // deployment topology is known.
    trustProxy: (() => {
        const value = process.env.TRUST_PROXY;
        if (value === undefined || value === '' || value === 'false') return false;
        const numeric = Number(value);
        return Number.isInteger(numeric) && numeric >= 0 ? numeric : false;
    })(),

    // Endpoint-specific authentication rate limits.
    authRateLimits: {
        login: {
            windowMs: parseInt(process.env.AUTH_RATE_LIMIT_LOGIN_WINDOW_MS || '60000', 10),
            limit: parseInt(process.env.AUTH_RATE_LIMIT_LOGIN_MAX || '10', 10),
        },
        register: {
            windowMs: parseInt(process.env.AUTH_RATE_LIMIT_REGISTER_WINDOW_MS || '60000', 10),
            limit: parseInt(process.env.AUTH_RATE_LIMIT_REGISTER_MAX || '5', 10),
        },
        forgotPassword: {
            windowMs: parseInt(process.env.AUTH_RATE_LIMIT_FORGOT_WINDOW_MS || '3600000', 10),
            limit: parseInt(process.env.AUTH_RATE_LIMIT_FORGOT_MAX || '5', 10),
        },
        resendVerification: {
            windowMs: parseInt(process.env.AUTH_RATE_LIMIT_RESEND_WINDOW_MS || '3600000', 10),
            limit: parseInt(process.env.AUTH_RATE_LIMIT_RESEND_MAX || '5', 10),
        },
        refreshToken: {
            windowMs: parseInt(process.env.AUTH_RATE_LIMIT_REFRESH_WINDOW_MS || '60000', 10),
            limit: parseInt(process.env.AUTH_RATE_LIMIT_REFRESH_MAX || '30', 10),
        },
    },

    // Global API rate limit applied to every /api request.
    globalApiRateLimit: {
        windowMs: parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || '900000', 10),
        limit: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX || '100', 10),
    },

    // Failed-login protection policy.
    loginLockout: {
        failureLimit: parseInt(process.env.AUTH_LOCKOUT_FAILURE_LIMIT || '5', 10),
        baseWindowMs: parseInt(process.env.AUTH_LOCKOUT_BASE_WINDOW_MS || '300000', 10),
        maxWindowMs: parseInt(process.env.AUTH_LOCKOUT_MAX_WINDOW_MS || '1800000', 10),
    },
    
}

Config['baseUrl'] = `${Config.protocol}://${Config.serverDomain}:${Config.port}`;
Config['brandLogo'] = `${Config.baseUrl}/static/images/logo.png`;
Config['avatarDefaultUrl'] = `${Config.baseUrl}/static/images/default-avatar.svg`;
Config['avatarRetrievalUrl'] = `${Config.baseUrl}/api/v1/user/avatar`;


export default Config;
