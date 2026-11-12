/**
 * Component tests for the approved Transactions and Add Transaction screens.
 *
 * Native modules (icons, gradients, status bar, and safe area) are mocked so
 * the tests can assert copy, filtering, search, and form interactions without
 * a device.
 */

import { act, create } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import type { ReactElement } from 'react';
import i18n from '@/i18n';
import {
    AddTransactionScreen,
    TransactionsScreen,
    type TransactionItem,
} from '@/components/transactions/TransactionsScreens';

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

jest.mock('expo-status-bar', () => ({
    StatusBar: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-native/Libraries/Lists/FlatList', () => {
    const React = jest.requireActual('react');
    const View = jest.requireActual('react-native/Libraries/Components/View/View').default;

    const MockFlatList = (props: Record<string, unknown>) => {
        const data = (props.data ?? []) as { id: string }[];
        const renderItem = props.renderItem as (mockEntry: { item: unknown }) => React.ReactElement;
        const listEmptyComponent = props.ListEmptyComponent;

        return React.createElement(
            View,
            { style: props.style },
            data.length > 0
                ? data.map((row, index) =>
                    React.createElement(
                        View,
                        { key: row.id ?? String(index) },
                        renderItem({ item: row }),
                    ),
                )
                : listEmptyComponent ?? null,
        );
    };
    MockFlatList.displayName = 'FlatList';

    return { __esModule: true, default: MockFlatList };
});

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

/**
 * Render a component inside an `act` scope.
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
 * Build a mapped transaction row for the list.
 *
 * @param overrides - Fields merged over the defaults.
 * @returns A transaction row.
 */
const item = (overrides: Partial<TransactionItem> = {}): TransactionItem => ({
    id: 'tx-1',
    title: 'Coffee Shop',
    categoryName: 'Food',
    kind: 'expense',
    amount: '4.50',
    currency: 'USD',
    occurredAt: '2026-10-27T08:25:00.000Z',
    iconName: 'restaurant-outline',
    iconColor: '#F06B3A',
    iconBackground: '#FDEAE1',
    ...overrides,
});

describe('TransactionsScreen', () => {
    afterEach(async () => {
        await i18n.changeLanguage('en');
    });

    it('renders the approved header, day heading, and transaction row', () => {
        const tree = render(
            <TransactionsScreen
                transactions={[item()]}
                onBack={jest.fn()}
                onAdd={jest.fn()}
                now={new Date('2026-10-27T10:00:00.000Z')}
            />,
        );

        const text = allText(tree);
        expect(text).toContain('Transactions');
        expect(text).toContain('Today');
        expect(text).toContain('Coffee Shop');
        expect(text).toContain('Food');
        expect(text).toContain('$4');
        expect(text).toContain('.50');
    });

    it('renders French transaction list labels after switching language', async () => {
        await i18n.changeLanguage('fr');
        const tree = render(
            <TransactionsScreen
                transactions={[item()]}
                onBack={jest.fn()}
                onAdd={jest.fn()}
                now={new Date('2026-10-27T10:00:00.000Z')}
            />,
        );

        const text = allText(tree);
        expect(text).toContain('Aujourd\'hui');
        expect(text).toContain('Revenus');
        expect(text).toContain('Dépenses');
    });

    it('renders and emits the recurring transactions shortcut', () => {
        const onRecurring = jest.fn();
        const tree = render(
            <TransactionsScreen
                transactions={[item()]}
                onBack={jest.fn()}
                onAdd={jest.fn()}
                onRecurringPress={onRecurring}
            />,
        );

        expect(allText(tree)).toContain('Recurring Transactions');
        act(() => {
            tree.root
                .findByProps({ accessibilityLabel: 'Recurring Transactions' })
                .props.onPress();
        });
        expect(onRecurring).toHaveBeenCalled();
    });

    it('shows an error message and retry action', () => {
        const tree = render(
            <TransactionsScreen
                transactions={[]}
                error="Could not reach the server."
                onBack={jest.fn()}
                onAdd={jest.fn()}
            />,
        );

        const text = allText(tree);
        expect(text).toContain('Could not reach the server.');
        expect(text).toContain('Retry');
    });

    it('filters rows when the Income segment is selected', () => {
        const onAdd = jest.fn();
        const tree = render(
            <TransactionsScreen
                transactions={[
                    item(),
                    item({
                        id: 'tx-2',
                        title: 'Salary',
                        categoryName: 'Salary',
                        kind: 'income',
                        amount: '3200',
                    }),
                ]}
                onBack={jest.fn()}
                onAdd={onAdd}
                now={new Date('2026-10-27T10:00:00.000Z')}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Income' }).props.onPress();
        });

        const text = allText(tree);
        expect(text).toContain('Salary');
        expect(text).not.toContain('Coffee Shop');
    });

    it('opens search and filters rows by query', () => {
        const tree = render(
            <TransactionsScreen
                transactions={[
                    item(),
                    item({
                        id: 'tx-2',
                        title: 'Salary',
                        categoryName: 'Salary',
                        kind: 'income',
                        amount: '3200',
                    }),
                ]}
                onBack={jest.fn()}
                onAdd={jest.fn()}
                now={new Date('2026-10-27T10:00:00.000Z')}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Search' }).props.onPress();
        });
        act(() => {
            tree.root.findByType(TextInput).props.onChangeText('salary');
        });

        const text = allText(tree);
        expect(text).toContain('Salary');
        expect(text).not.toContain('Coffee Shop');
    });

    it('opens the add form from the floating button', () => {
        const onAdd = jest.fn();
        const tree = render(
            <TransactionsScreen
                transactions={[item()]}
                onBack={jest.fn()}
                onAdd={onAdd}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Add transaction' }).props.onPress();
        });

        expect(onAdd).toHaveBeenCalled();
    });
});

describe('AddTransactionScreen', () => {
    const categories = [{ id: 'sys.food', label: 'Food', iconName: 'restaurant-outline' as const }];

    it('renders the approved form fields and save button', () => {
        const tree = render(
            <AddTransactionScreen
                categories={categories}
                budgets={[]}
                onBack={jest.fn()}
                onSave={jest.fn()}
            />,
        );

        const text = allText(tree);
        expect(text).toContain('Add Transaction');
        expect(text).toContain('Amount');
        expect(text).toContain('Category');
        expect(text).toContain('Date');
        expect(text).toContain('Description');
        expect(text).toContain('Save Transaction');
    });

    it('validates amount and category before saving', () => {
        const onSave = jest.fn();
        const tree = render(
            <AddTransactionScreen
                categories={categories}
                budgets={[]}
                onBack={jest.fn()}
                onSave={onSave}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Save Transaction' }).props.onPress();
        });
        expect(onSave).not.toHaveBeenCalled();
        expect(allText(tree)).toContain('Enter a valid positive amount.');
    });

    it('wires the category and date selector callbacks', () => {
        const onChooseCategory = jest.fn();
        const onChooseDate = jest.fn();
        const tree = render(
            <AddTransactionScreen
                categories={categories}
                budgets={[]}
                onBack={jest.fn()}
                onSave={jest.fn()}
                onChooseCategory={onChooseCategory}
                onChooseDate={onChooseDate}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Category' }).props.onPress();
        });
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Date' }).props.onPress();
        });

        expect(onChooseCategory).toHaveBeenCalled();
        expect(onChooseDate).toHaveBeenCalled();
    });

    it('disables budget selection for income transactions', () => {
        const tree = render(
            <AddTransactionScreen
                categories={categories}
                budgets={[]}
                onBack={jest.fn()}
                onSave={jest.fn()}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Income' }).props.onPress();
        });

        const budget = tree.root.findByProps({
            accessibilityLabel: 'Add to Budget (Optional)',
        });
        expect(budget.props.disabled).toBe(true);
    });

    it('renders edit mode with prepopulated values and Save Changes', () => {
        const tree = render(
            <AddTransactionScreen
                mode="edit"
                initialValues={{
                    amount: '12.50',
                    categoryId: 'sys.food',
                    description: 'Lunch',
                }}
                categories={[{ id: 'sys.food', label: 'Food', iconName: 'restaurant-outline' as const }]}
                budgets={[]}
                onBack={jest.fn()}
                onSave={jest.fn()}
            />,
        );

        const text = allText(tree);
        expect(text).toContain('Edit Transaction');
        expect(text).toContain('Save Changes');
        expect(tree.root.findByProps({ value: '12.50' })).toBeTruthy();
    });
});
