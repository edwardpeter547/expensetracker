import bcrypt from "bcryptjs";
import crypto from "crypto";
import Config from "../configurations/env.config.js";
import logger from "../configurations/logger.config.js";
import prisma from "../configurations/prisma.connect.js";
import { AUTH_ACTIONS, USER_ACTIONS } from "../constants/audit.actions.js";
import { USER_PUBLIC_SELECT } from "../constants/user.select.js";
import AppError from "../utils/appError.js";
import { generateTokens } from "../utils/helpers.js";
import { REFRESH_TOKEN_TTL_MS, REFRESH_TOKEN_PATTERN, REUSE_DETECTED } from "../constants/app.constants.js";

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

    const isExistingUser = await checkExistingUser(email, username);
    if(isExistingUser){
        logger.warn(`User :${username} Already exist`);
        throw new AppError("User with this email or username already exist", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            username,
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
        throw new AppError('Invalid Refresh Token', 401);
    }

    const tokenHash = hashToken(presentedToken);
    const stored = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
        include: { user: { select: USER_PUBLIC_SELECT } }
    });

    if (!stored) {
        throw new AppError('Invalid Refresh Token', 401);
    }

    if (stored.isRevoked) {
        await revokeTokenFamily(stored.familyId);
        throw new AppError('Invalid Refresh Token', 401);
    }

    if (stored.expiresAt < new Date()) {
        throw new AppError('Refresh Token Expired', 401);
    }

    if (!stored.user || !stored.user.isActive) {
        await revokeTokenFamily(stored.familyId);
        throw new AppError('Account deactivated', 401);
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
                SELECT "tokenVersion", "isActive"
                FROM "user"
                WHERE "id" = ${stored.user.id}
                FOR UPDATE
            `;
            const lockedUser = lockedRows[0];

            if (
                !lockedUser ||
                !lockedUser.isActive ||
                Number(lockedUser.tokenVersion) !== stored.user.tokenVersion
            ) {
                throw new AppError('Invalid Refresh Token', 401);
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
            throw new AppError('Invalid Refresh Token', 401);
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
 * Persist an email-verification token for a user.
 *
 * @param {object} user The user to verify.
 * @param {string} token The raw verification token.
 * @param {object} [tx=prisma] An optional Prisma transaction client.
 * @returns {Promise<void>}
 */
export const createVerificationToken = async (user, token, tx = prisma) => {
    await tx.verificationToken.create({
        data: {
            userId: user.id,
            token: token,
            expiresAt: new Date(Date.now() + Config.verificationTokenExpiryMinutes * 60 * 1000)
        }
    });
}

/**
 * Load a verification token with its safe user projection.
 *
 * The raw verification token is not returned in the result.
 *
 * @param {string} token The raw verification token.
 * @returns {Promise<object|null>} The token record (id, expiresAt, user).
 */
export const getVerificationToken = async (token) => {
    return await prisma.verificationToken.findUnique({
        where: { token },
        select: {
            id: true,
            expiresAt: true,
            user: { select: USER_PUBLIC_SELECT }
        }
    });
}

/**
 * Delete a verification token by id.
 *
 * @param {string} tokenId The verification token id.
 * @returns {Promise<void>}
 */
export const removeVerificationToken = async(tokenId) => {
    await prisma.verificationToken.delete({where: {id: tokenId}});
}

/**
 * Mark a user verified and consume the verification token atomically.
 *
 * @param {string} verificationId The verification token id.
 * @param {number} userId The user to activate.
 * @returns {Promise<void>}
 */
export const confirmVerification = async(verificationId, userId) => {
    
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId},
            data: {emailVerifiedAt: new Date(), isActive: true, isEmailVerified: true}
        });

        await tx.verificationToken.delete({
            where: {id: verificationId}
        });
    });
}

/**
 * Reset verification state and issue a new verification token atomically.
 *
 * @param {object} user The user to re-verify.
 * @param {string} verificationToken The new raw verification token.
 * @returns {Promise<void>}
 */
export const saveVerificationToken = async(user, verificationToken) => {
    await prisma.$transaction(async (tx) => {
        await tx.verificationToken.deleteMany({
            where: {userId: user.id}
        });
        await tx.user.update({
            where: {email: user.email},
            data: {
                isEmailVerified: false,
                isActive: false,
                emailVerifiedAt: null
            }
        });
        await createVerificationToken(user, verificationToken, tx)
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
 * @returns {Promise<{success: boolean}>} Whether the reset was applied.
 */
export const resetPasswordWithCode = async ({userId, code, password}) => {
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


