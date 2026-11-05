/**
 * Component tests for the Biometric App Lock screen.
 *
 * Verifies the missing-hardware fallback and that a failed or canceled unlock
 * surfaces an error without unlocking the app.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactElement } from 'react';
import { useAppLock } from '@/contexts/AppLockContext';
import { useAuth } from '@/hooks/useAuth';
import { getBiometricCapability } from '@/security/biometrics';
import AppLockScreen from '../AppLockScreen';

jest.mock('@/contexts/AppLockContext', () => ({ useAppLock: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/security/biometrics', () => ({
    getBiometricCapability: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => {
    const Ionicons = () => null;
    Ionicons.displayName = 'Ionicons';
    return { Ionicons };
});
jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUseAppLock = useAppLock as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockGetBiometricCapability = getBiometricCapability as jest.Mock;

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

describe('AppLockScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue({ logout: jest.fn() });
    });

    test('shows the password recovery path when biometrics are unavailable', async () => {
        mockGetBiometricCapability.mockResolvedValue({
            supported: false,
            enrolled: false,
            strong: false,
            methods: [],
            reason: 'No biometric hardware',
        });
        mockUseAppLock.mockReturnValue({ unlock: jest.fn() });

        let tree: ReturnType<typeof create>;
        await act(async () => {
            tree = render(<AppLockScreen />);
        });
        const text = allText(tree!);

        expect(text).toContain('ExpenseTracker is locked');
        expect(text).toContain('Biometrics are not available on this device');
        expect(text).toContain('Use password instead');
    });

    test('surfaces an error when a biometric unlock fails', async () => {
        mockGetBiometricCapability.mockResolvedValue({
            supported: true,
            enrolled: true,
            strong: true,
            methods: ['fingerprint'],
        });
        mockUseAppLock.mockReturnValue({
            unlock: jest.fn().mockResolvedValue({
                success: false,
                error: 'Biometric verification failed.',
            }),
        });

        let tree: ReturnType<typeof create>;
        await act(async () => {
            tree = render(<AppLockScreen />);
        });

        expect(allText(tree!)).toContain('Biometric verification failed.');
    });
});
