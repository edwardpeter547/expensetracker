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

console.log(`Environment variable path: ${envPath}`)

dotenv.config({path: envPath});


const Config = {

    // Server Environment Variables
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
    clientUrl: process.env.CLIENT_URL || '*',

    //Database Environment Variables
    databaseUrl: process.env.DATABASE_URL,

    // Auth Environment variables
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.jwtExpiresIn || "15m",

    // Logging Environment Variables
    serverLogFile: process.env.SERVER_LOG_FILENAME || "server.log",
    serverLogMaxSize: process.env.SERVER_LOG_MAXSIZE || 5242880,
    serverLogMaxFile: process.env.SERVER_LOG_MAXFILE || 4,

    errorLogFile: process.env.ERROR_LOG_FILENAME || "error.log",
    errorLogMaxSize: process.env.ERROR_LOG_MAXSIZE || 5242880,
    errorLogMaxFile: process.env.ERROR_LOG_MAXFILE || 4,

    // Localization Settings
    defaultLocale: process.env.DEFAULT_LOCALE || 'en',

    // SMTP Settings
    smtpFrom: process.env.SMTP_FROM || "noreply@expensetracker.co.uk",


    // Application Settings
    verificationTokenExpiryMinutes: parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_MINUTES || '10'),
    passwordResetTokenExpiryMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || '10'),
    brandName: process.env.SERVICE_BRAND_NAME || 'EXPENSE TRACKER',
    developerName: process.env.DEVELOPER_NAME || 'Retep Systems',

    serverDomain: process.env.HOST_DOMAIN || 'localhost',
    protocol: process.env.HOST_PROTOCOL || 'http'
    
}

Config['baseUrl'] = `${Config.protocol}://${Config.serverDomain}:${Config.port}`;
Config['brandLogo'] = `${Config.baseUrl}/static/images/logo.png`;


export default Config;