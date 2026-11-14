import { act, create } from 'react-test-renderer';
import { ReactElement } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { verifyEmail, resendVerificationEmail } from '@/api/auth';
import VerifyEmailScreen from '../../../app/(auth)/verify-email';
import i18n from '@/i18n';

const mockVerifyEmail = verifyEmail as jest.Mock;
const mockResendVerificationEmail = resendVerificationEmail as jest.Mock;

jest.mock('expo-router', () => ({
    router: { replace: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({ email: 'user@example.com' })),
}));

jest.mock('@/api/auth', () => ({
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
}));

jest.mock('@/api/errors', () => ({
    normalizeApiError: jest.fn((error: { message?: string }) => ({
        message: error?.message || 'Something went wrong',
        kind: error?.message?.startsWith('Network') ? 'network' : 'validation',
    })),
}));

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-linear-gradient', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const LinearGradient = (props: Record<string, unknown>) =>
        React.createElement(View, props);
    LinearGradient.displayName = 'LinearGradient';
    return { LinearGradient };
});

jest.mock('@expo/vector-icons', () => {
    const Ionicons = () => null;
    Ionicons.displayName = 'Ionicons';
    const MaterialCommunityIcons = () => null;
    MaterialCommunityIcons.displayName = 'MaterialCommunityIcons';
    return { Ionicons, MaterialCommunityIcons };
});

jest.mock('react-native-svg', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const createMock = (name: string) => {
        const Mock = (props: Record<string, unknown>) =>
            React.createElement(View, props);
        Mock.displayName = name;
        return Mock;
    };
    return {
        __esModule: true,
        default: createMock('Svg'),
        Defs: createMock('Defs'),
        LinearGradient: createMock('LinearGradient'),
        Path: createMock('Path'),
        Stop: createMock('Stop'),
        Circle: createMock('Circle'),
    };
});

/**
 * Render a component inside act and return the test renderer.
 *
 * @param element - The React element to render.
 * @returns The mounted test renderer.
 */
const render = (element: ReactElement) => {
    let tree: ReturnType<typeof create>;
    act(() => {
        tree = create(element);
    });
    return tree!;
};

/**
 * Join every visible string in a tree into one newline-separated string.
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
 * Simulate typing into a digit box labelled by its accessibility label.
 *
 * @param tree - The mounted test renderer.
 * @param label - The digit box accessibility label.
 * @param value - The new text value.
 */
const type = (tree: ReturnType<typeof create>, label: string, value: string): void => {
    act(() => {
        tree.root.findByProps({ accessibilityLabel: label }).props.onChangeText(value);
    });
};

/**
 * Enter a six-digit code into the individual digit boxes.
 *
 * @param tree - The mounted test renderer.
 * @param code - The six-character code to enter.
 */
const typeCode = (tree: ReturnType<typeof create>, code: string): void => {
    code.split('').forEach((digit, index) => {
        type(tree, `Digit ${index + 1}`, digit);
    });
};

/**
 * Flush pending microtasks and settle the async submission path.
 */
const flush = async (): Promise<void> => {
    await act(async () => {
        await Promise.resolve();
    });
};

afterEach(async () => {
    await i18n.changeLanguage('en');
});

beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyEmail.mockResolvedValue(undefined);
    mockResendVerificationEmail.mockResolvedValue(undefined);
});

describe('VerifyEmailScreen', () => {
    /**
     * The screen must render six individual digit boxes with decorative dash
     * separators and preserve the registration-step copy.
     */
    it('renders six digit boxes separated by dashes', () => {
        const tree = render(<VerifyEmailScreen />);

        for (let index = 1; index <= 6; index += 1) {
            expect(
                tree.root.findByProps({ accessibilityLabel: `Digit ${index}` }),
            ).toBeTruthy();
        }

        const text = allText(tree);
        expect((text.match(/-/g) ?? [])).toHaveLength(5);
        expect(text).toContain('Verify your email');
        expect(text).toContain('We sent a verification code to your email address');
        expect(text).toContain('Verify email');
        expect(text).toContain('Resend verification code');
    });

    /**
     * A partially entered code must be rejected locally without calling the
     * backend.
     */
    it('rejects a short code without calling the API', async () => {
        const tree = render(<VerifyEmailScreen />);
        type(tree, 'Digit 1', '1');
        type(tree, 'Digit 2', '2');
        type(tree, 'Digit 3', '3');
        type(tree, 'Digit 4', '4');
        type(tree, 'Digit 5', '5');

        await act(async () => {
            tree.root.findByProps({ accessibilityLabel: 'Verify email' }).props.onPress();
        });
        await flush();

        expect(allText(tree)).toContain('Enter all 6 digits');
        expect(mockVerifyEmail).not.toHaveBeenCalled();
    });

    /**
     * A leading-zero code must be submitted as a string, and a successful
     * verification must return the user to sign in.
     */
    it('submits leading zeros and navigates to sign in on success', async () => {
        const tree = render(<VerifyEmailScreen />);
        typeCode(tree, '012345');
        await flush();

        expect(mockVerifyEmail).toHaveBeenCalledWith('user@example.com', '012345');
        expect(router.replace).toHaveBeenCalledWith('/login');
    });

    /**
     * Entering the final digit must automatically submit the code without a
     * separate button press.
     */
    it('auto-submits once all six digits are entered', async () => {
        const tree = render(<VerifyEmailScreen />);
        typeCode(tree, '123456');
        await flush();

        expect(mockVerifyEmail).toHaveBeenCalledWith('user@example.com', '123456');
        expect(router.replace).toHaveBeenCalledWith('/login');
    });

    /**
     * A backend rejection must surface the error and clear the boxes so the
     * user can enter a fresh code.
     */
    it('shows a rejected-code error and clears the boxes', async () => {
        mockVerifyEmail.mockRejectedValue({ message: 'Verification code has expired' });
        const tree = render(<VerifyEmailScreen />);
        typeCode(tree, '123456');
        await flush();

        expect(allText(tree)).toContain('Verification code has expired');
        expect(router.replace).not.toHaveBeenCalled();
        expect(
            tree.root.findByProps({ accessibilityLabel: 'Digit 1' }).props.value,
        ).toBe('');
    });

    /**
     * A network failure must retain the entered digits so the user can retry
     * without re-entering them.
     */
    it('keeps the entered digits after a network failure', async () => {
        mockVerifyEmail.mockRejectedValue({ message: 'Network Error' });
        const tree = render(<VerifyEmailScreen />);
        typeCode(tree, '123456');
        await flush();

        expect(allText(tree)).toContain('Network Error');
        expect(
            tree.root.findByProps({ accessibilityLabel: 'Digit 1' }).props.value,
        ).toBe('1');
        expect(router.replace).not.toHaveBeenCalled();
    });

    /**
     * Resend must call the real backend endpoint and start the local cooldown
     * so the user cannot spam the server.
     */
    it('resends through the API and starts a cooldown', async () => {
        const tree = render(<VerifyEmailScreen />);

        await act(async () => {
            tree.root.findByProps({ accessibilityLabel: 'Resend verification code' }).props.onPress();
        });
        await flush();

        expect(mockResendVerificationEmail).toHaveBeenCalledWith('user@example.com');
        expect(allText(tree)).toContain('Resend code in 60s');
    });

    /**
     * While a verification request is in flight, the submit button must be
     * disabled so the user cannot submit the same code twice.
     */
    it('disables the submit button while verification is in flight', async () => {
        let resolveVerify: (() => void) | undefined;
        mockVerifyEmail.mockImplementation(() => new Promise<void>((resolve) => {
            resolveVerify = resolve;
        }));
        const tree = render(<VerifyEmailScreen />);
        typeCode(tree, '123456');

        act(() => {
            void tree.root.findByProps({ accessibilityLabel: 'Verify email' }).props.onPress();
        });

        const button = tree.root.findByProps({ accessibilityLabel: 'Verify email' });
        expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });

        resolveVerify?.();
        await flush();
    });
});
