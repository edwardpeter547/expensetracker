import Joi from "joi";
import i18n from "../configurations/i18n.config.js";

/**
 * Validation schema for an optional language code selected from the
 * configured i18n locales.
 */
export const langSchema = Joi.object({
    lang: Joi.string().optional().valid(...i18n.getLocales())
})
