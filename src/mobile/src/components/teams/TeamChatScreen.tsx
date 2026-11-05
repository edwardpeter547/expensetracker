/**
 * Team Chat screen.
 *
 * Group-scoped chat with a local-only draft. Messages are demo state and are
 * never delivered; the screen labels that clearly.
 */

import {
    PlanningIcon,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import type { Team, TeamChatMessage } from '@/types/team';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

/** Props for the Team Chat screen. */
export interface TeamChatScreenProps {
    team: Team;
    messages: TeamChatMessage[];
    onBack: () => void;
    onSend: (message: string) => void;
}

/**
 * Render the Team Chat screen.
 *
 * @param {TeamChatScreenProps} props Component props.
 * @returns {JSX.Element} The chat screen.
 */
const TeamChatScreen = ({ team, messages, onBack, onSend }: TeamChatScreenProps) => {
    const [draft, setDraft] = useState('');

    /**
     * Send the current draft and clear it.
     */
    const send = () => {
        const message = draft.trim();
        if (!message) return;
        onSend(message);
        setDraft('');
    };

    return (
        <PlanningScreen title={`${team.name} Chat`} subtitle="Group messages" onBack={onBack}>
            <View style={styles.chatHeader}>
                <PlanningIcon name="users" color={planningColors.emerald} size={22} />
                <Text style={planningStyles.body}>{team.memberCount} participants</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.messages}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {messages.length === 0 ? (
                    <Text style={styles.empty}>No messages yet. Start the conversation.</Text>
                ) : (
                    messages.map((message) => (
                        <View
                            key={message.id}
                            style={[
                                styles.messageRow,
                                message.mine ? styles.mine : styles.theirs,
                            ]}
                        >
                            {!message.mine ? (
                                <Text style={styles.author}>{message.by}</Text>
                            ) : null}
                            <View
                                style={[
                                    styles.bubble,
                                    message.mine ? styles.mineBubble : styles.theirsBubble,
                                ]}
                            >
                                <Text style={styles.messageText}>{message.message}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <View style={styles.composer}>
                <TextInput
                    style={styles.input}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Message your team..."
                    placeholderTextColor="#A2ADBB"
                    accessibilityLabel="Message your team"
                />
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    onPress={send}
                    disabled={!draft.trim()}
                    style={styles.send}
                >
                    <PlanningIcon
                        name="send"
                        color={draft.trim() ? planningColors.emerald : planningColors.muted}
                        size={22}
                    />
                </Pressable>
            </View>
            <Text style={styles.note}>Preview chat — messages are not delivered or persisted.</Text>
        </PlanningScreen>
    );
};

/** Team Chat screen styles. */
const styles = StyleSheet.create({
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    messages: {
        paddingVertical: 8,
        gap: 12,
        flexGrow: 1,
    },
    empty: {
        textAlign: 'center',
        color: planningColors.muted,
        fontSize: 13,
        marginTop: 24,
    },
    messageRow: {
        gap: 4,
        maxWidth: '85%',
    },
    mine: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    theirs: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    author: {
        fontSize: 11,
        color: planningColors.muted,
        marginLeft: 4,
    },
    bubble: {
        borderRadius: 16,
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: planningColors.border,
    },
    mineBubble: {
        backgroundColor: '#DDF5E8',
    },
    theirsBubble: {
        backgroundColor: planningColors.surface,
    },
    messageText: {
        fontSize: 14,
        color: planningColors.text,
    },
    composer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    input: {
        flex: 1,
        minHeight: 46,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: planningColors.border,
        paddingHorizontal: 13,
        backgroundColor: '#FFFFFF',
        color: planningColors.text,
    },
    send: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: planningColors.emeraldLight,
    },
    note: {
        textAlign: 'center',
        fontSize: 11,
        color: planningColors.muted,
        marginTop: 10,
    },
});

export default TeamChatScreen;
