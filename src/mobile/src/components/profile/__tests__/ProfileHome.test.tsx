/**
 * Component tests for the Profile V2 landing screen.
 *
 * Verifies the three menu groups render, menu rows navigate to the correct
 * destination, the sign-out action is wired, and the loading state hides the
 * content until the identity is ready.
 */

import { act, create } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';
import type { ReactElement } from 'react';
import ProfileHome, { type ProfileIdentity } from '../ProfileHome';

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

const IDENTITY: ProfileIdentity = {
    displayName: 'Ada Lovelace',
    email: 'ada@example.com',
    firstname: 'Ada',
    lastname: 'Lovelace',
};

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

describe('ProfileHome', () => {
    test('renders the identity and all three approved menu groups', () => {
        const onNavigate = jest.fn();
        const tree = render(
            <ProfileHome
                identity={IDENTITY}
                membership={null}
                loading={false}
                onNavigate={onNavigate}
                onSignOut={jest.fn()}
            />,
        );

        const text = allText(tree);
        expect(text).toContain('Ada Lovelace');
        expect(text).toContain('ada@example.com');
        expect(text).toContain('YOUR ACCOUNT');
        expect(text).toContain('PREFERENCES & TOOLS');
        expect(text).toContain('ACCOUNT CONTROL');
        expect(text).toContain('Personal Information');
        expect(text).toContain('Categories');
        expect(text).toContain('Account Management');
    });

    test('navigates to the selected menu destination', () => {
        const onNavigate = jest.fn();
        const tree = render(
            <ProfileHome
                identity={IDENTITY}
                membership={null}
                loading={false}
                onNavigate={onNavigate}
                onSignOut={jest.fn()}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Security' }).props.onPress();
        });
        expect(onNavigate).toHaveBeenCalledWith('security');
    });

    test('wires the sign-out action to the supplied handler', () => {
        const onSignOut = jest.fn();
        const tree = render(
            <ProfileHome
                identity={IDENTITY}
                membership={null}
                loading={false}
                onNavigate={jest.fn()}
                onSignOut={onSignOut}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Sign Out' }).props.onPress();
        });
        expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    test('shows a loading state before the identity is available', () => {
        const tree = render(
            <ProfileHome
                identity={null}
                membership={null}
                loading
                onNavigate={jest.fn()}
                onSignOut={jest.fn()}
            />,
        );

        expect(tree.root.findAllByType(ActivityIndicator).length).toBe(1);
        expect(allText(tree)).not.toContain('YOUR ACCOUNT');
    });
});
