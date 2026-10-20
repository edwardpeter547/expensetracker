import prisma from "../configurations/prisma.connect.js";

/**
 * Load a user's safe public profile by id.
 *
 * @param {{userId: number}} userData The decoded auth context.
 * @returns {Promise<object|null>} The safe user projection.
 */
export const userProfile = async (userData) => {
    console.log('this is decoded', JSON.stringify(userData));
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
            createdAt: true
        }
    });
}


/**
 * Aggregate a user's month-to-date income, expenses, and recent transactions.
 *
 * @param {number} userId The owning user id.
 * @param {Date} startOfMonth The start of the current month.
 * @param {number} [limit=5] Maximum recent transactions to return.
 * @returns {Promise<[object, object, object[]]>} Income aggregate, expense
 *   aggregate, and recent transactions.
 */
export const getUserSummary = async (userId, startOfMonth, limit = 5) => {
    return await Promise.all([
        prisma.transaction.aggregate({
            where: {
                userId: userId,
                transType: 'INCOME',
                transactionDate: {gte: startOfMonth}
            },
            _sum: {amount: true}
        }),

        prisma.transaction.aggregate({
            where: {
                userId: userId,
                transType: "EXPENSE",
                transactionDate: { gte: startOfMonth}
            },
            _sum:  {amount: true}
        }),
        prisma.transaction.findMany({
            where: {userId: userId },
            orderBy: {transactionDate: 'desc'},
            take: limit,
        })
    ])

}
