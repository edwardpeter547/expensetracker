import express from 'express';
import { getDashboard, getProfile, updateProfile } from '../../controllers/user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

/**
 * Authenticated user routes mounted under `/api/v1/user`.
 */

const userRoutes = express.Router();

userRoutes.use(authenticate);

userRoutes.get('/profile', getProfile);
userRoutes.put('/profile', updateProfile);
userRoutes.get('/dashboard', getDashboard);


export default userRoutes;
