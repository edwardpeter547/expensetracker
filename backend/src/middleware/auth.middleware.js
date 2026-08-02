import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import Config from '../configurations/env.config.js';
import { userProfile } from '../services/profile.service.js';
import AppError from '../utils/appError.js';


export const authenticate = async (request, response, next) => {
    try {

        const authHeader = request.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer')){
            throw new AppError('Access denied. No token provided.', StatusCodes.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];

        // Verify access token
        const decoded = jwt.verify(token, Config.jwtSecret);
        
        const user = await userProfile({userId: decoded.userId});

        if(!user || !user.isActive){
            throw new AppError('User not found or account deactivated', StatusCodes.UNAUTHORIZED)
        }

        request.user = user;
        next();

    }catch(error){
        if(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'){
            return next(new AppError('Invalid or expired token', StatusCodes.UNAUTHORIZED));
        }
        next(error);
    }
}