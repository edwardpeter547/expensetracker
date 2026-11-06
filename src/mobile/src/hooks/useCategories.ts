/**
 * Category management data hook.
 *
 * Loads and mutates categories through the resolved `categoryDataSource`.
 * Mutations share the same direction-agnostic custom-category contract as the
 * backend: a custom category has no stored income/expense type.
 */

import { normalizeApiError } from '@/api/errors';
import { categoryDataSource } from '@/contracts';
import type { Category } from '@/types/transaction';
import { useCallback, useEffect, useRef, useState } from 'react';

/** State exposed by the category management hook. */
export interface UseCategoriesResult {
    categories: Category[];
    loading: boolean;
    saving: boolean;
    error: string | null;
    reload: () => Promise<void>;
    create: (name: string) => Promise<void>;
    rename: (id: string, name: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
}

/**
 * Load and mutate the authenticated user's categories.
 *
 * Mutations throw `Error` instances whose messages are already normalized for
 * display so callers can surface conflict and validation failures inline.
 *
 * @returns {UseCategoriesResult} Categories plus loading, saving, and error state.
 */
export const useCategories = (): UseCategoriesResult => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestSequence = useRef(0);

    const reload = useCallback(async (): Promise<void> => {
        const sequence = ++requestSequence.current;
        setLoading(true);
        setError(null);

        try {
            const next = await categoryDataSource.list();
            if (requestSequence.current === sequence) {
                setCategories(next);
            }
        } catch (cause) {
            if (requestSequence.current === sequence) {
                setError(normalizeApiError(cause).message);
            }
        } finally {
            if (requestSequence.current === sequence) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    /**
     * Persist a new custom category.
     *
     * @param {string} name The category name.
     * @returns {Promise<void>}
     * @throws {Error} When the backend rejects the create.
     */
    const create = useCallback(async (name: string): Promise<void> => {
        const normalized = name.trim();
        if (!normalized) throw new Error('Category name is required.');

        setSaving(true);
        try {
            await categoryDataSource.create(normalized);
            setCategories(await categoryDataSource.list());
        } catch (cause) {
            throw new Error(normalizeApiError(cause).message);
        } finally {
            setSaving(false);
        }
    }, []);

    /**
     * Rename an existing custom category.
     *
     * @param {string} id The category id.
     * @param {string} name The new category name.
     * @returns {Promise<void>}
     * @throws {Error} When the backend rejects the rename.
     */
    const rename = useCallback(async (id: string, name: string): Promise<void> => {
        const normalized = name.trim();
        if (!normalized) throw new Error('Category name is required.');

        setSaving(true);
        try {
            await categoryDataSource.rename(id, normalized);
            setCategories(await categoryDataSource.list());
        } catch (cause) {
            throw new Error(normalizeApiError(cause).message);
        } finally {
            setSaving(false);
        }
    }, []);

    /**
     * Delete an existing custom category.
     *
     * @param {string} id The category id.
     * @returns {Promise<void>}
     * @throws {Error} When the category is missing or still in use.
     */
    const remove = useCallback(async (id: string): Promise<void> => {
        setSaving(true);
        try {
            await categoryDataSource.remove(id);
            setCategories(await categoryDataSource.list());
        } catch (cause) {
            throw new Error(normalizeApiError(cause).message);
        } finally {
            setSaving(false);
        }
    }, []);

    return { categories, loading, saving, error, reload, create, rename, remove };
};
