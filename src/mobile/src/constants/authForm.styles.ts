import { brandColors, radii, spacing, typography } from '@/constants/designTokens';
import { StyleSheet } from 'react-native';

/**
 * Shared styles for the authentication form screens and their components.
 *
 * Both screens use brand-fixed values (not the user-selected theme) so the
 * light-mode reference design stays consistent across the auth flow.
 */
const authFormStyles = () =>
  StyleSheet.create({
    keyboardView: {
      flex: 1,
      backgroundColor: brandColors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: brandColors.border,
      backgroundColor: brandColors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      marginTop: spacing.xxl,
      fontSize: typography.title,
      fontWeight: '700',
      color: brandColors.navy,
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: typography.subtitle,
      lineHeight: typography.subtitle * 1.4,
      color: brandColors.textSecondary,
    },
    field: {
      marginTop: spacing.xl,
    },
    nameRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    label: {
      fontSize: typography.label,
      fontWeight: '600',
      color: brandColors.navy,
      marginBottom: spacing.sm,
    },
    input: {
      height: 52,
      borderRadius: radii.input,
      backgroundColor: brandColors.inputBackground,
      borderWidth: 1,
      borderColor: brandColors.inputBorder,
      paddingHorizontal: spacing.md,
      fontSize: typography.input,
      color: brandColors.navy,
    },
    inputFocused: {
      borderColor: brandColors.primary,
      borderWidth: 1.5,
      backgroundColor: brandColors.background,
    },
    inputError: {
      borderColor: brandColors.error,
    },
    errorText: {
      color: brandColors.error,
      fontSize: 14,
      marginTop: spacing.xs,
    },
    passwordWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      borderRadius: radii.input,
      backgroundColor: brandColors.inputBackground,
      borderWidth: 1,
      borderColor: brandColors.inputBorder,
      paddingHorizontal: spacing.md,
    },
    passwordInput: {
      flex: 1,
      fontSize: typography.input,
      color: brandColors.navy,
      paddingVertical: 0,
    },
    eyeButton: {
      paddingLeft: spacing.sm,
    },
    forgotRow: {
      alignItems: 'flex-end',
      marginTop: spacing.sm,
    },
    forgotLink: {
      color: brandColors.blueGray,
      fontSize: typography.label,
      fontWeight: '600',
    },
    button: {
      height: 54,
      borderRadius: radii.button,
      backgroundColor: brandColors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl,
    },
    buttonPressed: {
      backgroundColor: brandColors.primaryDark,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: brandColors.white,
      fontSize: typography.button,
      fontWeight: '600',
    },
    socialSection: {
      marginTop: spacing.xl,
    },
    dividerText: {
      textAlign: 'center',
      color: brandColors.textSecondary,
      fontSize: typography.label,
      marginBottom: spacing.lg,
    },
    socialRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    socialButton: {
      width: 64,
      height: 48,
      borderRadius: 14,
      backgroundColor: brandColors.socialButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: spacing.xl,
    },
    footerText: {
      color: brandColors.textSecondary,
      fontSize: typography.body,
    },
    footerLink: {
      color: brandColors.link,
      fontSize: typography.body,
      fontWeight: '600',
      marginLeft: spacing.xs,
    },
    requirements: {
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    requirementText: {
      fontSize: 14,
      color: brandColors.textSecondary,
    },
    requirementTextMet: {
      color: brandColors.navy,
    },
  });

export default authFormStyles;
