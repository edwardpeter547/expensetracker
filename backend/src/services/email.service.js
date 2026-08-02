import nodemailer from 'nodemailer';
import createTransporter from '../configurations/email.config.js';
import { emailTemplates } from '../messaging/email.templates.js';
import Config from '../configurations/env.config.js';
import logger from '../configurations/logger.config.js';
import { APPLICATION_MODE } from '../constants/audit.actions.js';
import i18n from '../configurations/i18n.config.js';


class EmailService {

    constructor(){
        this.transporter = null;
    }

    async _getTransporter(){
        if(!this.transporter){
            this.transporter = await createTransporter();
        }
        return this.transporter;
    }

    _maskEmail(emailAddress){
        if(!emailAddress || !emailAddress.includes('@')) return emailAddress;

        const [local, domain] = emailAddress.split('@');
        if(local.length <= 2) return `${local}***@${domain}`;
        return `${local.slice(0, 2)}***${local.slice(-2)}@${domain}`;
    }

    async _send({to, subject, template, data, locale=Config.defaultLocale, attachments=[]}){
        try{
            const transporter = await this._getTransporter();
            const html = emailTemplates.render(template, data, locale);
            const mailOptions = {
                from: `"${Config.brandName}" <${Config.smtpFrom}>`,
                to,
                subject,
                html,
                attachments,
            }

            const info = await transporter.sendMail(mailOptions);

            logger.info('Email sent successfully', {
                template,
                to: this._maskEmail(to),
                messageId: info.messageId,
            });

            if(Config.nodeEnv !== APPLICATION_MODE.PRODUCTION){
                const previewUrl = nodemailer.getTestMessageUrl(info);
                if(previewUrl){
                    console.log('\n Email sent! Preview at:');
                    console.log(`   ${previewUrl}\n`);
                }
            }

            return info;
        }
        catch(error){
            logger.error('Failed to send email', {
                template,
                to: this._maskEmail(to),
                error: error.message
            });

            throw error;
        }
    }

    async sendRegistrationComplete(user, token){

        const locale = user.language || Config.defaultLocale;

        return this._send({
            to: user.email,
            subject: i18n.__({phrase: 'WELCOME_EMAIL_SUBJECT', locale}, {brandName: Config.brandName}),
            template: 'welcome',
            locale,
            data: {
                brandName: Config.brandName,
                firstName: user.firstname,
                verifyUrl: `${Config.baseUrl}/api/${Config.apiVersion}/auth/verify-email?token=${token}`,
                unsubscribeToken: user.unsubscribeToken
            }
        });
    }

    async sendVerificationConfirmation(user){
        const locale = user.language || Config.defaultLocale;

        return this._send({
            to: user.email,
            subject: i18n.__({phrase: 'VERIFICATION_COMPLETE_EMAIL_SUBJECT', locale}, {brandName: Config.brandName}),
            template: 'registration-complete',
            locale,
            data: {
                firstName: user.firstName,
                unsubscribeToken: user.unsubscribeToken
            }
        });
    }

    async resendEmailVerificationLink(user, token){
        const locale = user.language || Config.defaultLocale;
        return this._send({
            to: user.email,
            subject: i18n.__({phrase: 'RESEND_VERIFICATION_EMAIL_SUBJECT', locale}, {brandName: Config.brandName}),
            template: 'resend-verification',
            locale,
            data: {
                firstName: user.firstname,
                brandName: Config.brandName,
                unsubscribeToken: user.unsubscribeToken,
                expiryMinutes: Config.verificationTokenExpiryMinutes,
                verifyUrl: `${Config.baseUrl}/api/${Config.apiVersion}/auth/verify-email?token=${token}`,
            }
        });
    }

    async sendPasswordResetCode(user, resetPasswordCode){
        const locale = user.language || Config.defaultLocale;
        console.log(`This is the locale: ${user.locale}`);
        return this._send({
            to: user.email,
            subject: i18n.__({phrase: 'RESET_PASSWORD_EMAIL_SUBJECT', locale}, {brandName: Config.brandName}),
            template: 'password-reset',
            locale,
            data: {
                firstName: user.firstname,
                brandName: Config.brandName,
                unsubscribeToken: user.unsubscribeToken,
                expiryMinutes: Config.passwordResetTokenExpiryMinutes,
                resetPasswordCode: resetPasswordCode,
            }
        });
    }
}


const emailService = new EmailService();
export default emailService;