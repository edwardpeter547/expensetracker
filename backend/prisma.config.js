import Config from "./src/configurations/env.config.js";
import {defineConfig} from 'prisma/config';

export default defineConfig({
    schema: './src/prisma',
    datasource: {
        url: Config.databaseUrl, 
    }
});