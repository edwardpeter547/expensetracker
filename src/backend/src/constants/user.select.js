/**
 * Allowlisted Prisma projections for user records returned in API responses.
 *
 * These selections deliberately omit password hashes, credential metadata
 * (lastPasswordReset), and unnecessary personal data (dateOfBirth,
 * mobileNumber). Use the narrowest projection that satisfies the endpoint's
 * contract; never return a full user record.
 */

/**
 * Minimal projection for authentication lifecycle responses (email
 * verification, resend, OTP verification, and password recovery).
 *
 * `tokenVersion` is retained here because the refresh-token rotation path
 * reads the owning user's token version through this projection to enforce
 * the revoke-all invariant. It is an internal auth field, so it is excluded
 * from the client-facing profile DTO (`USER_PROFILE_SELECT`).
 */
export const USER_PUBLIC_SELECT = {
    id: true,
    email: true,
    username: true,
    firstname: true,
    lastname: true,
    avatar: true,
    isActive: true,
    isEmailVerified: true,
    emailVerifiedAt: true,
    language: true,
    currency: true,
    tokenVersion: true,
};

/**
 * Projection for a user nested as the owner of another resource (e.g. a
 * transaction). It is narrower than the authentication projection because
 * status and verification flags are irrelevant to the parent resource.
 */
export const USER_OWNER_SELECT = {
    id: true,
    email: true,
    username: true,
    firstname: true,
    lastname: true,
    avatar: true,
};

/**
 * Projection for the authenticated user's own profile and profile updates.
 *
 * It includes editable preferences plus read-only security metadata
 * (`isEmailVerified`, `lastLoginAt`) and timestamps, but omits credential
 * material (`tokenVersion`, `lastPasswordReset`), personal identifiers such as
 * date of birth and phone number, and the password hash.
 */
export const USER_PROFILE_SELECT = {
    id: true,
    email: true,
    username: true,
    firstname: true,
    lastname: true,
    avatar: true,
    language: true,
    currency: true,
    timezone: true,
    theme: true,
    isEmailVerified: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
};
