/**
 * Profile V2 settings destinations.
 *
 * One component owns all eight settings sections behind the shared navy header
 * so they keep consistent back navigation, typography, spacing, and action
 * buttons. Capabilities are wired only when the existing backend or local
 * preference infrastructure genuinely supports them; everything else is
 * clearly labelled as preview-only.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { normalizeApiError } from '@/api/errors';
import {
    changePassword,
    fetchSessions,
    requestAccountDeletion,
    revokeAllSessions,
    revokeSession,
    updateProfile,
    type UserSession,
} from '@/api/user';
import { isDemoMode } from '@/contracts';
import { profileTheme as t } from '@/constants/profileTheme';
import { useAppLock } from '@/contexts/AppLockContext';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import useTheme from '@/hooks/useTheme';
import {
    SUPPORTED_CURRENCIES,
    SUPPORTED_LANGUAGES,
} from '@/localization/registry';
import type { ThemeName } from '@/types/ThemeContextType';
import {
    getBiometricCapability,
    type BiometricCapability,
} from '@/security/biometrics';
import type { AppLockTiming } from '@/security/appLock';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ManageCategories from './ManageCategories';
import {
    EmptyState,
    FormField,
    PrimaryButton,
    SectionCard,
    SettingsRow,
    ToggleRow,
} from './ProfilePrimitives';

/** The eight supported settings destinations. */
export type ProfileSection =
    | 'personal'
    | 'security'
    | 'linked'
    | 'notifications'
    | 'preferences'
    | 'categories'
    | 'export'
    | 'account';

const TITLES: Record<ProfileSection, string> = {
    personal: 'Personal Information',
    security: 'Security',
    linked: 'Linked Accounts',
    notifications: 'Notifications',
    preferences: 'App Preferences',
    categories: 'Manage Categories',
    export: 'Data Export',
    account: 'Account Management',
};

const INTRO: Record<ProfileSection, string> = {
    personal: 'Keep your personal information up to date.',
    security: 'Manage how you securely access your account.',
    linked: 'Manage financial accounts you choose to connect.',
    notifications: 'Choose the updates that matter to you.',
    preferences: 'Make ExpenseTracker feel like your own.',
    categories: 'Keep your income and expenses beautifully organized.',
    export: 'Take your financial records with you.',
    account: 'Your account, privacy and control.',
};

const THEME_LABELS: Record<ThemeName, string> = {
    coffee: 'Coffee',
    forest: 'Forest',
    purple: 'Purple',
    ocean: 'Ocean',
};

const LANGUAGE_LABELS: Record<string, string> = {
    en: 'English',
    fr: 'Français',
};

/**
 * Show a clearly-labelled preview alert for a capability that is not yet
 * connected to a real service.
 *
 * @param {string} feature The human-readable feature name.
 * @returns {void}
 */
const preview = (feature: string): void => {
    Alert.alert(
        'Not available yet',
        `${feature} needs to be connected to an existing app service. No changes have been saved.`,
    );
};

/**
 * Render a set of selectable option chips.
 *
 * @param {object} props Chip props.
 * @param {readonly {value: string; label: string}[]} props.options The options.
 * @param {string} props.value The selected value.
 * @param {(value: string) => void} props.onSelect Selection handler.
 * @returns {JSX.Element} The chip row.
 */
const OptionChips = ({
    options,
    value,
    onSelect,
}: {
    options: readonly { value: string; label: string }[];
    value: string;
    onSelect: (value: string) => void;
}) => (
    <View style={styles.options}>
        {options.map((option) => {
            const active = option.value === value;
            return (
                <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => onSelect(option.value)}
                    style={[styles.option, active && styles.optionActive]}
                >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {option.label}
                    </Text>
                </Pressable>
            );
        })}
    </View>
);

/**
 * Render the Profile V2 settings screen for a single destination.
 *
 * @param {{section: ProfileSection}} props Component props.
 * @returns {JSX.Element} The settings screen.
 */
const ProfileSettings = ({ section }: { section: ProfileSection }) => {
    const insets = useSafeAreaInsets();
    const {
        user,
        logout,
        refreshProfile,
        biometricLogin,
        enrollBiometricLogin,
        disableBiometricLogin,
    } = useAuth();
    const {
        enabled: appLockEnabled,
        timing: appLockTiming,
        setEnabled: setAppLockEnabled,
        setTiming: setAppLockTiming,
    } = useAppLock();
    const { language, currency, setLanguage, setCurrency, followDeviceLanguage, followDeviceCurrency } = useLocale();
    const { theme, setTheme } = useTheme();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const [passwordOpen, setPasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordBusy, setPasswordBusy] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsError, setSessionsError] = useState<string | null>(null);

    const [flags, setFlags] = useState<Record<string, boolean>>({
        push: true,
        budget: true,
        weekly: false,
        product: false,
    });
    const toggle = (key: string) => setFlags((previous) => ({ ...previous, [key]: !previous[key] }));

    const [exportFormat, setExportFormat] = useState('CSV');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
    const [biometricLoginBusy, setBiometricLoginBusy] = useState(false);
    const [biometricLoginError, setBiometricLoginError] = useState<string | null>(null);
    const [appLockError, setAppLockError] = useState<string | null>(null);

    useEffect(() => {
        setFirstName(user?.firstname ?? '');
        setLastName(user?.lastname ?? '');
        setUsername(user?.username ?? '');
    }, [user]);

    useEffect(() => {
        let active = true;
        getBiometricCapability()
            .then((capability) => {
                if (active) setBiometricCapability(capability);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (section !== 'security' || isDemoMode) return;
        let active = true;
        setSessionsLoading(true);
        setSessionsError(null);
        fetchSessions()
            .then((next) => {
                if (active) setSessions(next);
            })
            .catch((cause: unknown) => {
                if (active) setSessionsError(normalizeApiError(cause).message);
            })
            .finally(() => {
                if (active) setSessionsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [section]);

    /**
     * Persist the editable display fields through the existing profile update
     * endpoint, then refresh the in-memory authenticated user.
     *
     * @returns {Promise<void>}
     */
    const saveProfile = async () => {
        setSavingProfile(true);
        setProfileError(null);
        try {
            if (isDemoMode) {
                preview('Profile updates');
                return;
            }
            await updateProfile({
                firstname: firstName.trim(),
                lastname: lastName.trim(),
                username: username.trim(),
            });
            await refreshProfile();
            Alert.alert('Profile updated', 'Your personal information has been saved.');
        } catch (cause) {
            setProfileError(normalizeApiError(cause).message);
        } finally {
            setSavingProfile(false);
        }
    };

    /**
     * Enable or disable biometric login for the current account.
     *
     * @param {boolean} value The desired enabled state.
     * @returns {Promise<void>}
     */
    const handleBiometricLoginToggle = async (value: boolean) => {
        if (biometricLoginBusy) return;
        setBiometricLoginBusy(true);
        setBiometricLoginError(null);
        try {
            if (value) {
                await enrollBiometricLogin();
            } else {
                await disableBiometricLogin();
            }
        } catch (cause) {
            setBiometricLoginError(
                cause instanceof Error ? cause.message : 'Unable to update biometric login.',
            );
        } finally {
            setBiometricLoginBusy(false);
        }
    };

    /**
     * Enable or disable the Biometric App Lock.
     *
     * @param {boolean} value The desired enabled state.
     * @returns {Promise<void>}
     */
    const handleAppLockToggle = async (value: boolean) => {
        setAppLockError(null);
        try {
            await setAppLockEnabled(value);
        } catch (cause) {
            setAppLockError(
                cause instanceof Error ? cause.message : 'Unable to update app lock.',
            );
        }
    };

    /** Device-appropriate biometric terminology for the login control. */
    const biometricLoginSubtitle = (): string => {
        if (biometricCapability?.methods.includes('face-id')) {
            return 'Sign in securely with Face ID.';
        }
        if (biometricCapability?.methods.includes('fingerprint')) {
            return 'Sign in securely with your fingerprint.';
        }
        return 'Sign in securely with your fingerprint or Face ID.';
    };

    /**
     * Submit a password change and sign the user out when it succeeds.
     *
     * @returns {Promise<void>}
     */
    const submitPasswordChange = async () => {
        setPasswordError(null);
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }

        setPasswordBusy(true);
        try {
            if (isDemoMode) {
                preview('Password changes');
                return;
            }
            await changePassword(currentPassword, newPassword);
            Alert.alert(
                'Password changed',
                'For security, please sign in again.',
                [{ text: 'OK', onPress: () => void logout() }],
            );
        } catch (cause) {
            setPasswordError(normalizeApiError(cause).message);
        } finally {
            setPasswordBusy(false);
        }
    };

    /**
     * Revoke all sessions after confirmation.
     *
     * @returns {Promise<void>}
     */
    const signOutAllSessions = async () => {
        try {
            if (isDemoMode) {
                preview('Session management');
                return;
            }
            await revokeAllSessions();
            setSessions([]);
            Alert.alert('Sessions signed out', 'All active sessions have been revoked.');
        } catch (cause) {
            Alert.alert('Could not sign out sessions', normalizeApiError(cause).message);
        }
    };

    /**
     * Revoke one session by id.
     *
     * @param {string} sessionId The session id.
     * @returns {Promise<void>}
     */
    const signOutSession = async (sessionId: string) => {
        try {
            await revokeSession(sessionId);
            setSessions((previous) => previous.filter((session) => session.id !== sessionId));
        } catch (cause) {
            Alert.alert('Could not sign out session', normalizeApiError(cause).message);
        }
    };

    /**
     * Submit a voluntary account-deletion request.
     *
     * @returns {Promise<void>}
     */
    const submitDeletion = async () => {
        setDeleteError(null);
        if (deleteConfirmation !== 'DELETE') {
            setDeleteError('Type DELETE to confirm.');
            return;
        }
        if (!deletePassword) {
            setDeleteError('Enter your password to continue.');
            return;
        }

        setDeleting(true);
        try {
            if (isDemoMode) {
                preview('Account deletion');
                setDeleteOpen(false);
                return;
            }
            await requestAccountDeletion(deletePassword, 'DELETE');
            setDeleteOpen(false);
            Alert.alert(
                'Deletion requested',
                'Your account is deactivated and will be permanently deleted after the recovery window.',
                [{ text: 'OK', onPress: () => void logout() }],
            );
        } catch (cause) {
            setDeleteError(normalizeApiError(cause).message);
        } finally {
            setDeleting(false);
        }
    };

    /**
     * Render the active section body.
     *
     * @returns {JSX.Element} The section content.
     */
    const renderSection = () => {
        switch (section) {
            case 'personal':
                return (
                    <>
                        <SectionCard title="Your details">
                            <FormField label="First name" value={firstName} onChangeText={setFirstName} />
                            <FormField label="Last name" value={lastName} onChangeText={setLastName} />
                            <FormField label="Username" value={username} onChangeText={setUsername} />
                            <FormField
                                label="Email address"
                                value={user?.email ?? ''}
                                onChangeText={() => undefined}
                                keyboardType="email-address"
                                editable={false}
                            />
                        </SectionCard>
                        <SectionCard title="Profile photo">
                            <SettingsRow
                                title="Change Photo"
                                subtitle="Select a profile image"
                                icon="camera-outline"
                                onPress={() => preview('Profile photo picker')}
                            />
                        </SectionCard>
                        {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
                        <PrimaryButton
                            title="Save Changes"
                            onPress={() => void saveProfile()}
                            loading={savingProfile}
                            disabled={savingProfile}
                        />
                    </>
                );
            case 'security':
                return (
                    <>
                        <SectionCard title="Account protection">
                            <SettingsRow
                                title="Password"
                                subtitle="Update your sign-in password"
                                icon="lock-closed-outline"
                                onPress={() => setPasswordOpen((open) => !open)}
                                last={!passwordOpen}
                            />
                            {passwordOpen ? (
                                <View style={styles.inlineForm}>
                                    <FormField
                                        label="Current password"
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        secureTextEntry
                                    />
                                    <FormField
                                        label="New password"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry
                                    />
                                    <FormField
                                        label="Confirm new password"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                    />
                                    {passwordError ? (
                                        <Text style={styles.errorText}>{passwordError}</Text>
                                    ) : null}
                                    <PrimaryButton
                                        title="Change Password"
                                        onPress={() => void submitPasswordChange()}
                                        loading={passwordBusy}
                                        disabled={passwordBusy}
                                    />
                                </View>
                            ) : null}
                            <ToggleRow
                                title="Biometric Login"
                                subtitle={biometricLoginSubtitle()}
                                value={biometricLogin !== null}
                                onValueChange={(value) => void handleBiometricLoginToggle(value)}
                            />
                            {biometricLoginError ? (
                                <Text style={styles.errorText}>{biometricLoginError}</Text>
                            ) : null}
                            <SettingsRow
                                title="Two-Factor Authentication"
                                subtitle="Add an extra security step"
                                icon="key-outline"
                                onPress={() => preview('Two-factor authentication')}
                                last
                            />
                        </SectionCard>
                        <SectionCard title="Biometric App Lock">
                            <ToggleRow
                                title="Require Biometrics to Open App"
                                subtitle="Protect your financial information when opening or returning to ExpenseTracker."
                                value={appLockEnabled}
                                onValueChange={(value) => void handleAppLockToggle(value)}
                            />
                            {appLockError ? (
                                <Text style={styles.errorText}>{appLockError}</Text>
                            ) : null}
                            {appLockEnabled ? (
                                <>
                                    <Text style={styles.fieldLabel}>Lock timing</Text>
                                    <OptionChips
                                        options={[
                                            { value: 'immediate', label: 'Immediately' },
                                            { value: '1m', label: 'After 1 minute' },
                                            { value: '5m', label: 'After 5 minutes' },
                                        ]}
                                        value={appLockTiming}
                                        onSelect={(value) => void setAppLockTiming(value as AppLockTiming)}
                                    />
                                </>
                            ) : null}
                        </SectionCard>
                        <SectionCard title="Device sessions">
                            {isDemoMode ? (
                                <Text style={styles.note}>
                                    Session management requires a signed-in account.
                                </Text>
                            ) : sessionsLoading ? (
                                <Text style={styles.note}>Loading sessions…</Text>
                            ) : sessionsError ? (
                                <Text style={styles.errorText}>{sessionsError}</Text>
                            ) : sessions.length === 0 ? (
                                <Text style={styles.note}>No other active sessions.</Text>
                            ) : (
                                sessions.map((session) => (
                                    <SettingsRow
                                        key={session.id}
                                        title={session.userAgent || 'Unknown device'}
                                        subtitle={`Last used ${session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString(language) : '—'}`}
                                        icon="phone-portrait-outline"
                                        trailing={
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityLabel="Revoke session"
                                                onPress={() => void signOutSession(session.id)}
                                                hitSlop={8}
                                            >
                                                <Text style={styles.dangerLink}>Revoke</Text>
                                            </Pressable>
                                        }
                                    />
                                ))
                            )}
                            {!isDemoMode && sessions.length > 0 ? (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Sign out all sessions"
                                    onPress={() => {
                                        Alert.alert(
                                            'Sign out all sessions',
                                            'This will revoke every active session, including this one.',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Sign Out All', style: 'destructive', onPress: () => void signOutAllSessions() },
                                            ],
                                        );
                                    }}
                                    style={styles.inlineAction}
                                >
                                    <Text style={styles.dangerLink}>Sign Out All Sessions</Text>
                                </Pressable>
                            ) : null}
                        </SectionCard>
                    </>
                );
            case 'linked':
                return (
                    <SectionCard title="Your connected accounts">
                        <EmptyState
                            icon="business-outline"
                            title="No linked accounts yet"
                            message="Connected accounts will appear here when integrations are available."
                        />
                        <PrimaryButton
                            title="Connect Account"
                            onPress={() => preview('Financial account linking')}
                        />
                    </SectionCard>
                );
            case 'notifications':
                return (
                    <>
                        <SectionCard title="Financial alerts">
                            <ToggleRow title="Push Notifications" subtitle="Notifications on your device" value={flags.push} onValueChange={() => toggle('push')} />
                            <ToggleRow title="Budget Alerts" subtitle="Know when spending approaches a limit" value={flags.budget} onValueChange={() => toggle('budget')} />
                            <ToggleRow title="Weekly Summary" subtitle="A digest of your financial activity" value={flags.weekly} onValueChange={() => toggle('weekly')} last />
                        </SectionCard>
                        <SectionCard title="Other updates">
                            <ToggleRow title="Product News" subtitle="Updates about ExpenseTracker" value={flags.product} onValueChange={() => toggle('product')} last />
                        </SectionCard>
                        <Text style={styles.note}>
                            Switches are local UI previews and are not saved to your account.
                        </Text>
                    </>
                );
            case 'preferences':
                return (
                    <>
                        <SectionCard title="Appearance">
                            <Text style={styles.fieldLabel}>Theme</Text>
                            <OptionChips
                                options={(Object.keys(THEME_LABELS) as ThemeName[]).map((value) => ({
                                    value,
                                    label: THEME_LABELS[value],
                                }))}
                                value={theme}
                                onSelect={(value) => void setTheme(value as ThemeName)}
                            />
                        </SectionCard>
                        <SectionCard title="Regional settings">
                            <Text style={styles.fieldLabel}>Default currency</Text>
                            <OptionChips
                                options={SUPPORTED_CURRENCIES.map((value) => ({ value, label: value }))}
                                value={currency}
                                onSelect={(value) => void setCurrency(value)}
                            />
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Follow device currency"
                                onPress={() => void followDeviceCurrency()}
                                style={styles.follow}
                            >
                                <Text style={styles.followText}>Follow device</Text>
                            </Pressable>

                            <Text style={styles.fieldLabel}>Language</Text>
                            <OptionChips
                                options={SUPPORTED_LANGUAGES.map((value) => ({
                                    value,
                                    label: LANGUAGE_LABELS[value] ?? value,
                                }))}
                                value={language}
                                onSelect={(value) => void setLanguage(value)}
                            />
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Follow device language"
                                onPress={() => void followDeviceLanguage()}
                                style={styles.follow}
                            >
                                <Text style={styles.followText}>Follow device</Text>
                            </Pressable>
                        </SectionCard>
                    </>
                );
            case 'categories':
                return <ManageCategories />;
            case 'export':
                return (
                    <>
                        <SectionCard title="Create an export">
                            <SettingsRow title="What to export" subtitle="All Transactions" icon="list-outline" />
                            <SettingsRow title="Date range" subtitle="All Time" icon="calendar-outline" />
                            <Text style={styles.fieldLabel}>File format</Text>
                            <OptionChips
                                options={[{ value: 'CSV', label: 'CSV' }, { value: 'PDF', label: 'PDF' }]}
                                value={exportFormat}
                                onSelect={setExportFormat}
                            />
                        </SectionCard>
                        <Text style={styles.note}>
                            Export options are a preview. Saving an actual file requires a
                            download/share integration that is not available yet.
                        </Text>
                        <PrimaryButton
                            title="Export Data"
                            onPress={() => preview('Data export')}
                        />
                    </>
                );
            case 'account':
                return (
                    <>
                        <SectionCard title="Account overview">
                            <SettingsRow
                                title="Account Status"
                                subtitle={user?.isEmailVerified ? 'Email verified' : 'Email not verified'}
                                icon="checkmark-circle-outline"
                            />
                            <SettingsRow
                                title="Privacy & Data"
                                subtitle="Review your privacy options"
                                icon="lock-closed-outline"
                                onPress={() => preview('Privacy settings')}
                            />
                        </SectionCard>
                        <SectionCard title="Sensitive actions">
                            <SettingsRow
                                title="Deactivate Account"
                                subtitle="Temporarily disable your account"
                                icon="pause-circle-outline"
                                onPress={() => Alert.alert(
                                    'Deactivate Account',
                                    'Account deactivation happens as the first step of the deletion flow, with a recovery window to cancel.',
                                )}
                            />
                            <SettingsRow
                                title="Delete Account"
                                subtitle="Permanently remove your account"
                                icon="trash-outline"
                                onPress={() => setDeleteOpen(true)}
                                last
                            />
                        </SectionCard>
                    </>
                );
        }
    };

    /**
     * Pop back to the Profile tab, falling back to a replace when there is no
     * history entry (for example after a deep link).
     *
     * @returns {void}
     */
    const goBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/profile');
        }
    };

    return (
        <View style={[styles.page, { marginTop: -insets.top }]}>
            <LinearGradient
                colors={[t.navyLight, t.navyDeep]}
                style={[styles.header, { paddingTop: insets.top + 14 }]}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back to Profile"
                    onPress={goBack}
                    style={styles.back}
                >
                    <Ionicons name="chevron-back" color="white" size={22} />
                </Pressable>
                <Text style={styles.headerTitle}>{TITLES[section]}</Text>
            </LinearGradient>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.intro}>{INTRO[section]}</Text>
                {renderSection()}
            </ScrollView>

            <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Delete Account</Text>
                        <Text style={styles.modalText}>
                            This deactivates your account immediately and schedules permanent
                            deletion after the recovery window. Type DELETE and enter your
                            password to confirm.
                        </Text>
                        <FormField
                            label="Password"
                            value={deletePassword}
                            onChangeText={setDeletePassword}
                            secureTextEntry
                        />
                        <FormField
                            label="Type DELETE to confirm"
                            value={deleteConfirmation}
                            onChangeText={setDeleteConfirmation}
                        />
                        {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
                        <View style={styles.modalActions}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Cancel delete account"
                                onPress={() => setDeleteOpen(false)}
                                style={styles.modalCancel}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Confirm delete account"
                                onPress={() => void submitDeletion()}
                                style={[styles.modalDelete, deleting && styles.primaryDisabled]}
                                disabled={deleting}
                            >
                                <Text style={styles.modalDeleteText}>
                                    {deleting ? 'Working…' : 'Delete Account'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

/** Profile settings styles. */
const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: t.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingHorizontal: 20,
        paddingBottom: 22,
    },
    back: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFFFFF22',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: -0.4 },
    scroll: { flex: 1 },
    content: { padding: 18, paddingBottom: 40 },
    intro: { fontSize: 15, color: t.secondary, lineHeight: 22, marginBottom: 19 },
    fieldLabel: { fontSize: 14, fontWeight: '700', color: '#627488', marginBottom: 10 },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    option: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: '#F9FBFC',
    },
    optionActive: { backgroundColor: t.greenLight, borderColor: t.green },
    optionText: { fontSize: 14, color: t.secondary, fontWeight: '700' },
    optionTextActive: { color: t.green },
    note: { fontSize: 14, color: t.secondary, lineHeight: 20, marginTop: 11, marginBottom: 12 },
    errorText: { fontSize: 13, color: t.danger, lineHeight: 19, marginBottom: 10 },
    inlineForm: { paddingTop: 4 },
    inlineAction: { paddingVertical: 10, alignItems: 'center' },
    dangerLink: { fontSize: 14, fontWeight: '800', color: t.danger },
    follow: { paddingVertical: 6 },
    followText: { fontSize: 14, fontWeight: '700', color: t.green },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 16, 38, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 20,
    },
    modalTitle: { fontSize: 22, fontWeight: '800', color: t.text },
    modalText: { fontSize: 15, lineHeight: 21, color: t.secondary, marginTop: 8, marginBottom: 14 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancel: {
        flex: 1,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
    },
    modalCancelText: { color: t.text, fontWeight: '700', fontSize: 15 },
    modalDelete: {
        flex: 1,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: t.danger,
    },
    modalDeleteText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    primaryDisabled: { opacity: 0.55 },
});

export default ProfileSettings;
