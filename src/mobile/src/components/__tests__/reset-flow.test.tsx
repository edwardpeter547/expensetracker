import { act, create } from 'react-test-renderer';
import { ReactElement } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import ForgotPasswordScreen from '../../../app/(auth)/forgot-password';
import ResetCodeScreen from '../../../app/(auth)/reset-code';
import ResetPasswordScreen from '../../../app/(auth)/reset-password';
import '@/i18n';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ channel: 'email' }),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const Ionicons = () => null;
  Ionicons.displayName = 'Ionicons';
  return { Ionicons };
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
 * Invoke a pressable's onPress handler inside act.
 *
 * @param tree - The mounted test renderer.
 * @param label - The pressable's accessibility label.
 * @returns A promise that resolves once the handler has run.
 */
const press = async (
  tree: ReturnType<typeof create>,
  label: string,
): Promise<void> => {
  await act(async () => {
    await tree.root.findByProps({ accessibilityLabel: label }).props.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  for (const tree of mounted) {
    tree.unmount();
  }
  mounted.length = 0;
  jest.useRealTimers();
});

describe('ForgotPasswordScreen', () => {
  /**
   * Verify the reset form renders and advances to the code screen.
   */
  it('renders delivery channels and navigates to the code screen', async () => {
    const tree = render(<ForgotPasswordScreen />);
    const text = allText(tree);

    expect(text).toContain('Forgot password?');
    expect(text).toContain('Email');
    expect(text).toContain('Mobile number');
    expect(text).toContain('WhatsApp');

    await press(tree, 'Send reset code');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/reset-code',
      params: { channel: 'email' },
    });
  });

  /**
   * Verify selecting a delivery channel marks it as selected.
   */
  it('selects the requested delivery channel', () => {
    const tree = render(<ForgotPasswordScreen />);

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'WhatsApp' }).props.onPress();
    });

    expect(
      tree.root.findByProps({ accessibilityLabel: 'WhatsApp' }).props
        .accessibilityState.selected,
    ).toBe(true);
  });
});

describe('ResetCodeScreen', () => {
  /**
   * Verify the code screen renders and advances to the new-password screen.
   */
  it('renders and navigates to the new-password screen', async () => {
    const tree = render(<ResetCodeScreen />);
    const text = allText(tree);

    expect(text).toContain('Enter code');
    expect(text).toContain('We sent a 6-digit code to your email');
    expect(text).toContain('Code expires in');

    type(tree, 'Digit 1', '1');
    type(tree, 'Digit 2', '2');
    type(tree, 'Digit 3', '3');
    type(tree, 'Digit 4', '4');
    type(tree, 'Digit 5', '5');
    type(tree, 'Digit 6', '6');

    await press(tree, 'Verify code');
    expect(router.push).toHaveBeenCalledWith('/reset-password');
  });

  /**
   * Verify an incomplete code surfaces an error instead of navigating.
   */
  it('shows an error for an incomplete code', async () => {
    const tree = render(<ResetCodeScreen />);

    await press(tree, 'Verify code');

    expect(allText(tree)).toContain('Enter all 6 digits');
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('ResetPasswordScreen', () => {
  /**
   * Verify mismatched passwords are rejected and matching ones complete.
   */
  it('validates the new password and returns to sign in', () => {
    const tree = render(<ResetPasswordScreen />);

    type(tree, 'New password', 'password123');
    type(tree, 'Confirm password', 'different');
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Update password' }).props.onPress();
    });
    expect(allText(tree)).toContain('Passwords do not match');
    expect(router.replace).not.toHaveBeenCalled();

    type(tree, 'Confirm password', 'password123');
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Update password' }).props.onPress();
    });
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
