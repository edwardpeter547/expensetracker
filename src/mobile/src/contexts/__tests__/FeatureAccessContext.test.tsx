/**
 * Tests for the frontend feature-access provider and hooks.
 *
 * The scenarios verify that `teams.create` denies by default, that the mock
 * override switches access states, that allowed actions run, and that denied,
 * loading, and unknown decisions never navigate or masquerade as each other.
 */

import {
    FeatureAccessProvider,
    useFeatureAccessContext,
} from '@/contexts/FeatureAccessContext';
import { useFeatureAccess, useFeatureGate } from '@/hooks/useFeatureAccess';
import type { FeatureKey } from '@/types/featureAccess';
import { act, create } from 'react-test-renderer';
import { Pressable, Text, View } from 'react-native';

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

/** Props for the test harness that exercises the provider hooks. */
interface HarnessProps {
    feature: FeatureKey;
    onAllowed: () => void;
}

/**
 * Render the current access view and expose control buttons.
 *
 * @param {HarnessProps} props Harness props.
 * @returns {JSX.Element} The harness.
 */
const Harness = ({ feature, onAllowed }: HarnessProps) => {
    const access = useFeatureAccess(feature);
    const { requestAccess } = useFeatureGate();
    const { setMockStatus } = useFeatureAccessContext();

    return (
        <View>
            <Text>{access.status}</Text>
            <Text>{`isAllowed:${access.isAllowed}`}</Text>
            <Text>{`isDenied:${access.isDenied}`}</Text>
            <Text>{`isLoading:${access.isLoading}`}</Text>
            <Text>{`isUnknown:${access.isUnknown}`}</Text>
            <Pressable
                accessibilityLabel="run"
                onPress={() => requestAccess(feature, onAllowed)}
            />
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
        </View>
    );
};

/**
 * Mount a feature-access provider around the harness.
 *
 * @param feature - The feature to observe.
 * @param onAllowed - Callback passed to `requestAccess`.
 * @returns The mounted renderer.
 */
const renderHarness = (
    feature: FeatureKey,
    onAllowed: () => void,
): ReturnType<typeof create> => {
    let tree: ReturnType<typeof create>;
    act(() => {
        tree = create(
            <FeatureAccessProvider>
                <Harness feature={feature} onAllowed={onAllowed} />
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

describe('FeatureAccessProvider', () => {
    it('denies teams.create by default for the premium gate test case', () => {
        const tree = renderHarness('teams.create', jest.fn());
        const text = allText(tree);

        expect(text).toContain('isDenied:true');
        expect(text).toContain('isAllowed:false');
    });

    it('keeps teams.manage allowed so not all Teams functionality is gated', () => {
        const tree = renderHarness('teams.manage', jest.fn());
        expect(allText(tree)).toContain('isAllowed:true');
    });

    it('switches a feature to allowed through the development mock override', () => {
        const tree = renderHarness('teams.create', jest.fn());

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'set-allowed' }).props.onPress();
        });

        expect(allText(tree)).toContain('isAllowed:true');
    });

    it('runs the allowed action without presenting a gate', () => {
        const onAllowed = jest.fn();
        const tree = renderHarness('teams.create', onAllowed);

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'set-allowed' }).props.onPress();
        });
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'run' }).props.onPress();
        });

        expect(onAllowed).toHaveBeenCalledTimes(1);
        expect(allText(tree)).not.toContain('Explore Premium Plans');
    });

    it('presents the premium gate and never runs a denied action', () => {
        const onAllowed = jest.fn();
        const tree = renderHarness('teams.create', onAllowed);

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'run' }).props.onPress();
        });

        expect(onAllowed).not.toHaveBeenCalled();
        expect(allText(tree)).toContain('Explore Premium Plans');
    });

    it('shows a pending state and never navigates while loading', () => {
        const onAllowed = jest.fn();
        const tree = renderHarness('teams.create', onAllowed);

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'set-loading' }).props.onPress();
        });
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'run' }).props.onPress();
        });

        const text = allText(tree);
        expect(onAllowed).not.toHaveBeenCalled();
        expect(text).toContain('Checking access');
        expect(text).not.toContain('Explore Premium Plans');
    });

    it('shows a retryable unavailable state without claiming a premium requirement', () => {
        const onAllowed = jest.fn();
        const tree = renderHarness('teams.create', onAllowed);

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'set-unknown' }).props.onPress();
        });
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'run' }).props.onPress();
        });

        const text = allText(tree);
        expect(onAllowed).not.toHaveBeenCalled();
        expect(text).toContain("We couldn't check access");
        expect(text).not.toContain('Explore Premium Plans');
    });
});
