import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import {defineConfig} from 'prisma/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeEnvironment = process.env.NODE_ENV || 'development';
const environmentFile = nodeEnvironment === 'testing'
    ? 'test.env'
    : nodeEnvironment === 'development'
        ? 'dev.env'
        : '.env';

// Load the environment file directly rather than importing env.config.js.
// Prisma commands must work at build time without JWT_SECRET, while runtime
// startup still validates that secret through env.config.js.
dotenv.config({
    path: path.resolve(__dirname, 'src/environment', environmentFile),
});

// The Prisma CLI uses the dedicated migration role whenever it is configured.
// Build environments pass MIGRATION_DATABASE_URL explicitly; the application
// runtime never reads this file.
export default defineConfig({
    schema: './src/prisma',
    datasource: {
        url: process.env.MIGRATION_DATABASE_URL
            || process.env.DATABASE_URL
            || 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder',
    }
});
