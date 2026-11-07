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
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
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
    const [focused, setFocused] = useState(false);
    const [keyboardInset, setKeyboardInset] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const canSend = draft.trim().length > 0;
    const hasUserMessage = messages.some((message) => message.role === 'user');

    useEffect(() => {
        if (Platform.OS !== 'ios') return;
        const showSub = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
            setKeyboardInset(event.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener('keyboardWillHide', () => {
            setKeyboardInset(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

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

    /**
     * Placeholder for image/file attachment until the media picker modules and
     * the AI backend are connected.
     */
    const handleAttach = () => {
        Alert.alert(
            'Attachments',
            'Image and file upload will be available once the media picker modules are connected.',
        );
    };

    /**
     * Placeholder for voice recording until the audio module and the AI
     * backend are connected.
     */
    const handleRecord = () => {
        Alert.alert(
            'Voice recording',
            'Voice recording will be available once the audio module is connected.',
        );
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
                style={[styles.body, { paddingBottom: keyboardInset }]}
                behavior={Platform.OS === 'ios' ? undefined : 'height'}
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

                <View style={styles.composerShell}>
                    <View style={[styles.composerCard, focused && styles.composerCardFocused]}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Attach image or file"
                            onPress={handleAttach}
                            style={styles.composerAction}
                        >
                            <Ionicons name="add" size={22} color={C.green} />
                        </Pressable>

                        <TextInput
                            style={styles.input}
                            value={draft}
                            onChangeText={setDraft}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            placeholder="Ask about your money…"
                            placeholderTextColor={C.muted}
                            accessibilityLabel="Message the AI assistant"
                            multiline
                        />

                        {canSend ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Send message"
                                onPress={send}
                                style={styles.send}
                            >
                                <LinearGradient
                                    colors={[C.green, C.greenBright]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.sendGradient}
                                >
                                    <Ionicons name="arrow-up" size={22} color={C.white} />
                                </LinearGradient>
                            </Pressable>
                        ) : (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Record audio"
                                onPress={handleRecord}
                                style={styles.composerAction}
                            >
                                <Ionicons name="mic-outline" size={20} color={C.green} />
                            </Pressable>
                        )}
                    </View>
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
    composerShell: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    composerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 5,
        borderRadius: 28,
        backgroundColor: C.white,
        borderWidth: 1.5,
        borderColor: C.border,
        shadowColor: '#0B1F33',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    composerCardFocused: {
        borderColor: C.green,
    },
    composerAction: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E5F7ED',
    },
    input: {
        flex: 1,
        minHeight: 42,
        maxHeight: 120,
        paddingHorizontal: 10,
        paddingVertical: 10,
        color: C.ink,
        fontSize: 15,
    },
    send: {
        width: 42,
        height: 42,
        borderRadius: 21,
        overflow: 'hidden',
        shadowColor: C.green,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    sendGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
