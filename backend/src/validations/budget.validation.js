import Joi from 'joi';

export const createBudgetSchema = Joi.object({
    amount: Joi.number().positive().required(),
    categoryId: Joi.string().required(),
    period: Joi.string().valid("WEEKLY", "MONTHLY", "YEARLY").default("MONTHLY"),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")),
    alertThreshold: Joi.number().integer().min(1).max(100).default(80)
});

export const updateBudgetSchema = Joi.object({
    amount: Joi.number().positive(),
    period: Joi.string().valid("WEEKLY", "MONTHLY", "YEARLY"),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")),
    alertThreshold: Joi.number().integer().min(1).max(100)
}).min(1);


export const budgetIdSchema = Joi.object({
    id: Joi.string().required()
})


export const createCategorySchema = Joi.object({
    name: Joi.string().required().min(1).max(50),
    icon: Joi.string().max(50),
    isSystem: Joi.boolean().default(false)
});

export const updateCategorySchema = Joi.object({
    name: Joi.string().min(1).max(50),
    icon: Joi.string().max(50)
}).min(1);

export const categoryIdSchema = Joi.object({
    id: Joi.string().required()
})

