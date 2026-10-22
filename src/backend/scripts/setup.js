/** 
 * This file runs BEFORE any test executes.
 * It sets up the test environment and database.
 */

import prisma from '../src/configurations/prisma.connect.js';
import { cleanDatabase, resetTestDatabase } from './prepare.db.js';


beforeAll(async () => {
    await resetTestDatabase();  // Reset once before all tests
    await prisma.$connect();
});

beforeEach(async () => {
    // Fast cleanup between tests (optional)
    await cleanDatabase();
});

afterAll(async () => {
    await prisma.$disconnect();
});