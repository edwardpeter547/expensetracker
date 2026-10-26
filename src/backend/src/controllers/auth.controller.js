import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import Config from '../configurations/env.config.js';
import i18n from '../configurations/i18n.config.js';
import logger from '../configurations/logger.config.js';
import { AUTH_ACTIONS, MESSAGING_ACTIONS, USER_ACTIONS } from '../constants/audit.actions.js';
import {
    confirmVerification,
    createLoginAttempt,
    createRefreshToken,
    createUser,
    createVerificationToken,
    getAccountLockout,
    getUser,
    getSafeUser,
    getVerificationToken,
    listUserSessions,
    removeVerificationToken,
    resetFailedLogins,
    resetPasswordWithCode,
    revokeAllUserSessions,
    revokeRefreshTokenByHash,
    revokeUserSession,
    rotateRefreshToken,
    savePasswordResetToken,
    saveVerificationToken,
    updateLastLogin,
    verifyResetPasswordToken,
} from '../services/auth.service.js';
import emailService from '../services/email.service.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { generateNumericCode, generateTokens, getAppLocale, maskEmail } from '../utils/helpers.js';
import { DUMMY_PASSWORD_HASH } from '../constants/app.constants.js';


/**
 * Register a new account and issue an access/refresh token pair.
 *
 * Creates an inactive user, persists a hashed refresh token, queues a
 * verification email, and returns the safe user projection plus tokens.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const register = catchAsync(async (request, response) => {

    const {email, username, password, firstName, lastName, language: bodyLanguage, currency} = request.body;
    const language = bodyLanguage || request.headers['accept-language']?.split('-')[0] || Config.defaultLocale

    const user = await createUser(email, username, password, firstName, lastName, language, currency);
    const {accessToken, refreshToken } = generateTokens(user.id, user.email, 0);

    await createRefreshToken(refreshToken, user.id, request.ip, null, request.headers['user-agent']);
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


/**
 * Verify an email-verification token and activate the user.
 *
 * @param {import('express').Request} request Express request with `query.token`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
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
    .catch(error => logger.error('Failed to send email', {user: maskEmail(verification.user.email), action: MESSAGING_ACTIONS.FAILED_SENDING_EMAIL}))

    response.status(200).json({
        success: true,
        message: i18n.__({phrase: "RESPONSE_MSG_EMAIL_VERIFIED", locale: verification.user.language}),
        data: {user: verification.user},
        errors: null
    });

});


/**
 * Resend the email-verification link for an unverified account.
 *
 * @param {import('express').Request} request Express request with `body.email`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const resendVerification = catchAsync(async (request, response) => {
    const { email } = request.body;
    const user = await getSafeUser({email});
    const genericMessage = request.__("RESPONSE_EMAIL_VERIFICATION_LINK_SENT");

    const respond = () => response.status(200).json({
        success: true,
        message: genericMessage,
        data: null,
        errors: null,
    });

    if(!user){
        logger.warn('User does not exist', {user: maskEmail(email), action: USER_ACTIONS.USER_NOT_FOUND});
        return respond();
    }

    if(user.isEmailVerified && user.isActive){
        logger.warn('Email is already verified', {user: maskEmail(email), action: USER_ACTIONS.USER_ACCOUNT_ACTIVE});
        return respond();
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await saveVerificationToken(user, verificationToken);
    
    emailService.resendEmailVerificationLink(user, verificationToken)
    .catch(error => logger.error('Failed to send email', {user: maskEmail(user.email), action: MESSAGING_ACTIONS.FAILED_SENDING_EMAIL}));

    return respond();
});


/**
 * Authenticate an email/password pair and issue a new token pair.
 *
 * Every failure path returns the same generic 401 shape so the response does
 * not disclose whether the email exists, whether the password was wrong, or
 * whether the account is temporarily restricted. A dummy bcrypt comparison is
 * performed for unknown emails to reduce timing differences. Failed attempts
 * are recorded before the lockout gate is consulted so concurrent failures are
 * all persisted rather than lost to a read-then-act race.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const login = catchAsync(async (request, response) => {

    const {email, password} = request.body;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];
    const locale = getAppLocale(request);
    const user = await getUser({email});
    const genericFailure = () => new AppError(
        i18n.__({phrase: "ERROR_INVALID_USER", locale: locale}),
        StatusCodes.UNAUTHORIZED,
    );

    // Compare against the real hash when the user exists, and against a fixed
    // dummy hash otherwise, so both paths cost roughly the same wall-clock time.
    const passwordValid = user
        ? await bcrypt.compare(password, user.password)
        : Boolean(await bcrypt.compare(password, DUMMY_PASSWORD_HASH));

    if (!user) {
        await createLoginAttempt({ipAddress, userAgent, email, loginAttemptStatus: false});
        logger.warn('Login failed: user not found', {user: maskEmail(email), action: AUTH_ACTIONS.LOGIN_FAILED});
        throw genericFailure();
    }

    if (!passwordValid) {
        await createLoginAttempt({ipAddress, userAgent, email, loginAttemptStatus: false, userId: user.id});
        logger.warn('Login failed: invalid password', {user: maskEmail(email), action: AUTH_ACTIONS.LOGIN_FAILED});
        throw genericFailure();
    }

    const lockout = await getAccountLockout(email);
    if (lockout.locked) {
        logger.warn('Login blocked by temporary lockout', {user: maskEmail(email), action: AUTH_ACTIONS.LOGIN_BLOCKED});
        throw genericFailure();
    }

    if (!user.isActive) {
        await createLoginAttempt({ipAddress, userAgent, email, loginAttemptStatus: false, userId: user.id});
        logger.warn('Login blocked: account deactivated', {user: maskEmail(email), action: AUTH_ACTIONS.LOGIN_BLOCKED});
        throw genericFailure();
    }

    // Generate tokens
    const {accessToken, refreshToken } = generateTokens(user.id, user.email, user.tokenVersion);

    await resetFailedLogins(email);
    await createRefreshToken(refreshToken, user.id, ipAddress, null, userAgent);
    await updateLastLogin(user);
    await createLoginAttempt({ipAddress, userAgent, email, loginAttemptStatus: true, userId: user.id});
    logger.info('Login Successful', {user: maskEmail(user.email), action: AUTH_ACTIONS.LOGIN_SUCCESS});

    const safeUser = await getSafeUser({id: user.id});

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__("RESPONSE_LOGIN_SUCCESSFUL"),
        data: {
            user: safeUser,
            accessToken,
            refreshToken
        }
    })


});

/**
 * Reset a password using a verified reset code, revoking all sessions.
 *
 * @param {import('express').Request} request Express request with `code`,
 *   `email`, and `password`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const resetPassword = catchAsync(async (request, response) => {
    const {code, email, password} = request.body;
    const user = await getUser({email});
    const locale = getAppLocale(request);

    if(!user){
        logger.warn("Password reset attempted for unknown email", {user: maskEmail(email), action: AUTH_ACTIONS.TOKEN_INVALID});
        throw new AppError(i18n.__({phrase: "ERROR_INVALID_RESET_TOKEN", locale}), StatusCodes.UNAUTHORIZED);
    }

    const result = await resetPasswordWithCode({
        userId: user.id,
        code,
        password,
    });

    if(!result.success){
        logger.warn("Password reset code invalid or already used", {user: maskEmail(user.email), action: AUTH_ACTIONS.TOKEN_EXPIRED});
        throw new AppError(i18n.__({phrase: "ERROR_INVALID_RESET_TOKEN", locale: user.language || locale}), StatusCodes.UNAUTHORIZED);
    }

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__("RESPONSE_PASSWORD_CHANGED"),
        data: null,
        errors: null
    })

});

/**
 * Verify a password-reset code for an email address.
 *
 * @param {import('express').Request} request Express request with `code` and
 *   `email`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const verifyToken = catchAsync(async (request, response) => {

    const {code, email } = request.body;
    const user = await getSafeUser({email});

    if(!user){
        logger.warn("Password reset code verification failed", {user: maskEmail(email), action: AUTH_ACTIONS.TOKEN_INVALID});
        throw new AppError(i18n.__({phrase: "ERROR_INVALID_RESET_TOKEN", locale: getAppLocale(request)}), StatusCodes.UNAUTHORIZED);
    }

    const locale = user.language || Config.defaultLocale;

    const result = await verifyResetPasswordToken(code, user);
    if(!result.valid){
        logger.warn("Invalid password reset token", {user: maskEmail(user.email), action: AUTH_ACTIONS.TOKEN_EXPIRED})
        throw new AppError(i18n.__({phrase: "ERROR_INVALID_RESET_TOKEN", locale: locale}), StatusCodes.UNAUTHORIZED);
    }

    response.status(StatusCodes.OK).json({
        success: true,
        message: null,
        data: {user},
        errors: null
    });

});

/**
 * Request a password-reset code for an email address.
 *
 * @param {import('express').Request} request Express request with `body.email`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const forgotPassword = catchAsync(async (request, response) => {
    const { email } = request.body;
    const user = await getSafeUser({email});

    if(!user){
        logger.warn('Password reset requested for unknown email', {user: maskEmail(email), action: USER_ACTIONS.USER_NOT_FOUND});
        return response.status(StatusCodes.OK).json({
            success: true,
            message: request.__("RESPONSE_PASSWORD_RESET_CODE_SENT"),
            data: null,
            errors: null
        });
    }

    const passwordResetCode = generateNumericCode(6);
    await savePasswordResetToken(user,  passwordResetCode);

    emailService.sendPasswordResetCode(user, passwordResetCode)
    .catch(error => logger.error('Failed to send email', {user: maskEmail(user.email), action: MESSAGING_ACTIONS.FAILED_SENDING_EMAIL}));

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__("RESPONSE_PASSWORD_RESET_CODE_SENT"),
        data: null,
        errors: null
    });
});

/**
 * Revoke the authenticated user's presented refresh-token session.
 *
 * Logout is idempotent: route validation rejects missing or malformed tokens
 * before this handler runs, and an unknown or already-revoked token is treated
 * as a successful logout. Only the presented token is revoked — matched by its
 * SHA-256 hash and the authenticated user's id — so no other session and no
 * other user's session is affected. No token material is logged or returned.
 *
 * @param {import('express').Request} request Express request carrying
 *        `body.refreshToken` and the authenticated `request.user`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const logout = catchAsync(async (request, response) => {
    const { refreshToken } = request.body;
    const user = request.user;

    await revokeRefreshTokenByHash(refreshToken, user.id);

    logger.info('User logged out', {user: maskEmail(user.email), action: AUTH_ACTIONS.LOGOUT_SUCCESS});

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__('RESPONSE_LOGOUT_SUCCESSFUL'),
        data: null,
        errors: null
    })
})

/**
 * List the authenticated user's active device sessions.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const listSessions = catchAsync(async (request, response) => {
    const sessions = await listUserSessions(request.user.id);

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__('RESPONSE_SESSIONS_LISTED'),
        data: {sessions},
        errors: null,
    });
});

/**
 * Revoke every active refresh-token session for the authenticated user.
 *
 * This is the device-wide equivalent of logging out everywhere. The service
 * revokes all refresh-token sessions and increments the user's token version
 * atomically, so previously issued access tokens are rejected on subsequent
 * requests.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const revokeAllSessions = catchAsync(async (request, response) => {
    await revokeAllUserSessions(request.user.id);

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__('RESPONSE_ALL_SESSIONS_REVOKED'),
        data: null,
        errors: null,
    });
});

/**
 * Revoke one of the authenticated user's sessions by refresh-token id.
 *
 * @param {import('express').Request} request Express request with `params.id`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const revokeSession = catchAsync(async (request, response) => {
    const sessionId = request.params.id;
    const {count} = await revokeUserSession(request.user.id, sessionId);

    if (count === 0) {
        throw new AppError(request.__('ERROR_SESSION_NOT_FOUND'), StatusCodes.NOT_FOUND);
    }

    response.status(StatusCodes.OK).json({
        success: true,
        message: request.__('RESPONSE_SESSION_REVOKED'),
        data: null,
        errors: null,
    });
});

/**
 * Rotate a refresh token and return a new token pair.
 *
 * Delegates to `rotateRefreshToken`, which hashes the token, enforces atomic
 * rotation, and revokes the family on replay.
 *
 * @param {import('express').Request} request Express request with
 *   `body.refreshToken`.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const refreshToken = catchAsync(async (request, response) => {

    const { refreshToken } = request.body;
    
    if(!refreshToken){
        throw new AppError('Refresh token is required', StatusCodes.BAD_REQUEST);
    }

    const tokens = await rotateRefreshToken(refreshToken);

    logger.info('Token refreshed', {
        userId: tokens.userId,
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




