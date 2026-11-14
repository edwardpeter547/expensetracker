import { act, create } from 'react-test-renderer';
import { ReactElement } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { forgotPassword, verifyOtp, resetPassword } from '@/api/auth';
import { usePasswordRecovery } from '@/hooks/usePasswordRecovery';
import ForgotPasswordScreen from '../../../app/(auth)/forgot-password';
import ResetCodeScreen from '../../../app/(auth)/reset-code';
import ResetPasswordScreen from '../../../app/(auth)/reset-password';
import PasswordUpdatedScreen from '../../../app/(auth)/password-updated';
import i18n from '@/i18n';

const mockForgotPassword = forgotPassword as jest.Mock;
const mockVerifyOtp = verifyOtp as jest.Mock;
const mockResetPassword = resetPassword as jest.Mock;
const mockUsePasswordRecovery = usePasswordRecovery as jest.Mock;
const mockBeginRecovery = jest.fn();
const mockCompleteVerification = jest.fn();
const mockClearRecovery = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/api/auth', () => ({
  forgotPassword: jest.fn(),
  verifyOtp: jest.fn(),
  resetPassword: jest.fn(),
}));

jest.mock('@/api/errors', () => ({
  normalizeApiError: jest.fn((error: { message?: string; code?: string }) => ({
    message: error?.message || 'Something went wrong',
    code: error?.code,
  })),
}));

jest.mock('@/hooks/usePasswordRecovery', () => ({
  usePasswordRecovery: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@expo/vector-icons', () => {
  const Ionicons = () => null;
  Ionicons.displayName = 'Ionicons';
  return { Ionicons };
});

jest.mock('react-native-svg', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const createMock = (name: string) => {
    const Mock = (props: Record<string, unknown>) => React.createElement(View, props);
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

const mounted: ReturnType<typeof create>[] = [];

/**
 * Render a component inside act and return the mounted test renderer.
 *
 * @param element - The React element to render.
 * @returns The mounted test renderer.
 */
const render = (element: ReactElement) => {
  let tree: ReturnType<typeof create>;
  act(() => {
    tree = create(element);
  });
  mounted.push(tree!);
  return tree!;
};

/**
 * Collect all visible text in a tree for copy assertions.
 *
 * @param tree - The mounted test renderer.
 * @returns The concatenated visible text.
 */
const allText = (tree: ReturnType<typeof create>): string =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .filter((child): child is string => typeof child === 'string')
    .join('\n');

/**
 * Simulate typing into an input by accessibility label.
 *
 * @param tree - The mounted test renderer.
 * @param label - The input's accessibility label.
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
 * Invoke a pressable's onPress handler inside act.
 *
 * @param tree - The mounted test renderer.
 * @param label - The pressable's accessibility label.
 * @returns A promise that resolves once the handler has run.
 */
const press = async (tree: ReturnType<typeof create>, label: string): Promise<void> => {
  await act(async () => {
    await tree.root.findByProps({ accessibilityLabel: label }).props.onPress();
  });
};

/**
 * Flush pending microtasks and settle the async submission path.
 */
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockForgotPassword.mockResolvedValue(undefined);
  mockVerifyOtp.mockResolvedValue(undefined);
  mockResetPassword.mockResolvedValue(undefined);
  mockUsePasswordRecovery.mockReturnValue({
    email: 'user@example.com',
    verifiedCode: '123456',
    beginRecovery: mockBeginRecovery,
    completeVerification: mockCompleteVerification,
    clearRecovery: mockClearRecovery,
  });
});

afterEach(async () => {
  act(() => {
    for (const tree of mounted) {
      tree.unmount();
    }
  });
  mounted.length = 0;
  jest.useRealTimers();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe('ForgotPasswordScreen', () => {
  /**
   * The entry screen must only offer email delivery, never the unsupported
   * SMS or WhatsApp channels.
   */
  it('renders an email-only form without unsupported channels', () => {
    const tree = render(<ForgotPasswordScreen />);
    const text = allText(tree);

    expect(text).toContain('Forgot password?');
    expect(text).toContain('Email');
    expect(text).not.toContain('Mobile number');
    expect(text).not.toContain('WhatsApp');
  });

  /**
   * An invalid email must be rejected locally without calling the backend.
   */
  it('rejects an invalid email without calling the API', async () => {
    const tree = render(<ForgotPasswordScreen />);

    type(tree, 'Email', 'not-an-email');
    await press(tree, 'Send reset code');

    expect(allText(tree)).toContain('Enter a valid email address');
    expect(mockForgotPassword).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  /**
   * A valid email must call the real forgot-password endpoint, remember the
   * email in memory, and navigate to the OTP screen.
   */
  it('requests a code and navigates to the OTP screen', async () => {
    const tree = render(<ForgotPasswordScreen />);

    type(tree, 'Email', 'user@example.com');
    await press(tree, 'Send reset code');
    await flush();

    expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(mockBeginRecovery).toHaveBeenCalledWith('user@example.com');
    expect(router.push).toHaveBeenCalledWith('/reset-code');
  });

  /**
   * A network failure must be surfaced without navigating away.
   */
  it('surfaces a network failure without navigating', async () => {
    mockForgotPassword.mockRejectedValue({ message: 'Network Error' });
    const tree = render(<ForgotPasswordScreen />);

    type(tree, 'Email', 'user@example.com');
    await press(tree, 'Send reset code');
    await flush();

    expect(allText(tree)).toContain('Network Error');
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('ResetCodeScreen', () => {
  /**
   * The OTP screen must reuse the six-box, dash-separated input design.
   */
  it('renders six digit boxes separated by dashes', () => {
    const tree = render(<ResetCodeScreen />);
    const text = allText(tree);

    for (let index = 1; index <= 6; index += 1) {
      expect(tree.root.findByProps({ accessibilityLabel: `Digit ${index}` })).toBeTruthy();
    }

    const dashCount = tree.root
      .findAllByType(Text)
      .filter((node) => node.props.children === '-').length;
    expect(dashCount).toBe(5);
    expect(text).toContain('We sent a 6-digit code to your email');
  });

  /**
   * Entering all six digits must auto-submit, verify, and navigate to the
   * reset-password screen while preserving leading zeros.
   */
  it('auto-submits the code and advances after verification', async () => {
    const tree = render(<ResetCodeScreen />);
    typeCode(tree, '012345');
    await flush();

    expect(mockVerifyOtp).toHaveBeenCalledWith('user@example.com', '012345');
    expect(mockCompleteVerification).toHaveBeenCalledWith('012345');
    expect(router.replace).toHaveBeenCalledWith('/reset-password');
  });

  /**
   * A rejected code must clear the boxes so the user can enter a fresh code.
   */
  it('clears the boxes after an invalid code', async () => {
    mockVerifyOtp.mockRejectedValue({
      message: 'Invalid or expired one time password',
      code: 'RESET_TOKEN_INVALID',
    });
    const tree = render(<ResetCodeScreen />);
    typeCode(tree, '123456');
    await flush();

    expect(allText(tree)).toContain('Invalid or expired one time password');
    expect(router.replace).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ accessibilityLabel: 'Digit 1' }).props.value).toBe('');
  });

  /**
   * A network failure must retain the entered digits so the user can retry.
   */
  it('keeps the entered digits after a network failure', async () => {
    mockVerifyOtp.mockRejectedValue({ message: 'Network Error' });
    const tree = render(<ResetCodeScreen />);
    typeCode(tree, '123456');
    await flush();

    expect(allText(tree)).toContain('Network Error');
    expect(tree.root.findByProps({ accessibilityLabel: 'Digit 1' }).props.value).toBe('1');
    expect(router.replace).not.toHaveBeenCalled();
  });

  /**
   * Resend must call the forgot-password endpoint and start a cooldown.
   */
  it('resends through the API and starts a cooldown', async () => {
    const tree = render(<ResetCodeScreen />);

    await press(tree, 'Resend code');
    await flush();

    expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(allText(tree)).toContain('Resend code in 60s');
  });
});

describe('ResetPasswordScreen', () => {
  /**
   * Mismatched passwords must be rejected without calling the backend.
   */
  it('rejects mismatched passwords', async () => {
    const tree = render(<ResetPasswordScreen />);

    type(tree, 'New password', 'NewPassword123!');
    type(tree, 'Confirm password', 'DifferentPassword123!');
    await press(tree, 'Update password');

    expect(allText(tree)).toContain('Passwords do not match');
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  /**
   * The registration-style strength policy must also gate the reset screen.
   */
  it('rejects a password that does not meet the strength requirements', async () => {
    const tree = render(<ResetPasswordScreen />);

    type(tree, 'New password', 'weakpass');
    type(tree, 'Confirm password', 'weakpass');
    await press(tree, 'Update password');

    expect(allText(tree)).toContain('Password must meet all strength requirements');
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  /**
   * Focusing the new-password field must reveal the strength checklist.
   */
  it('shows the strength requirements while the password field is focused', () => {
    const tree = render(<ResetPasswordScreen />);

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'New password' }).props.onFocus();
    });

    expect(allText(tree)).toContain('One uppercase letter');
    expect(allText(tree)).toContain('One special character');
  });

  /**
   * A valid reset must call the real endpoint, clear recovery state, and
   * return to login with a success confirmation.
   */
  it('resets the password and returns to login with success', async () => {
    const tree = render(<ResetPasswordScreen />);

    type(tree, 'New password', 'NewPassword123!');
    type(tree, 'Confirm password', 'NewPassword123!');
    await press(tree, 'Update password');
    await flush();

    expect(mockResetPassword).toHaveBeenCalledWith('user@example.com', '123456', 'NewPassword123!');
    expect(mockClearRecovery).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/password-updated');
  });

  /**
   * A lost recovery context must not allow a reset and must offer a restart.
   */
  it('shows an expired state when recovery context is missing', () => {
    mockUsePasswordRecovery.mockReturnValue({
      email: null,
      verifiedCode: null,
      beginRecovery: mockBeginRecovery,
      completeVerification: mockCompleteVerification,
      clearRecovery: mockClearRecovery,
    });

    const tree = render(<ResetPasswordScreen />);

    expect(allText(tree)).toContain('Password reset expired');
    expect(allText(tree)).toContain('Start over');
  });
});

describe('PasswordUpdatedScreen', () => {
  /**
   * The success screen must render the confirmation copy and sign-in button.
   */
  it('renders the confirmation copy and sign-in button', () => {
    const tree = render(<PasswordUpdatedScreen />);
    const text = allText(tree);

    expect(text).toContain('Password updated');
    expect(text).toContain(
      'Your password has been changed. You can now sign in with your new password.',
    );
    expect(text).toContain('Back to sign in');
  });

  /**
   * The button must let the user skip the delay and return to sign in.
   */
  it('navigates to sign in when the button is pressed', async () => {
    const tree = render(<PasswordUpdatedScreen />);

    await press(tree, 'Back to sign in');

    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  /**
   * Without user input the screen must redirect to sign in after a delay.
   */
  it('redirects to sign in automatically after a few seconds', () => {
    jest.useFakeTimers();
    render(<PasswordUpdatedScreen />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
