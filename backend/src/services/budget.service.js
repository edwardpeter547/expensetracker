import prisma from "../configurations/prisma.connect.js";
import { FIRST_DAY_OF_MONTH, FIRST_MONTH_OF_YEAR } from "../constants/app.constants.js";

export const getBudgetList = async (userId) => {
    const budgets = prisma.budget.findMany({
        where: { userId: userId, isActive: true},
        include: {category: true},
        orderBy: {createdAt: "desc"}
    });
    return budgets;
}

export const getBudgetWithSpending = async (budgets, currentDate, userId) => {

    const budgetWithSpending = await Promise.all(
        budgets.map(async (budget) => {
            let startDate, nextPeriod;

            if(budget.period === "MONTHLY"){
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                nextPeriod = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
            } else if( budget.period === "WEEKLY") {
                const dayOfWeek = currentDate.getDay();
                startDate = new Date(currentDate);
                startDate.setDate(currentDate.getDate() - dayOfWeek);
                startDate.setHours(0, 0, 0, 0);

                nextPeriod = new Date(startDate);
                nextPeriod.setDate(startDate.getDate() + 7);
            } else {
                startDate = new Date(currentDate.getFullYear(), FIRST_MONTH_OF_YEAR, FIRST_DAY_OF_MONTH);
                nextPeriod = new Date(currentDate.getFullYear() + 1, FIRST_MONTH_OF_YEAR, FIRST_DAY_OF_MONTH);
            }

            // If budget has custom dates, use those
            if(budget.startDate > startDate) startDate = budget.startDate;
            if(budget.endDate) nextPeriod = new Date(budget.endDate.getTime() + 86400000)

            const spending = await prisma.transaction.aggregate({
                where: {
                    userId: userId,
                    categoryId: budget.categoryId,
                    transType: "EXPENSE",
                    transactionDate: {gte: startDate, lt: nextPeriod },
                },
                _sum: {amount: true },
            });

            const spent = spending._sum.amount || 0;
            const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;

            return {
                ...budget,
                spent,
                remaining: budget.amount - spent,
                percentage,
                isOverBudget: spent > budget.amount,
            };
        })
    )

    return budgetWithSpending;
}


export const getBudgetRecord = async (userId, budgetId) => {
    return await prisma.budget.findFirst({
        where: {id: budgetId, userId: userId },
        include: { category: true },
    });
}

export const addBudget = async (budgetData) => {
    return await prisma.budget.create({
        data: budgetData,
        include: {category: true},
    })
}

export const checkBudget = async (userId, categoryId, period) => {
    return await prisma.budget.findUnique({
        where: {
            userId: userId,
            categoryId: categoryId,
            period: period
        }
    })
}

export const budgetExists = async (userId, budgetId) => {
    return await prisma.budget.findFirst({
        where: {id: budgetId, userId: userId}
    });
}

export const updateBudgetRecord = async (budgetId, userId, budgetData) => {
    return await prisma.budget.update({
        where: {id: budgetId, userId: userId},
        data: budgetData,
        include: {category: true}
    });
}


export const deleteBudgetRecord = async (budgetId, userId) => {
    await prisma.budget.update({
        where: {id: budgetId, userId: userId},
        data: {isActive: false}
    });
}