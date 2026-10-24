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
 * It includes editable preferences but omits verification status, personal
 * identifiers such as date of birth and phone number, and all credentials.
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
    updatedAt: true,
};
