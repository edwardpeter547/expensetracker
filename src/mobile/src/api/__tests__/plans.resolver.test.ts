import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { normalizeAuditWalletPlansUrl } from '../plans.resolver.ts';

describe('normalizeAuditWalletPlansUrl', () => {
    test('returns undefined for a missing value', () => {
        assert.equal(normalizeAuditWalletPlansUrl(undefined), undefined);
        assert.equal(normalizeAuditWalletPlansUrl(null), undefined);
        assert.equal(normalizeAuditWalletPlansUrl('   '), undefined);
    });

    test('returns a normalized https URL unchanged apart from the trailing slash', () => {
        assert.equal(
            normalizeAuditWalletPlansUrl('https://auditwallet.example/plans/'),
            'https://auditwallet.example/plans',
        );
    });

    test('rejects non-https URLs so the gate can never open an insecure link', () => {
        assert.equal(normalizeAuditWalletPlansUrl('http://auditwallet.example/plans'), undefined);
        assert.equal(normalizeAuditWalletPlansUrl('ftp://auditwallet.example/plans'), undefined);
    });

    test('rejects malformed URLs rather than opening an unexpected destination', () => {
        assert.equal(normalizeAuditWalletPlansUrl('not a url'), undefined);
    });

    test('preserves query strings and fragments on valid https URLs', () => {
        assert.equal(
            normalizeAuditWalletPlansUrl('https://auditwallet.example/plans?src=mobile#pricing'),
            'https://auditwallet.example/plans?src=mobile#pricing',
        );
    });
});
