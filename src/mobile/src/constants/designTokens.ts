/**
 * Core brand design tokens for the ExpenseTracker mobile app.
 *
 * These values define the product's identity (emerald + deep navy on white)
 * and intentionally do not change with the user-selected app theme. They are
 * the foundation the welcome screen and future dashboard/chart surfaces share.
 */
export const brandColors = {
  /** Primary brand emerald, used for the primary CTA and the leaf logo. */
  primary: '#289A6B',
  /** Darker emerald for pressed states and small accents. */
  primaryDark: '#1F8A60',
  /** Deep navy used for the wordmark and primary headings. */
  navy: '#081026',
  /** Muted slate blue-gray used for supporting copy. */
  textSecondary: '#7E8BA4',
  /** App background. */
  background: '#FFFFFF',
  /** Light blue-gray used for outlined button borders. */
  border: '#D9E2EC',
  /** White, kept explicit so callers do not need the theme context. */
  white: '#FFFFFF',
  /** Rounded input fill color. */
  inputBackground: '#F7F9FC',
  /** Subtle input border color. */
  inputBorder: '#E1E8F1',
  /** Muted placeholder text. */
  placeholder: '#AAB3C3',
  /** Interactive link blue used by footer links. */
  link: '#1673E6',
  /** Muted blue-gray used by secondary text links. */
  blueGray: '#647796',
  /** Success green used by password requirement checks. */
  success: '#20B565',
  /** Error red used by validation feedback. */
  error: '#DC3545',
  /** Fill color for the deferred social sign-in buttons. */
  socialButton: '#F7F8FA',
  /** Color of the auth header back arrow. */
  backIcon: '#3E4655',
  /** Warm golden sun used by the welcome illustration. */
  sun: '#FDCB75',
  /** Lightest mint hill shade. */
  hillMintLight: '#D3EEE0',
  /** Main mint hill shade. */
  hillMint: '#BFE5D0',
  /** Mid green hill shade. */
  hillMid: '#9DD9B8',
  /** Emerald front hill shade. */
  hillEmerald: '#4CB782',
} as const;

/** Spacing scale, in logical pixels. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Corner radii, in logical pixels. */
export const radii = {
  /** Rounded corner used by primary call-to-action buttons. */
  button: 12,
  /** Rounded corner used by auth form inputs. */
  input: 12,
  card: 16,
} as const;

/** Font sizes used by the welcome experience. */
export const typography = {
  title: 34,
  subtitle: 19,
  label: 15,
  input: 17,
  body: 16,
  button: 18,
} as const;
