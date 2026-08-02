import express from 'express';
import {
    changePassword,
    forgotPassword,
    login,
    logout,
    refreshToken,
    register,
    resendVerification,
    verifyEmail,
    verifyToken
} from '../../controllers/auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
    changePasswordSchema,
    emailVerificationSchema,
    loginSchema,
    refreshSchema,
    registerSchema,
    resetPasswordTokenSchema,
    verificationTokenSchema
} from '../../validations/auth.validation.js';


const authRoutes = express.Router();

// Public routes
authRoutes.post('/register', validate(registerSchema), register);
authRoutes.get('/verify-email', validate(verificationTokenSchema), verifyEmail);
authRoutes.post('/resend-verification', validate(emailVerificationSchema), resendVerification);
authRoutes.post('/login', validate(loginSchema), login);
authRoutes.post('/forgot-password', validate(emailVerificationSchema), forgotPassword);
authRoutes.post('/verify-otp', validate(resetPasswordTokenSchema), verifyToken);
authRoutes.post('/change-password', validate(changePasswordSchema), changePassword);
authRoutes.post('/refresh-token', validate(refreshSchema), refreshToken);

// Protected Routes
authRoutes.post('/logout', authenticate, logout);

export default authRoutes;