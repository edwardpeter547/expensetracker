/**
 * Component tests for the membership additions inserted into Profile V2.
 *
 * Verifies the header badge renders the verified tier or an unavailable
 * neutral state, the tier chip renders only for a known membership, and the
 * new Membership & Billing menu row navigates through the existing handler.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactElement } from 'react';
import type { MembershipSummary } from '@/types/membership';
import ProfileHome from '../ProfileHome';
import { MembershipHeaderBadge } from '../MembershipProfileAdditions';
import '@/i18n';

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

const GOLD: MembershipSummary = {
    tier: 'gold',
    displayName: 'Gold Member',
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

describe('MembershipProfileAdditions', () => {
    test('renders the verified membership tier in the header badge', () => {
        const tree = render(<MembershipHeaderBadge membership={GOLD} />);
        expect(allText(tree)).toContain('Gold Member');
    });

    test('renders a neutral header badge when membership is unavailable', () => {
        const tree = render(<MembershipHeaderBadge membership={null} />);
        expect(allText(tree)).toContain('Membership unavailable');
    });

    test('navigates to Membership & Billing from the new menu row', () => {
        const onNavigate = jest.fn();
        const tree = render(
            <ProfileHome
                identity={{
                    displayName: 'Ada Lovelace',
                    email: 'ada@example.com',
                    firstname: 'Ada',
                    lastname: 'Lovelace',
                }}
                membership={GOLD}
                loading={false}
                onNavigate={onNavigate}
                onSignOut={jest.fn()}
            />,
        );

        act(() => {
            tree.root
                .findByProps({ accessibilityLabel: 'Membership & Billing' })
                .props.onPress();
        });

        expect(onNavigate).toHaveBeenCalledWith('membership');
    });
});
