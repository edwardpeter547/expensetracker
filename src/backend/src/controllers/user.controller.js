import { StatusCodes } from "http-status-codes";
import { getUserSummary, userProfile } from "../services/profile.service.js";
import catchAsync from "../utils/catchAsync.js";


/**
 * Return the authenticated user's profile.
 *
 * Note: the not-found branch references symbols that are not imported in this
 * module; the success path is unaffected.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const getProfile = catchAsync(async (request, response) => {
    
    const user = request.user;
    const profile = await userProfile({userId: request.user?.id});

    if(!profile){
        logger.warn("User not Found", {user: maskEmail(request.user.email), action: USER_ACTIONS.USER_NOT_FOUND});
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

    const [totalIncome, totalExpenses, recentTransactions] = await getUserSummary(userId, startOfMonth);

    console.log(totalIncome, totalExpenses, recentTransactions);

    response.status(StatusCodes.OK).json({
        success: true,
        message: "User Summary",
        data: {
            balance: (totalIncome._sum.amount || 0) - (totalExpenses._sum.amount || 0),
            totalIncome: totalIncome._sum.amount || 0,
            totalExpenses: totalExpenses._sum.amount || 0,
            recentTransactions
        },
        errors: null
    })
});


/**
 * Update the authenticated user's profile.
 *
 * Currently an unimplemented placeholder: the handler body is commented out
 * and the endpoint sends no response. No validation is applied on the route.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @returns {Promise<void>}
 */
export const updateProfile = catchAsync(async (request, response) => {

//     export const updateProfile = catchAsync(async (request, response) => {
//     const { firstname, lastname, username, currency, timezone, language, theme } = request.body;

//     const user = await prisma.user.update({
//         where: { id: request.user.id },
//         data: {
//             ...(firstname && { firstname }),
//             ...(lastname && { lastname }),
//             ...(username && { username }),
//             ...(currency && { currency }),
//             ...(timezone && { timezone }),
//             ...(language && { language }),
//             ...(theme && { theme }),
//         },
//         select: {
//             id: true,
//             email: true,
//             username: true,
//             firstname: true,
//             lastname: true,
//             language: true,
//             currency: true,
//             timezone: true,
//             theme: true,
//         }
//     });

//     response.json({
//         success: true,
//         message: 'Profile updated',
//         data: user
//     });
// });

})
