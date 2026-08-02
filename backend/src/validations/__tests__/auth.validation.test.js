import { describe, expect, test } from '@jest/globals';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    refreshSchema,
    registerSchema,
} from '../auth.validation';

describe('Register Schema Validation - registerSchema', () => {

    const registrationData = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'First',
        lastName: 'John'
    }

    const requiredFields = ['username', 'password', 'email'];
    const optionalFields = ['firstName', 'lastName'];

    /**
     * Validates that username only accepts alphanumeric characters.
     * Hyphens and special characters should be rejected.
     */
    test('fail when username is not alphanumeric', () => {
        const {error} = registerSchema.validate({...registrationData, username: "test-user"});
        expect(error).toBeDefined();
        expect(error.message).toContain("username");
    });

    /**
     * Validates the minimum length constraint on username (min: 3).
     * Usernames shorter than 3 characters should be rejected.
     */
    test('fails when username is less than required min characters', () => {
        const {error} = registerSchema.validate({...registrationData, username: "te"});
        expect(error).toBeDefined();
        expect(error.message).toContain("username");
    });

    /**
     * Validates the maximum length constraint on username (max: 30).
     * Usernames exceeding 30 characters should be rejected.
     */
    test('fails when username exceeds required max character', () => {
        const { error } = registerSchema.validate({
            ...registrationData,
            username: "testuserA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8SK"
        });

        expect(error).toBeDefined();
        expect(error.message).toContain("username");
    });

    /**
     * Validates the maximum length constraint on the optional firstName field (max: 50).
     * First names exceeding 50 characters should be rejected.
     */
    test('firstname if present has to be 50 characters max', () => {
        const { error } = registerSchema.validate({
            ...registrationData,
            firstName: 'JohnathonSebastianMontgomeryWellingtonTheThirdSecond',
            password: 'secretPassword123'
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('firstName');
    })

    /**
     * Validates the maximum length constraint on the optional lastName field (max: 50).
     * Last names exceeding 50 characters should be rejected.
     */
    test('lastname if present has to be 50 characters max', () => {
        const { error } = registerSchema.validate({
            ...registrationData,
            lastName: 'JohnathonSebastianMontgomeryWellingtonTheThirdSecond',
            password: 'secretPassword123'
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('lastName');
    })

    /**
     * Validates that validation fails when any required field (email, username, password)
     * is omitted from the registration payload.
     */
    test('fails when any required field is missing', () => {
        requiredFields.forEach(field => {
            const {[field]: removedField, ...inputWithoutField} = registrationData;
            const { error } = registerSchema.validate({...inputWithoutField});

            expect(error).toBeDefined();
            expect(error.message).toContain(`${field}`);
        });
    });

    /**
     * Validates that validation succeeds when any optional field (firstName, lastName)
     * is omitted from the registration payload. The omitted field should not appear
     * in the validated output.
     */
    test('passes when any optional field is not present', () => {
        optionalFields.forEach(field => {
            const password = 'secretPassword123';
            const {[field]: removedField, ...inputWithoutField} = registrationData;
            const { error, value } = registerSchema.validate({password, ...inputWithoutField});
            expect(error).toBeUndefined();
            expect(Object.keys(value)).not.toContain(field);
        });
    });

    /**
     * Validates that validation succeeds when all required and optional fields
     * are present with valid values.
     */
    test('passes when required and optional fields are present', () => {
        const {error, value} = registerSchema.validate({
            ...registrationData,
            password: 'secretPassword123'
        });
        expect(error).toBeUndefined();
        expect(value).toBeDefined();
    })

});


/**
 * Login Schema Validation Tests
 *
 * Validates the loginSchema which enforces constraints on authentication
 * credentials. Both email and password are required fields.
 */
describe('Login Schema Validation - loginSchema', () => {

    const requiredFields = ['email', 'password'];
    const authenticationData = {
        email: 'testuser@example.com',
        password: 'secretPassword123'
    }

    /**
     * Validates that both email and password are required for login.
     * Omitting either field should result in a validation error.
     */
    test('ensure email and password are required fields', () => {
        requiredFields.forEach(field => {
            const {[field]: removedField, ...inputWithoutField} = authenticationData;
            const { error } = loginSchema.validate({...inputWithoutField});
            expect(error).toBeDefined();
            expect(error.message).toContain(field);
        });
    });

    /**
     * Validates that login rejects malformed email addresses.
     * An email without a valid domain should fail validation.
     */
    test('fails for an invalid email address', () =>{
        const { error } = loginSchema.validate({
            ...authenticationData,
            email: "testuser@example"
        });

        expect(error).toBeDefined();
        expect(error.message).toContain('email');
    })
});


/**
 * Refresh Schema Validation Tests
 *
 * Validates the refreshSchema which requires a refreshToken field
 * for token refresh operations.
 */
describe('Refresh Schema Validation - refreshSchema', () => {
    /**
     * Validates that a valid refreshToken string passes validation
     * and is correctly returned in the validated output.
     */
    test('ensure schema accepts a refreshToken', () => {
        const { error, value } = refreshSchema.validate({refreshToken: "abcd123".repeat(2)});
        expect(error).toBeUndefined();
        expect(JSON.stringify(value)).toEqual(JSON.stringify({refreshToken: "abcd123abcd123"}))
    });

    /**
     * Validates that the refreshToken field is required.
     * Omitting it should result in a validation error.
     */
    test('fails when refreshToken is missing', () => {
        const { error } = refreshSchema.validate({});
        expect(error).toBeDefined();
        expect(error.message).toContain('refreshToken');
    })
});


/**
 * Forgot Password Schema Validation Tests
 *
 * Validates the forgotPasswordSchema which requires a valid email address
 * for initiating a password reset flow.
 */
describe('Forgot Password Schema Validation - forgotPasswordSchema', () =>{

    /**
     * Validates that forgot password rejects malformed email addresses.
     * An email without a valid domain should fail validation.
     */
    test('fails for an invalid email address', () =>{
        const { error } = forgotPasswordSchema.validate({
            email: "testuser@example"
        });

        expect(error).toBeDefined();
        expect(error.message).toContain('email');
    });

    /**
     * Validates that the email field is required for password reset requests.
     * Omitting it should result in a validation error.
     */
    test('fails when email is missing', () => {
        const { error } = forgotPasswordSchema.validate({});
        expect(error).toBeDefined();
        expect(error.message).toContain('email');
    });
});


/**
 * Reset Password Schema Validation Tests
 *
 * Validates the changePasswordSchema which requires both a token and
 * a new password that meets minimum length requirements.
 */
describe('Change Password Schema Validation - changePasswordSchema', () => {

    const passwordResetData = {
        code: '066983',
        password: 'secretPassword123',
        email: 'test@test.com'
    }

    const requiredFields = ['code', 'password', 'email'];

    /**
     * Validates that both code and password are required fields.
     * Omitting either field should result in a validation error.
     */
    test('reset password requires a new password and a token', () =>{

        requiredFields.forEach(field => {
            const {[field]: removedField, ...inputWithoutField} = passwordResetData;
            const { error } = changePasswordSchema.validate({...inputWithoutField});
            expect(error).toBeDefined();
            expect(error.message).toContain(field);
        });
    });

    /**
     * Validates the minimum length constraint on newPassword (min: 8).
     * Passwords shorter than 8 characters should be rejected.
     */
    test('fails when new password is less than 8 characters', () => {
        const { error } = changePasswordSchema.validate({...passwordResetData, newPassword: "secre"});

        expect(error).toBeDefined();
        expect(error.message).toContain('newPassword');
    });
} )