/**
 * Regression tests for recipient-localised email rendering.
 *
 * These tests pin the fixes for the audit findings BK-09 and BK-10:
 *
 * - Email templates must translate and format with the recipient's locale
 *   without mutating the shared `i18n` singleton.
 * - Currency and date helpers must use `Intl` rather than hardcoded `$`,
 *   `en-US`, or `toFixed(2)`, and must never rewrite financial values.
 */

import { describe, expect, test } from '@jest/globals';
import Handlebars from 'handlebars';
import i18n from '../../configurations/i18n.config.js';
import { emailTemplates } from '../email.templates.js';

/**
 * Render the welcome email with a fixed data set and the requested locale.
 *
 * @param {string|undefined} locale The render locale.
 * @returns {string} The rendered HTML email.
 */
const renderWelcome = (locale) => emailTemplates.render('welcome', {
    firstName: 'Ada',
    brandName: 'AuditWallet',
    verificationCode: '012345',
    expiryMinutes: 10,
    unsubscribeToken: 'unsub-token',
}, locale);

describe('email template localisation', () => {
    /**
     * An English render must use the English body and action copy.
     */
    test('renders the welcome email in English', () => {
        const html = renderWelcome('en');

        expect(html).toContain('Welcome to AuditWallet, Ada');
        expect(html).toContain('Verification Code');
        expect(html).toContain('012345');
        expect(html).toContain('All rights reserved');
    });

    /**
     * A French render must use the French body and action copy.
     */
    test('renders the welcome email in French', () => {
        const html = renderWelcome('fr');

        expect(html).toContain('Bienvenue sur AuditWallet, Ada');
        expect(html).toContain('Code de vérification');
        expect(html).toContain('012345');
        expect(html).toContain('Tous droits réservés');
    });

    /**
     * Regional variants resolve to their base language and unsupported or
     * missing languages fall back to the documented English default.
     */
    test('resolves regional variants and falls back to English', () => {
        expect(renderWelcome('fr-CA')).toContain('Bienvenue sur AuditWallet, Ada');
        expect(renderWelcome('de-DE')).toContain('Welcome to AuditWallet, Ada');
        expect(renderWelcome('es')).toContain('Welcome to AuditWallet, Ada');
        expect(renderWelcome(undefined)).toContain('Welcome to AuditWallet, Ada');
    });

    /**
     * Rendering must never mutate the shared `i18n` locale, and interleaved
     * renders in different languages must not leak into each other.
     */
    test('keeps renders locale-scoped without mutating shared i18n state', () => {
        const localeBefore = i18n.getLocale();

        const firstFrench = renderWelcome('fr');
        const english = renderWelcome('en');
        const secondFrench = renderWelcome('fr');

        expect(firstFrench).toContain('Bienvenue sur AuditWallet, Ada');
        expect(english).toContain('Welcome to AuditWallet, Ada');
        expect(secondFrench).toContain('Bienvenue sur AuditWallet, Ada');
        expect(english).not.toContain('Bienvenue sur AuditWallet, Ada');
        expect(i18n.getLocale()).toBe(localeBefore);
    });
});

describe('email formatting helpers', () => {
    /**
     * Currency formatting must use the render locale and explicit currency
     * code, and must not modify the supplied numeric value.
     */
    test('formats currency from the render locale and currency code', () => {
        const template = Handlebars.compile('{{formatCurrency amount currency=currency}}');
        const amount = 1250.5;

        const french = template({amount, currency: 'EUR', locale: 'fr'});
        const english = template({amount, currency: 'USD', locale: 'en'});

        expect(french).toBe(new Intl.NumberFormat('fr', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount));
        expect(english).toBe(new Intl.NumberFormat('en', {
            style: 'currency',
            currency: 'USD',
        }).format(amount));
        expect(french).not.toContain('$');
        expect(amount).toBe(1250.5);
    });

    /**
     * Date formatting must use the render locale and treat the timezone as an
     * explicit, independent option rather than deriving it from the language.
     */
    test('formats dates from the render locale with an explicit timezone', () => {
        const template = Handlebars.compile('{{formatDate date timeZone=timeZone}}');
        const date = '2024-01-15T23:30:00Z';

        const french = template({date, timeZone: 'UTC', locale: 'fr'});
        const english = template({date, timeZone: 'UTC', locale: 'en'});
        const kiribati = template({date, timeZone: 'Pacific/Kiritimati', locale: 'en'});

        expect(french).toBe(new Intl.DateTimeFormat('fr', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
        }).format(new Date(date)));
        expect(english).toContain('January');
        expect(french).not.toContain('January');
        expect(kiribati).toBe(new Intl.DateTimeFormat('en', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Pacific/Kiritimati',
        }).format(new Date(date)));
    });
});
