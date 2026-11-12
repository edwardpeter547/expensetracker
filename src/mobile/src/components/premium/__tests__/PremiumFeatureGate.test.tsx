/**
 * Rendering tests for the premium feature gate.
 *
 * The scenarios verify feature-specific copy, the disabled CTA when no plans
 * URL is configured, the external-link CTA, and the dismiss action.
 */

import PremiumFeatureGate from '@/components/premium/PremiumFeatureGate';
import { act, create } from 'react-test-renderer';
import { Linking, Text } from 'react-native';
import type { ReactElement } from 'react';
import '@/i18n';

jest.mock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: { extra: {} } },
}));

jest.mock('@expo/vector-icons', () => {
    const Ionicons = () => null;
    Ionicons.displayName = 'Ionicons';
    return { Ionicons };
});

/**
 * Mount a component inside an `act` scope.
 *
 * @param element - The element to mount.
 * @returns The mounted renderer.
 */
const render = (element: ReactElement): ReturnType<typeof create> => {
    let tree: ReturnType<typeof create>;
    act(() => {
        tree = create(element);
    });
    return tree!;
};

/**
 * Concatenate all visible text in a mounted tree.
 *
 * @param tree - The mounted renderer.
 * @returns The concatenated text content.
 */
const allText = (tree: ReturnType<typeof create>): string =>
    tree.root
        .findAllByType(Text)
        .map((node) => node.props.children)
        .flat(Infinity)
        .filter((child): child is string => typeof child === 'string')
        .join('\n');

describe('PremiumFeatureGate', () => {
    it('renders feature-specific headline, description, and benefits', () => {
        const tree = render(
            <PremiumFeatureGate feature="teams.create" onDismiss={jest.fn()} />,
        );
        const text = allText(tree);

        expect(text).toContain('Better finances, together.');
        expect(text).toContain('Create a shared space to plan, track and understand money together.');
        expect(text).toContain('Manage pooled or independent team finances');
        expect(text).toContain('Track contributions and shared spending');
        expect(text).toContain('Explore Premium Plans');
    });

    it('disables the external CTA and explains when no plans URL is configured', () => {
        const tree = render(
            <PremiumFeatureGate feature="teams.create" onDismiss={jest.fn()} />,
        );
        const cta = tree.root.findByProps({ accessibilityLabel: 'Explore Premium Plans' });

        expect(cta.props.disabled).toBe(true);
        expect(allText(tree)).toContain('Plan comparison is not available yet.');
    });

    it('opens the configured https plans URL through the platform linker', async () => {
        const canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
        const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
        const tree = render(
            <PremiumFeatureGate
                feature="teams.create"
                plansUrl="https://auditwallet.example/plans"
                onDismiss={jest.fn()}
            />,
        );

        await act(async () => {
            tree.root.findByProps({ accessibilityLabel: 'Explore Premium Plans' }).props.onPress();
        });

        expect(canOpen).toHaveBeenCalledWith('https://auditwallet.example/plans');
        expect(openUrl).toHaveBeenCalledWith('https://auditwallet.example/plans');

        canOpen.mockRestore();
        openUrl.mockRestore();
    });

    it('delegates to the custom opener when provided', async () => {
        const onOpenPlans = jest.fn(() => Promise.resolve());
        const tree = render(
            <PremiumFeatureGate
                feature="teams.create"
                onOpenPlans={onOpenPlans}
                onDismiss={jest.fn()}
            />,
        );

        await act(async () => {
            tree.root.findByProps({ accessibilityLabel: 'Explore Premium Plans' }).props.onPress();
        });

        expect(onOpenPlans).toHaveBeenCalledTimes(1);
    });

    it('calls the dismiss action for Maybe Later', () => {
        const onDismiss = jest.fn();
        const tree = render(
            <PremiumFeatureGate feature="teams.create" onDismiss={onDismiss} />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Maybe Later' }).props.onPress();
        });

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('renders the compact variant without the full illustration', () => {
        const tree = render(
            <PremiumFeatureGate
                feature="teams.invite"
                presentation="compact"
                onDismiss={jest.fn()}
            />,
        );
        const text = allText(tree);

        expect(text).toContain('PREMIUM FEATURE');
        expect(text).toContain('Bring your people in.');
        expect(
            tree.root.findAllByProps({
                accessibilityLabel: 'Illustration of a premium finance dashboard with a secure lock',
            }),
        ).toHaveLength(0);
    });
});
