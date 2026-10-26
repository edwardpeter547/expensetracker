import prisma from "../configurations/prisma.connect.js";
import { USER_PROFILE_SELECT } from "../constants/user.select.js";
import { Prisma } from "../generated/client.js";
import { StatusCodes } from "http-status-codes";
import AppError from "../utils/appError.js";
import { normalizeUsername } from "../utils/helpers.js";
import { buildAvatarDto, buildDisplayName } from "./avatar.service.js";

/**
 * Load a user's middleware-safe profile by id.
 *
 * This projection is the authentication context (`request.user`); it must
 * include `isActive` and `tokenVersion` so the auth middleware can enforce
 * account state and token-version invalidation, but it never includes the
 * password hash or personal identifiers such as date of birth or phone number.
 *
 * @param {{userId: number}} userData The decoded auth context.
 * @returns {Promise<object|null>} The middleware-safe user projection.
 */
export const userProfile = async (userData) => {
    return await prisma.user.findUnique({
        where: {id: userData.userId},
        select: {
            id: true,
            email: true,
            username: true,
            firstname: true,
            lastname: true,
            avatar: true,
            language: true, 
            currency: true,
            timezone: true,
            theme: true,
            isActive: true,
            isEmailVerified: true,
            tokenVersion: true,
        }
    });
}

/**
 * Map a safely projected user record to the public profile DTO.
 *
 * Adds the derived `displayName` and the stable `avatar` object, and returns a
 * coherent shape shared by the read and update endpoints. Credential metadata
 * and personal identifiers are never present because the projections feeding
 * this function already omit them.
 *
 * @param {object|null} user The safely projected user record.
 * @returns {object|null} The public profile DTO, or null.
 */
export const toProfileDto = (user) => {
    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        displayName: buildDisplayName(user.firstname, user.lastname),
        avatar: buildAvatarDto(user),
        language: user.language,
        currency: user.currency,
        timezone: user.timezone,
        theme: user.theme,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

/**
 * Load the authenticated user's public profile DTO.
 *
 * @param {number} userId The owning user id.
 * @returns {Promise<object|null>} The public profile DTO, or null.
 */
export const getUserProfileDto = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: USER_PROFILE_SELECT,
    });

    return toProfileDto(user);
};

/**
 * Update the authenticated user's editable profile fields.
 *
 * Only preferences and display fields are accepted; credentials and
 * verification state can never be changed through this path.
 * Usernames are normalized to lowercase, and a unique-constraint violation is
 * translated to a 409 conflict.
 *
 * @param {number} userId The owning user id.
 * @param {object} profileData The fields to update.
 * @returns {Promise<object>} The public profile DTO of the updated user.
 * @throws {AppError} With status 409 when the normalized username is taken.
 */
export const updateUserProfile = async (userId, profileData) => {
    const data = { ...profileData };

    if (data.username !== undefined) {
        data.username = normalizeUsername(data.username);
    }

    try {
        const user = await prisma.user.update({
            where: {id: userId},
            data,
            select: USER_PROFILE_SELECT,
        });
        return toProfileDto(user);
    } catch (error) {
        if (error?.code === 'P2002') {
            throw new AppError('Username already exists', StatusCodes.CONFLICT);
        }
        throw error;
    }
}


/**
 * Aggregate a user's month-to-date income, expenses, and recent transactions
 * for a single currency.
 *
 * @param {number} userId The owning user id.
 * @param {Date} startOfMonth The start of the current month.
 * @param {string} currency The currency to aggregate.
 * @param {number} [limit=5] Maximum recent transactions to return.
 * @returns {Promise<object>} Canonical string totals and recent transactions.
 */
export const getUserSummary = async (userId, startOfMonth, currency, limit = 5) => {
    const [income, expenses, recentTransactions] = await Promise.all([
        prisma.transaction.aggregate({
            where: {
                userId: userId,
                transType: 'INCOME',
                currency: currency,
                transactionDate: {gte: startOfMonth}
            },
            _sum: {amount: true}
        }),

        prisma.transaction.aggregate({
            where: {
                userId: userId,
                transType: "EXPENSE",
                currency: currency,
                transactionDate: { gte: startOfMonth}
            },
            _sum:  {amount: true}
        }),
        prisma.transaction.findMany({
            where: {userId: userId },
            orderBy: {transactionDate: 'desc'},
            take: limit,
        })
    ]);

    const incomeTotal = new Prisma.Decimal(income._sum.amount ?? 0);
    const expenseTotal = new Prisma.Decimal(expenses._sum.amount ?? 0);

    return {
        currency,
        totalIncome: incomeTotal.toString(),
        totalExpenses: expenseTotal.toString(),
        balance: incomeTotal.minus(expenseTotal).toString(),
        recentTransactions,
    };
}
