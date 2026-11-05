/**
 * AI chat route.
 *
 * Owns navigation only and delegates presentation to `AiChatScreen`. Closing
 * returns to the dashboard, where the floating chat button is visible again.
 */

import AiChatScreen from '@/components/ai/AiChatScreen';
import { router } from 'expo-router';

/**
 * Render the AI chat route.
 *
 * @returns {JSX.Element} The AI chat screen.
 */
const AiChatRoute = () => (
    <AiChatScreen
        onClose={() => {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/(tabs)');
            }
        }}
    />
);

export default AiChatRoute;
