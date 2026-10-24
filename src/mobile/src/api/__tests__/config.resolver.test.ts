import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    parseMetroHost,
    resolveApiBaseUrl,
} from '../config.resolver.ts';

describe('resolveApiBaseUrl', () => {
    test('uses an explicit development URL unchanged', () => {
        assert.equal(
            resolveApiBaseUrl({
                explicitUrl: 'http://192.168.1.9:7001/api/v1/',
                apiPort: 7001,
                environment: 'development',
                platform: 'ios',
                isDevice: true,
                isDev: true,
            }),
            'http://192.168.1.9:7001/api/v1',
        );
    });

    test('rejects an explicit URL that omits the /api/v1 prefix', () => {
        assert.throws(
            () => resolveApiBaseUrl({
                explicitUrl: 'http://192.168.1.9:7001',
                apiPort: 7001,
                environment: 'development',
                platform: 'ios',
                isDevice: true,
                isDev: true,
            }),
            /must include the "\/api\/v1" prefix/,
        );
    });

    test('routes the iOS Simulator to host loopback over http', () => {
        assert.equal(
            resolveApiBaseUrl({
                apiPort: 7001,
                environment: 'development',
                platform: 'ios',
                isDevice: false,
                isDev: true,
            }),
            'http://localhost:7001/api/v1',
        );
    });

    test('routes the Android Emulator to the 10.0.2.2 alias', () => {
        assert.equal(
            resolveApiBaseUrl({
                apiPort: 7001,
                environment: 'development',
                platform: 'android',
                isDevice: false,
                isDev: true,
            }),
            'http://10.0.2.2:7001/api/v1',
        );
    });

    test('derives a physical device URL from the Metro host', () => {
        assert.equal(
            resolveApiBaseUrl({
                apiPort: 7001,
                environment: 'development',
                platform: 'ios',
                isDevice: true,
                isDev: true,
                metroHost: '192.168.0.193:8081',
            }),
            'http://192.168.0.193:7001/api/v1',
        );
    });

    test('fails closed for physical devices without a Metro host', () => {
        assert.throws(
            () => resolveApiBaseUrl({
                apiPort: 7001,
                environment: 'development',
                platform: 'android',
                isDevice: true,
                isDev: true,
            }),
            /Cannot resolve the development host/,
        );
    });

    test('requires an explicit https URL for production', () => {
        assert.throws(
            () => resolveApiBaseUrl({
                apiPort: 7001,
                environment: 'production',
                platform: 'ios',
                isDevice: true,
                isDev: false,
            }),
            /EXPO_PUBLIC_API_URL is required/,
        );

        assert.throws(
            () => resolveApiBaseUrl({
                explicitUrl: 'http://api.example.com/api/v1',
                apiPort: 7001,
                environment: 'production',
                platform: 'ios',
                isDevice: true,
                isDev: false,
            }),
            /require an https EXPO_PUBLIC_API_URL/,
        );
    });

    test('parseMetroHost strips the Metro port', () => {
        assert.equal(parseMetroHost('192.168.1.20:8081'), '192.168.1.20');
        assert.equal(parseMetroHost('  10.0.0.5:8081  '), '10.0.0.5');
        assert.equal(parseMetroHost(undefined), undefined);
    });
});
