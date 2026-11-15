/**
 * Optional collapsible "Additional Details" section for the transaction form.
 *
 * The host controls expansion so validation can force the section open when a
 * nested field (for example a line item) is invalid while collapsed.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const C = transactionColors;
const T = transactionTypography;

/** Props for the additional-details accordion. */
export interface AdditionalDetailsAccordionProps {
    expanded: boolean;
    onToggle: () => void;
    children: ReactNode;
    errorText?: string | null;
}

/**
 * Render the collapsible additional-details section.
 *
 * @param {AdditionalDetailsAccordionProps} props Accordion props.
 * @returns {JSX.Element} The accordion.
 */
const AdditionalDetailsAccordion = ({
    expanded,
    onToggle,
    children,
    errorText = null,
}: AdditionalDetailsAccordionProps) => {
    const { t } = useTranslation('transactions');

    return (
        <View style={styles.section}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Toggle additional details')}
                onPress={onToggle}
                style={styles.toggle}
            >
                <View style={styles.toggleCopy}>
                    <Text style={styles.title}>{t('Additional Details')}</Text>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={C.green}
                />
            </Pressable>

            {errorText ? (
                <View style={styles.error}>
                    <Ionicons name="alert-circle" size={14} color={C.error} />
                    <Text style={styles.errorText}>{errorText}</Text>
                </View>
            ) : null}

            {expanded ? <View style={styles.body}>{children}</View> : null}
        </View>
    );
};

/** Accordion styles. */
const styles = StyleSheet.create({
    section: {
        marginTop: 18,
        borderTopWidth: 1,
        borderTopColor: C.divider,
        paddingTop: 10,
    },
    toggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    toggleCopy: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: T.fieldLabel,
        fontWeight: T.fieldLabelWeight,
        color: C.label,
    },
    error: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F3C2C2',
        backgroundColor: C.errorBackground,
    },
    errorText: {
        flex: 1,
        fontSize: T.validation,
        color: C.error,
    },
    body: {
        marginTop: 6,
    },
});

export default AdditionalDetailsAccordion;
