export default {
    PRIVACY_POLICY: 'privacy policy',
    COPYRIGHT_TEXT: 'All rights reserved',
    EMAIL_SALUTATION_TEXT: `Best regards,`,
    EMAIL_SIGNATURE_TEXT:`The {{brandName}} Team.`,
    SUPPORT: 'support',
    UNSUBSCRIBE: 'unsubscribe',
    EMAIL_FOOTER_INFO: 'You\'re receiving this because you have an account with',
    WELCOME_EMAIL_SUBJECT: `{{brandName}} Registration Successful — Verify Your Email`,
    WELCOME_EMAIL_TEXT: `
        <h4>Welcome to {{brandName}}, {{firstName}}</h4>
        <p>Thank you for creating an account. We're excited to help you manage your finances.</p>
        <p>To complete your registration, enter the six-digit verification code below.</p>
        <p>This code expires in {{expiryMinutes}} minutes.</p>
        <p>If you didn't create this account, please ignore this email.</p>
    `,
    EMAIL_VERIFICATION_CODE_TEXT: "Verification Code",
    VERIFY_EMAIL_BUTTON_TEXT: "Verify Email Address",
    RESET_PASSWORD_VERIFICATION_CODE_TEXT: "Verification Code",
    EMAIL_VERIFIED_SUCCESS: `
        <h1>Congratulations, {{firstName}}</h1>
        <p>Your email address has been successfully verified. you now have full access to your account.</p>
        <p>Here's what you can do next:</p>
        <ul>
            <li>Set up your income and expense categories</li>
            <li>Add your first transaction</li>
            <li>Create a monthly budget</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
    `,
    VERIFICATION_COMPLETE_EMAIL_SUBJECT: `{{brandName}} — Email Verified Successfully`,
    RESEND_VERIFICATION_EMAIL_SUBJECT: `{{brandName}} — Verify Your Email Address`,
    RESET_PASSWORD_EMAIL_SUBJECT: `{{brandName}} Account: Password Reset Request Received`,
    RESEND_VERIFICATION_EMAIL_TEXT: `
    <h1>Hi {{firstName}}</h1>
    <p>We received a request to resend the verification code for your {{brandName}} account.</p>
    <p>Enter the six-digit verification code below to verify your email address and activate your account.</p>
    <p>This code expires in {{expiryMinutes}} minutes. If you didn't request this, please ignore this email.</p>
    `,
    RESET_PASSWORD_EMAIL_TEXT: `
    <h1>Hello {{firstName}}</h1>
    <p>We received a request to reset the password for your <b>{{brandName}} account.</b></p>
    <p>If you made this request, use the verification code below to reset your password.</p>
    <p>This code will <b>expire in {{expiryMinutes}} minutes.</b> If you didn't request a password reset, please ignore this email.</p>
    `,
    RESPONSE_MSG_EMAIL_VERIFIED: 'Email verified successfully',
    RESPONSE_MSG_USER_CREATED: 'User created successfully',
    RESPONSE_EMAIL_VERIFICATION_LINK_SENT: 'Email verification code sent. Please check your email',
    RESPONSE_PASSWORD_RESET_CODE_SENT: 'Password reset verification code has been sent',
    RESPONSE_PASSWORD_CHANGED: 'Your password has been updated',
    RESPONSE_LOGIN_SUCCESSFUL:  'Login successful',
    RESPONSE_LOGOUT_SUCCESSFUL: 'Logout successful',
    RESPONSE_SESSIONS_LISTED: 'Sessions listed successfully',
    RESPONSE_SESSION_REVOKED: 'Session revoked successfully',
    RESPONSE_ALL_SESSIONS_REVOKED: 'All sessions revoked successfully',
    ERROR_INVALID_RESET_TOKEN: 'Invalid or expired One time password. please request a new one',
    ERROR_EXPIRED_RESET_TOKEN: 'Expired One time password, please request a new one',
    ERROR_INVALID_USER: 'Invalid email or password',
    ERROR_ACCOUNT_DEACTIVATED: 'Account is deactivated. Contact support.',
    ERROR_SESSION_NOT_FOUND: 'Session not found',
    RESOURCE_NOT_FOUND: 'Record not found',
    NOT_FOUND: 'Resource not found',
    UNIQUE_CONSTRAINT_VIOLATION: '{{field}} already exists',
    TOKEN_INVALID: 'Invalid or expired token',
    TOKEN_EXPIRED: 'Token expired',
    VALIDATION_ERROR: 'Validation failed',
    VALIDATION_REQUIRED: 'This field is required',
    VALIDATION_EMPTY: 'This field cannot be empty',
    VALIDATION_INVALID_TYPE: 'Invalid value type',
    VALIDATION_INVALID_VALUE: 'Invalid value',
    VALIDATION_INVALID_FORMAT: 'Invalid format',
    VALIDATION_TOO_SHORT: 'Must be at least {{limit}} characters',
    VALIDATION_TOO_LONG: 'Must be at most {{limit}} characters',
    VALIDATION_TOO_SMALL: 'Must be at least {{limit}}',
    VALIDATION_TOO_LARGE: 'Must be at most {{limit}}',
    VALIDATION_NOT_ALLOWED: 'Value is not allowed',
    AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
    AUTH_ACCOUNT_DEACTIVATED: 'Account is deactivated. Contact support.',
    ACCOUNT_ALREADY_EXISTS: 'An account with this email or username already exists',
    USERNAME_ALREADY_EXISTS: 'Username already exists',
    TOKEN_MISSING: 'Access denied. No token provided.',
    FORBIDDEN: 'Access denied. Insufficient permissions.',
    REFRESH_TOKEN_MISSING: 'Refresh token is required',
    REFRESH_TOKEN_INVALID: 'Invalid refresh token',
    REFRESH_TOKEN_EXPIRED: 'Refresh token expired',
    SESSION_NOT_FOUND: 'Session not found',
    VERIFICATION_TOKEN_INVALID: 'Invalid or expired verification code',
    VERIFICATION_TOKEN_EXPIRED: 'Verification code has expired',
    RESET_TOKEN_INVALID: 'Invalid or expired one time password. Please request a new one',
    RESET_TOKEN_EXPIRED: 'Expired one time password, please request a new one',
    PASSWORD_INCORRECT: 'Current password is incorrect',
    PASSWORD_SAME_AS_CURRENT: 'New password must be different from the current password',
    PASSWORD_PREVIOUSLY_USED: 'New password was used previously',
    TRANSACTION_NOT_FOUND: 'Transaction not found',
    BUDGET_NOT_FOUND: 'Budget not found',
    CATEGORY_NOT_FOUND: 'Category not found',
    BUDGET_ALREADY_EXISTS: 'A budget already exists for this category and period',
    CATEGORY_ALREADY_EXISTS: 'Category already exists',
    CATEGORY_IN_USE: 'Category is in use by {{budgetCount}} budgets and {{transactionCount}} transactions',
    BUDGET_LIMIT_EXCEEDED: 'Budget limit exceeded',
    INVALID_DATE: 'Invalid date format',
    AVATAR_REQUIRED: 'Avatar image is required',
    AVATAR_INVALID: 'Unsupported or invalid image',
    AVATAR_TOO_LARGE: 'Image dimensions are too large',
    AVATAR_STORAGE_UNAVAILABLE: 'Avatar storage is not configured',
    UNSUPPORTED_MEDIA_TYPE: 'Unsupported media type',
    DELETION_REQUEST_NOT_FOUND: 'Deletion request not found',
    DELETION_ALREADY_IN_PROGRESS: 'A deletion request is already in progress',
    DELETION_NOT_CANCELLABLE: 'Deletion can no longer be cancelled',
    DELETION_INVALID_RETENTION: 'Invalid retention decision',
    
}
