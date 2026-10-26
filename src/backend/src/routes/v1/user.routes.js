import express from 'express';
import {
    cancelDeletion,
    changePassword,
    exportData,
    getAvatar,
    getDashboard,
    getDeletionStatus,
    getProfile,
    removeAvatar,
    requestDeletion,
    updateProfile,
    uploadAvatar,
} from '../../controllers/user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { avatarUpload } from '../../middleware/avatar-upload.middleware.js';
import { avatarUploadRateLimiter, deletionRecoveryRateLimiter } from '../../configurations/rate-limit.config.js';
import {
    changeOwnPasswordSchema,
    deletionCancelSchema,
    deletionRequestSchema,
    updateProfileSchema,
} from '../../validations/user.validation.js';

/**
 * Authenticated user routes mounted under `/api/v1/user`.
 */

const userRoutes = express.Router();

userRoutes.get('/profile', authenticate, getProfile);
userRoutes.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
userRoutes.get('/dashboard', authenticate, getDashboard);
userRoutes.post('/change-password', authenticate, validate(changeOwnPasswordSchema), changePassword);
userRoutes.get('/avatar', authenticate, getAvatar);
userRoutes.post('/avatar', authenticate, avatarUploadRateLimiter, avatarUpload, uploadAvatar);
userRoutes.delete('/avatar', authenticate, avatarUploadRateLimiter, removeAvatar);
userRoutes.post('/deletion-request', authenticate, validate(deletionRequestSchema), requestDeletion);
userRoutes.get('/deletion-request', authenticate, getDeletionStatus);
userRoutes.post('/data-export', authenticate, exportData);

// Cancellation is a recovery path for a locked-out account: it reauthenticates
// with email + password rather than the already-revoked bearer token.
userRoutes.delete('/deletion-request', deletionRecoveryRateLimiter, validate(deletionCancelSchema), cancelDeletion);


export default userRoutes;
