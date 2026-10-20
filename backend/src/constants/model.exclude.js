
/**
 * Fields excluded from serialized user records.
 */

export const USER_MODEL_EXCLUDE = {
    password: true,
    passwordResetTokens: true,
    passwordHistories: true,
    refreshTokens: true,
    verificationTokens: true,
    loginAttempts: true,
}
