import bcrypt from "bcryptjs";
import crypto from "crypto";
import Config from "../configurations/env.config.js";
import logger from "../configurations/logger.config.js";
import prisma from "../configurations/prisma.connect.js";
import { AUTH_ACTIONS, USER_ACTIONS } from "../constants/audit.actions.js";
import { USER_PUBLIC_SELECT } from "../constants/user.select.js";
import AppError from "../utils/appError.js";
import { generateTokens, normalizeUsername } from "../utils/helpers.js";
import { REFRESH_TOKEN_TTL_MS, REFRESH_TOKEN_PATTERN, REUSE_DETECTED } from "../constants/app.constants.js";
import { AUTH_AUDIT_EVENT_TYPES, AUTH_AUDIT_OUTCOMES } from "../constants/auth-audit.constants.js";
import { recordAuthAuditEvent } from "./auth-audit.service.js";
import { ERROR_CODES } from "../constants/error-codes.js";

/**
 * Find an existing user by email or username.
 *
 * @param {string} email The email to check.
 * @param {string} username The username to check.
 * @returns {Promise<object|null>} A matching user or null.
 */
export const checkExistingUser = async (email, username) => {
    
    const existingUser = await prisma.user.findFirst({
        where: { OR: [ {email}, {username} ] }
    });

    return existingUser;
}

/**
 * Create an inactive user with a safe projection (no password in the result).
 *
 * @param {string} email The user's email.
 * @param {string} username The user's username.
 * @param {string} password The plaintext password to hash.
 * @param {string} firstname The user's first name.
 * @param {string} lastname The user's last name.
 * @param {string} language The preferred locale.
 * @param {string} [currency='USD'] The preferred currency code.
 * @returns {Promise<object>} The safe created-user projection.
 * @throws {AppError} If the email or username already exists.
 */
export const createUser = async (email, username, password, firstname, lastname, language, currency = 'USD') => {

    const normalizedUsername = normalizeUsername(username);
    const isExistingUser = await checkExistingUser(email, normalizedUsername);
    if(isExistingUser){
        logger.warn(`User :${username} Already exist`);
        throw new AppError("User with this email or username already exist", 409, null, {code: ERROR_CODES.ACCOUNT_ALREADY_EXISTS});
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            username: normalizedUsername,
            password: hashedPassword,
            firstname: firstname,
            lastname: lastname,
            language,
            currency,
            isEmailVerified: false,
            isPhoneVerified: false,
            isActive: false
        },
        select: {
            id: true,
            email: true,
            username: true,
            firstname: true,
            lastname: true,
            language: true,
            currency: true,
            createdAt: true
        }
    });

    return user;
}

/**
 * Return the SHA-256 hex digest of a refresh token. Only this digest is ever
 * persisted; the raw token exists only in the client and in memory.
 */
export const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Hash a short-lived password-reset code before persistence and lookup.
 *
 * Reset codes are sensitive but short, so a fast unsalted SHA-256 digest is
 * sufficient to prevent the raw code from being readable in the database.
 *
 * @param {string} code The raw numeric reset code.
 * @returns {string} The hex-encoded digest.
 */
export const hashResetCode = (code) => {
    return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Hash a six-digit email-verification code with a keyed HMAC digest.
 *
 * A six-digit code has only one million possible values, so a fast unsalted
 * digest would be brute-forceable if the database leaked. The key is derived
 * from the configured JWT secret and a purpose string, so offline guessing
 * requires the server secret while per-account attempt limits protect the
 * live endpoint.
 *
 * @param {string} code The raw numeric verification code.
 * @returns {string} The hex-encoded HMAC-SHA256 digest.
 */
export const hashVerificationCode = (code) => {
    const key = crypto.createHmac('sha256', Config.jwtSecret)
        .update('expensetracker:email-verification-otp')
        .digest();
    return crypto.createHmac('sha256', key).update(String(code)).digest('hex');
}

/**
 * Persist a SHA-256 digest of a refresh token for a user.
 *
 * The raw token is never stored; only its digest is written. `familyId` links
 * rotated tokens so replay of any member can revoke the whole family.
 *
 * @param {string} refreshToken The raw refresh token to hash and persist.
 * @param {number} userId The owning user id.
 * @param {string} [ipAddress] The issuing request IP.
 * @param {string|null} [familyId=null] The token family id, or null to create one.
 * @param {string|null} [userAgent=null] The issuing request user agent.
 * @returns {Promise<void>}
 */
export const createRefreshToken = async (refreshToken, userId, ipAddress, familyId = null, userAgent = null) => {
    await prisma.refreshToken.create({
        data: {
            token: hashToken(refreshToken),
            familyId: familyId ?? crypto.randomUUID(),
            userId: userId,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            createdByIp: ipAddress,
            userAgent: userAgent,
        }
    });
    logger.info("Refresh Token generated", {userId: userId, action: AUTH_ACTIONS.REFRESH_TOKEN_CREATED});
}

/**
 * Load a refresh token by hashing the presented raw token.
 *
 * @param {string} token The raw refresh token.
 * @returns {Promise<object|null>} The token record with a safe user, or null.
 */
export const getRefreshToken = async (token) => {
    return await prisma.refreshToken.findUnique({
        where: { token: hashToken(token) },
        include: { user: { select: USER_PUBLIC_SELECT } }
    });
}

/**
 * Revoke the caller's presented refresh-token session, if it is still active.
 *
 * The raw token is SHA-256 hashed before lookup, and the conditional update is
 * constrained by both the token hash and the authenticated user's id. This
 * guarantees one user can never revoke another user's session. Already-revoked
 * or unknown tokens simply match zero rows, making logout idempotent.
 *
 * @param {string} refreshToken The raw refresh token presented by the client.
 * @param {number} userId The authenticated user's id.
 * @returns {Promise<{count: number}>} The number of tokens revoked (0 or 1).
 */
export const revokeRefreshTokenByHash = async (refreshToken, userId) => {
    return await prisma.refreshToken.updateMany({
        where: { token: hashToken(refreshToken), userId, isRevoked: false },
        data: { isRevoked: true }
    });
}

/**
 * Revoke every active token in a refresh-token family.
 *
 * Used by replay detection so a reused token invalidates the whole session.
 *
 * @param {string} familyId The token family identifier.
 * @returns {Promise<{count: number}>} The number of tokens revoked.
 */
export const revokeTokenFamily = async (familyId) => {
    return await prisma.refreshToken.updateMany({
        where: { familyId, isRevoked: false },
        data: { isRevoked: true }
    });
}

/**
 * Revoke every active refresh token for a user.
 *
 * @param {number} userId The user whose sessions should be revoked.
 * @returns {Promise<{count: number}>} The number of tokens revoked.
 */
export const revokeAllRefreshTokens = async (userId) => {
    return await prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true }
    });
}

/**
 * Revoke every active refresh-token session for a user and invalidate all
 * previously issued access tokens in one atomic operation.
 *
 * The `tokenVersion` increment causes the authentication middleware to reject
 * access tokens signed with the previous version on the next request, while
 * the refresh-token update prevents any device from obtaining a new token.
 *
 * @param {number} userId The user whose sessions should be revoked.
 * @returns {Promise<object[]>} The results of the token-version update
 *   followed by the refresh-token revocation.
 */
export const revokeAllUserSessions = async (userId) => {
    return prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { tokenVersion: { increment: 1 } },
        }),
        prisma.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true },
        }),
    ]);
};

/**
 * List a user's active device sessions (refresh-token records).
 *
 * @param {number} userId The owning user id.
 * @returns {Promise<object[]>} Session records ordered newest first.
 */
export const listUserSessions = async (userId) => {
    return prisma.refreshToken.findMany({
        where: {
            userId,
            isRevoked: false,
            expiresAt: {gt: new Date()},
        },
        orderBy: {createdAt: 'desc'},
        select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            createdByIp: true,
            userAgent: true,
            lastUsedAt: true,
        },
    });
};

/**
 * Revoke one of the user's own sessions by refresh-token id.
 *
 * @param {number} userId The owning user id.
 * @param {string} sessionId The refresh-token id.
 * @returns {Promise<{count: number}>} The number of sessions revoked (0 or 1).
 */
export const revokeUserSession = async (userId, sessionId) => {
    return prisma.refreshToken.updateMany({
        where: {id: sessionId, userId, isRevoked: false},
        data: {isRevoked: true},
    });
};

/**
 * Rotate a presented refresh token atomically and return a new token pair.
 *
 * The consume step is a conditional update that revokes the presented token
 * only if it is still active; exactly one concurrent caller observes a count
 * of one. A second caller observes a count of zero, which is treated as replay
 * and revokes the whole token family.
 */
export const rotateRefreshToken = async (presentedToken) => {
    if (typeof presentedToken !== 'string' || !REFRESH_TOKEN_PATTERN.test(presentedToken)) {
        throw new AppError('Invalid Refresh Token', 401, null, {code: ERROR_CODES.REFRESH_TOKEN_INVALID});
    }

    const tokenHash = hashToken(presentedToken);
    const stored = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
        include: { user: { select: USER_PUBLIC_SELECT } }
    });

    if (!stored) {
        throw new AppError('Invalid Refresh Token', 401, null, {code: ERROR_CODES.REFRESH_TOKEN_INVALID});
    }

    if (stored.isRevoked) {
        await revokeTokenFamily(stored.familyId);
        throw new AppError('Invalid Refresh Token', 401, null, {code: ERROR_CODES.REFRESH_TOKEN_INVALID});
    }

    if (stored.expiresAt < new Date()) {
        throw new AppError('Refresh Token Expired', 401, null, {code: ERROR_CODES.REFRESH_TOKEN_EXPIRED});
    }

    if (!stored.user) {
        await revokeTokenFamily(stored.familyId);
        throw new AppError('Account deactivated', 401, null, {code: ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED});
    }

    if (!stored.user.isActive) {
        await revokeTokenFamily(stored.familyId);
        throw new AppError('Account deactivated', 401, null, {code: ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED});
    }

    if (!stored.user.isEmailVerified) {
        await revokeTokenFamily(stored.familyId);
        throw new AppError('Email not verified', 401, null, {code: ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED});
    }

    const tokens = generateTokens(stored.user.id, stored.user.email, stored.user.tokenVersion);

    try {
        await prisma.$transaction(async (tx) => {
            // Lock the user row before consuming the refresh token. This
            // serializes rotation against revoke-all and password-reset
            // token-version bumps, so a refresh token inserted after a global
            // revocation cannot survive because the version check below sees
            // the committed bump or the global revocation sees the new row.
            const lockedRows = await tx.$queryRaw`
                SELECT "tokenVersion", "isActive", "isEmailVerified"
                FROM "user"
                WHERE "id" = ${stored.user.id}
                FOR UPDATE
            `;
            const lockedUser = lockedRows[0];

            if (
                !lockedUser ||
                !lockedUser.isActive ||
                !lockedUser.isEmailVerified ||
                Number(lockedUser.tokenVersion) !== stored.user.tokenVersion
            ) {
                throw new AppError('Invalid Refresh Token', 401, null, {code: ERROR_CODES.REFRESH_TOKEN_INVALID});
            }

            const consumed = await tx.refreshToken.updateMany({
                where: { token: tokenHash, isRevoked: false },
                data: { isRevoked: true }
            });

            if (consumed.count === 0) {
                const error = new Error('Refresh token reuse detected');
                error.code = REUSE_DETECTED;
                throw error;
            }

            await tx.refreshToken.create({
                data: {
                    token: hashToken(tokens.refreshToken),
                    familyId: stored.familyId,
                    userId: stored.user.id,
                    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
                    createdByIp: stored.createdByIp,
                    userAgent: stored.userAgent,
                    lastUsedAt: new Date(),
                }
            });
        });
    } catch (error) {
        if (error.code === REUSE_DETECTED) {
            await revokeTokenFamily(stored.familyId);
            throw new AppError('Invalid Refresh Token', 401, null, {code: ERROR_CODES.REFRESH_TOKEN_INVALID});
        }
        throw error;
    }

    return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: stored.user.id
    };
}

/**
 * Record a login attempt for audit and lockout tracking.
 *
 * @param {object} params Attempt details.
 * @param {string} [params.ipAddress] The request IP.
 * @param {string} [params.userAgent] The request user agent.
 * @param {string} params.email The attempted email.
 * @param {boolean} params.loginAttemptStatus Whether the attempt succeeded.
 * @param {number|null} [params.userId=null] The resolved user id, if any.
 * @returns {Promise<void>}
 */
export const createLoginAttempt = async ({ipAddress, userAgent, email, loginAttemptStatus, userId = null}) => {

    await prisma.loginAttempt.create({
        data: {
            email,
            ipAddress,
            userAgent,
            wasSuccess: loginAttemptStatus,
            userId
        }
    });

    logger.info("New Login Attempt:", {
        ip_address: ipAddress, 
        user_agent: userAgent, 
        user_id: userId, 
        login_status: loginAttemptStatus, 
        action: loginAttemptStatus ? USER_ACTIONS.USER_LOGIN_ATTEMPT_SUCCESS: USER_ACTIONS.USER_LOGIN_ATTEMPT_FAILED }
    );
}

/**
 * Count failed login attempts for an email within the trailing window.
 *
 * @param {string} email The attempted email address.
 * @param {number} windowMs The trailing window in milliseconds.
 * @returns {Promise<number>} The number of failed attempts in the window.
 */
export const countRecentFailedLogins = async (email, windowMs) => {
    return prisma.loginAttempt.count({
        where: {
            email,
            wasSuccess: false,
            attemptTime: {gte: new Date(Date.now() - windowMs)},
        },
    });
};

/**
 * Determine whether an email is currently restricted by failed-login policy.
 *
 * The restriction window escalates with the number of recent failures (doubling
 * per additional failure-limit tier) and is capped at the configured maximum.
 * A successful login clears the counter via {@link resetFailedLogins}.
 *
 * @param {string} email The email to evaluate.
 * @returns {Promise<{locked: boolean, lockedUntil: Date|null}>} Lock state.
 */
export const getAccountLockout = async (email) => {
    const {failureLimit, baseWindowMs, maxWindowMs} = Config.loginLockout;
    const failures = await countRecentFailedLogins(email, maxWindowMs);

    if (failures < failureLimit) {
        return {locked: false, lockedUntil: null};
    }

    const tiers = Math.floor((failures - failureLimit) / failureLimit);
    const windowMs = Math.min(maxWindowMs, baseWindowMs * Math.pow(2, tiers));
    const lastFailure = await prisma.loginAttempt.findFirst({
        where: {email, wasSuccess: false},
        orderBy: {attemptTime: 'desc'},
        select: {attemptTime: true},
    });

    if (!lastFailure) {
        return {locked: false, lockedUntil: null};
    }

    const lockedUntil = new Date(lastFailure.attemptTime.getTime() + windowMs);
    return {locked: lockedUntil.getTime() > Date.now(), lockedUntil};
};

/**
 * Clear failed-login history for an email after a successful authentication.
 *
 * @param {string} email The email whose failed attempts should be cleared.
 * @returns {Promise<void>}
 */
export const resetFailedLogins = async (email) => {
    await prisma.loginAttempt.deleteMany({
        where: {email, wasSuccess: false},
    });
};

/**
 * Persist a hashed email-verification code for a user.
 *
 * The raw six-digit code is never stored; only its keyed HMAC digest is
 * written. Codes are single-use (`usedAt`), expire after the configured
 * window, and carry an attempt counter enforced by {@link verifyEmailCode}.
 *
 * @param {object} user The user to verify.
 * @param {string} code The raw six-digit code.
 * @param {string|null} [ipAddress=null] The issuing request IP.
 * @param {object} [tx=prisma] An optional Prisma transaction client.
 * @returns {Promise<object>} The created verification-token record.
 */
export const createVerificationCode = async (user, code, ipAddress = null, tx = prisma) => {
    return tx.verificationToken.create({
        data: {
            userId: user.id,
            tokenHash: hashVerificationCode(code),
            expiresAt: new Date(Date.now() + Config.verificationTokenExpiryMinutes * 60 * 1000),
            attempts: 0,
            usedAt: null,
            createdByIp: ipAddress,
        }
    });
}

/**
 * Invalidate every unused verification code for a user and persist a fresh one.
 *
 * Superseding prior codes on resend prevents an unbounded set of live
 * credentials and guarantees only the most recently issued code is usable.
 *
 * @param {object} user The user to re-verify.
 * @param {string} code The new raw six-digit code.
 * @param {string|null} [ipAddress=null] The issuing request IP.
 * @returns {Promise<void>}
 */
export const saveVerificationCode = async (user, code, ipAddress = null) => {
    await prisma.$transaction(async (tx) => {
        await tx.verificationToken.updateMany({
            where: {userId: user.id, usedAt: null},
            data: {usedAt: new Date()},
        });
        await tx.user.update({
            where: {id: user.id},
            data: {
                isEmailVerified: false,
                isActive: false,
                emailVerifiedAt: null,
            }
        });
        await createVerificationCode(user, code, ipAddress, tx);
    });
}

/**
 * Load the most recently issued verification code for a user.
 *
 * Used by the resend path to enforce a per-account cooldown without relying
 * on in-memory state.
 *
 * @param {number} userId The owning user id.
 * @returns {Promise<object|null>} The latest code record, or null.
 */
export const getLatestVerificationCode = async (userId) => {
    return prisma.verificationToken.findFirst({
        where: {userId},
        orderBy: {createdAt: 'desc'},
        select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            usedAt: true,
            attempts: true,
        },
    });
}

/**
 * Increment the attempt counter on a user's active verification code and
 * invalidate it once the configured limit is reached.
 *
 * This runs inside the verification transaction while the user row is locked,
 * so concurrent wrong-code attempts serialize and cannot race past the limit.
 *
 * @param {object} tx The Prisma transaction client.
 * @param {number} userId The owning user id.
 * @param {number} attemptLimit The configured attempt limit.
 * @returns {Promise<void>}
 */
const registerFailedVerificationAttempt = async (tx, userId, attemptLimit) => {
    const active = await tx.verificationToken.findFirst({
        where: {userId, usedAt: null, expiresAt: {gt: new Date()}},
        orderBy: {createdAt: 'desc'},
        select: {id: true},
    });

    if (!active) {
        return;
    }

    await tx.verificationToken.updateMany({
        where: {id: active.id, usedAt: null},
        data: {attempts: {increment: 1}},
    });

    const updated = await tx.verificationToken.findUnique({
        where: {id: active.id},
        select: {attempts: true},
    });

    if (updated && updated.attempts >= attemptLimit) {
        await tx.verificationToken.updateMany({
            where: {id: active.id, usedAt: null},
            data: {usedAt: new Date()},
        });
    }
}

/**
 * Verify a six-digit email code and activate the account atomically.
 *
 * The user row is locked first so concurrent verifications and resends
 * serialize. A wrong code increments the account's active code counter; when
 * the counter reaches the configured limit the code is invalidated and the
 * caller must request a new one. Correct codes are strictly single-use.
 *
 * @param {object} params Verification parameters.
 * @param {string} params.email The account email address.
 * @param {string} params.code The raw six-digit code.
 * @returns {Promise<{status: 'verified'|'invalid'|'expired', user?: object}>}
 *   The verification outcome and, on success, a minimal safe user.
 */
export const verifyEmailCode = async ({email, code}) => {
    const codeHash = hashVerificationCode(code);
    const attemptLimit = Config.verificationAttemptLimit;

    return prisma.$transaction(async (tx) => {
        const lockedRows = await tx.$queryRaw`
            SELECT "id", "email", "language", "isActive", "isEmailVerified"
            FROM "user"
            WHERE "email" = ${email}
            FOR UPDATE
        `;
        const lockedUser = lockedRows[0];

        if (!lockedUser) {
            return {status: 'invalid'};
        }

        const token = await tx.verificationToken.findFirst({
            where: {userId: lockedUser.id, tokenHash: codeHash, usedAt: null},
            orderBy: {createdAt: 'desc'},
            select: {id: true, expiresAt: true, attempts: true},
        });

        if (!token) {
            await registerFailedVerificationAttempt(tx, lockedUser.id, attemptLimit);
            return {status: 'invalid'};
        }

        if (token.expiresAt < new Date()) {
            await tx.verificationToken.updateMany({
                where: {id: token.id, usedAt: null},
                data: {usedAt: new Date()},
            });
            return {status: 'expired'};
        }

        const consumed = await tx.verificationToken.updateMany({
            where: {id: token.id, usedAt: null},
            data: {usedAt: new Date()},
        });

        if (consumed.count !== 1) {
            return {status: 'invalid'};
        }

        await tx.user.update({
            where: {id: lockedUser.id},
            data: {
                isEmailVerified: true,
                isActive: true,
                emailVerifiedAt: new Date(),
            },
        });

        await tx.verificationToken.updateMany({
            where: {userId: lockedUser.id, usedAt: null},
            data: {usedAt: new Date()},
        });

        return {
            status: 'verified',
            user: {id: lockedUser.id, email: lockedUser.email, language: lockedUser.language},
        };
    });
}

/**
 * Persist a password-reset token for a user.
 *
 * @param {object} user The user requesting the reset.
 * @param {string} passwordResetToken The raw reset token.
 * @param {string} [ipAddress] The request IP.
 * @returns {Promise<void>}
 */
export const savePasswordResetToken = async (user, passwordResetToken, ipAddress) => {
    await prisma.$transaction(async (tx) => {
        // Invalidate any previous unused code so repeated forgot-password
        // requests cannot accumulate an unbounded set of active credentials.
        await tx.passwordResetToken.updateMany({
            where: {userId: user.id, usedAt: null},
            data: {usedAt: new Date()},
        });

        await tx.passwordResetToken.create({
            data: {
                token: hashResetCode(passwordResetToken),
                userId: user.id,
                expiresAt: new Date(Date.now() + Config.passwordResetTokenExpiryMinutes * 60 * 1000),
                createdByIp: ipAddress,
            },
        });
    });
}

/**
 * Load a full user row by arbitrary filters, attaching an internal `_meta`
 * marker for later `refreshRecord` use.
 *
 * @param {object} params Prisma `where` filters.
 * @returns {Promise<object|null>} The full user row (including password), or
 *   null. Callers must sanitize before returning it to a client.
 */
export const getUser = async(params) => {
    const user =  await prisma.user.findFirst({
        where: {...params}
    });

    if(!user) return null;

    user._meta = {
        model: prisma.user.name,
        method: 'findFirst',
        args: {where: { ...params} }
    }
    return user;
}

/**
 * Fetch a user using only the public, allowlisted projection.
 *
 * Unlike {@link getUser}, this never loads the password hash or credential
 * metadata, so the returned record is safe to serialize directly in an API
 * response. It also does not attach the internal `_meta` marker.
 *
 * @param {object} params Prisma `where` filters for the user (e.g. `{email}`).
 * @returns {Promise<object|null>} The safely projected user, or null.
 */
export const getSafeUser = async (params) => {
    const user = await prisma.user.findFirst({
        where: { ...params },
        select: USER_PUBLIC_SELECT
    });

    return user || null;
}

/**
 * Load a user's safe public profile by filters.
 *
 * @param {object} params Prisma `where` filters.
 * @returns {Promise<object|null>} The safe user projection or null.
 */
export const getProfile = async(params) => {
    const user = await prisma.user.findFirst({
        where: {...params},
        select: {
            id: true,
            email: true,
            username: true,
            firstname: true,
            lastname: true,
            avatar: true,
            isEmailVerified: true,
            language: true,
            currency: true,
            timezone: true,
            theme: true,
            lastLoginAt: true,
            createdAt: true,
        }
    });

    if(!user){
        return null;
    }
    
    return user;
}

/**
 * Verify an unexpired password-reset code for a user.
 *
 * @param {string} code The presented reset code.
 * @param {object} user The user attempting the reset.
 * @returns {Promise<{valid: boolean, code: object|null}>} Validity and the
 *   matching token record, if any.
 */
export const verifyResetPasswordToken = async (code, user) => {

    const tokenData = await prisma.passwordResetToken.findFirst({
        where: {
            userId: user.id,
            token: hashResetCode(code),
            usedAt: null,
            expiresAt: {gt: new Date()},
        }
    });

    return {
        valid: !!tokenData,
        code: tokenData || null
    }
}

/**
 * Consume a reset code and update the user's password atomically.
 *
 * The user row is locked first so this operation serializes with refresh-token
 * rotation and revoke-all. A code can be used exactly once: the conditional
 * `updateMany` consumes it only while `usedAt` is null, and concurrent callers
 * block on the same user-row lock.
 *
 * @param {object} params Reset parameters.
 * @param {number} params.userId The user to reset.
 * @param {string} params.code The raw numeric reset code.
 * @param {string} params.password The new plaintext password.
 * @param {string|null} [params.ipAddress=null] The request IP address.
 * @param {string|null} [params.correlationId=null] The request correlation id.
 * @returns {Promise<{success: boolean}>} Whether the reset was applied.
 */
export const resetPasswordWithCode = async ({userId, code, password, ipAddress = null, correlationId = null}) => {
    const hashedPassword = await bcrypt.hash(password, 12);

    return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${userId} FOR UPDATE`;

        const token = await tx.passwordResetToken.findFirst({
            where: {
                userId,
                token: hashResetCode(code),
                usedAt: null,
                expiresAt: {gt: new Date()},
            },
            select: {id: true},
        });

        if (!token) return {success: false};

        const userRecord = await tx.user.findUnique({
            where: {id: userId},
            select: {password: true},
        });
        if (!userRecord) return {success: false};

        const consumed = await tx.passwordResetToken.updateMany({
            where: {id: token.id, usedAt: null},
            data: {usedAt: new Date()},
        });
        if (consumed.count !== 1) return {success: false};

        await tx.passwordHistory.create({
            data: {
                password: userRecord.password,
                userId,
            },
        });
        await tx.user.update({
            where: {id: userId},
            data: {
                password: hashedPassword,
                lastPasswordReset: new Date(),
                tokenVersion: {increment: 1},
            },
        });
        await tx.refreshToken.updateMany({
            where: {userId, isRevoked: false},
            data: {isRevoked: true},
        });

        await recordAuthAuditEvent({
            eventType: AUTH_AUDIT_EVENT_TYPES.PASSWORD_RESET_COMPLETE,
            outcome: AUTH_AUDIT_OUTCOMES.SUCCESS,
            userId,
            ipAddress,
            correlationId,
        }, {tx, critical: true});

        return {success: true};
    });
}

const getCurrentPaswordHash = async (email) => {
    const user = await prisma.user.findFirst({
        select: {
            password: true
        },
        where: {
            email: email
        }
    });
    return user.password;
}

/**
 * Hash and persist a new password, record history, and revoke all sessions
 * atomically.
 *
 * @param {object} user The user whose password changes.
 * @param {string} password The new plaintext password.
 * @returns {Promise<void>}
 */
export const updateUserPassword = async (user, password) => {

    const hashedPassword = await bcrypt.hash(password, 12);
    const currentPasswordHash = await getCurrentPaswordHash(user.email);

    await prisma.$transaction(async (tx) => {
        await tx.passwordHistory.create({
            data: {
                password: currentPasswordHash,
                userId: user.id,
            }
        });

        await tx.user.update({
            where: {email: user.email},
            data: {
                password: hashedPassword,
                lastPasswordReset: new Date(),
                tokenVersion: {increment: 1},
            }
        });

        await tx.refreshToken.updateMany({
            where: {userId: user.id, isRevoked: false},
            data: {isRevoked: true}
        });
    });
}

/**
 * Change the authenticated user's password after verifying the current one.
 *
 * The user row is locked first (`SELECT ... FOR UPDATE`) so concurrent
 * password changes serialize against each other and against refresh-token
 * rotation and revoke-all. The current password is verified with bcrypt, and
 * the new password is rejected when it equals the current password or any
 * entry in the password-history table. On success the old hash is recorded in
 * history, the new hash is stored, the user's token version is incremented,
 * and every active refresh-token session is revoked atomically.
 *
 * @param {number} userId The authenticated user's id.
 * @param {string} currentPassword The presented current password.
 * @param {string} newPassword The proposed new password.
 * @param {object} [auditContext={}] Request context for the audit record.
 * @param {string|null} [auditContext.ipAddress=null] The request IP address.
 * @param {string|null} [auditContext.correlationId=null] The request correlation id.
 * @returns {Promise<object>} The transaction result.
 * @throws {AppError} With status 401 when the user is missing or the current
 *   password is incorrect.
 * @throws {AppError} With status 409 when the new password reuses the current
 *   password or a previous password.
 */
export const changeUserPassword = async (userId, currentPassword, newPassword, auditContext = {}) => {
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    return prisma.$transaction(async (tx) => {
        // Lock the user row first so a concurrent password change cannot
        // interleave with the compare-and-update sequence below.
        const lockedRows = await tx.$queryRaw`
            SELECT "password"
            FROM "user"
            WHERE "id" = ${userId}
            FOR UPDATE
        `;
        const lockedUser = lockedRows[0];

        if (!lockedUser) {
            throw new AppError('User not found', 401, null, {code: ERROR_CODES.RESOURCE_NOT_FOUND});
        }

        const currentPasswordValid = await bcrypt.compare(currentPassword, lockedUser.password);
        if (!currentPasswordValid) {
            throw new AppError('Current password is incorrect', 401, null, {code: ERROR_CODES.PASSWORD_INCORRECT});
        }

        if (await bcrypt.compare(newPassword, lockedUser.password)) {
            throw new AppError('New password must be different from the current password', 409, null, {code: ERROR_CODES.PASSWORD_SAME_AS_CURRENT});
        }

        const history = await tx.passwordHistory.findMany({
            where: { userId },
            select: { password: true },
        });
        for (const entry of history) {
            if (await bcrypt.compare(newPassword, entry.password)) {
                throw new AppError('New password was used previously', 409, null, {code: ERROR_CODES.PASSWORD_PREVIOUSLY_USED});
            }
        }

        await tx.passwordHistory.create({
            data: {
                password: lockedUser.password,
                userId,
            },
        });
        await tx.user.update({
            where: { id: userId },
            data: {
                password: hashedNewPassword,
                lastPasswordReset: new Date(),
                tokenVersion: { increment: 1 },
            },
        });
        await tx.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true },
        });

        await recordAuthAuditEvent({
            eventType: AUTH_AUDIT_EVENT_TYPES.PASSWORD_CHANGE,
            outcome: AUTH_AUDIT_OUTCOMES.SUCCESS,
            userId,
            ipAddress: auditContext.ipAddress ?? null,
            correlationId: auditContext.correlationId ?? null,
        }, {tx, critical: true});
    });
}

/**
 * Update a user's last-login timestamp.
 *
 * @param {object} user The user to update.
 * @returns {Promise<void>}
 */
export const updateLastLogin = async (user) => {
    await prisma.user.update({
        where: {id: user.id},
        data: {lastLoginAt: new Date()}
    });
}


/**
 * Reload a user by email (currently returns null; the returned body is
 * commented out).
 *
 * @param {object} user A user object with an `email`.
 * @returns {Promise<null>}
 */
export const sanitizeUser = async (user) => {
    const refreshedUser = await getUser(user.email);
    if(!refreshedUser) return null;
    // return {
    //     id: user.id,
    //     email: user.email,
    //     username: user.username,
    //     firstname: user.firstname,
    //     lastname: user.lastname,

    // }
}


/**
 * Re-run the Prisma operation captured in a `_meta` marker.
 *
 * @param {object} _meta The Prisma model, method, and arguments to replay.
 * @returns {Promise<object>} The re-fetched record.
 * @throws {AppError} If `_meta` is missing a model or method.
 */
export const refreshRecord = async (_meta) => {
    if(!_meta || !_meta.model || !_meta.method)
        throw new AppError('Invalid _meta: model and method are required');

    const model = prisma[_meta.model];
    if(!model)
        throw new AppError(`Model "${_meta.model}" not found`);

    return await model[_meta.method](_meta.args);
}


/**
 * Copy an object while omitting the keys in the exclusion list.
 *
 * @param {object} obj The source object.
 * @param {object} excludeList A map whose keys should be omitted.
 * @returns {object} The sanitized shallow copy.
 */
const sanitizeObject = (obj, excludeList) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)){
        if(!(key in excludeList)){
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Sanitize every object in an array.
 *
 * @param {object[]} arr The source array.
 * @param {object} excludeList A map whose keys should be omitted.
 * @returns {object[]} The sanitized copies.
 */
const sanitizeArray = (arr, excludeList) => {
    return arr.map(item => sanitizeObject(item, excludeList));
}

/**
 * Remove excluded fields from a value before serializing it to a client.
 *
 * @param {object|object[]|null} data The value to sanitize.
 * @param {object} excludeList A map whose keys should be omitted.
 * @returns {object|object[]|null} The sanitized value.
 */
export const sanitizeResponse = (data, excludeList) => {
    if(!data) return null;
    
    if(Array.isArray(data)){
        return sanitizeArray(data, excludeList);
    }

    return sanitizeObject(data, excludeList);
}


