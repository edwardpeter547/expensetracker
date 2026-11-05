import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { router } from 'expo-router';
import WelcomeScreen from '../../../app/welcome';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

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

/**
 * Collects all visible text rendered by a test renderer tree.
 *
 * @param tree - A rendered test renderer.
 * @returns A newline-joined string of the tree's text content.
 */
const collectText = (tree: ReturnType<typeof create>): string =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .filter((child): child is string => typeof child === 'string')
    .join('\n');

describe('WelcomeScreen', () => {
  let tree: ReturnType<typeof create>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the brand copy and both entry actions', () => {
    act(() => {
      tree = create(<WelcomeScreen />);
    });
    const text = collectText(tree);

    expect(
      tree.root.findByProps({ accessibilityLabel: 'AuditWallet' }),
    ).toBeTruthy();
    expect(text).toContain('Take control of');
    expect(text).toContain('your finances');
    expect(text).toContain('Get Started');
    expect(text).toContain('Sign In');
  });

  it('navigates to registration and login from the two actions', () => {
    act(() => {
      tree = create(<WelcomeScreen />);
    });

    act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Get Started' })
        .props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/register');

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Sign In' }).props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/login');
  });
});
