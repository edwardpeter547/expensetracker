/**
 * Rendering tests for the localised Planning screens.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactElement } from 'react';
import i18n from '@/i18n';
import BudgetsScreen from '@/components/planning/BudgetsScreen';

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

describe('Planning budgets screen', () => {
    afterEach(async () => {
        await i18n.changeLanguage('en');
    });

    it('renders French planning copy after switching language', async () => {
        await i18n.changeLanguage('fr');
        const tree = render(
            <BudgetsScreen
                budgets={[]}
                loading={false}
                error={null}
                currency="GBP"
                language="fr"
                notice={null}
                onBack={jest.fn()}
                onRetry={jest.fn()}
                onSelectBudget={jest.fn()}
                onCreate={jest.fn()}
            />,
        );

        const text = allText(tree);
        expect(text).toContain('Gérez vos limites de dépenses');
        expect(text).toContain('Aucun budget pour le moment.');
    });
});
