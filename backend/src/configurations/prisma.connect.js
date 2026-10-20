import {PrismaPg} from '@prisma/adapter-pg';
import Config from './env.config.js';
import { PrismaClient } from '../generated/client.js';

/**
 * Create the Prisma client wired to the configured PostgreSQL connection
 * through the `@prisma/adapter-pg` driver adapter.
 */
const adapter = new PrismaPg({ connectionString: Config.databaseUrl });
const prisma = new PrismaClient({ adapter });

export default prisma;
