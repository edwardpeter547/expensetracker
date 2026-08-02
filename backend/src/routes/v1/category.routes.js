import express from 'express';
import { createCategory, deleteCategory, getCategories, getCategory, updateCategory } from '../../controllers/category.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate, validateParams } from '../../middleware/validation.middleware.js';
import { categoryIdSchema, createCategorySchema, updateCategorySchema } from '../../validations/budget.validation.js';


const categoryRoutes = express.Router();

categoryRoutes.use(authenticate);

categoryRoutes.get('/', getCategories);
categoryRoutes.get('/:id', validateParams(categoryIdSchema), getCategory);
categoryRoutes.post('/', validate(createCategorySchema), createCategory);
categoryRoutes.put('/', validate(updateCategorySchema), updateCategory);
categoryRoutes.delete('/:id', validateParams(categoryIdSchema), deleteCategory);

export default categoryRoutes;