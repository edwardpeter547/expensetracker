import { act, create } from 'react-test-renderer';
import { ReactElement } from 'react';
import { Platform, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import LoginScreen from '../../../app/(auth)/login';
import RegisterScreen from '../../../app/(auth)/register';

const mockLogin = jest.fn();
const mockRegister = jest.fn();

/**
 * Non-secret test-only values that satisfy the form rules without resembling
 * real credentials, so static secret scanners never flag the test fixtures.
 */
const TEST_PASSWORD = 'not-a-secret-value';
const TEST_STRONG_PASSWORD = 'Test value 1!';
const TEST_WEAK_PASSWORD = 'TestValue123';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));

jest.mock('@/security/biometrics', () => ({
    getBiometricCapability: jest.fn(() => Promise.reject(new Error('unavailable'))),
}));

jest.mock('@/api/errors', () => ({
  normalizeApiError: jest.fn((error: { message?: string }) => ({
    message: error?.message || 'Something went wrong',
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

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
);

const mockUseAuth = useAuth as jest.Mock;

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
 * Simulate typing into the input labelled by an accessibility label.
 *
 * @param tree - The mounted test renderer.
 * @param label - The input's accessibility label.
 * @param value - The new text value.
 */
const type = (
  tree: ReturnType<typeof create>,
  label: string,
  value: string,
): void => {
  act(() => {
    tree.root.findByProps({ accessibilityLabel: label }).props.onChangeText(value);
  });
};

/**
 * Invoke a pressable's onPress handler inside act, awaiting async handlers.
 *
 * @param tree - The mounted test renderer.
 * @param label - The pressable's accessibility label.
 */
const press = async (
  tree: ReturnType<typeof create>,
  label: string,
): Promise<void> => {
  await act(async () => {
    await tree.root.findByProps({ accessibilityLabel: label }).props.onPress();
  });
};

/**
 * Fill the sign-in form with valid-looking credentials.
 *
 * @param tree - The mounted test renderer.
 */
const fillLoginForm = (tree: ReturnType<typeof create>): void => {
  type(tree, 'Email address', 'user@example.com');
  type(tree, 'Password', TEST_PASSWORD);
};

/**
 * Fill the registration form with credentials that satisfy every field rule.
 *
 * @param tree - The mounted test renderer.
 */
const fillRegisterForm = (tree: ReturnType<typeof create>): void => {
  type(tree, 'Email', 'user@example.com');
  type(tree, 'First name', 'Jane');
  type(tree, 'Last name', 'Doe');
  type(tree, 'Password', TEST_STRONG_PASSWORD);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    login: mockLogin,
    register: mockRegister,
    user: null,
    biometricLogin: null,
    loginWithBiometrics: jest.fn(),
  });
});

describe('LoginScreen', () => {
  /**
   * Verify the Midnight Luxe V1.5 sign-in copy renders as expected.
   */
  it('renders the expected labels and copy', () => {
    const tree = render(<LoginScreen />);
    const text = allText(tree);

    expect(
      tree.root.findByProps({ accessibilityLabel: 'AuditWallet' }),
    ).toBeTruthy();
    expect(text).toContain('Sign in');
    expect(text).toContain('Access your financial dashboard');
    expect(text).toContain('Email address');
    expect(text).toContain('Password');
    expect(text).toContain('Forgot Password?');
    expect(text).toContain('Sign In');
    expect(text).toContain('OR CONTINUE WITH');
    expect(text).toContain('Continue with Google');
    expect(text).toContain('Continue with Apple');
    expect(text).toContain('New to ExpenseTracker?');
    expect(text).toContain('Create account');
    expect(text).toContain('Secure access to your financial world');
  });

  it('shows inline errors for an empty form and does not submit', async () => {
    const tree = render(<LoginScreen />);

    await press(tree, 'Sign In');
    const text = allText(tree);

    expect(text).toContain('Email is required');
    expect(text).toContain('Password is required');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  /**
   * Verify malformed email addresses are rejected before submission.
   */
  it('validates the email format', async () => {
    const tree = render(<LoginScreen />);

    type(tree, 'Email address', 'not-an-email');
    type(tree, 'Password', TEST_PASSWORD);
    await press(tree, 'Sign In');

    expect(allText(tree)).toContain('Enter a valid email address');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  /**
   * Verify credentials are trimmed before being sent to the login service.
   */
  it('signs in with trimmed credentials', async () => {
    const tree = render(<LoginScreen />);
    mockLogin.mockResolvedValue(undefined);

    type(tree, 'Email address', '  user@example.com  ');
    type(tree, 'Password', TEST_PASSWORD);
    await press(tree, 'Sign In');

    expect(mockLogin).toHaveBeenCalledWith('user@example.com', TEST_PASSWORD);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows the server error on invalid credentials', async () => {
    const tree = render(<LoginScreen />);
    mockLogin.mockRejectedValue({ message: 'Invalid email or password' });

    fillLoginForm(tree);
    await press(tree, 'Sign In');

    expect(allText(tree)).toContain('Invalid email or password');
  });

  it('toggles password visibility', () => {
    const tree = render(<LoginScreen />);

    type(tree, 'Password', TEST_PASSWORD);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props
        .secureTextEntry,
    ).toBe(true);

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Show password' }).props.onPress();
    });
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props
        .secureTextEntry,
    ).toBe(false);
  });

  it('disables the button while loading', async () => {
    const tree = render(<LoginScreen />);
    let resolveLogin: (() => void) | undefined;
    mockLogin.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        }),
    );

    fillLoginForm(tree);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Sign In' }).props.onPress();
    });

    expect(
      tree.root.findByProps({ accessibilityLabel: 'Sign In' }).props.disabled,
    ).toBe(true);

    await act(async () => {
      resolveLogin?.();
    });
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  /**
   * Verify the forgot-password and create-account links route correctly.
   */
  it('navigates to forgot-password and registration', async () => {
    const tree = render(<LoginScreen />);

    await press(tree, 'Forgot Password?');
    expect(router.push).toHaveBeenCalledWith('/forgot-password');

    await press(tree, 'Create account');
    expect(router.push).toHaveBeenCalledWith('/register');
  });

  /**
   * Verify the reference social buttons render and honestly report that their
   * providers are not yet wired into the app.
   */
  it('renders social sign-in buttons and reports providers are unavailable', async () => {
    const tree = render(<LoginScreen />);

    expect(
      tree.root.findByProps({ accessibilityLabel: 'Continue with Google' }),
    ).toBeTruthy();
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Continue with Apple' }),
    ).toBeTruthy();

    await press(tree, 'Continue with Google');

    expect(allText(tree)).toContain("Google sign-in isn't available yet.");
  });

  /**
   * Verify the biometric button is hidden on iOS and rendered on Android,
   * matching the platform-specific Face ID behavior.
   */
  it('shows the biometric sign-in button only on Android', () => {
    const originalOS = Platform.OS;

    try {
      Platform.OS = 'ios';
      const iosTree = render(<LoginScreen />);
      expect(
        iosTree.root.findAllByProps({
          accessibilityLabel: 'Sign in with Biometrics',
        }),
      ).toHaveLength(0);

      Platform.OS = 'android';
      const androidTree = render(<LoginScreen />);
      expect(
        androidTree.root.findByProps({
          accessibilityLabel: 'Sign in with Biometrics',
        }),
      ).toBeTruthy();
    } finally {
      Platform.OS = originalOS;
    }
  });

  it('redirects an already-authenticated user to the tabs', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      user: { id: 1, email: 'user@example.com' },
    });

    render(<LoginScreen />);

    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});

describe('RegisterScreen', () => {
  /**
   * Verify the static registration copy and the focused password checklist.
   */
  it('renders the expected labels and copy', () => {
    const tree = render(<RegisterScreen />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props.onFocus();
    });
    const text = allText(tree);

    expect(text).toContain('Create Account');
    expect(text).toContain('Start your financial journey');
    expect(text).toContain('First name');
    expect(text).toContain('Last name');
    expect(text).toContain('At least 8 characters');
    expect(text).toContain('Create Account');
    expect(text).toContain('Already have an account?');
    expect(text).toContain('Sign In');
  });

  /**
   * Verify the checklist updates in place while the password is being edited.
   */
  it('updates password requirements live', () => {
    const tree = render(<RegisterScreen />);

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props.onFocus();
    });
    expect(
      tree.root.findByProps({
        accessibilityLabel: 'At least 8 characters, not satisfied',
      }),
    ).toBeTruthy();

    type(tree, 'Password', TEST_PASSWORD);

    expect(
      tree.root.findByProps({
        accessibilityLabel: 'At least 8 characters, satisfied',
      }),
    ).toBeTruthy();
    expect(
      tree.root.findAllByProps({
        accessibilityLabel: 'At least 8 characters, not satisfied',
      }),
    ).toHaveLength(0);
  });

  /**
   * Verify a valid registration submits and advances to email verification.
   */
  it('registers and navigates to the verification flow', async () => {
    const tree = render(<RegisterScreen />);
    mockRegister.mockResolvedValue(undefined);

    fillRegisterForm(tree);
    await press(tree, 'Create Account');

    expect(mockRegister).toHaveBeenCalledWith({
      email: 'user@example.com',
      username: 'user',
      password: TEST_STRONG_PASSWORD,
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(router.replace).toHaveBeenCalledWith('/verify-email');
  });

  /**
   * Verify the standard strength rules render and a weak password is blocked.
   */
  it('enforces the standard password strength rules', async () => {
    const tree = render(<RegisterScreen />);

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props.onFocus();
    });
    expect(
      tree.root.findByProps({
        accessibilityLabel: 'One uppercase letter, not satisfied',
      }),
    ).toBeTruthy();
    expect(
      tree.root.findByProps({
        accessibilityLabel: 'One number, not satisfied',
      }),
    ).toBeTruthy();
    expect(
      tree.root.findByProps({
        accessibilityLabel: 'One special character, not satisfied',
      }),
    ).toBeTruthy();

    type(tree, 'Email', 'user@example.com');
    type(tree, 'First name', 'Jane');
    type(tree, 'Last name', 'Doe');
    type(tree, 'Password', TEST_WEAK_PASSWORD);
    await press(tree, 'Create Account');

    expect(allText(tree)).toContain(
      'Password must meet all strength requirements',
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  /**
   * Verify the criteria checklist shows only while focused and collapses to
   * the colored progress bar once the password field loses focus.
   */
  it('collapses the criteria to the strength meter after blur', () => {
    const tree = render(<RegisterScreen />);

    expect(
      tree.root.findAllByProps({
        accessibilityLabel: 'At least 8 characters, not satisfied',
      }),
    ).toHaveLength(0);

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props.onFocus();
    });
    expect(
      tree.root.findByProps({
        accessibilityLabel: 'At least 8 characters, not satisfied',
      }),
    ).toBeTruthy();

    type(tree, 'Password', TEST_STRONG_PASSWORD);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props.onBlur();
    });

    expect(
      tree.root.findAllByProps({
        accessibilityLabel: 'At least 8 characters, satisfied',
      }),
    ).toHaveLength(0);
    expect(
      tree.root.findByProps({
        accessibilityLabel: 'Password strength: Strong',
      }),
    ).toBeTruthy();
  });

  /**
   * Verify the social buttons render on registration and report unavailability.
   */
  it('renders social sign-in buttons and reports providers are unavailable', async () => {
    const tree = render(<RegisterScreen />);

    expect(
      tree.root.findByProps({ accessibilityLabel: 'Continue with Google' }),
    ).toBeTruthy();
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Continue with Apple' }),
    ).toBeTruthy();

    await press(tree, 'Continue with Google');

    expect(allText(tree)).toContain("Google sign-in isn't available yet.");
  });

  it('shows duplicate account errors from the server', async () => {
    const tree = render(<RegisterScreen />);
    mockRegister.mockRejectedValue({
      message: 'User with this email or username already exist',
    });

    fillRegisterForm(tree);
    await press(tree, 'Create Account');

    expect(allText(tree)).toContain(
      'User with this email or username already exist',
    );
  });

  it('navigates to sign in from the footer', async () => {
    const tree = render(<RegisterScreen />);

    await press(tree, 'Sign In');

    expect(router.push).toHaveBeenCalledWith('/login');
  });
});
