/**
 * Rendering tests for the floating chat button.
 *
 * Verifies the button is discoverable through its accessibility label and
 * that pressing it emits the open-chat callback.
 */

import FloatingChatButton from '@/components/dashboard/FloatingChatButton';
import { act, create } from 'react-test-renderer';

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

describe('FloatingChatButton', () => {
    it('renders with an accessible label and emits the press callback', () => {
        const onPress = jest.fn();
        let tree: ReturnType<typeof create>;

        act(() => {
            tree = create(<FloatingChatButton onPress={onPress} />);
        });

        const button = tree!.root.findByProps({
            accessibilityLabel: 'Open AI chat',
        });
        expect(button).toBeTruthy();

        act(() => {
            button.props.onPress();
        });

        expect(onPress).toHaveBeenCalledTimes(1);
    });
});
