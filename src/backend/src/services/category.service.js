
import prisma from "../configurations/prisma.connect.js"

/**
 * List system categories plus the user's own categories.
 *
 * @param {number} userId The user id.
 * @returns {Promise<object[]>} The category records.
 */
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

/**
 * Fetch a single category that is either system-owned or user-owned.
 *
 * @param {string} categoryId The category id.
 * @param {number} userId The user id.
 * @returns {Promise<object|null>} The category or null.
 */
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


/**
 * Create a category record.
 *
 * @param {object} categoryData The category fields to persist.
 * @param {number} userId The owning user id.
 * @returns {Promise<object>} The created category.
 */
export const createCategoryRecord = async (categoryData, userId) => {
    return await prisma.category.create({
        data: categoryData
    })
}

/**
 * Find a system or user category by case-insensitive name.
 *
 * @param {string} categoryName The name to look up.
 * @param {number} userId The user id.
 * @returns {Promise<object|null>} The matching category or null.
 */
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


/**
 * Find a user-owned category by id.
 *
 * @param {number} userId The owning user id.
 * @param {string} categoryId The category id.
 * @returns {Promise<object|null>} The category or null.
 */
export const checkCategoryById = async (userId, categoryId) => {

    return await prisma.category.findFirst({
        where: {id: categoryId, userId: userId}
    });
}

/**
 * Detect a name conflict excluding the category being renamed.
 *
 * @param {string} categoryId The category id to exclude.
 * @param {string} categoryName The proposed name.
 * @param {number} userId The owning user id.
 * @returns {Promise<object|null>} A conflicting category or null.
 */
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


/**
 * Atomically update an owned category using `{id, userId}`.
 *
 * @param {object} categoryData The fields to update.
 * @param {string} categoryId The category id.
 * @param {number} userId The owning user id.
 * @returns {Promise<object>} The updated category.
 */
export const updateCategoryRecord = async (categoryData, categoryId, userId) => {
    return await prisma.category.update({
        where: {id: categoryId, userId: userId},
        data: categoryData
    });
} 

/**
 * Count the user's budgets referencing a category.
 *
 * @param {number} userId The owning user id.
 * @param {string} categoryId The category id.
 * @returns {Promise<number>} The matching budget count.
 */
export const countBudget = async (userId, categoryId) => {
    return await prisma.budget.count({
        where: {userId: userId, categoryId: categoryId}
    });
}

/**
 * Count the user's transactions whose category string matches a name.
 *
 * @param {number} userId The owning user id.
 * @param {string} categoryName The category name.
 * @returns {Promise<number>} The matching transaction count.
 */
export const countTransaction = async (userId, categoryName) => {
    return await prisma.transaction.count({
        where: {
            userId: userId,
            category: {
                equals: categoryName,
                mode: "insensitive"
            }
        }
    });
}


/**
 * Atomically delete an owned category using `{id, userId}`.
 *
 * @param {string} categoryId The category id.
 * @param {number} userId The owning user id.
 * @returns {Promise<object>} The deleted category.
 */
export const deleteCategoryRecord = async (categoryId, userId) => {
    return await prisma.category.delete({
        where: {id: categoryId, userId: userId}
    });
}


