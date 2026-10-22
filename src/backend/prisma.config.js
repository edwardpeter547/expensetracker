import Config from "./src/configurations/env.config.js";
import {defineConfig} from 'prisma/config';

// The Prisma CLI uses the dedicated migration role whenever it is configured
// (MIGRATION_DATABASE_URL is loaded from dev.env by env.config.js). The
// application runtime never reads this file; it connects through
// src/configurations/prisma.connect.js using Config.databaseUrl.
export default defineConfig({
    schema: './src/prisma',
    datasource: {
        url: process.env.MIGRATION_DATABASE_URL || Config.databaseUrl,
    }
});
