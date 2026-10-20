import AppError from "../utils/appError.js";
import { langSchema } from "../validations/general.validation.js";
import i18n from "../configurations/i18n.config.js";
import Config from "../configurations/env.config.js";
import { getAppLocale } from "../utils/helpers.js";



/**
 * Set the request locale from the `Accept-Language` header.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @param {import('express').NextFunction} next Express next callback.
 * @returns {void}
 */
export const langHandler = (request, response, next) => {

    const lang = getAppLocale(request);
    
    const {error, value} = langSchema.validate({lang});
    if(error){
        return next(new AppError('Invalid language parameter', 400));
    }

    // Language detection
    if(lang && i18n.getLocales().includes(lang)){
        request.setLocale(lang);
    }
    next();
}
