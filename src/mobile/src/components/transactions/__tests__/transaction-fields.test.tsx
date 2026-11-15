/**
 * Component tests for the optional transaction detail controls: merchant
 * metadata, the payment-method dropdown, and the time picker.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactElement } from 'react';
import i18n from '@/i18n';
import MerchantDetailsFields from '@/components/transactions/MerchantDetailsFields';
import TimePickerModal from '@/components/transactions/TimePickerModal';

jest.mock('@expo/vector-icons', () => {
    const Ionicons = () => null;
    Ionicons.displayName = 'Ionicons';
    return { Ionicons };
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

describe('MerchantDetailsFields', () => {
    /**
     * Selecting a payment method must update the merchant value with the
     * chosen label string rather than requiring free-text entry.
     */
    it('selects a payment method from the dropdown', () => {
        const onChange = jest.fn();
        const tree = render(
            <MerchantDetailsFields value={{}} language="en-US" onChange={onChange} />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Payment method' }).props.onPress();
        });
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Card' }).props.onPress();
        });

        expect(onChange).toHaveBeenCalledWith({ paymentMethod: 'Card' });
    });

    /**
     * The merchant address input must be multiline while other optional
     * merchant fields remain single-line.
     */
    it('renders the merchant address as a multiline input', () => {
        const tree = render(
            <MerchantDetailsFields value={{}} language="en-US" onChange={jest.fn()} />,
        );

        expect(
            tree.root.findByProps({ accessibilityLabel: 'Merchant address' }).props.multiline,
        ).toBe(true);
    });
});

describe('TimePickerModal', () => {
    afterEach(async () => {
        await i18n.changeLanguage('en');
    });

    /**
     * Applying the picker must emit a zero-padded `HH:mm` string and close the
     * sheet, preserving time-only semantics.
     */
    it('applies the selected time and closes', () => {
        const onSelect = jest.fn();
        const onClose = jest.fn();
        const tree = render(
            <TimePickerModal
                visible
                value="08:25"
                language="en-US"
                onClose={onClose}
                onSelect={onSelect}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Increase minute' }).props.onPress();
        });
        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Apply time' }).props.onPress();
        });

        expect(onSelect).toHaveBeenCalledWith('08:26');
        expect(onClose).toHaveBeenCalled();
    });

    /**
     * Cancelling the picker must not emit a selection or change the saved
     * value.
     */
    it('cancels without emitting a selection', () => {
        const onSelect = jest.fn();
        const onClose = jest.fn();
        const tree = render(
            <TimePickerModal
                visible
                value="08:25"
                language="en-US"
                onClose={onClose}
                onSelect={onSelect}
            />,
        );

        act(() => {
            tree.root.findByProps({ accessibilityLabel: 'Close' }).props.onPress();
        });

        expect(onSelect).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    /**
     * An empty value must be accepted and the picker must initialize from the
     * current clock rather than throwing.
     */
    it('renders with an empty value without error', () => {
        const tree = render(
            <TimePickerModal
                visible
                value={null}
                language="en-US"
                onClose={jest.fn()}
                onSelect={jest.fn()}
            />,
        );

        expect(allText(tree)).toContain('Select time');
    });
});
