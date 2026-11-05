/**
 * Rendering tests for the AI chat screen.
 *
 * Verifies the screen identity, the welcome message, the close action, and
 * the local composer behavior.
 */

import AiChatScreen from '@/components/ai/AiChatScreen';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';

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

describe('AiChatScreen', () => {
    it('renders the assistant header and welcome message', () => {
        let tree: ReturnType<typeof create>;
        act(() => {
            tree = create(<AiChatScreen onClose={jest.fn()} />);
        });

        const text = allText(tree!);
        expect(text).toContain('AI Assistant');
        expect(text).toContain('AuditWallet');
        expect(text).toContain("Hi, I'm your AuditWallet assistant.");
    });

    it('closes when the close button is pressed', () => {
        const onClose = jest.fn();
        let tree: ReturnType<typeof create>;
        act(() => {
            tree = create(<AiChatScreen onClose={onClose} />);
        });

        act(() => {
            tree!.root.findByProps({ accessibilityLabel: 'Close AI chat' }).props.onPress();
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('appends a user message and clears the composer on send', () => {
        let tree: ReturnType<typeof create>;
        act(() => {
            tree = create(<AiChatScreen onClose={jest.fn()} />);
        });

        const input = tree!.root.findByProps({
            accessibilityLabel: 'Message the AI assistant',
        });

        act(() => {
            input.props.onChangeText('How much did I spend?');
        });

        act(() => {
            tree!.root.findByProps({ accessibilityLabel: 'Send message' }).props.onPress();
        });

        const text = allText(tree!);
        expect(text).toContain('How much did I spend?');
        expect(text).toContain('AI replies will appear here once connected.');
        expect(
            tree!.root.findByProps({
                accessibilityLabel: 'Message the AI assistant',
            }).props.value,
        ).toBe('');
    });
});
