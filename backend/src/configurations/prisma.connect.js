import {PrismaPg} from '@prisma/adapter-pg';
import Config from './env.config.js';
import { PrismaClient } from '../prisma/generated/client.js';

const adapter = new PrismaPg({ connectionString: Config.databaseUrl });
const prisma = new PrismaClient({ adapter });

export default prisma;