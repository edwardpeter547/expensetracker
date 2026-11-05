/**
 * Floating chat button for the dashboard.
 *
 * A rounded emerald action button that stays fixed in the corner while the
 * dashboard content scrolls beneath it. The button can be dragged anywhere on
 * the dashboard and snaps to the nearest left or right edge on release, while
 * remaining clamped inside the safe vertical area.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

/** Button diameter in logical pixels. */
const SIZE = 60;
/** Horizontal padding from the snapped edge. */
const EDGE_MARGIN = 16;
/** Vertical padding from the top of the draggable area. */
const TOP_MARGIN = 96;
/** Vertical padding from the bottom of the draggable area. */
const BOTTOM_MARGIN = 20;
/** Movement threshold before a touch becomes a drag rather than a tap. */
const DRAG_THRESHOLD = 5;

/** Props for the floating chat button. */
export interface FloatingChatButtonProps {
    onPress?: () => void;
    /** Measured container size; falls back to window size when omitted. */
    containerSize?: { width: number; height: number };
}

/**
 * Clamp a number between a minimum and maximum value.
 *
 * @param {number} value The value to clamp.
 * @param {number} min The inclusive minimum.
 * @param {number} max The inclusive maximum.
 * @returns {number} The clamped value.
 */
const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

/**
 * Render the draggable floating chat button.
 *
 * @param {FloatingChatButtonProps} props Component props.
 * @returns {JSX.Element} The floating button.
 */
const FloatingChatButton = ({
    onPress,
    containerSize,
}: FloatingChatButtonProps) => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const initial = {
        x: Math.max(EDGE_MARGIN, windowWidth - SIZE - EDGE_MARGIN),
        y: Math.max(TOP_MARGIN, windowHeight - SIZE - BOTTOM_MARGIN),
    };
    const [position] = useState(() => new Animated.ValueXY(initial));
    const currentRef = useRef<{ x: number; y: number }>({ ...initial });
    const boundsRef = useRef<{ width: number; height: number }>({
        width: windowWidth,
        height: windowHeight,
    });
    const gestureStartRef = useRef({ x: 0, y: 0, dx: 0, dy: 0 });

    useEffect(() => {
        const bounds = containerSize ?? { width: windowWidth, height: windowHeight };
        boundsRef.current = bounds;

        const next = {
            x: Math.max(EDGE_MARGIN, bounds.width - SIZE - EDGE_MARGIN),
            y: Math.max(TOP_MARGIN, bounds.height - SIZE - BOTTOM_MARGIN),
        };
        position.setValue(next);
        currentRef.current = next;
    }, [containerSize, windowWidth, windowHeight, position]);

    const [panResponder, setPanResponder] = useState<
        ReturnType<typeof PanResponder.create> | null
    >(null);

    useEffect(() => {
        setPanResponder(
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, gesture) =>
                    Math.abs(gesture.dx) > DRAG_THRESHOLD
                    || Math.abs(gesture.dy) > DRAG_THRESHOLD,
                onPanResponderGrant: (_, gesture) => {
                    gestureStartRef.current = {
                        x: currentRef.current.x,
                        y: currentRef.current.y,
                        dx: gesture.dx,
                        dy: gesture.dy,
                    };
                },
                onPanResponderMove: (_, gesture) => {
                    const bounds = boundsRef.current;
                    const start = gestureStartRef.current;
                    const maxX = Math.max(EDGE_MARGIN, bounds.width - SIZE - EDGE_MARGIN);
                    const maxY = Math.max(TOP_MARGIN, bounds.height - SIZE - BOTTOM_MARGIN);
                    const next = {
                        x: clamp(start.x + gesture.dx - start.dx, EDGE_MARGIN, maxX),
                        y: clamp(start.y + gesture.dy - start.dy, TOP_MARGIN, maxY),
                    };
                    position.setValue(next);
                    currentRef.current = next;
                },
                onPanResponderRelease: (_, gesture) => {
                    const bounds = boundsRef.current;
                    const start = gestureStartRef.current;
                    const maxY = Math.max(TOP_MARGIN, bounds.height - SIZE - BOTTOM_MARGIN);
                    const currentX = start.x + gesture.dx - start.dx;
                    const currentY = clamp(
                        start.y + gesture.dy - start.dy,
                        TOP_MARGIN,
                        maxY,
                    );
                    const targetX = currentX + SIZE / 2 < bounds.width / 2
                        ? EDGE_MARGIN
                        : Math.max(EDGE_MARGIN, bounds.width - SIZE - EDGE_MARGIN);
                    const target = { x: targetX, y: currentY };

                    position.setValue({ x: currentX, y: currentY });
                    currentRef.current = target;
                    Animated.spring(position, {
                        toValue: target,
                        useNativeDriver: false,
                        bounciness: 0,
                    }).start();
                },
                onPanResponderTerminationRequest: () => false,
            }),
        );
    }, [position]);

    return (
        <Animated.View
            style={[styles.wrap, { transform: position.getTranslateTransform() }]}
            {...panResponder?.panHandlers}
        >
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open AI chat"
                onPress={onPress}
                style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
            >
                <LinearGradient
                    colors={['#1B9568', '#2BAC7B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.button}
                >
                    <Ionicons name="chatbubble-ellipses" size={26} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.badge}>
                    <Ionicons name="sparkles" size={12} color="#1B9568" />
                </View>
            </Pressable>
        </Animated.View>
    );
};

/** Floating chat button styles. */
const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 6,
    },
    pressable: {
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        elevation: 6,
        shadowColor: '#0C4932',
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
    },
    pressed: {
        transform: [{ scale: 0.96 }],
    },
    button: {
        flex: 1,
        borderRadius: SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DFEFE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default FloatingChatButton;
