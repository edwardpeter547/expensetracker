import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import Config from '../configurations/env.config.js';
import i18n from '../configurations/i18n.config.js';
import logger from '../configurations/logger.config.js';
import { AUTH_ACTIONS, MESSAGING_ACTIONS, USER_ACTIONS } from '../constants/audit.actions.js';
import { USER_MODEL_EXCLUDE } from '../constants/model.exclude.js';
import {
    confirmVerification,
    createLoginAttempt,
    createRefreshToken,
    createUser,
    createVerificationToken,
    deleteRefreshToken,
    getRefreshToken,
    getUser,
    getVerificationToken,
    refreshRecord,
    removeVerificationToken,
    sanitizeResponse,
    savePasswordResetToken,
    saveVerificationToken,
    updateLastLogin,
    updateUserPassword,
    verifyResetPasswordToken,
} from '../services/auth.service.js';
import emailService from '../services/email.service.js';
import { revokeRefreshToken } from '../services/profile.service.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { generateTokens, getAppLocale, maskEmail } from '../utils/helpers.js';


export const register = catchAsync(async (request, response) => {

    const {email, username, password, firstName, lastName} = request.body;
    const language = request.headers['accept-language']?.split('-')[0] || Config.defaultLocale

    const user = await createUser(email, username, password, firstName, lastName, language);
    const {accessToken, refreshToken } = generateTokens(user.id, user.email);

    await createRefreshToken(refreshToken, user.id, request.ip);
    await createLoginAttempt({
        ipAddress: request.ip, 
        userAgent: request.headers['user-agent'], 
        email: email, 
        loginAttemptStatus: true, 
        userId: user.id
    });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await createVerificationToken(user, verificationToken);

    emailService.sendRegistrationComplete(user, verificationToken).catch(error => logger.error('failed send welcome email', {userId: user.id, error}));
    logger.info("Registration Email sent!", {user: maskEmail(user.email), action: MESSAGING_ACTIONS.WELCOME_EMAIL_SENT})
    logger.info("User Account Created", {user: maskEmail(user.email), action: USER_ACTIONS.USER_CREATED});

    response.status(201).json({
        success: true,
        message: request.__('RESPONSE_MSG_USER_CREATED'),
        data: {user, accessToken, refreshToken},
        errors: null
    });

});


export const verifyEmail = catchAsync(async (request, response) => {

    const { token } = request.query;
    const verification = await getVerificationToken(token);

    if(!verification){
        logger.warn("Invalid Verification Token", {action: AUTH_ACTIONS.TOKEN_INVALID});
        throw new AppError('Invalid or expired verification token', 400);
    }

    if(verification.expiresAt < new Date()){
        await removeVerificationToken(verification.id);
        logger.warn("Verification token has expired", {user: maskEmail(verification.user.email), action: AUTH_ACTIONS.TOKEN_EXPIRED});
        throw new AppError('Verification token has expired', 400);
    }

    // Mark user as verified
    await confirmVerification(verification.id, verification.user.id);

    await emailService.sendVerificationConfirmation(verification.user)
    .catch(error => logger.error('Failed to send email', {user: maskEmail(user.email), action: MESSAGING_ACTIONS.FAILED_SENDING_EMAIL}))

    response.status(200).json({
        success: true,
        message: i18n.__({phrase: "RESPONSE_MSG_EMAIL_VERIFIED", locale: verification.user.language}),
        data: {user: verification.user},
        errors: null
    });

});


export const resendVerification = catchAsync(async (request, response) => {
    const { email } = request.body;
    const user = await getUser({email});

    if(!user){
        logger.warn('User does not exist', {user: maskEmail(email), action: USER_ACTIONS.USER_NOT_FOUND});
        throw new AppError('User not found', 404);
    }

    if(user.isEmailVerified && user.isActive){
        logger.warn('Email is already verified', {user: maskEmail(email), action: USER_ACTIONS.USER_ACCOUNT_ACTIVE});
        throw new AppError('Email is already verified', 400);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await saveVerificationToken(user, verificationToken);
    
    emailService.resendEmailVerificationLink(user, verificationToken)
    .catch(error => logger.error('Failed to send email', {user: maskEmail(user.email), action: MESSAGING_ACTIONS.FAILED_SENDING_EMAIL}));

    response.status(200).json({
        success: true,
        message: request.__("RESPONSE_EMAIL_VERIFICATION_LINK_SENT"),
        data: {user},
        errors: null
    })
});


export const login = catchAsync(async (request, response) => {

    const {email, password} = request.body;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];
    const user = await getUser({email});
    const locale = getAppLocale(request);
    
    if(!user){
        await createLoginAttempt({ipAddress, userAgent, email, loginAttemptStatus: false});
        logger.warn('Login failed: User not found', {user: maskEmail(email), action: AUTH_ACTIONS.LOGIN_FAILED});
        throw new AppError(i18n.__({phrase: "ERROR_INVALID_USER", locale: locale}), 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if(!isPasswordValid){
        await createLoginAttempt({ipAddress, userAgent, email, loginAttemptStatus: false, userId: user.id});
        logger.warn('Login failed: Invalid password', {user: maskEmail(user.email), action: AUTH_ACTIONS.LOGIN_FAILED});
        throw new AppError(i18n.__({phrase: "ERROR_INVALID_USER", locale: locale}), 403);
    }

    if(!user.isActive){
        await createLoginAttempt({ipAddress, userAgent, email, loginAttemptStatus: false, userId: user.id});
        logger.warn('Login failed: Account deactivated', {user: maskEmail(user.email), action: AUTH_ACTIONS.LOGIN_BLOCKED});
        throw new AppError(i18n.__({phrase: "ERROR_ACCOUNT_DEACTIVATED", locale: locale}), 403);
    }

    // Generate tokens
    const {accessToken, refreshToken } = generateTokens(user.id, user.email);

    await createRefreshToken(refreshToken, user.id, ipAddress);
    await updateLastLogin(user);
    await createLoginAttempt({ipAddress, userAgent, email, loginAttemptStatus: true, userId: user.id});
    logger.info('Login Successful', {user: maskEmail(user.email), action: AUTH_ACTIONS.LOGIN_SUCCESS});

    const updatedUser = await refreshRecord(user._meta);

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__("RESPONSE_LOGIN_SUCCESSFUL"),
        data: {
            user: sanitizeResponse(updatedUser, USER_MODEL_EXCLUDE),
            accessToken,
            refreshToken
        }
    })


});

export const changePassword = catchAsync(async (request, response) => {
    const {code, email, password} = request.body;
    const user = await getUser({email});
    const result = await verifyResetPasswordToken(code, user);
    const locale = user.language || Config.defaultLocale;

    if(!result.valid){
        logger.warn("Expired password reset token", {user: maskEmail(user.email), action: AUTH_ACTIONS.TOKEN_EXPIRED})
        throw new AppError(i18n.__({phrase: "ERROR_EXPIRED_RESET_TOKEN", locale: locale}));
    }

    await updateUserPassword(user, password);

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__("RESPONSE_PASSWORD_CHANGED"),
        data: null,
        errors: null
    })

});

export const verifyToken = catchAsync(async (request, response) => {

    const {code, email } = request.body;
    const user = await getUser({email});
    const locale = user.language || Config.defaultLocale;

    const result = await verifyResetPasswordToken(code, user);
    if(!result.valid){
        logger.warn("Invalid password reset token", {user: maskEmail(user.email), action: AUTH_ACTIONS.TOKEN_EXPIRED})
        throw new AppError(i18n.__({phrase: "ERROR_INVALID_RESET_TOKEN", locale: locale}));
    }

    response.status(StatusCodes.OK).json({
        success: true,
        message: null,
        data: {user},
        errors: null
    });

});

export const forgotPassword = catchAsync(async (request, response) => {
    const { email } = request.body;
    const user = await getUser({email});

    if(!user){
        logger.warn('User does not exist', {user: maskEmail(email), action: USER_ACTIONS.USER_NOT_FOUND});
        throw new AppError('User not found', StatusCodes.NOT_FOUND);
    }

    const passwordResetCode = Array.from(crypto.randomBytes(6)).map(byte => byte % 10).join('');
    console.log(`This is the password reset code: ${passwordResetCode}`);
    await savePasswordResetToken(user,  passwordResetCode);

    emailService.sendPasswordResetCode(user, passwordResetCode)
    .catch(error => logger.error('Failed to send email', {user: maskEmail(user.email), action: MESSAGING_ACTIONS.FAILED_SENDING_EMAIL}));

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__("RESPONSE_PASSWORD_RESET_CODE_SENT"),
        data: {user},
        errors: null
    });
});

export const logout = catchAsync(async (request, response) => {
    
    const { refreshToken } = request.body;
    const user = request.user;

    if(!refreshToken){
        logger.error('Missing refreshToken', {user: maskEmail(user.email), action: AUTH_ACTIONS.MISSING_REFRESH_TOKEN})
        throw new AppError('Refresh token is required', StatusCodes.BAD_REQUEST);
    }

    const result = await revokeRefreshToken(refreshToken, user.id);

    if(result.count === 0)
        throw new AppError('Refresh token not found or already revoked', StatusCodes.NOT_FOUND);

    logger.info('User logged out', {user: maskEmail(user.email), action: AUTH_ACTIONS.LOGOUT_SUCCESS});
    
    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__('RESPONSE_LOGOUT_SUCCESSFUL'),
        data: request.user,
        errors: null
    })
})

export const refreshToken = catchAsync(async (request, response) => {

    const { refreshToken } = request.body;
    
    if(!refreshToken){
        throw new AppError('Refresh token is required', StatusCodes.BAD_REQUEST);
    }

    const storedToken = await getRefreshToken(refreshToken);

    if(!storedToken || storedToken.isRevoked){
        logger.warn("Invalid Refresh Token", {user: maskEmail(storedToken.user.email), action: AUTH_ACTIONS.TOKEN_INVALID});
        throw new AppError("Invalid Refresh Token", StatusCodes.UNAUTHORIZED)
    }

    if(storedToken.expiresAt < new Date()){
        await deleteRefreshToken(storedToken);
        logger.warn("Refresh Token Expired", {user: maskEmail(storedToken.user.email), action: AUTH_ACTIONS.TOKEN_EXPIRED});
        throw new AppError("Refresh Token Expired", StatusCodes.UNAUTHORIZED);
    }

    // generate new tokens
    const tokens = generateTokens(storedToken.user.id, storedToken.user.email);

    await revokeRefreshToken(storedToken.token, storedToken.user.id);

    await createRefreshToken(tokens.refreshToken, storedToken.user.id, request.ip);

    logger.info('Token refreshed', { 
        userId: storedToken.user.id,
        action: AUTH_ACTIONS.TOKEN_REFRESHED 
    });

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Token Refreshed",
        data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        }
    })


})




