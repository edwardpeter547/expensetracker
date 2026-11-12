/**
 * Tests for the route/section-level feature guard.
 *
 * The scenarios verify that children render only when access is allowed and
 * that denied, loading, and unknown decisions surface their dedicated states
 * instead of the protected content.
 */

import FeatureGate from '@/components/premium/FeatureGate';
import {
    FeatureAccessProvider,
    useFeatureAccessContext,
} from '@/contexts/FeatureAccessContext';
import type { FeatureKey } from '@/types/featureAccess';
import { act, create } from 'react-test-renderer';
import { Pressable, Text, View } from 'react-native';
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

jest.mock('react-native-safe-area-context', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const SafeAreaView = ({ children, ...props }: Record<string, unknown>) =>
        React.createElement(View, props, children);
    SafeAreaView.displayName = 'SafeAreaView';
    return {
        SafeAreaView,
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    };
});

/** Props for the gate harness. */
interface HarnessProps {
    feature: FeatureKey;
    onDismiss?: () => void;
}

/**
 * Render the guard plus development mock controls.
 *
 * @param {HarnessProps} props Harness props.
 * @returns {JSX.Element} The harness.
 */
const Harness = ({ feature, onDismiss }: HarnessProps) => {
    const { setMockStatus } = useFeatureAccessContext();

    return (
        <View>
            <Pressable
                accessibilityLabel="set-allowed"
                onPress={() => setMockStatus(feature, 'allowed')}
            />
            <Pressable
                accessibilityLabel="set-denied"
                onPress={() => setMockStatus(feature, 'denied')}
            />
            <Pressable
                accessibilityLabel="set-loading"
                onPress={() => setMockStatus(feature, 'loading')}
            />
            <Pressable
                accessibilityLabel="set-unknown"
                onPress={() => setMockStatus(feature, 'unknown')}
            />
            <FeatureGate
                featureId={feature}
                presentation="screen"
                onDeniedDismiss={onDismiss}
                onBack={onDismiss}
            >
                <Text>ALLOWED CHILD</Text>
            </FeatureGate>
        </View>
    );
};

/**
 * Mount the harness inside the provider.
 *
 * @param feature - The feature to guard.
 * @param onDismiss - Optional dismiss callback.
 * @returns The mounted renderer.
 */
const renderHarness = (
    feature: FeatureKey,
    onDismiss?: () => void,
): ReturnType<typeof create> => {
    let tree: ReturnType<typeof create>;
    act(() => {
        tree = create(
            <FeatureAccessProvider>
                <Harness feature={feature} onDismiss={onDismiss} />
            </FeatureAccessProvider>,
        );
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

describe('FeatureGate', () => {
    it('renders protected children when access is allowed', () => {
        const tree = renderHarness('teams.create');

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'set-allowed' }).props.onPress();
        });

        expect(allText(tree)).toContain('ALLOWED CHILD');
        expect(allText(tree)).not.toContain('Explore Premium Plans');
    });

    it('renders the premium gate instead of children when access is denied', () => {
        const tree = renderHarness('teams.create');
        const text = allText(tree);

        expect(text).toContain('Explore Premium Plans');
        expect(text).not.toContain('ALLOWED CHILD');
    });

    it('renders a pending state instead of children while loading', () => {
        const tree = renderHarness('teams.create');

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'set-loading' }).props.onPress();
        });

        const text = allText(tree);
        expect(text).toContain('Checking access');
        expect(text).not.toContain('ALLOWED CHILD');
        expect(text).not.toContain('Explore Premium Plans');
    });

    it('renders an unavailable state without claiming a premium requirement when unknown', () => {
        const tree = renderHarness('teams.create');

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'set-unknown' }).props.onPress();
        });

        const text = allText(tree);
        expect(text).toContain("We couldn't check access");
        expect(text).not.toContain('ALLOWED CHILD');
        expect(text).not.toContain('Explore Premium Plans');
    });
});
