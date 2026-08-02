import bcrypt from "bcryptjs";
import Config from "../configurations/env.config.js";
import logger from "../configurations/logger.config.js";
import prisma from "../configurations/prisma.connect.js";
import { AUTH_ACTIONS, USER_ACTIONS } from "../constants/audit.actions.js";
import AppError from "../utils/appError.js";

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

export const createRefreshToken = async (refreshToken, userId, ipAddress) => {
    
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdByIp: ipAddress
        }
    });
    logger.info("Refresh Token generated", {userId: userId, action: AUTH_ACTIONS.REFRESH_TOKEN_CREATED});
}

export const getRefreshToken = async (token) => {
    const storedToken = await prisma.refreshToken.findUnique({
        where: {token: token},
        include: {user: true}
    });

    return storedToken;
}

export const deleteRefreshToken = async (storedToken) => {
    return await prisma.refreshToken.delete({where: {id: storedToken.id}});
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
        include: { user: true }
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
        })
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


