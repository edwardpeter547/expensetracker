
import prisma from "../configurations/prisma.connect.js"

export const getCategoryList = async (userId) => {
    return await prisma.category.findMany({
        where: {
            OR: [
                {isSystem: true},
                {userId: userId}
            ]
        },
        orderBy: { name: "asc"}
    })
}

export const getCategoryRecord = async (categoryId, userId) => {
    return await prisma.category.findFirst({
        where: {
            id: categoryId,
            OR: [
                {isSystem: true},
                {userId: userId}
            ]
        },
        
    })
}


export const createCategoryRecord = async (categoryData, userId) => {
    return await prisma.category.create({
        data: categoryData
    })
}

export const checkCategoryByName = async (categoryName, userId) => {
    return await prisma.category.findFirst({
        where: {
            name: {equals: categoryName, mode: "insensitive"},
            OR: [
                {isSystem: true},
                {userId: userId}
            ]
        }
    });
}


export const checkCategoryById = async (userId, categoryId) => {

    return await prisma.category.findFirst({
        where: {id: categoryId, userId: userId}
    });
}

export const checkConflict = async(categoryId, categoryName, userId) => {
    return await prisma.category.findFirst({
        where: {
            name: {equals: categoryName, mode: "insensitive"},
            id: {not: categoryId },
            OR: [
                {isSystem: true},
                {userId: userId}
            ]
        }
    });
}


export const updateCategoryRecord = async (categoryData, categoryId) => {
    return await prisma.category.update({
        where: {id: categoryId},
        data: categoryData
    });
} 

export const countBudget = async (categoryId) => {
    return await prisma.budget.count({
        where: {categoryId: categoryId}
    });
}

export const countTransaction = async (categoryName) => {
    return await prisma.transaction.count({
        where: {
            category: {
                equals: categoryName,
                mode: "insensitive"
            }
        }
    });
}


export const deleteCategoryRecord = async (categoryId) => {
    return await prisma.category.delete({
        where: {id: categoryId}
    });
}


