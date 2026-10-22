
export const USER_ACTIONS = {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_SUSPENDED: 'user.suspended',
    USER_ACTIVATED: 'user.activated',
    USER_ACCOUNT_ACTIVE: 'user.account.active',
    USER_ROLE_CHANGED: 'user.role.changed',
    USER_PASSWORD_RESET_REQUESTED: 'user.password.reset.requested',
    USER_PASSWORD_CHANGED: 'user.password.changed',
    USER_PROFILE_UPDATED: 'user.profile.updated',
    USER_TWO_FACTOR_ENABLED: 'user.2fa.enabled',
    USER_TWO_FACTOR_DISABLED: 'user.2fa.disabled',
    USER_LOGIN_ATTEMPT_SUCCESS: 'user.login.success',
    USER_LOGIN_ATTEMPT_FAILED: 'user.login.failed',
    USER_NOT_FOUND: 'user.not.found'
}


export const TRANSACTION_ACTIONS = {
    CREATED: 'transaction.created',
    UPDATED: 'transaction.updated',
    DELETED: 'transaction.deleted',
    BULK_CREATED: 'transaction.bulk.created',
    BULK_DELETED: 'transaction.bulk.deleted',
    EXPORTED: 'transaction.exported',
    IMPORTED: 'transaction.imported',
    DUPLICATE_DETECTED: 'transaction.duplicate.detected',
};

export const AUTH_ACTIONS = {
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILED: 'auth.login.failed',
    LOGIN_BLOCKED: 'auth.login.blocked',
    LOGOUT_SUCCESS: 'auth.logout.success',
    TOKEN_REFRESHED: 'auth.token.refreshed',
    TOKEN_EXPIRED: 'auth.token.expired',
    TOKEN_INVALID: 'auth.token.invalid',
    SESSION_EXPIRED: 'auth.session.expired',
    SESSION_REVOKED: 'auth.session.revoked',
    REFRESH_TOKEN_CREATED: 'refresh.token.created',
    MISSING_REFRESH_TOKEN: 'refresh.token.missing',
};


export const BUDGET_ACTIONS = {
    CREATED: 'budget.created',
    UPDATED: 'budget.updated',
    DELETED: 'budget.deleted',
    EXCEEDED: 'budget.exceeded',
    APPROACHING_LIMIT: 'budget.approaching.limit',   // 80% used
    RESET: 'budget.reset',
    NOT_FOUND: 'budget.not.found',
    CONFLICT: 'matching.budget.exists'
}


export const REPORT_ACTIONS = {
    GENERATED: 'report.generated',
    EXPORTED_PDF: 'report.exported.pdf',
    EXPORTED_CSV: 'report.exported.csv',
    EXPORTED_EXCEL: 'report.exported.excel',
    SCHEDULED: 'report.scheduled',
};


export const NOTIFICATION_ACTIONS = {
    SENT: 'notification.sent',
    READ: 'notification.read',
    READ_ALL: 'notification.read.all',
    PREFERENCES_UPDATED: 'notification.preferences.updated',
    UNSUBSCRIBED: 'notification.unsubscribed',
};


export const API_ACTIONS = {
    RATE_LIMIT_EXCEEDED: 'api.rate.limit.exceeded',
    INVALID_ENDPOINT: 'api.invalid.endpoint',
    METHOD_NOT_ALLOWED: 'api.method.not.allowed',
    UNAUTHORIZED_ACCESS: 'api.unauthorized.access',
};


export const DATA_ACTIONS = {
    EXPORT_STARTED: 'data.export.started',
    EXPORT_COMPLETED: 'data.export.completed',
    EXPORT_FAILED: 'data.export.failed',
    IMPORT_STARTED: 'data.import.started',
    IMPORT_COMPLETED: 'data.import.completed',
    IMPORT_FAILED: 'data.import.failed',
    DATA_CLEANED: 'data.cleaned',
    DATA_ARCHIVED: 'data.archived',
};

export const CATEGORY_ACTIONS = {
    CREATED: 'category.created',
    UPDATED: 'category.updated',
    DELETED: 'category.deleted',
    MERGED: 'category.merged',
    NOT_FOUND: 'category.not.found',
    ALREADY_EXIST: 'category.exist'
};


export const APPLICATION_MODE = {
    DEVELOPMENT: "development",
    TESTING: 'testing',
    PRODUCTION: 'production'
}


export const MESSAGING_ACTIONS = {
    WELCOME_EMAIL_SENT: 'registration.email.sent',
    FAILED_SENDING_EMAIL: 'failed.sending.email',
}