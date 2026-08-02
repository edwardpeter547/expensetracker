import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../src/configurations/prisma.connect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const NPX_PATH = '/snap/bin/npx';
const BASH_PATH = '/usr/bin/bash';
const ENVIRONMENT = 'testing';


const getModelNames = () => {
    return Object.keys(prisma).filter(key => {
        return !key.startsWith('$') &&
                !key.startsWith('_') &&
                typeof prisma[key] === 'object' &&
                prisma[key]?.deleteMany;
    })
}


const getDbTables = async () => {
    let existingTables = [];
    try{
        const result = await prisma.$queryRaw`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
        `;
        
        existingTables = result.map(r => r.tablename).filter(name => name !== '_prisma_migrations');
        return existingTables;

    }catch(error){
        console.error('Failed to fetch table list', error.message);
        return existingTables;
    }
}
 

export const resetTestDatabase = () => {
    console.log('Preparing to reset database');
    
    try {
        // Execute the shell script
        execSync(`NODE_ENV=${ENVIRONMENT} ${NPX_PATH} prisma migrate reset --force`, {
            stdio: 'inherit',
            shell: true
        });

    } catch (error) {
        console.error('❌ Database reset failed:', error.message);
        throw error;
    }
}


export const cleanDatabase = async () => {
    const tableList = await getDbTables();
    if(tableList.length === 0){
        return;
    }

    try{

        for(const table of tableList){
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
        }

        console.log(`🧹 Cleaned ${tableList.length} tables`);
    }
    catch(error){
        console.error('❌ Failed to clean database:', error.message);
        throw error;
    }
}


const createTestUser = async () => {
    const testUser = {
        email: "test@expensetrackeruk.com",
        firstname: "Test",
        lastname: "User",
        username: "testuser",
        password: "Testuser2020@@"
    }

    const hashedPassword = await bcrypt.hash(testUser.password, 12);

    try{

        const user = await prisma.user.create({
            data: {
                ...testUser,
                password: hashedPassword,
                isEmailVerified: false,
                isPhoneVerified: false,
                isActive: false
            }
        });
        console.log('✅ Test user created:', user.email);
        console.log(JSON.stringify(user));
    }
    catch(error){
        console.error('❌ Failed to create test user:', error.message);
        throw error;
    }
}



