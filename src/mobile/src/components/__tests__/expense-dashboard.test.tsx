/**
 * Component tests for the approved Dashboard V1.5.
 *
 * Native modules (SVG, gradients, icons, image loading, safe area, and status
 * bar) are mocked so the tests can assert layout copy and interaction states
 * without a device.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import ExpenseDashboard from '../dashboard/ExpenseDashboard';
import type { DashboardData } from '../../types/dashboard';
import type { Team } from '../../types/team';

const mockOnSelectPreset = jest.fn();
const mockOnSelectRange = jest.fn();

jest.mock('@/components/dashboard/PeriodPickerModal', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const Mock = (props: Record<string, unknown>) =>
        React.createElement(View, { ...props, testID: 'period-picker' });
    Mock.displayName = 'PeriodPickerModal';
    return { __esModule: true, default: Mock };
});

jest.mock('expo-image', () => ({
    Image: () => null,
}));

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

jest.mock('@expo/vector-icons', () => {
    const Ionicons = () => null;
    Ionicons.displayName = 'Ionicons';
    return { Ionicons };
});

jest.mock('react-native-svg', () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const createMock = (name: string) => {
        const Mock = (props: Record<string, unknown>) =>
            React.createElement(View, props);
        Mock.displayName = name;
        return Mock;
    };
    return {
        __esModule: true,
        default: createMock('Svg'),
        Circle: createMock('Circle'),
        G: createMock('G'),
        Line: createMock('Line'),
        Polyline: createMock('Polyline'),
        Rect: createMock('Rect'),
    };
});

/**
 * Create a minimal populated dashboard view model.
 *
 * @returns A representative dashboard data fixture.
 */
const populatedData = (): DashboardData => ({
    firstName: 'John',
    currency: 'USD',
    totalSpending: '1234.56',
    spendingChangePercent: 12,
    income: '3200',
    expenses: '1234',
    remaining: '1966',
    monthlySpending: '1234.56',
    spendingGoal: '1000',
    trend: [],
    categories: [
        { name: 'Food', amount: '450', color: '#FF8B31' },
        { name: 'Transport', amount: '240', color: '#3296FB' },
    ],
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
 * Render the dashboard with the given overrides.
 *
 * @param overrides - Props merged over the defaults.
 * @returns The mounted test renderer.
 */
const render = (
    overrides: Partial<Parameters<typeof ExpenseDashboard>[0]> = {},
): ReturnType<typeof create> => {
    let tree: ReturnType<typeof create>;
    act(() => {
        tree = create(
            <ExpenseDashboard
                data={populatedData()}
                firstNameFallback=""
                loading={false}
                error={null}
                selection={{ kind: 'preset', period: 'This Month' }}
                language="en-US"
                onSelectPreset={mockOnSelectPreset}
                onSelectRange={mockOnSelectRange}
                onRetry={jest.fn()}
                {...overrides}
            />,
        );
    });
    return tree!;
};

describe('ExpenseDashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the approved header, cards, and category section', () => {
        const text = allText(render());

        expect(text).toContain('Welcome back,');
        expect(text).toContain('John');
        expect(text).toContain('Total Spending');
        expect(text).toContain('Income');
        expect(text).toContain('Expenses');
        expect(text).toContain('Balance');
        expect(text).toContain('Spending by Category');
        expect(text).toContain('Monthly Spending Goal');
        expect(text).toContain('6-Month Trend');
        expect(text).toContain('Food');
        expect(text).toContain('12% from previous period');
    });

    it('renders an explicit empty chart state for zero spending', () => {
        const text = allText(
            render({
                data: {
                    ...populatedData(),
                    totalSpending: '0',
                    income: '0',
                    expenses: '0',
                    remaining: '0',
                    monthlySpending: '0',
                    spendingChangePercent: null,
                    categories: [],
                },
            }),
        );

        expect(text).toContain('No spending this period');
        expect(text).toContain('— no previous data');
    });

    it('shows an error message and retry action instead of values', () => {
        const tree = render({ data: null, error: 'Could not reach the server.' });
        const text = allText(tree);

        expect(text).toContain('Could not reach the server.');
        expect(text).toContain('Retry');
        expect(text).not.toContain('Spending by Category');
    });

    it('shows skeletons while loading and keeps the header visible', () => {
        const tree = render({ data: null, loading: true });
        const text = allText(tree);

        expect(text).toContain('Welcome back,');
        expect(text).toContain('Total Spending');
        expect(text).not.toContain('Spending by Category');
    });

    it('opens the period picker from the calendar selector', () => {
        const tree = render();

        expect(tree.root.findByProps({ testID: 'period-picker' }).props.visible).toBe(false);

        act(() => {
            tree.root
                .findByProps({ accessibilityLabel: 'Period: This Month' })
                .props.onPress();
        });

        expect(tree.root.findByProps({ testID: 'period-picker' }).props.visible).toBe(true);
    });

    it('labels the notification bell as unavailable when pressed', () => {
        const tree = render();

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Notifications' }).props.onPress();
        });

        expect(allText(tree)).toContain("Notifications aren't available yet.");
    });

    it('renders team finance cards and opens the selected team workspace', () => {
        const onOpenTeam = jest.fn();
        const teams: Team[] = [
            {
                id: 'family',
                name: 'Family Finance',
                kind: 'Family',
                mode: 'POOLED',
                memberCount: 4,
                budgetTarget: 3500,
                spent: 2180,
            },
        ];

        const tree = render({ teams, onOpenTeam });
        const text = allText(tree);

        expect(text).toContain('TEAM FINANCE');
        expect(text).toContain('Family Finance');
        expect(text).toContain('Pooled');
        expect(text).toContain('Available (tracked)');

        act(() => {
            tree.root
                .findByProps({ accessibilityLabel: 'Open Family Finance' })
                .props.onPress();
        });

        expect(onOpenTeam).toHaveBeenCalledWith('family');
    });
});
