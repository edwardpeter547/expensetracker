/**
 * Component tests for the Profile V2 settings destinations.
 *
 * Verifies that authenticated profile data populates the personal information
 * form, that preview-only notification toggles are clearly labelled, and that
 * unavailable security capabilities are identified rather than presented as
 * functional.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactElement } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useAppLock } from '@/contexts/AppLockContext';
import useTheme from '@/hooks/useTheme';
import ProfileSettings, { type ProfileSection } from '../ProfileSettings';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useTheme', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/hooks/useCategories', () => ({ useCategories: jest.fn() }));
jest.mock('@/contexts/LocaleContext', () => ({ useLocale: jest.fn() }));
jest.mock('@/contexts/AppLockContext', () => ({ useAppLock: jest.fn() }));
jest.mock('@/security/biometrics', () => ({
    getBiometricCapability: jest.fn(() => Promise.reject(new Error('unavailable'))),
}));
jest.mock('@/api/user', () => ({
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    fetchSessions: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllSessions: jest.fn(),
    requestAccountDeletion: jest.fn(),
    fetchDeletionStatus: jest.fn(),
}));

jest.mock('expo-router', () => ({
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

jest.mock('@expo/vector-icons', () => {
    const Ionicons = () => null;
    Ionicons.displayName = 'Ionicons';
    return { Ionicons };
});

jest.mock('expo-linear-gradient', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const LinearGradient = (props: Record<string, unknown>) =>
        React.createElement(View, props);
    LinearGradient.displayName = 'LinearGradient';
    return { LinearGradient };
});

jest.mock('expo-image', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const Image = (props: Record<string, unknown>) => React.createElement(View, props);
    Image.displayName = 'Image';
    return { Image };
});

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseTheme = useTheme as jest.Mock;
const mockUseLocale = useLocale as jest.Mock;
const mockUseAppLock = useAppLock as jest.Mock;

/**
 * Render a component inside an act scope.
 *
 * @param element - The element to mount.
 * @returns The mounted test renderer.
 */
const render = (element: ReactElement): ReturnType<typeof create> => {
    let tree: ReturnType<typeof create>;
    act(() => {
        tree = create(element);
    });
    return tree!;
};

/**
 * Join every visible string in a rendered tree.
 *
 * @param tree - The mounted test renderer.
 * @returns The concatenated text content.
 */
const allText = (tree: ReturnType<typeof create>): string =>
    tree.root
        .findAllByType(Text)
        .map((node) => node.props.children)
        .flat(Infinity)
        .filter((child): child is string => typeof child === 'string')
        .join('\n');

/**
 * Mount a settings section with the shared hook mocks preconfigured.
 *
 * @param section - The settings destination to render.
 * @returns The mounted test renderer.
 */
const renderSection = (section: ProfileSection): ReturnType<typeof create> => {
    mockUseAuth.mockReturnValue({
        user: {
            id: 1,
            email: 'ada@example.com',
            username: 'ada',
            firstname: 'Ada',
            lastname: 'Lovelace',
            isEmailVerified: true,
        },
        isLoading: false,
        logout: jest.fn(),
        refreshProfile: jest.fn(),
        biometricLogin: null,
        enrollBiometricLogin: jest.fn(),
        disableBiometricLogin: jest.fn(),
        loginWithBiometrics: jest.fn(),
    });
    mockUseTheme.mockReturnValue({
        theme: 'forest',
        setTheme: jest.fn(),
        colors: {
            primary: '#2E7D32',
            background: '#E8F5E9',
            text: '#1B5E20',
            border: '#C8E6C9',
            white: '#FFFFFF',
            textLight: '#66BB6A',
            expense: '#C62828',
            income: '#388E3C',
            card: '#FFFFFF',
            shadow: '#000000',
        },
    });
    mockUseLocale.mockReturnValue({
        language: 'en',
        currency: 'USD',
        setLanguage: jest.fn(),
        setCurrency: jest.fn(),
        followDeviceLanguage: jest.fn(),
        followDeviceCurrency: jest.fn(),
        isLanguageOverridden: false,
        isCurrencyOverridden: false,
        regionCode: null,
        applyRemotePreferences: jest.fn(),
    });
    mockUseAppLock.mockReturnValue({
        enabled: false,
        timing: 'immediate',
        locked: false,
        hydrated: true,
        setEnabled: jest.fn(),
        setTiming: jest.fn(),
        unlock: jest.fn(),
        lock: jest.fn(),
    });

    return render(<ProfileSettings section={section} />);
};

describe('ProfileSettings', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('populates personal information from the authenticated user', () => {
        const tree = renderSection('personal');

        expect(tree.root.findByProps({ accessibilityLabel: 'First name' }).props.value).toBe('Ada');
        expect(tree.root.findByProps({ accessibilityLabel: 'Last name' }).props.value).toBe('Lovelace');
        expect(tree.root.findByProps({ accessibilityLabel: 'Username' }).props.value).toBe('ada');
        expect(tree.root.findByProps({ accessibilityLabel: 'Email address' }).props.value).toBe('ada@example.com');
    });

    test('labels notification toggles as preview-only', () => {
        const tree = renderSection('notifications');
        const text = allText(tree);

        expect(text).toContain('Push Notifications');
        expect(text).toContain('Budget Alerts');
        expect(text).toContain('Switches are local UI previews and are not saved to your account.');
    });

    test('renders biometric login, biometric app lock, and two-factor controls', () => {
        const tree = renderSection('security');
        const text = allText(tree);

        expect(text).toContain('Biometric Login');
        expect(text).toContain('Require Biometrics to Open App');
        expect(text).toContain('Two-Factor Authentication');
        expect(text).toContain('Session management requires a signed-in account.');
    });
});
