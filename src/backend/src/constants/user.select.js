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
