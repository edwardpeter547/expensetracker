import Joi from 'joi';
import {id, email, password, otpToken, text, token} from './common.validation.js';

export const registerSchema = Joi.object({
    email: email(),
    username: text(3, 30).required().alphanum(),
    password: password(8, 100),
    firstName: text(),
    lastName: text(),
});

export const loginSchema = Joi.object({
    email: email(),
    password: password()
});


export const refreshSchema = Joi.object({
    refreshToken: token(),
})


export const verificationTokenSchema = Joi.object({
    token: token(),
});

export const resetPasswordTokenSchema = Joi.object({
    code: otpToken(6),
    email: email()
})

export const emailVerificationSchema = Joi.object({
    email: email()
});


export const forgotPasswordSchema = Joi.object({
    email: email()
});


export const changePasswordSchema = Joi.object({
    code: otpToken(6),
    email: email(),
    password: password(8, 100),
});