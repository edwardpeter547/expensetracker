import { StatusCodes } from "http-status-codes";
import logger from "../configurations/logger.config.js";
import { USER_ACTIONS } from "../constants/audit.actions.js";
import { changeUserPassword } from "../services/auth.service.js";
import {
    getAvatar as getAvatarImage,
    removeAvatar as removeUserAvatar,
    replaceAvatar,
} from "../services/avatar.service.js";
import {
    cancelDeletion as cancelDeletionService,
    exportUserData,
    getDeletionStatus as getDeletionStatusService,
    requestVoluntaryDeletion,
} from "../account-deletion/deletion/service.js";
import { getUserSummary, getUserProfileDto, updateUserProfile } from "../services/profile.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { maskEmail } from "../utils/helpers.js";


/**
 * Return the authenticated user's profile.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getProfile = catchAsync(async (request, response) => {
    
    const profile = await getUserProfileDto(request.user?.id);

    if(!profile){
        logger.warn("User not Found", {user: maskEmail(request.user?.email), action: USER_ACTIONS.USER_NOT_FOUND});
        throw new AppError('User not found', StatusCodes.NOT_FOUND)
    }

    response.status(StatusCodes.OK).json({
        success: true,
        message: "User Profile",
        data: {
            profile: profile
        },
        errors: null
    })
});


/**
 * Return the authenticated user's dashboard summary.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getDashboard = catchAsync(async (request, response) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const userId = request.user?.id;
    const currency = request.user?.currency || 'USD';

    const summary = await getUserSummary(userId, startOfMonth, currency);

    response.status(StatusCodes.OK).json({
        success: true,
        message: "User Summary",
        data: {
            currency: summary.currency,
            balance: summary.balance,
            totalIncome: summary.totalIncome,
            totalExpenses: summary.totalExpenses,
            recentTransactions: summary.recentTransactions,
        },
        errors: null
    })
});


/**
 * Update the authenticated user's profile.
 *
 * Accepts only editable display and preference fields; route validation
 * strips unknown fields before this handler runs.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const updateProfile = catchAsync(async (request, response) => {
    const { firstname, lastname, username, currency, timezone, language, theme } = request.body;

    const profileData = {
        ...(firstname !== undefined && { firstname }),
        ...(lastname !== undefined && { lastname }),
        ...(username !== undefined && { username }),
        ...(currency !== undefined && { currency }),
        ...(timezone !== undefined && { timezone }),
        ...(language !== undefined && { language }),
        ...(theme !== undefined && { theme }),
    };

    const profile = await updateUserProfile(request.user.id, profileData);

    logger.info("User profile updated", {user: maskEmail(request.user.email), action: USER_ACTIONS.USER_PROFILE_UPDATED});

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Profile updated",
        data: { profile },
        errors: null
    });
});


/**
 * Change the authenticated user's password.
 *
 * Requires the current password and a policy-compliant new password. On
 * success every other session is revoked and previously issued access tokens
 * are invalidated by the service-level token-version increment.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const changePassword = catchAsync(async (request, response) => {
    const { currentPassword, newPassword } = request.body;

    await changeUserPassword(request.user.id, currentPassword, newPassword);

    logger.info("User password changed", {
        user: maskEmail(request.user.email),
        action: USER_ACTIONS.USER_PASSWORD_CHANGED,
    });

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Password changed",
        data: null,
        errors: null,
    });
});


/**
 * Upload or replace the authenticated user's avatar.
 *
 * The multipart body is parsed by the route middleware; the service validates,
 * normalizes, stores, and atomically references the image before returning the
 * updated profile DTO.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const uploadAvatar = catchAsync(async (request, response) => {
    const file = request.file;
    if (!file) {
        throw new AppError('Avatar file is required', StatusCodes.BAD_REQUEST);
    }

    await replaceAvatar({ userId: request.user.id, inputBuffer: file.buffer });
    const profile = await getUserProfileDto(request.user.id);

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Avatar updated",
        data: { profile },
        errors: null,
    });
});


/**
 * Remove the authenticated user's custom avatar and return to the default.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const removeAvatar = catchAsync(async (request, response) => {
    await removeUserAvatar({ userId: request.user.id });
    const profile = await getUserProfileDto(request.user.id);

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Avatar removed",
        data: { profile },
        errors: null,
    });
});

/**
 * Return the authenticated user's effective avatar image.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getAvatar = catchAsync(async (request, response) => {
    const { buffer, contentType, etag } = await getAvatarImage({ userId: request.user.id });

    response
        .status(StatusCodes.OK)
        .set('Content-Type', contentType)
        .set('Cache-Control', 'private, no-cache')
        .set('ETag', etag)
        .send(buffer);
});

/**
 * Request voluntary account closure.
 *
 * Reauthenticates with the current password and a deliberate confirmation,
 * immediately deactivates the account and revokes sessions, and schedules
 * durable erasure after the 14-day recovery period.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const requestDeletion = catchAsync(async (request, response) => {
    const { password } = request.body;
    const { requestId, recoveryDeadline } = await requestVoluntaryDeletion({
        userId: request.user.id,
        password,
    });

    response.status(StatusCodes.ACCEPTED).json({
        success: true,
        message: "Deletion requested",
        data: { requestId, recoveryDeadline },
        errors: null,
    });
});

/**
 * Retrieve the authenticated user's latest deletion request status.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getDeletionStatus = catchAsync(async (request, response) => {
    const status = await getDeletionStatusService({ userId: request.user.id });

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Deletion status",
        data: { request: status },
        errors: null,
    });
});

/**
 * Cancel an eligible voluntary closure after email/password reauthentication.
 *
 * This recovery path does not use the revoked bearer token; it is rate-limited
 * at the route boundary.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const cancelDeletion = catchAsync(async (request, response) => {
    const { email, password } = request.body;
    const { requestId } = await cancelDeletionService({ email, password });

    response.status(StatusCodes.OK).json({
        success: true,
        message: "Deletion cancelled",
        data: { requestId },
        errors: null,
    });
});

/**
 * Export the authenticated user's data as a versioned JSON document.
 *
 * The export excludes password hashes and authentication tokens and is served
 * directly as an attachment, so no temporary file needs to be stored or later
 * cleaned up.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const exportData = catchAsync(async (request, response) => {
    const data = await exportUserData({ userId: request.user.id });

    response
        .status(StatusCodes.OK)
        .set("Content-Type", "application/json")
        .set("Content-Disposition", `attachment; filename="expensetracker-export-${Date.now()}.json"`)
        .set("Cache-Control", "private, no-store")
        .json(data);
});
