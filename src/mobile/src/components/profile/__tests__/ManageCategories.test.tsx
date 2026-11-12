/**
 * Component tests for the Manage Categories screen.
 *
 * Verifies that system categories are rendered as protected built-ins while
 * user-created categories expose edit and delete controls, and that a
 * delete-conflict rejection from the data layer is surfaced to the user.
 */

import { act, create } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import type { ReactElement } from 'react';
import { useCategories } from '@/hooks/useCategories';
import ManageCategories from '../ManageCategories';
import '@/i18n';

jest.mock('@/hooks/useCategories', () => ({
    useCategories: jest.fn(),
}));

jest.mock('@/contexts/LocaleContext', () => ({
    useLocale: jest.fn(() => ({ language: 'en' })),
}));

jest.mock('@expo/vector-icons', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const Ionicons = (props: Record<string, unknown>) => React.createElement(View, props);
    Ionicons.displayName = 'Ionicons';
    Ionicons.glyphMap = {
        'restaurant-outline': 1,
        'receipt-outline': 1,
        'pricetag-outline': 1,
        'grid-outline': 1,
        'trash-outline': 1,
    };
    return { Ionicons };
});

jest.mock('expo-image', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const Image = (props: Record<string, unknown>) => React.createElement(View, props);
    Image.displayName = 'Image';
    return { Image };
});

const mockUseCategories = useCategories as jest.Mock;

const CATEGORIES = [
    { id: 'sys.food', name: 'Food', icon: 'restaurant-outline', isSystem: true, userId: null },
    { id: 'custom-1', name: 'Coffee', icon: null, isSystem: false, userId: 1 },
];

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

describe('ManageCategories', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        mockUseCategories.mockReset();
    });

    test('renders system categories as protected built-ins', () => {
        mockUseCategories.mockReturnValue({
            categories: CATEGORIES,
            loading: false,
            saving: false,
            error: null,
            reload: jest.fn(),
            create: jest.fn(),
            rename: jest.fn(),
            remove: jest.fn(),
        });

        const tree = render(<ManageCategories />);
        const text = allText(tree);

        expect(text).toContain('Food');
        expect(text).toContain('Built-in category');
        expect(text).toContain('SYSTEM');
        expect(text).not.toContain('Edit');
        expect(text).not.toContain('Coffee');
    });

    test('shows edit and delete controls for custom categories', () => {
        mockUseCategories.mockReturnValue({
            categories: CATEGORIES,
            loading: false,
            saving: false,
            error: null,
            reload: jest.fn(),
            create: jest.fn(),
            rename: jest.fn(),
            remove: jest.fn(),
        });

        const tree = render(<ManageCategories />);
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Custom' }).props.onPress();
        });

        const text = allText(tree);
        expect(text).toContain('Coffee');
        expect(text).toContain('Custom category');
        expect(text).toContain('Edit');
        expect(tree.root.findAllByProps({ accessibilityLabel: 'Delete Coffee' }).length).toBeGreaterThan(0);
    });

    test('surfaces a delete-conflict message from the data layer', async () => {
        const remove = jest
            .fn()
            .mockRejectedValue(new Error('Category is in use by 2 transactions'));
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
        mockUseCategories.mockReturnValue({
            categories: CATEGORIES,
            loading: false,
            saving: false,
            error: null,
            reload: jest.fn(),
            create: jest.fn(),
            rename: jest.fn(),
            remove,
        });

        const tree = render(<ManageCategories />);
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Custom' }).props.onPress();
        });
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Delete Coffee' }).props.onPress();
        });

        const confirmCall = alertSpy.mock.calls.find((call) => call[0] === 'Delete Category');
        const buttons = confirmCall?.[2] as { text: string; style?: string; onPress?: () => void }[] | undefined;
        const destructive = buttons?.find((button) => button.style === 'destructive');

        await act(async () => {
            destructive?.onPress?.();
        });

        expect(remove).toHaveBeenCalledWith('custom-1');
        expect(alertSpy).toHaveBeenCalledWith(
            'Cannot delete category',
            'Category is in use by 2 transactions',
        );
    });
});
