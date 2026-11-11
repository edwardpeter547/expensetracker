/**
 * Transaction row wrapper exposing Edit (swipe right) and Delete (swipe left).
 *
 * Uses the already-installed gesture-handler Swipeable; actions never execute
 * on reveal, only when explicitly tapped.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
} from '@/constants/transactionsTheme';
import {
    cloneElement,
    forwardRef,
    isValidElement,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

const C = transactionColors;

/** Props for the swipeable transaction row. */
export interface SwipeableTransactionRowProps {
    children: ReactNode;
    onEdit: () => void;
    onDelete: () => void;
    onWillOpen?: (direction: 'left' | 'right') => void;
}

/**
 * Render the swipeable row shell.
 *
 * @param {SwipeableTransactionRowProps} props Component props.
 * @param {React.Ref<Swipeable>} ref The swipeable ref.
 * @returns {JSX.Element} The swipeable row.
 */
const SwipeableTransactionRow = forwardRef<Swipeable, SwipeableTransactionRowProps>(
    ({ children, onEdit, onDelete, onWillOpen }, ref) => {
        const { t } = useTranslation('transactions');
        const [openDirection, setOpenDirection] = useState<'left' | 'right' | null>(null);
        const suppressPressRef = useRef(false);

        const cardStyle =
            openDirection === 'right'
                ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                : openDirection === 'left'
                    ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }
                    : undefined;

        const content = isValidElement(children)
            ? cloneElement(
                  children as ReactElement<{ style?: unknown; onPress?: (event: unknown) => void }>,
                  {
                      style: [
                          (children as ReactElement<{ style?: unknown }>).props.style,
                          cardStyle,
                      ],
                      onPress: (event: unknown) => {
                          if (suppressPressRef.current) return;
                          (
                              children as ReactElement<{
                                  onPress?: (event: unknown) => void;
                              }>
                          ).props.onPress?.(event);
                      },
                  },
              )
            : children;

        /**
         * Render the green edit action behind the row.
         *
         * @param {unknown} _progress Progress value.
         * @param {unknown} _drag Drag value.
         * @param {Swipeable} swipeable The swipeable instance.
         * @returns {JSX.Element} The edit action.
         */
        const renderLeftActions = (_progress: unknown, _drag: unknown, swipeable: Swipeable) => (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Edit transaction')}
                onPress={() => {
                    swipeable.close();
                    onEdit();
                }}
                style={styles.editAction}
            >
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionText}>{t('Edit')}</Text>
            </Pressable>
        );

        /**
         * Render the red delete action behind the row.
         *
         * @param {unknown} _progress Progress value.
         * @param {unknown} _drag Drag value.
         * @param {Swipeable} swipeable The swipeable instance.
         * @returns {JSX.Element} The delete action.
         */
        const renderRightActions = (_progress: unknown, _drag: unknown, swipeable: Swipeable) => (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Delete transaction')}
                onPress={() => {
                    swipeable.close();
                    onDelete();
                }}
                style={styles.deleteAction}
            >
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionText}>{t('Delete')}</Text>
            </Pressable>
        );

        return (
            <View style={styles.wrap}>
                <Swipeable
                    ref={ref}
                    renderLeftActions={renderLeftActions}
                    renderRightActions={renderRightActions}
                    onSwipeableWillOpen={(direction) => {
                        suppressPressRef.current = true;
                        setOpenDirection(direction);
                        onWillOpen?.(direction);
                    }}
                    onSwipeableOpenStartDrag={() => {
                        suppressPressRef.current = true;
                    }}
                    onSwipeableWillClose={() => {
                        suppressPressRef.current = false;
                        setOpenDirection(null);
                    }}
                    onSwipeableClose={() => {
                        suppressPressRef.current = false;
                        setOpenDirection(null);
                    }}
                    overshootLeft={false}
                    overshootRight={false}
                >
                    {content}
                </Swipeable>
            </View>
        );
    },
);

SwipeableTransactionRow.displayName = 'SwipeableTransactionRow';

/** Swipe action styles. */
const styles = StyleSheet.create({
    wrap: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 10,
    },
    editAction: {
        width: 84,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: C.green,
    },
    deleteAction: {
        width: 84,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: C.error,
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default SwipeableTransactionRow;
