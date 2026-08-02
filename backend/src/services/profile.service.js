import prisma from "../configurations/prisma.connect.js";

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


export const revokeRefreshToken = async (refreshToken, userId) => {
    return await prisma.refreshToken.updateMany({
        where: {token: refreshToken, userId, isRevoked: false},
        data: {
            isRevoked: true
        }
    })
}


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