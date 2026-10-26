/**
 * @file server.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Server entry point — connects to the database and starts the Express server
 *
 * Initializes the application by connecting to the database via Prisma, then starts
 * the Express server on the configured port. Handles graceful shutdown on SIGTERM
 * by disconnecting from the database and closing the server.
 *
 * @module server.js
 */

import app from "./app.js";
import prisma from "./configurations/prisma.connect.js";
import Config from "./configurations/env.config.js";
import logger from "./configurations/logger.config.js";
import { getStorageAdapter } from "./configurations/storage.config.js";
import { startDeletionWorker } from "./account-deletion/deletion/worker.js";


let server;

/**
 * Gracefully shuts down the HTTP server and disconnects from the database
 *
 * Handles cleanup operations when the application receives a termination signal.
 * Disconnects from the Prisma database, closes the HTTP server, then exits the
 * process with status code 0. This ensures no pending requests are abruptly
 * terminated and database connections are properly released.
 *
 * @param {string} signal - The signal name that triggered the shutdown (e.g., 'SIGTERM', 'SIGINT')
 * @returns {void}
 *
 * @example
 * // Used by process signal handlers
 * process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
 * process.on('SIGINT', () => gracefulShutdown('SIGINT'));
 */
const gracefulShutdown = async (signal) => {
    console.log(`${signal} signal recieved: closing HTTP server`);
    logger.info(`${signal} signal received: closing HTTP server`);
    await prisma.$disconnect();
    server.close(() => {
        console.log('HTTP server closed!');
        logger.info('HTTP server closed!');
        process.exit(0);
    });
}

// Graceful shutdown handler
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


/**
 * Initializes and starts the Express server
 *
 * Connects to the database via Prisma, then starts the Express server on the
 * configured port. Logs the server start information including port, environment,
 * and API URL. If the database connection fails, logs the error and exits the
 * process with status code 1.
 *
 * @async
 * @returns {Promise<void>}
 *
 * @throws Will log the error and exit the process if database connection fails
 *
 * @example
 * // Called at the bottom of the file to bootstrap the application
 * startServer();
 */
const startServer = async () => {
    try{
        await prisma.$connect();
        // Validate and construct the storage adapter at startup so a broken
        // STORAGE_DRIVER configuration fails fast instead of leaving a
        // permanently unavailable upload endpoint.
        getStorageAdapter();
        // Start the durable deletion worker. The interval is only a trigger;
        // all job state, leasing, and progress live in PostgreSQL.
        startDeletionWorker({
            intervalMs: Config.deletionWorker.intervalMs,
            leaseTtlMs: Config.deletionWorker.leaseTtlMs,
        });
        logger.info('Database connected successfully');
        server = app.listen(Config.port, Config.host, () => {
            const serverInfo = {
                port: Config.port,
                host: Config.host,
                environment: Config.nodeEnv,
                apiUrl: `http://localhost:${Config.port}/api/${Config.apiVersion}`
            }

            logger.info('Application Started', serverInfo);

            console.log(`Server running on port ${Config.port}`);
            console.log(`Environment: ${Config.nodeEnv}`);
            console.log(`API URL: http://localhost:${Config.port}/api/${Config.apiVersion}`);
            logger.info("Application Started");
        })

    }catch (error){
        logger.error('Failed to start server', { error: error.message });
        console.log(`Failed to start server: ${error}`);
        process.exit(1);
    }
}


startServer();
