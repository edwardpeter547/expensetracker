/**
 * Component tests for the Membership & Billing screen.
 *
 * Verifies the Free, paid, and missing-membership presentations, and that
 * Compare Plans stays out-of-app: no plan list is rendered and, while the
 * product website is unavailable, pressing the action shows a clear notice.
 */

import { act, create } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import type { ReactElement } from 'react';
import type { MembershipSummary } from '@/types/membership';
import MembershipBillingScreen from '../MembershipBillingScreen';

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

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const FREE: MembershipSummary = {
    tier: 'free',
    displayName: 'Free Member',
    benefits: ['Core tracking'],
};

const GOLD: MembershipSummary = {
    tier: 'gold',
    displayName: 'Gold Member',
    benefits: ['Unlimited categories', 'Priority support'],
    status: 'active',
    priceLabel: '$9.99',
    billingCycleLabel: 'month',
    renewalDateLabel: '1 Dec 2026',
    billingProviderLabel: 'Demo Billing',
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

describe('MembershipBillingScreen', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders the Free membership presentation', () => {
        const tree = render(
            <MembershipBillingScreen membership={FREE} onBack={jest.fn()} />,
        );
        const text = allText(tree);

        expect(text).toContain('Free Member');
        expect(text).toContain('Your personal finance essentials');
        expect(text).toContain('Explore Premium');
        expect(text).not.toContain('Subscription');
    });

    test('renders the paid membership and subscription details', () => {
        const tree = render(
            <MembershipBillingScreen membership={GOLD} onBack={jest.fn()} />,
        );
        const text = allText(tree);

        expect(text).toContain('Gold Member');
        expect(text).toContain('Unlimited categories');
        expect(text).toContain('Subscription');
        expect(text).toContain('Billing cycle');
        expect(text).toContain('Next billing / renewal');
        expect(text).toContain('Billing provider');
        expect(text).toContain('Subscription management is not yet available here.');
    });

    test('renders the missing-membership neutral state without invented data', () => {
        const tree = render(
            <MembershipBillingScreen membership={null} onBack={jest.fn()} />,
        );
        const text = allText(tree);

        expect(text).toContain('Unavailable');
        expect(text).toContain('Plan benefits are not available yet.');
        expect(text).toContain("The product website isn't available yet.");
    });

    test('keeps plan comparison out-of-app and shows an unavailable notice', () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
        const tree = render(
            <MembershipBillingScreen membership={FREE} onBack={jest.fn()} />,
        );

        expect(allText(tree)).not.toContain('Silver');
        expect(allText(tree)).toContain('Compare Plans');

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Compare Plans' }).props.onPress();
        });

        expect(alertSpy).toHaveBeenCalledWith(
            'Not available yet',
            'Plan comparison will be available on the product website soon.',
        );
    });
});
