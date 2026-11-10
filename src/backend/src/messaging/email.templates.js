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
import {
    DEFAULT_CURRENCY,
    DEFAULT_LANGUAGE,
} from '../constants/localization.js';
import { getDirectory } from '../utils/helpers.js';
import { resolveRequestLocale } from '../utils/locale.js';
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
     * - `__` : i18n translation helper scoped to the render's locale
     * - `formatCurrency` : Formats numbers with `Intl.NumberFormat`
     * - `formatDate` : Formats dates with `Intl.DateTimeFormat`
     * - `ifEquals` : Conditional block helper for equality comparisons
     *
     * @private
     * @returns {void}
     */
    _registerHelpers() {
        /**
         * Translation helper scoped to the locale of the current render.
         *
         * The locale is read from the render context instead of the shared
         * `i18n` singleton, so translations are request-independent and safe
         * to render concurrently.
         *
         * @example
         * {{__ "WELCOME_TITLE" firstName=user.firstName}}
         */
        Handlebars.registerHelper('__', (key, ...args) => {
            const options = args.pop();
            const replacements = options.hash || {};
            const locale = options.data?.root?.locale || DEFAULT_LANGUAGE;
            return i18n.__({phrase: key, locale}, replacements);
        });

        /**
         * Currency formatting helper scoped to the render's locale.
         *
         * Uses `Intl.NumberFormat` so symbols and separators come from the
         * locale and currency rather than hardcoded `$`/`toFixed(2)`. The
         * input value is only formatted, never mutated.
         *
         * @example
         * {{formatCurrency amount currency="EUR"}}
         */
        Handlebars.registerHelper('formatCurrency', (amount, ...args) => {
            const options = args.pop();
            const locale = options.data?.root?.locale || DEFAULT_LANGUAGE;
            const currency = options.hash?.currency || args[0] || DEFAULT_CURRENCY;
            const number = Number(amount);

            if (Number.isNaN(number)) {
                return '';
            }

            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
            }).format(number);
        });

        /**
         * Date formatting helper scoped to the render's locale.
         *
         * Uses `Intl.DateTimeFormat` with the render locale. The timezone is
         * an explicit option (default UTC) and is never derived from the
         * language, keeping language and timezone independent.
         *
         * @example
         * {{formatDate createdAt}}
         * {{formatDate createdAt timeZone="Europe/Paris"}}
         */
        Handlebars.registerHelper('formatDate', (date, options) => {
            const locale = options.data?.root?.locale || DEFAULT_LANGUAGE;
            const timeZone = options.hash?.timeZone || 'UTC';
            const parsed = new Date(date);

            if (Number.isNaN(parsed.getTime())) {
                return '';
            }

            return new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone,
            }).format(parsed);
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
     * global data (logo URL, year, footer links). The locale is resolved and
     * passed through the render context; the shared `i18n` instance is never
     * mutated.
     *
     * @param {string} templateName - Name of the template file (without .hbs extension)
     * @param {Object} data - Data object passed to the template and layout
     * @param {string} [locale='en'] - Recipient language code (e.g., 'en', 'fr');
     *   regional variants resolve to their base language and unsupported values
     *   fall back to `en`.
     * @returns {string} Complete HTML email string ready to be sent
     *
     * @example
     * const html = emailTemplates.render('welcome', {
     *     firstName: 'John',
     *     verifyUrl: 'https://...',
     *     unsubscribeToken: 'abc123'
     * }, 'en');
     */
    render(templateName, data, locale = DEFAULT_LANGUAGE) {
        const effectiveLocale = resolveRequestLocale({userLanguage: locale});

        // Compile and cache the template on first use
        if (!this.templates[templateName]) {
            const source = fs.readFileSync(
                path.join(__dirname, `templates/${templateName}.hbs`),
                'utf8'
            );
            this.templates[templateName] = Handlebars.compile(source);
        }

        const renderData = {...data, locale: effectiveLocale};
        const body = this.templates[templateName](renderData);

        return this.layout({
            body,
            logoUrl: Config.brandLogo,
            logoAltText: `${Config.brandName} Logo`,
            year: new Date().getFullYear(),
            unsubscribeUrl: `${Config.clientUrl}/unsubscribe?token=${data.unsubscribeToken}`,
            unsubscribeLinkText: `${i18n.__({phrase: 'UNSUBSCRIBE', locale: effectiveLocale})}`,
            privacyUrl: `${Config.clientUrl}/privacy`,
            privacyLinkText: `${i18n.__({phrase: 'PRIVACY_POLICY', locale: effectiveLocale})}`,
            supportUrl: `${Config.clientUrl}/support`,
            supportLinkText: `${i18n.__({phrase: 'SUPPORT', locale: effectiveLocale})}`,
            emailFooterInfo: `${i18n.__({phrase: 'EMAIL_FOOTER_INFO', locale: effectiveLocale})}`,
            brandName: Config.brandName,
            developerName: Config.developerName,
            copyrightText: `${i18n.__({phrase: 'COPYRIGHT_TEXT', locale: effectiveLocale})}`,
            salutationText: `${i18n.__({phrase: 'EMAIL_SALUTATION_TEXT', locale: effectiveLocale})}`,
            signatureText: `${i18n.__({phrase: 'EMAIL_SIGNATURE_TEXT', locale: effectiveLocale}, {brandName: Config.brandName})}`
        });
    }
}


export const emailTemplates = new EmailTemplateService();
