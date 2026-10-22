/**
 * @file email.config.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Nodemailer transporter configuration for sending emails
 *
 * Creates a configured Nodemailer transporter based on the application environment.
 * In production, it uses real SMTP credentials from environment configuration.
 * In development/testing, it creates a fake Ethereal email account for previewing
 * emails without actually sending them to real recipients.
 *
 * @module email.config
 */

import nodemailer from 'nodemailer';
import Config from './env.config.js';
import { APPLICATION_MODE } from '../constants/audit.actions.js';


/**
 * Creates and returns a configured Nodemailer transporter
 *
 * In production mode, connects to the real SMTP server using credentials from
 * environment variables. In non-production modes (development, testing), creates
 * a disposable Ethereal email account that captures outgoing emails and provides
 * a web URL to preview them — no real emails are sent.
 *
 * @async
 * @returns {Promise<Object>} Configured Nodemailer transporter instance
 *
 * @throws Will throw if SMTP connection fails in production
 */
const createTransporter = async () => {
    if (Config.nodeEnv === APPLICATION_MODE.PRODUCTION) {
        return nodemailer.createTransport({
            host: Config.smtpHost,
            port: Config.smtpPort,
            auth: {
                user: Config.smtpUser,
                pass: Config.smtpPass,
            }
        });
    }

    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        }
    });
}


export default createTransporter;
