/**
 * LocaleContext preference-resolution tests.
 *
 * The scenarios verify device detection, explicit override persistence,
 * follow-device clearing, restart hydration, and the explicit-over-remote
 * precedence required by the preference lifecycle.
 */

import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Pressable, Text, View } from 'react-native';
import { LocaleProvider, useLocale } from '../LocaleContext';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
        mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
        mockStorage.delete(key);
    }),
}));

jest.mock('expo-localization', () => ({
    getLocales: jest.fn(() => [
        {languageTag: 'en-US', languageCode: 'en', regionCode: 'US', currencyCode: 'USD'},
    ]),
}));

/**
 * Render the effective locale and expose control buttons.
 *
 * @returns {JSX.Element} The probe.
 */
const Probe = () => {
    const locale = useLocale();

    return (
        <View>
            <Text>{`${locale.language}|${locale.isLanguageOverridden}`}</Text>
            <Pressable accessibilityLabel="set-fr" onPress={() => void locale.setLanguage('fr')} />
            <Pressable accessibilityLabel="set-en" onPress={() => void locale.setLanguage('en')} />
            <Pressable accessibilityLabel="follow-device" onPress={() => void locale.followDeviceLanguage()} />
            <Pressable accessibilityLabel="apply-remote-fr" onPress={() => locale.applyRemotePreferences('fr', 'USD')} />
            <Pressable accessibilityLabel="clear-remote" onPress={() => locale.clearRemotePreferences()} />
        </View>
    );
};

/**
 * Mount the provider and wait for its async hydration.
 *
 * @returns {Promise<ReactTestRenderer>} The rendered tree.
 */
const renderProvider = async (): Promise<ReactTestRenderer> => {
    const tree = create(
        <LocaleProvider>
            <Probe />
        </LocaleProvider>,
    );
    await flush();
    return tree;
};

/**
 * Flush pending promises inside `act` so hydration and state updates settle.
 *
 * @returns {Promise<void>}
 */
const flush = async (): Promise<void> => {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
};

/**
 * Read the probe status text.
 *
 * @param {ReactTestRenderer} tree The rendered tree.
 * @returns {string} `language|isLanguageOverridden`.
 */
const status = (tree: ReactTestRenderer): string => {
    return tree.root.findAllByType(Text)[0].props.children;
};

/**
 * Press a probe control by its accessibility label.
 *
 * @param {ReactTestRenderer} tree The rendered tree.
 * @param {string} label The accessibility label.
 * @returns {Promise<void>}
 */
const press = async (tree: ReactTestRenderer, label: string): Promise<void> => {
    await act(async () => {
        tree.root.findByProps({accessibilityLabel: label}).props.onPress();
    });
    await flush();
};

describe('LocaleContext', () => {
    beforeEach(() => {
        mockStorage.clear();
    });

    /**
     * With no stored override the effective language must come from the
     * device snapshot.
     */
    test('resolves the device language by default', async () => {
        const tree = await renderProvider();

        expect(status(tree)).toBe('en|false');
        tree.unmount();
    });

    /**
     * Selecting a language must apply it immediately and persist it as an
     * explicit override.
     */
    test('applies and persists an explicit language choice', async () => {
        const tree = await renderProvider();
        await press(tree, 'set-fr');

        expect(status(tree)).toBe('fr|true');
        expect(mockStorage.get('preferences.language')).toBe('fr');
        tree.unmount();
    });

    /**
     * Following the device must clear the persisted override and return to
     * the detected device language.
     */
    test('follows the device after clearing the override', async () => {
        const tree = await renderProvider();
        await press(tree, 'set-fr');
        await press(tree, 'follow-device');

        expect(status(tree)).toBe('en|false');
        expect(mockStorage.has('preferences.language')).toBe(false);
        tree.unmount();
    });

    /**
     * A persisted override must survive a provider restart.
     */
    test('restores a persisted override after restart', async () => {
        const first = await renderProvider();
        await press(first, 'set-fr');
        first.unmount();

        const second = await renderProvider();
        expect(status(second)).toBe('fr|true');
        second.unmount();
    });

    /**
     * An explicit choice must win over an adopted account preference, and
     * clearing the remote preference must not clear the explicit choice.
     */
    test('explicit choice wins over remote and survives remote clearing', async () => {
        const tree = await renderProvider();

        await press(tree, 'apply-remote-fr');
        expect(status(tree)).toBe('fr|false');

        await press(tree, 'set-en');
        expect(status(tree)).toBe('en|true');

        await press(tree, 'clear-remote');
        expect(status(tree)).toBe('en|true');
        tree.unmount();
    });

    /**
     * Without an explicit choice, clearing the adopted remote preference must
     * fall back to the device language.
     */
    test('falls back to the device after clearing remote preferences', async () => {
        const tree = await renderProvider();

        await press(tree, 'apply-remote-fr');
        expect(status(tree)).toBe('fr|false');

        await press(tree, 'clear-remote');
        expect(status(tree)).toBe('en|false');
        tree.unmount();
    });
});
