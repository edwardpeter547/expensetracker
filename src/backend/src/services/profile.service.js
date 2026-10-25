import prisma from "../configurations/prisma.connect.js";
import { USER_PROFILE_SELECT } from "../constants/user.select.js";
import { Prisma } from "../generated/client.js";

/**
 * Load a user's safe public profile by id.
 *
 * @param {{userId: number}} userData The decoded auth context.
 * @returns {Promise<object|null>} The safe user projection.
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
            dateOfBirth: true,
            mobileNumber: true,
            isActive: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            language: true, 
            currency: true,
            timezone: true,
            theme: true,
            lastLoginAt: true,
            createdAt: true,
            tokenVersion: true,
        }
    });
}

/**
 * Update the authenticated user's editable profile fields.
 *
 * Only preferences and display fields are accepted; credentials and
 * verification state can never be changed through this path.
 *
 * @param {number} userId The owning user id.
 * @param {object} profileData The fields to update.
 * @returns {Promise<object>} The safely projected updated user.
 */
export const updateUserProfile = async (userId, profileData) => {
    return prisma.user.update({
        where: {id: userId},
        data: profileData,
        select: USER_PROFILE_SELECT
    });
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
