/**
 * @file email.templates.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Handlebars email template compiler and renderer
 *
 * Provides a service class that loads, compiles, and renders Handlebars email templates.
 * Supports a base layout wrapper, reusable partials (buttons, headers, footers), and
 * custom helpers for translation (i18n), currency formatting, date formatting, and
 * conditional comparisons. All templates are cached after first compilation for
 * performance.
 *
 * @module email.templates
 */

import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import Config from '../configurations/env.config.js';
import { getDirectory } from '../utils/helpers.js';
import i18n from '../configurations/i18n.config.js';


const __dirname = getDirectory(import.meta.url);


/**
 * Service class for managing and rendering Handlebars email templates
 *
 * Handles template compilation, partial registration, helper registration,
 * and rendering with locale support. Templates are compiled on first use
 * and cached for subsequent renders.
 */
class EmailTemplateService {
    constructor() {
        this.layout = this._loadLayout();
        this.templates = {};
        this._registerPartials();
        this._registerHelpers();
    }

    /**
     * Loads and compiles the base layout template
     *
     * The base layout wraps every email with the brand header, logo,
     * footer with unsubscribe/privacy/support links, and copyright notice.
     *
     * @private
     * @returns {Function} Compiled Handlebars template function
     */
    _loadLayout() {
        const source = fs.readFileSync(
            path.join(__dirname, 'templates/layouts/base.hbs'),
            'utf8'
        );
        return Handlebars.compile(source);
    }

    /**
     * Registers all Handlebars partials from the templates/partials directory
     *
     * Each .hbs file in the partials directory becomes a reusable partial
     * accessible in any template via the {{> partialName}} syntax.
     *
     * @private
     * @returns {void}
     */
    _registerPartials() {
        const partialDir = path.join(__dirname, 'templates/partials');
        const files = fs.readdirSync(partialDir);

        files.forEach(file => {
            const name = path.basename(file, '.hbs');
            const source = fs.readFileSync(path.join(partialDir, file), 'utf8');
            Handlebars.registerPartial(name, source);
        });
    }

    /**
     * Registers custom Handlebars helpers for use in email templates
     *
     * Available helpers:
     * - `__` : i18n translation helper, uses i18n.__() for locale-aware strings
     * - `formatCurrency` : Formats numbers as currency (e.g., $1,250.50)
     * - `formatDate` : Formats dates in human-readable US format
     * - `ifEquals` : Conditional block helper for equality comparisons
     *
     * @private
     * @returns {void}
     */
    _registerHelpers() {
        /**
         * Translation helper — wraps i18n.__() for use in templates
         *
         * @example
         * {{__ "WELCOME_TITLE" firstName=user.firstName}}
         */
        Handlebars.registerHelper('__', (key, ...args) => {
            const options = args.pop();
            const replacements = options.hash || {};
            return i18n.__.call(i18n, key, replacements);
        });

        /**
         * Currency formatting helper
         *
         * @example
         * {{formatCurrency amount}}
         * // Output: $1,250.50
         */
        Handlebars.registerHelper('formatCurrency', (amount) => {
            return `$${amount.toFixed(2)}`;
        });

        /**
         * Date formatting helper — displays date in long US format
         *
         * @example
         * {{formatDate createdAt}}
         * // Output: January 15, 2024
         */
        Handlebars.registerHelper('formatDate', (date) => {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        });

        /**
         * Equality comparison helper for conditional blocks
         *
         * @example
         * {{#ifEquals status "active"}}
         *     <p>Account is active</p>
         * {{else}}
         *     <p>Account is inactive</p>
         * {{/ifEquals}}
         */
        Handlebars.registerHelper('ifEquals', (arg1, arg2, options) => {
            return arg1 === arg2 ? options.fn(this) : options.inverse(this);
        });
    }

    /**
     * Renders an email template with the given data and locale
     *
     * Compiles the named template (caching it for future use), renders it
     * with the provided data, then wraps the result in the base layout with
     * global data (logo URL, year, footer links). The locale is set on the
     * i18n instance before rendering to ensure translations use the correct
     * language.
     *
     * @param {string} templateName - Name of the template file (without .hbs extension)
     * @param {Object} data - Data object passed to the template and layout
     * @param {string} [locale='en'] - Locale code for translations (e.g., 'en', 'fr', 'es')
     * @returns {string} Complete HTML email string ready to be sent
     *
     * @example
     * const html = emailTemplates.render('welcome', {
     *     firstName: 'John',
     *     verifyUrl: 'https://...',
     *     unsubscribeToken: 'abc123'
     * }, 'en');
     */
    render(templateName, data, locale = Config.defaultLocale) {
        // Set the locale for i18n before rendering
        i18n.setLocale(locale);

        // Compile and cache the template on first use
        if (!this.templates[templateName]) {
            const source = fs.readFileSync(
                path.join(__dirname, `templates/${templateName}.hbs`),
                'utf8'
            );
            this.templates[templateName] = Handlebars.compile(source);
        }

        const body = this.templates[templateName](data);

        return this.layout({
            body,
            logoUrl: Config.brandLogo,
            logoAltText: `${Config.brandName} Logo`,
            year: new Date().getFullYear(),
            unsubscribeUrl: `${Config.clientUrl}/unsubscribe?token=${data.unsubscribeToken}`,
            unsubscribeLinkText: `${i18n.__({phrase: 'UNSUBSCRIBE', locale: locale})}`,
            privacyUrl: `${Config.clientUrl}/privacy`,
            privacyLinkText: `${i18n.__({phrase: 'PRIVACY_POLICY', locale: locale})}`,
            supportUrl: `${Config.clientUrl}/support`,
            supportLinkText: `${i18n.__({phrase: 'SUPPORT', locale: locale})}`,
            emailFooterInfo: `${i18n.__({phrase: 'EMAIL_FOOTER_INFO', locale: locale})}`,
            brandName: Config.brandName,
            developerName: Config.developerName,
            copyrightText: `${i18n.__({phrase: 'COPYRIGHT_TEXT', locale: locale})}`,
            salutationText: `${i18n.__({phrase: 'EMAIL_SALUTATION_TEXT', locale: locale})}`,
            signatureText: `${i18n.__({phrase: 'EMAIL_SIGNATURE_TEXT', locale: locale}, {brandName: Config.brandName})}`
        });
    }
}


export const emailTemplates = new EmailTemplateService();
