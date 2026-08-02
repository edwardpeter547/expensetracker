import Joi from "joi";
import i18n from "../configurations/i18n.config.js";

export const langSchema = Joi.object({
    lang: Joi.string().optional().valid(...i18n.getLocales())
})