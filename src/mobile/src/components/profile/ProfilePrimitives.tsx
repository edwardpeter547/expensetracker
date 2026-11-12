/**
 * Reusable primitives for the Profile V2 surfaces.
 *
 * These cards, rows, fields, buttons, toggles, and chips follow the existing
 * app conventions (typed props, accessibility labels, static style sheets)
 * while matching the approved V2 visual direction. They intentionally do not
 * depend on the theme context so the profile header can use the static navy
 * and emerald palette consistently.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import type { ProfileAvatar as ProfileAvatarDto } from '@/types/profile';
import { profileTheme as t } from '@/constants/profileTheme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Pressable,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';

/** A valid Ionicons glyph name. */
export type ProfileIconName = keyof typeof Ionicons.glyphMap;

/**
 * Render a rounded white card with a section title.
 *
 * @param {object} props Component props.
 * @param {string} props.title The card title.
 * @param {React.ReactNode} props.children The card body.
 * @returns {JSX.Element} The section card.
 */
export const SectionCard = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        {children}
    </View>
);

/**
 * Render a pressable settings row with an optional icon and trailing element.
 *
 * @param {object} props Component props.
 * @param {string} props.title The row title.
 * @param {string} [props.subtitle] Supporting subtitle text.
 * @param {ProfileIconName} [props.icon] Leading Ionicons glyph.
 * @param {() => void} [props.onPress] Press handler; row is inert when omitted.
 * @param {React.ReactNode} [props.trailing] Trailing node or chevron.
 * @param {boolean} [props.last] Hide the bottom divider on the final row.
 * @returns {JSX.Element} The settings row.
 */
export const SettingsRow = ({
    title,
    subtitle,
    icon,
    onPress,
    trailing,
    last = false,
}: {
    title: string;
    subtitle?: string;
    icon?: ProfileIconName;
    onPress?: () => void;
    trailing?: React.ReactNode;
    last?: boolean;
}) => (
    <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={title}
        onPress={onPress}
        disabled={!onPress}
        style={[styles.row, last && styles.rowLast]}
    >
        {icon ? (
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={21} color={t.navy} />
            </View>
        ) : null}
        <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{title}</Text>
            {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
        {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#A5B3C1" /> : null)}
    </Pressable>
);

/**
 * Render a labelled text field.
 *
 * @param {object} props Component props.
 * @param {string} props.label The field label.
 * @param {string} props.value The controlled value.
 * @param {(text: string) => void} props.onChangeText Change handler.
 * @param {string} [props.placeholder] Placeholder text.
 * @param {boolean} [props.secureTextEntry] Mask the value.
 * @param {'default'|'email-address'} [props.keyboardType] Keyboard variant.
 * @param {boolean} [props.editable] Whether the field accepts input.
 * @returns {JSX.Element} The form field.
 */
export const FormField = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType = 'default',
    editable = true,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address';
    editable?: boolean;
}) => (
    <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            accessibilityLabel={label}
            style={[styles.input, !editable && styles.inputDisabled]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder ?? label}
            placeholderTextColor="#9AA7B5"
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            editable={editable}
            autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        />
    </View>
);

/**
 * Render a primary emerald action button.
 *
 * @param {object} props Component props.
 * @param {string} props.title The button label.
 * @param {() => void} props.onPress Press handler.
 * @param {boolean} [props.disabled] Disable interaction.
 * @param {boolean} [props.loading] Show a loading state.
 * @returns {JSX.Element} The primary button.
 */
export const PrimaryButton = ({
    title,
    onPress,
    disabled,
    loading = false,
}: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
}) => {
    const { t: tt } = useTranslation('profile');
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={title}
            disabled={disabled || loading}
            onPress={onPress}
            style={[styles.primary, (disabled || loading) && styles.primaryDisabled]}
        >
            <Text style={styles.primaryText}>{loading ? tt('Working…') : title}</Text>
        </Pressable>
    );
};

/**
 * Render a settings row ending in a switch.
 *
 * @param {object} props Component props.
 * @param {string} props.title The row title.
 * @param {string} props.subtitle Supporting subtitle text.
 * @param {boolean} props.value The switch value.
 * @param {(value: boolean) => void} props.onValueChange Change handler.
 * @returns {JSX.Element} The toggle row.
 */
export const ToggleRow = ({
    title,
    subtitle,
    value,
    onValueChange,
    last = false,
}: {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    last?: boolean;
}) => (
    <SettingsRow
        title={title}
        subtitle={subtitle}
        last={last}
        trailing={
            <Switch
                accessibilityLabel={title}
                value={value}
                onValueChange={onValueChange}
                trackColor={{ true: t.green }}
            />
        }
    />
);

/**
 * Render a centered empty-state block.
 *
 * @param {object} props Component props.
 * @param {ProfileIconName} props.icon The empty-state icon.
 * @param {string} props.title The empty-state title.
 * @param {string} props.message Supporting message.
 * @returns {JSX.Element} The empty state.
 */
export const EmptyState = ({
    icon,
    title,
    message,
}: {
    icon: ProfileIconName;
    title: string;
    message: string;
}) => (
    <View style={styles.empty}>
        <Ionicons name={icon} size={42} color={t.green} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>{message}</Text>
    </View>
);

/**
 * Render a segmented control with equal-width options.
 *
 * @param {object} props Component props.
 * @param {readonly {value: string; label: string}[]} props.options The segments.
 * @param {string} props.value The selected option.
 * @param {(value: string) => void} props.onChange Selection handler.
 * @returns {JSX.Element} The segmented control.
 */
export const SegmentedControl = ({
    options,
    value,
    onChange,
}: {
    options: readonly { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}) => (
    <View style={styles.segment}>
        {options.map((option) => {
            const active = option.value === value;
            return (
                <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => onChange(option.value)}
                    style={[styles.segmentItem, active && styles.segmentActive]}
                >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {option.label}
                    </Text>
                </Pressable>
            );
        })}
    </View>
);

/**
 * Render the profile avatar with authenticated-photo support and an initials
 * fallback for missing or failed photos.
 *
 * @param {object} props Component props.
 * @param {ProfileAvatarDto|string|null|undefined} props.avatar Avatar DTO or raw key.
 * @param {string|null|undefined} props.firstname User first name.
 * @param {string|null|undefined} props.lastname User last name.
 * @param {string|null} [props.accessToken] Bearer token for image headers.
 * @param {number} [props.size] Avatar width and height.
 * @returns {JSX.Element} The avatar element.
 */
export const ProfileAvatar = ({
    avatar,
    firstname,
    lastname,
    accessToken,
    size = 67,
}: {
    avatar?: ProfileAvatarDto | string | null;
    firstname?: string | null;
    lastname?: string | null;
    accessToken?: string | null;
    size?: number;
}) => {
    const [imageFailed, setImageFailed] = React.useState(false);
    const { t: tt } = useTranslation('profile');
    const dto = avatar && typeof avatar === 'object' ? avatar : null;
    const initials = dto?.initials
        || `${firstname?.charAt(0) ?? ''}${lastname?.charAt(0) ?? ''}`.toUpperCase()
        || null;
    const showImage = Boolean(dto?.url && !dto.isDefault && !imageFailed);

    return (
        <View
            style={[
                styles.avatar,
                { width: size, height: size, borderRadius: size / 2 },
            ]}
        >
            {showImage ? (
                <ExpoImage
                    accessibilityLabel={tt('Profile photo')}
                    source={{
                        uri: dto?.url ?? '',
                        headers: accessToken
                            ? { Authorization: `Bearer ${accessToken}` }
                            : undefined,
                    }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={120}
                    onError={() => setImageFailed(true)}
                />
            ) : initials ? (
                <Text style={[styles.avatarInitials, { fontSize: size * 0.34 }]}>
                    {initials}
                </Text>
            ) : (
                <Ionicons name="person" size={size * 0.48} color={t.navy} />
            )}
        </View>
    );
};

/** Profile primitive styles. */
export const styles = StyleSheet.create({
    card: {
        backgroundColor: t.white,
        borderRadius: 17,
        borderColor: t.border,
        borderWidth: 1,
        padding: 17,
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: t.text,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        minHeight: 64,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: t.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowBody: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 16, fontWeight: '700', color: t.text },
    rowSubtitle: { fontSize: 14, color: t.secondary, lineHeight: 20, marginTop: 4 },
    iconBox: {
        width: 42,
        height: 42,
        backgroundColor: '#F0F5F8',
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    field: { marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '700', color: '#627488', marginBottom: 7 },
    input: {
        backgroundColor: '#F9FBFC',
        borderColor: '#E0E7EE',
        borderWidth: 1,
        borderRadius: 11,
        padding: 13,
        fontSize: 16,
        color: t.text,
    },
    inputDisabled: { color: t.secondary, backgroundColor: '#F2F5F8' },
    primary: {
        backgroundColor: t.green,
        borderRadius: 13,
        padding: 16,
        alignItems: 'center',
        marginTop: 5,
    },
    primaryDisabled: { opacity: 0.55 },
    primaryText: { color: t.white, fontSize: 16, fontWeight: '800' },
    empty: { paddingVertical: 24, alignItems: 'center', gap: 13 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: t.text },
    emptyText: {
        fontSize: 14,
        color: t.secondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 8,
    },
    segment: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 13,
        backgroundColor: '#EAF0F3',
        marginBottom: 16,
    },
    segmentItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10 },
    segmentActive: { backgroundColor: t.white },
    segmentText: { color: '#708396', fontSize: 14, fontWeight: '700' },
    segmentTextActive: { color: t.green },
    avatar: {
        backgroundColor: '#DCE8EC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF88',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitials: { color: t.navy, fontWeight: '800' },
});
