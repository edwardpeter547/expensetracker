/**
 * AI assistant chat screen.
 *
 * A polished local-only chat surface opened from the dashboard's floating
 * chat button. Messages are local UI state only: no AI endpoint exists yet,
 * so the screen labels the pending assistant reply clearly rather than
 * fabricating responses.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Fixed palette matching the approved dashboard header. */
const C = {
    navy: '#091525',
    navyLight: '#0D1B2E',
    white: '#FFFFFF',
    ink: '#12213A',
    muted: '#8997AC',
    green: '#1B9568',
    greenBright: '#2BAC7B',
    border: '#E9EEF4',
    background: '#F6F8FB',
} as const;

/** A single chat message in the local conversation. */
interface AiChatMessage {
    id: string;
    role: 'assistant' | 'user';
    text: string;
}

/** Initial assistant greeting. */
const INITIAL_MESSAGE: AiChatMessage = {
    id: 'assistant-welcome',
    role: 'assistant',
    text: "Hi, I'm your AuditWallet assistant. Ask me about your spending, budgets, or goals.",
};

/** Props for the AI chat screen. */
export interface AiChatScreenProps {
    onClose: () => void;
}

/**
 * Render an assistant message aligned to the left.
 *
 * @param {object} props Bubble props.
 * @param {string} props.text The message text.
 * @returns {JSX.Element} The assistant bubble.
 */
const AssistantBubble = ({ text }: { text: string }) => (
    <View style={styles.assistantRow}>
        <View style={styles.assistantAvatar}>
            <Ionicons name="sparkles" size={14} color={C.green} />
        </View>
        <View style={styles.assistantBubble}>
            <Text style={styles.assistantText}>{text}</Text>
        </View>
    </View>
);

/**
 * Render a user message aligned to the right.
 *
 * @param {object} props Bubble props.
 * @param {string} props.text The message text.
 * @returns {JSX.Element} The user bubble.
 */
const UserBubble = ({ text }: { text: string }) => (
    <View style={styles.userRow}>
        <LinearGradient
            colors={[C.green, C.greenBright]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userBubble}
        >
            <Text style={styles.userText}>{text}</Text>
        </LinearGradient>
    </View>
);

/**
 * Render the AI chat screen.
 *
 * @param {AiChatScreenProps} props Component props.
 * @returns {JSX.Element} The chat screen.
 */
const AiChatScreen = ({ onClose }: AiChatScreenProps) => {
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<AiChatMessage[]>([INITIAL_MESSAGE]);
    const [draft, setDraft] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const canSend = draft.trim().length > 0;
    const hasUserMessage = messages.some((message) => message.role === 'user');

    /**
     * Append the current draft as a user message and clear the composer.
     */
    const send = () => {
        const text = draft.trim();
        if (!text) return;
        setMessages((previous) => [
            ...previous,
            { id: `user-${Date.now()}`, role: 'user', text },
        ]);
        setDraft('');
    };

    return (
        <View style={[styles.screen, { marginTop: -insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={C.navy} />

            <LinearGradient
                colors={[C.navyLight, C.navy]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.headerRow}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close AI chat"
                        onPress={onClose}
                        style={styles.close}
                    >
                        <Ionicons name="close" size={24} color={C.white} />
                    </Pressable>
                    <View style={styles.headerTitle}>
                        <Text style={styles.title}>AI Assistant</Text>
                        <Text style={styles.subtitle}>AuditWallet</Text>
                    </View>
                    <View style={styles.aiBadge}>
                        <Ionicons name="sparkles" size={18} color={C.navy} />
                    </View>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={styles.body}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.messages}
                    onContentSizeChange={() =>
                        scrollRef.current?.scrollToEnd({ animated: true })
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map((message) =>
                        message.role === 'assistant' ? (
                            <AssistantBubble key={message.id} text={message.text} />
                        ) : (
                            <UserBubble key={message.id} text={message.text} />
                        ),
                    )}
                </ScrollView>

                <View style={styles.composer}>
                    <TextInput
                        style={styles.input}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder="Ask about your money…"
                        placeholderTextColor={C.muted}
                        accessibilityLabel="Message the AI assistant"
                        multiline
                    />
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                        onPress={send}
                        disabled={!canSend}
                        style={[styles.send, !canSend && styles.sendDisabled]}
                    >
                        <Ionicons name="arrow-up" size={22} color={C.white} />
                    </Pressable>
                </View>
                <Text style={styles.note}>
                    {hasUserMessage
                        ? 'AI replies will appear here once connected.'
                        : 'Ask about your spending, budgets, or goals.'}
                </Text>
            </KeyboardAvoidingView>
        </View>
    );
};

/** AI chat screen styles. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: C.background,
    },
    header: {
        paddingHorizontal: 18,
        paddingBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    close: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#23364C',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        alignItems: 'center',
    },
    title: {
        color: C.white,
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    subtitle: {
        color: '#C5D1DE',
        fontSize: 12,
        marginTop: 2,
    },
    aiBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#A9F0C7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        flex: 1,
    },
    messages: {
        padding: 18,
        gap: 14,
        flexGrow: 1,
    },
    assistantRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        maxWidth: '88%',
    },
    assistantAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#E5F7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    assistantBubble: {
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 18,
        borderBottomLeftRadius: 5,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    assistantText: {
        fontSize: 14,
        lineHeight: 20,
        color: C.ink,
    },
    userRow: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
        maxWidth: '88%',
    },
    userBubble: {
        borderRadius: 18,
        borderBottomRightRadius: 5,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    userText: {
        fontSize: 14,
        lineHeight: 20,
        color: C.white,
    },
    composer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    input: {
        flex: 1,
        minHeight: 46,
        maxHeight: 120,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: C.white,
        color: C.ink,
        fontSize: 15,
        textAlignVertical: 'center',
    },
    send: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.green,
    },
    sendDisabled: {
        opacity: 0.4,
    },
    note: {
        textAlign: 'center',
        fontSize: 11,
        color: C.muted,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 10,
    },
});

export default AiChatScreen;
