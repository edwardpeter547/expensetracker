/**
 * Pure validation helpers for the authentication screens.
 *
 * The rules mirror the backend schemas: email follows Joi's email check,
 * usernames are 3-30 alphanumeric characters, and passwords are 8-100
 * characters. Keeping these in one module lets the screens and tests share a
 * single source of truth.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9]+$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /[0-9]/;
const SPECIAL_PATTERN = /[^A-Za-z0-9]/;

/** Boolean results for the standard password rules shown on the register screen. */
export interface PasswordRuleState {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

/** Normalized password strength for the register screen meter. */
export interface PasswordStrength {
  /** Number of filled meter segments, from 0 to 4. */
  score: number;
  /** Human-readable strength label, or an empty string when no password is entered. */
  label: string;
}

/**
 * Check whether a value is a well-formed email address.
 *
 * @param value - The raw email value.
 * @returns True when the trimmed value looks like an email address.
 */
export const isValidEmail = (value: string): boolean =>
  EMAIL_PATTERN.test(value.trim());

/**
 * Check whether a value is a valid username (3-30 alphanumeric characters).
 *
 * @param value - The raw username value.
 * @returns True when the trimmed value satisfies the backend rules.
 */
export const isValidUsername = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    trimmed.length >= 3 &&
    trimmed.length <= 30 &&
    USERNAME_PATTERN.test(trimmed)
  );
};

/**
 * Compute the visible password requirements for the current value.
 *
 * The backend currently enforces length only, but the register screen exposes
 * the standard client-side strength policy so users can create stronger
 * passwords. These rules intentionally do not loosen the backend length rule.
 *
 * @param value - The current password value.
 * @returns Whether each standard password rule is satisfied.
 */
export const getPasswordRequirements = (
  value: string,
): PasswordRuleState => ({
  length: value.length >= PASSWORD_MIN_LENGTH,
  uppercase: UPPERCASE_PATTERN.test(value),
  lowercase: LOWERCASE_PATTERN.test(value),
  number: NUMBER_PATTERN.test(value),
  special: SPECIAL_PATTERN.test(value),
});

/**
 * Check whether a password satisfies every standard strength rule.
 *
 * @param value - The current password value.
 * @returns True when length, case, number, and special rules all pass.
 */
export const isPasswordStrong = (value: string): boolean => {
  const rules = getPasswordRequirements(value);
  return (
    rules.length &&
    rules.uppercase &&
    rules.lowercase &&
    rules.number &&
    rules.special
  );
};

/**
 * Derive a 0-4 strength score and label for the current password.
 *
 * @param value - The current password value.
 * @returns The normalized strength score and label.
 */
export const getPasswordStrength = (value: string): PasswordStrength => {
  const rules = getPasswordRequirements(value);
  const met = [
    rules.length,
    rules.uppercase,
    rules.lowercase,
    rules.number,
    rules.special,
  ].filter(Boolean).length;

  if (!value) return { score: 0, label: '' };
  if (!rules.length) return { score: 0, label: 'Weak' };
  if (met === 5) return { score: 4, label: 'Strong' };
  if (met === 4) return { score: 3, label: 'Good' };
  if (met === 3) return { score: 2, label: 'Fair' };
  return { score: 1, label: 'Weak' };
};
