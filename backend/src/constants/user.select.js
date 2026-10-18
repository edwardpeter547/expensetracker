/**
 * Allowlisted Prisma projection for user records returned in API responses.
 *
 * Prefer this explicit selection over fetching a complete user record and
 * removing sensitive fields afterwards. It deliberately omits password hashes
 * and credential metadata (e.g. lastPasswordReset) so those values never reach
 * a serialized response.
 */
export const USER_PUBLIC_SELECT = {
    id: true,
    email: true,
    username: true,
    firstname: true,
    lastname: true,
    dateOfBirth: true,
    mobileNumber: true,
    avatar: true,
    isActive: true,
    isEmailVerified: true,
    emailVerifiedAt: true,
    isPhoneVerified: true,
    phoneVerifiedAt: true,
    currency: true,
    timezone: true,
    language: true,
    theme: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
};
