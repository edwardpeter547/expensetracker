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

export const checkExistingUser = async (email, username) => {
    
    const existingUser = await prisma.user.findFirst({
        where: { OR: [ {email}, {username} ] }
    });

    return existingUser;
}

export const createUser = async (email, username, password, firstname, lastname, language) => {

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

export const createRefreshToken = async (refreshToken, userId, ipAddress, familyId = null) => {
    await prisma.refreshToken.create({
        data: {
            token: hashToken(refreshToken),
            familyId: familyId ?? crypto.randomUUID(),
            userId: userId,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            createdByIp: ipAddress
        }
    });
    logger.info("Refresh Token generated", {userId: userId, action: AUTH_ACTIONS.REFRESH_TOKEN_CREATED});
}

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

export const revokeTokenFamily = async (familyId) => {
    return await prisma.refreshToken.updateMany({
        where: { familyId, isRevoked: false },
        data: { isRevoked: true }
    });
}

export const revokeAllRefreshTokens = async (userId) => {
    return await prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true }
    });
}

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

    const tokens = generateTokens(stored.user.id, stored.user.email);

    try {
        await prisma.$transaction(async (tx) => {
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
                    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
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

export const createVerificationToken = async (user, token, tx = prisma) => {
    await tx.verificationToken.create({
        data: {
            userId: user.id,
            token: token,
            expiresAt: new Date(Date.now() + Config.verificationTokenExpiryMinutes * 60 * 1000)
        }
    });
}

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

export const removeVerificationToken = async(tokenId) => {
    await prisma.verificationToken.delete({where: {id: tokenId}});
}

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

export const savePasswordResetToken = async (user, passwordResetToken, ipAddress) => {
    await prisma.passwordResetToken.create({
        data: {
            token: passwordResetToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + Config.passwordResetTokenExpiryMinutes * 60 * 1000),
            createdByIp: ipAddress
        }
    });
}

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

export const verifyResetPasswordToken = async (code, user) => {

    const tokenData = await prisma.passwordResetToken.findFirst({
        where: {
            userId: user.id,
            token: code,
            expiresAt: {gt: new Date()}
        }
    });

    return {
        valid: !!tokenData,
        code: tokenData || null
    }
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
                lastPasswordReset: new Date()
            }
        });

        await tx.refreshToken.updateMany({
            where: {userId: user.id, isRevoked: false},
            data: {isRevoked: true}
        });
    });
}

export const updateLastLogin = async (user) => {
    await prisma.user.update({
        where: {email: user.email, id: user.id},
        data: {lastLoginAt: new Date()}
    });
}


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


export const refreshRecord = async (_meta) => {
    if(!_meta || !_meta.model || !_meta.method)
        throw new AppError('Invalid _meta: model and method are required');

    const model = prisma[_meta.model];
    if(!model)
        throw new AppError(`Model "${_meta.model}" not found`);

    return await model[_meta.method](_meta.args);
}


const sanitizeObject = (obj, excludeList) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)){
        if(!(key in excludeList)){
            sanitized[key] = value;
        }
    }
    return sanitized;
}

const sanitizeArray = (arr, excludeList) => {
    return arr.map(item => sanitizeObject(item, excludeList));
}

export const sanitizeResponse = (data, excludeList) => {
    if(!data) return null;
    
    if(Array.isArray(data)){
        return sanitizeArray(data, excludeList);
    }

    return sanitizeObject(data, excludeList);
}


