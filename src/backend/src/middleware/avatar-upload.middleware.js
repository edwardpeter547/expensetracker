import multer from 'multer';
import Config from '../configurations/env.config.js';
import AppError from '../utils/appError.js';
import { ALLOWED_AVATAR_MIME_TYPES } from '../constants/avatar.constants.js';
import { StatusCodes } from 'http-status-codes';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: Config.avatarUploadLimitBytes,
        files: 1,
        fields: 0,
    },
    fileFilter: (request, file, callback) => {
        // First-pass rejection only; the service re-inspects decoded content.
        if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
            return callback(new AppError('Unsupported media type', StatusCodes.UNSUPPORTED_MEDIA_TYPE));
        }
        callback(null, true);
    },
});

/**
 * Parse a single `avatar` multipart file field into memory.
 *
 * Multer errors are translated to stable HTTP responses: an oversized file
 * becomes 413 and every other malformed multipart request becomes 400.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @param {import('express').NextFunction} next Express next callback.
 * @returns {void}
 */
export const avatarUpload = (request, response, next) => {
    upload.single('avatar')(request, response, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : StatusCodes.BAD_REQUEST;
            return next(new AppError(error.message, status));
        }

        return next(error);
    });
};
