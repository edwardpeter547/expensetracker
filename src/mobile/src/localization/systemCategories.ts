/**
 * Stable identifiers and labels for system-defined categories.
 *
 * The identifiers match the seeded `Category.id` values on the backend and are
 * deliberately independent of display labels, so translations never rewrite
 * stored financial data.
 */

export interface SystemCategory {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    en: string;
    fr: string;
}

export const SYSTEM_CATEGORIES: SystemCategory[] = [
    { id: 'sys.salary', type: 'INCOME', en: 'Salary', fr: 'Salaire' },
    { id: 'sys.investment', type: 'INCOME', en: 'Investment', fr: 'Investissement' },
    { id: 'sys.freelancing', type: 'INCOME', en: 'Freelancing', fr: 'Freelance' },
    { id: 'sys.gifts', type: 'INCOME', en: 'Gifts', fr: 'Cadeaux' },
    { id: 'sys.bonus', type: 'INCOME', en: 'Bonus', fr: 'Prime' },
    { id: 'sys.food', type: 'EXPENSE', en: 'Food', fr: 'Alimentation' },
    { id: 'sys.transport', type: 'EXPENSE', en: 'Transport', fr: 'Transport' },
    { id: 'sys.shopping', type: 'EXPENSE', en: 'Shopping', fr: 'Achats' },
    { id: 'sys.bills', type: 'EXPENSE', en: 'Bills', fr: 'Factures' },
    { id: 'sys.entertainment', type: 'EXPENSE', en: 'Entertainment', fr: 'Divertissement' },
    { id: 'sys.health', type: 'EXPENSE', en: 'Health', fr: 'Santé' },
];

/**
 * Resolve a display label for a system category id.
 *
 * @param {string|undefined|null} id The stable category id.
 * @param {string} language The selected application language.
 * @returns {string} The localized label, falling back to English, then to the
 *   raw id when the id is not a known system category.
 */
export const systemCategoryLabel = (
    id: string | undefined | null,
    language: string,
): string => {
    if (!id) return '';
    const category = SYSTEM_CATEGORIES.find((item) => item.id === id);
    if (!category) return id;
    return language === 'fr' ? category.fr : category.en;
};
