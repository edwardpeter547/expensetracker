import Joi from "joi";

export const id = () => Joi.string().uuid().required;
export const email = () => Joi.string().email().required();
export const password = (min = 8, max = 128) => Joi.string().min(min).max(max).required();
export const otpToken = (minLength = 6) => Joi.string().alphanum().length(minLength).required();
export const text = (min = 1, max = 50) => Joi.string().min(min).max(max);
export const token = () => Joi.string().required();