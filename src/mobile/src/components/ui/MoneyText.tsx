/**
 * Locale-aware currency text with a de-emphasised decimal fraction.
 *
 * The whole amount (sign, symbol, and integer) keeps the supplied style while
 * the decimal separator and cents shrink to roughly 62% of the whole font
 * size. The dashboard Total Spending card is intentionally not rendered with
 * this component because it keeps the fraction at the same size as the whole.
 */

import { splitFormattedMoney } from '@/localization/format';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

/** Props for the currency text component. */
export interface MoneyTextProps {
    /** Canonical decimal amount (string or number). */
    value: string | number;
    /** ISO 4217 currency code used for the symbol. */
    currency: string;
    /** Display language; defaults to the active i18next language. */
    language?: string;
    /** Optional presentation sign rendered before the symbol and amount. */
    sign?: string;
    /** Style applied to the whole amount and inherited by the wrapper. */
    style?: StyleProp<TextStyle>;
    /** Optional override for the smaller decimal style. */
    fractionStyle?: StyleProp<TextStyle>;
    /** Maximum number of lines for the wrapper text. */
    numberOfLines?: number;
    /** Whether the wrapper text should shrink to fit its container. */
    adjustsFontSizeToFit?: boolean;
    /** Minimum scale applied when the wrapper shrinks to fit. */
    minimumFontScale?: number;
}

/**
 * Render a formatted currency amount with a smaller decimal fraction.
 *
 * @param {MoneyTextProps} props Component props.
 * @returns {JSX.Element} The split currency text.
 */
export const MoneyText = ({
    value,
    currency,
    language,
    sign,
    style,
    fractionStyle,
    numberOfLines,
    adjustsFontSizeToFit,
    minimumFontScale,
}: MoneyTextProps) => {
    const { i18n } = useTranslation();
    const resolvedLanguage = language ?? i18n.language;
    const { prefix, fraction, suffix } = splitFormattedMoney(value, resolvedLanguage, currency);

    const flattened = StyleSheet.flatten(style);
    const wholeSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : undefined;
    const fractionSize = wholeSize ? Math.max(10, Math.round(wholeSize * 0.62)) : undefined;

    return (
        <Text
            style={style}
            numberOfLines={numberOfLines}
            adjustsFontSizeToFit={adjustsFontSizeToFit}
            minimumFontScale={minimumFontScale}
        >
            {sign}
            {prefix}
            {fraction ? (
                <Text style={[fractionSize ? { fontSize: fractionSize } : null, fractionStyle]}>
                    {fraction}
                </Text>
            ) : null}
            {suffix}
        </Text>
    );
};
