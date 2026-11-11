import auth from './auth';
import transactions from './transactions';
import planning from './planning';
import errors from './errors';

/**
 * Empty bootstrap namespace used until feature strings are extracted in #182.
 */
const placeholder = {};

export default {
    auth,
    transactions,
    planning,
    teams: placeholder,
    profile: placeholder,
    notifications: placeholder,
    ai: placeholder,
    errors,
};
