/**
 * Manage Categories settings screen.
 *
 * System categories are grouped by their known income/expense direction and
 * are immutable. User-created categories are grouped under "Custom" because
 * the backend category model has no stored income/expense type for them, and
 * the create/rename/delete flows never invent that type.
 */

import { Ionicons } from '@expo/vector-icons';
import { profileTheme as t } from '@/constants/profileTheme';
import { useLocale } from '@/contexts/LocaleContext';
import { useCategories } from '@/hooks/useCategories';
import {
    SYSTEM_CATEGORIES,
    systemCategoryLabel,
} from '@/localization/systemCategories';
import { categoryIconName } from '@/components/transactions/categoryPresentation';
import type { Category } from '@/types/transaction';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    EmptyState,
    FormField,
    PrimaryButton,
    SectionCard,
    SegmentedControl,
    SettingsRow,
    type ProfileIconName,
} from './ProfilePrimitives';

/** The three category-management segments. */
type CategorySegment = 'Expenses' | 'Income' | 'Custom';

const SEGMENTS: CategorySegment[] = ['Expenses', 'Income', 'Custom'];

/** Resolve the known direction of a category, or null for custom categories. */
const categoryTypeOf = (
    category: Category,
): 'INCOME' | 'EXPENSE' | null => {
    if (!category.isSystem) return null;
    return SYSTEM_CATEGORIES.find((entry) => entry.id === category.id)?.type ?? null;
};

/**
 * Render the Manage Categories screen.
 *
 * @returns {JSX.Element} The category management screen.
 */
const ManageCategories = () => {
    const { language } = useLocale();
    const { categories, loading, saving, error, reload, create, rename, remove } =
        useCategories();
    const [segment, setSegment] = useState<CategorySegment>('Expenses');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [editorError, setEditorError] = useState<string | null>(null);

    const visibleCategories = useMemo(() => {
        return categories.filter((category) => {
            const type = categoryTypeOf(category);
            if (segment === 'Custom') return type === null;
            if (segment === 'Expenses') return type === 'EXPENSE';
            return type === 'INCOME';
        });
    }, [categories, segment]);

    /** Open the editor for a new or existing custom category. */
    const startEditing = (category?: Category) => {
        setEditingId(category?.id ?? null);
        setCategoryName(category?.name ?? '');
        setEditorError(null);
        setEditorOpen(true);
    };

    /** Close the editor and clear its transient state. */
    const closeEditor = () => {
        setEditorOpen(false);
        setEditingId(null);
        setCategoryName('');
        setEditorError(null);
    };

    /** Persist the editor's category name, surfacing failures inline. */
    const saveCategory = async () => {
        try {
            if (editingId) {
                await rename(editingId, categoryName);
            } else {
                await create(categoryName);
            }
            closeEditor();
        } catch (cause) {
            setEditorError(cause instanceof Error ? cause.message : 'Unable to save category.');
        }
    };

    /** Confirm and then delete a custom category. */
    const confirmDelete = (category: Category) => {
        Alert.alert(
            'Delete Category',
            `Delete "${category.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        remove(category.id).catch((cause: unknown) => {
                            Alert.alert(
                                'Cannot delete category',
                                cause instanceof Error ? cause.message : 'Unable to delete category.',
                            );
                        });
                    },
                },
            ],
        );
    };

    const renderCategory = (category: Category) => {
        const type = categoryTypeOf(category);
        const label = category.isSystem
            ? systemCategoryLabel(category.id, language)
            : category.name;
        const icon: ProfileIconName = categoryIconName(category, type === 'INCOME' ? 'income' : 'expense');

        if (category.isSystem) {
            return (
                <SettingsRow
                    key={category.id}
                    title={label}
                    subtitle="Built-in category"
                    icon={icon}
                    trailing={<Text style={styles.systemTag}>SYSTEM</Text>}
                />
            );
        }

        return (
            <SettingsRow
                key={category.id}
                title={label}
                subtitle="Custom category"
                icon={icon}
                onPress={() => startEditing(category)}
                trailing={
                    <View style={styles.rowActions}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${category.name}`}
                            onPress={() => startEditing(category)}
                            hitSlop={8}
                        >
                            <Text style={styles.editCategory}>Edit</Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${category.name}`}
                            onPress={() => confirmDelete(category)}
                            hitSlop={8}
                        >
                            <Ionicons name="trash-outline" size={18} color={t.danger} />
                        </Pressable>
                    </View>
                }
            />
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={t.green} />
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            {error ? (
                <View style={styles.errorCard}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Retry loading categories"
                        onPress={() => void reload()}
                        style={styles.retry}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            ) : null}

            <SegmentedControl options={SEGMENTS} value={segment} onChange={(value) => {
                setSegment(value as CategorySegment);
                closeEditor();
            }} />

            <SectionCard title={`${segment} Categories`}>
                {visibleCategories.length > 0 ? (
                    visibleCategories.map((category) => renderCategory(category))
                ) : (
                    <EmptyState
                        icon={segment === 'Custom' ? 'pricetag-outline' : 'grid-outline'}
                        title={`No ${segment.toLowerCase()} categories`}
                        message={
                            segment === 'Custom'
                                ? 'Custom categories you add will appear here.'
                                : 'These built-in categories are managed by ExpenseTracker.'
                        }
                    />
                )}
            </SectionCard>

            {editorOpen ? (
                <SectionCard title={editingId ? 'Edit Category' : 'New Category'}>
                    <FormField
                        label="Category name"
                        value={categoryName}
                        onChangeText={setCategoryName}
                    />
                    <Text style={styles.note}>
                        Custom categories apply to both income and expenses.
                    </Text>
                    {editorError ? <Text style={styles.editorError}>{editorError}</Text> : null}
                    <PrimaryButton
                        title={editingId ? 'Save Category' : 'Add Category'}
                        onPress={() => void saveCategory()}
                        disabled={!categoryName.trim() || saving}
                        loading={saving}
                    />
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cancel"
                        onPress={closeEditor}
                        style={styles.cancel}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                </SectionCard>
            ) : (
                <PrimaryButton
                    title="Add Custom Category"
                    onPress={() => startEditing()}
                />
            )}
        </View>
    );
};

/** Manage Categories styles. */
const styles = StyleSheet.create({
    wrapper: { paddingBottom: 24 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorCard: {
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#FDF1F1',
        borderWidth: 1,
        borderColor: '#FFD8DD',
        marginBottom: 14,
    },
    errorText: { color: t.danger, fontSize: 14, lineHeight: 20 },
    retry: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9, backgroundColor: t.danger },
    retryText: { color: t.white, fontWeight: '700', fontSize: 13 },
    systemTag: {
        fontSize: 11,
        fontWeight: '800',
        color: '#708296',
        backgroundColor: '#F0F3F6',
        padding: 7,
        borderRadius: 8,
    },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    editCategory: { fontSize: 15, fontWeight: '800', color: t.green },
    note: { fontSize: 14, color: t.secondary, lineHeight: 20, marginTop: 2, marginBottom: 6 },
    editorError: { fontSize: 13, color: t.danger, lineHeight: 19, marginBottom: 6 },
    cancel: { alignItems: 'center', padding: 14 },
    cancelText: { color: t.secondary, fontWeight: '700', fontSize: 14 },
});

export default ManageCategories;
