/**
 * Profile domain types shared by the Profile tab, settings screens, and the
 * authentication context.
 */

/** Stable avatar representation returned by `GET /user/profile`. */
export interface ProfileAvatar {
    /** Retrieval URL for the effective avatar image. */
    url: string;
    /** Up to two uppercase initials derived from the user's name. */
    initials: string;
    /** True when the default bundled avatar is being used. */
    isDefault: boolean;
}

/**
 * A user record as returned by the auth or profile endpoints.
 *
 * The auth login/register responses include a narrower "safe user" projection
 * where `avatar` is the raw storage key (or null); the profile endpoint
 * returns the richer DTO where `avatar` is a `ProfileAvatar` and display
 * preferences plus timestamps are present. All optional fields therefore
 * tolerate both shapes.
 */
export interface UserProfile {
    id: number;
    email: string;
    username: string;
    firstname?: string | null;
    lastname?: string | null;
    /** `ProfileAvatar` from the profile DTO, or the raw key from auth. */
    avatar?: ProfileAvatar | string | null;
    language?: string | null;
    currency?: string | null;
    timezone?: string | null;
    theme?: string | null;
    isActive?: boolean;
    isEmailVerified?: boolean;
    displayName?: string;
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string | null;
}
