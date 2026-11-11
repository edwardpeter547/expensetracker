import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getApiLanguage, setApiLanguage } from '../api-language.ts';

test('updates and returns the effective API language', () => {
    assert.equal(getApiLanguage(), 'en');

    setApiLanguage('fr');
    assert.equal(getApiLanguage(), 'fr');

    setApiLanguage('en');
});
