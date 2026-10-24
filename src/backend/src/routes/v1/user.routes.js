import express from 'express';
import { getDashboard, getProfile, updateProfile } from '../../controllers/user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { updateProfileSchema } from '../../validations/user.validation.js';

/**
 * Authenticated user routes mounted under `/api/v1/user`.
 */

const userRoutes = express.Router();

userRoutes.use(authenticate);

userRoutes.get('/profile', getProfile);
userRoutes.put('/profile', validate(updateProfileSchema), updateProfile);
userRoutes.get('/dashboard', getDashboard);


export default userRoutes;
