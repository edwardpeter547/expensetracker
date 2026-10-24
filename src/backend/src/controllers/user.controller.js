import { StatusCodes } from "http-status-codes";
import logger from "../configurations/logger.config.js";
import { USER_ACTIONS } from "../constants/audit.actions.js";
import { getUserSummary, updateUserProfile, userProfile } from "../services/profile.service.js";
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
    
    const profile = await userProfile({userId: request.user?.id});

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
})
