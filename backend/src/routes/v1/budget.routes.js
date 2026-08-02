import express from 'express';
import { createBudget, deleteBudget, getBudget, getBudgets, updateBudget } from '../../controllers/budget.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate, validateParams } from '../../middleware/validation.middleware.js';
import { budgetIdSchema, createBudgetSchema, updateBudgetSchema } from '../../validations/budget.validation.js';

const budgetRoutes  = express.Router();

budgetRoutes.use(authenticate);

budgetRoutes.get('/', getBudgets);
budgetRoutes.get('/:id', validateParams(budgetIdSchema), getBudget);
budgetRoutes.post('/', validate(createBudgetSchema), createBudget);
budgetRoutes.put('/:id', validate(updateBudgetSchema), updateBudget);
budgetRoutes.delete('/:id', validateParams(budgetIdSchema), deleteBudget);


export default budgetRoutes;