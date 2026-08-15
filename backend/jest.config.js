export default {
        coverageDirectory: '<rootDir>/coverage',
        coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
        
        projects: [
        {
            displayName: 'UNIT',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/src/**/__tests__/*.test.js'],
            // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
            testTimeout: 10000,

            globals: {
                __DEV__: true,
            },

            collectCoverageFrom: [
                '<rootDir>/src/**/*.{js,jsx,ts,tsx}',
                '!<rootDir>/src/**/__tests__/**',
                '!<rootDir>/src/**/*.test.{js,jsx,ts,tsx}',
                '!<rootDir>/scripts/**',
                '!<rootDir>/src/prisma/**',
                '!<rootDir>/src/configurations/**',
                '!<rootDir>/src/constants/**',
                '!<rootDir>/src/**/*.types.{js,ts}',
                '!<rootDir>/src/**/index.{js,ts}',
                '!<rootDir>/src/**/*.routes.{js,ts}'
            ],
            coverageThreshold: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            },
            
        }
    ],

    // Add this to see what's happening
    verbose: true
};