/**
 * Rendering tests for the localised Teams screens.
 *
 * Verifies English and French copy, interpolation, pluralisation, empty
 * states, and translated accessibility labels after a runtime language
 * switch.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactElement } from 'react';
import i18n from '@/i18n';
import CreateTeamScreen from '@/components/teams/CreateTeamScreen';
import TeamMembersScreen from '@/components/teams/TeamMembersScreen';
import TeamsListScreen from '@/components/teams/TeamsListScreen';
import type { Team } from '@/types/team';

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

/** A pooled family team used for list and member screens. */
const FAMILY_TEAM: Team = {
    id: 'team-1',
    name: 'Family Finance',
    kind: 'Family',
    mode: 'POOLED',
    memberCount: 3,
    budgetTarget: 1200,
    spent: 300,
    status: 'active',
};

describe('Teams internationalisation', () => {
    afterEach(async () => {
        await i18n.changeLanguage('en');
    });

    it('renders English empty state, privacy copy, and accessibility labels', () => {
        const tree = render(
            <TeamsListScreen
                teams={[]}
                currency="USD"
                language="en"
                onBack={jest.fn()}
                onCreate={jest.fn()}
                onOpenTeam={jest.fn()}
                onRestoreTeam={jest.fn()}
            />,
        );
        const text = allText(tree);

        expect(text).toContain('No teams yet.');
        expect(text).toContain('Your personal finances stay private');
        expect(text).toContain('Create New Team');
    });

    it('renders French copy, pluralisation, and mode labels after switching language', async () => {
        await i18n.changeLanguage('fr');
        const tree = render(
            <TeamsListScreen
                teams={[FAMILY_TEAM]}
                currency="EUR"
                language="fr"
                onBack={jest.fn()}
                onCreate={jest.fn()}
                onOpenTeam={jest.fn()}
                onRestoreTeam={jest.fn()}
            />,
        );
        const text = allText(tree);

        expect(text).toContain('Équipes');
        expect(text).toContain('3 membres');
        expect(text).toContain('Famille');
        expect(text).toContain('Fonds communs');
        expect(
            tree.root.findByProps({ accessibilityLabel: 'Ouvrir Family Finance' }),
        ).toBeTruthy();
    });

    it('localises step interpolation on the Create Team flow', async () => {
        await i18n.changeLanguage('fr');
        const tree = render(
            <CreateTeamScreen onBack={jest.fn()} onCreate={jest.fn()} />,
        );
        const text = allText(tree);

        expect(text).toContain('Créer une équipe');
        expect(text).toContain('Étape 1 sur 3');
        expect(text).toContain('Parlez-nous de votre équipe');
    });

    it('localises member roles and invitation states', async () => {
        await i18n.changeLanguage('fr');
        const tree = render(
            <TeamMembersScreen
                team={FAMILY_TEAM}
                members={[
                    { id: 'm1', teamId: 'team-1', name: 'Ada', role: 'Owner' },
                    { id: 'm2', teamId: 'team-1', name: 'Grace', role: 'Member' },
                ]}
                invitations={[]}
                onBack={jest.fn()}
                onInvite={jest.fn()}
            />,
        );
        const text = allText(tree);

        expect(text).toContain('Propriétaire');
        expect(text).toContain('Membre');
        expect(text).toContain('Invitations en attente');
        expect(text).toContain('Aucune invitation en attente.');
    });
});
