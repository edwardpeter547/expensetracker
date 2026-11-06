/**
 * Rendering tests for the Recurring Transactions UI components.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactElement } from 'react';
import RecurringShortcut from '@/components/recurring/RecurringShortcut';
import RecurringScheduleListItem from '@/components/recurring/RecurringScheduleListItem';
import RecurringStatusBadge from '@/components/recurring/RecurringStatusBadge';
import RecurringEmptyState from '@/components/recurring/RecurringEmptyState';
import RecurringConfirmationCard from '@/components/recurring/RecurringConfirmationCard';
import { DEMO_RECURRING_SCHEDULES } from '@/offline/recurringDemo';

jest.mock('@expo/vector-icons', () => {
    const Ionicons = () => null;
    Ionicons.displayName = 'Ionicons';
    return { Ionicons };
});

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

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

describe('RecurringShortcut', () => {
    it('renders the shortcut and emits its press action', () => {
        const onPress = jest.fn();
        const tree = render(<RecurringShortcut onPress={onPress} />);

        expect(allText(tree)).toContain('Recurring Transactions');
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Recurring Transactions' }).props.onPress();
        });
        expect(onPress).toHaveBeenCalled();
    });
});

describe('RecurringScheduleListItem', () => {
    it('renders schedule name, amount, frequency, and status', () => {
        const schedule = DEMO_RECURRING_SCHEDULES[0];
        const tree = render(
            <RecurringScheduleListItem
                schedule={schedule}
                language="en-US"
                currency="GBP"
                onPress={jest.fn()}
            />,
        );

        expect(allText(tree)).toContain('Monthly Salary');
        expect(allText(tree)).toContain('Active');
        expect(allText(tree)).toContain('28th of every month');
    });

    it('renders variable amount copy for variable schedules', () => {
        const schedule = DEMO_RECURRING_SCHEDULES.find((item) => item.id === 'rec-electricity');
        const tree = render(
            <RecurringScheduleListItem
                schedule={schedule!}
                language="en-US"
                currency="GBP"
                onPress={jest.fn()}
            />,
        );
        expect(allText(tree)).toContain('Variable amount');
    });
});

describe('RecurringStatusBadge', () => {
    it('renders lifecycle labels', () => {
        expect(allText(render(<RecurringStatusBadge status="ACTIVE" />))).toContain('Active');
        expect(allText(render(<RecurringStatusBadge status="PAUSED" />))).toContain('Paused');
        expect(allText(render(<RecurringStatusBadge status="CANCELED" />))).toContain('Canceled');
    });
});

describe('RecurringEmptyState', () => {
    it('renders the empty message and action', () => {
        const tree = render(<RecurringEmptyState onAction={jest.fn()} />);
        expect(allText(tree)).toContain('No recurring transactions yet');
        expect(allText(tree)).toContain('Add Recurring Transaction');
    });
});

describe('RecurringConfirmationCard', () => {
    it('renders the income confirmation prompt', () => {
        const schedule = DEMO_RECURRING_SCHEDULES[1];
        const tree = render(
            <RecurringConfirmationCard
                schedule={schedule}
                actualAmount="2000.00"
                onActualAmountChange={jest.fn()}
                onConfirm={jest.fn()}
                onEditActual={jest.fn()}
                onNotYet={jest.fn()}
            />,
        );
        expect(allText(tree)).toContain('Have you received this payment?');
        expect(allText(tree)).toContain('Confirm Payment');
    });
});
