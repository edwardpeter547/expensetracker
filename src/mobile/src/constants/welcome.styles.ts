import { brandColors, radii, spacing, typography } from '@/constants/designTokens';
import { StyleSheet } from 'react-native';

/**
 * Styles for the splash and welcome screen.
 *
 * These are intentionally brand-fixed (rather than theme-driven) because the
 * welcome experience presents the product identity regardless of the theme
 * the user later selects inside the app.
 */
const welcomeStyles = () =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: brandColors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
    },
    brand: {
      alignItems: 'center',
      marginTop: spacing.xxl + spacing.xl,
    },
    title: {
      marginTop: spacing.lg,
      fontSize: typography.title,
      fontWeight: '700',
      color: brandColors.navy,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    wordmark: {
      height: 34,
      width: 259,
      marginTop: spacing.lg,
    },
    subtitle: {
      marginTop: spacing.sm,
      fontSize: typography.subtitle,
      lineHeight: typography.subtitle * 1.45,
      color: brandColors.textSecondary,
      textAlign: 'center',
    },
    illustration: {
      width: '100%',
      marginTop: spacing.xl,
      aspectRatio: 375 / 156,
    },
    actions: {
      marginTop: spacing.xl,
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    primaryButton: {
      backgroundColor: brandColors.primary,
      borderRadius: radii.button,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonPressed: {
      backgroundColor: brandColors.primaryDark,
    },
    primaryButtonText: {
      color: brandColors.white,
      fontSize: typography.button,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: brandColors.white,
      borderRadius: radii.button,
      height: 56,
      borderWidth: 1,
      borderColor: brandColors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonPressed: {
      backgroundColor: '#F5F8FB',
    },
    secondaryButtonText: {
      color: brandColors.navy,
      fontSize: typography.button,
      fontWeight: '600',
    },
  });

export default welcomeStyles;
