/**
 * Profile V2 surface tokens.
 *
 * The navy palette matches the existing Dashboard V1.5 and Goals headers so
 * the profile landing page reads as part of the same app rather than a
 * separate design. The emerald accent is shared with the approved dashboard
 * and the tab bar active tint. These tokens are static; they intentionally
 * do not respond to the user-selected app theme, matching `designTokens.ts`
 * and `transactionsTheme.ts`.
 */

export const profileTheme = {
    /** Lightest navy stop at the top of the premium gradient header. */
    navyLight: '#1C344B',
    /** Mid navy stop shared with the Goals header surface. */
    navy: '#0D1B2E',
    /** Deepest navy stop shared with the Goals screen background. */
    navyDeep: '#091525',
    /** Approved emerald accent for primary actions and selections. */
    green: '#1B9568',
    /** Tinted emerald fill for selected chips and soft accents. */
    greenLight: '#E9F7F0',
    /** Primary ink for card titles and row copy. */
    text: '#14283B',
    /** Secondary slate used for subtitles and supporting copy. */
    secondary: '#7A8A9B',
    /** Muted blue-gray used for group labels and hints. */
    muted: '#8997A8',
    /** App background behind the white menu cards. */
    background: '#F6F8FB',
    /** Explicit white kept independent of the theme context. */
    white: '#FFFFFF',
    /** Subtle card and divider border. */
    border: '#E8EDF2',
    /** Destructive-action red. */
    danger: '#C73543',
} as const;
