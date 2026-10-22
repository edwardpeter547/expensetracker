
import { describe, expect, test } from '@jest/globals';
import { bulkCreateSchema, createTransactionSchema, updateTransactionSchema } from '../transaction.validation.js';


/**
 * Create Transaction Schema Validation Tests
 *
 * Validates the createTransactionSchema which enforces constraints on
 * transaction creation requests. Required fields: amount, type, category.
 * Optional fields: description, date, receiptUrl, location.
 *
 * @module transaction.validation.test
 */
describe('Create Transaction Schema Test Suite - createTransactionSchema', () => {

    const transactionData = {
        amount: 500.00,
        type: 'INCOME',
        category: 'Salary',
        description: `My salary for the month of ${new Date().toISOString().split('T')}`,
        date: new Date().toISOString(),
        recieptUrl: 'http://localhost:800/api/reports/reciept.jpg',
        location: 'United Kingdom'
    }

    const requiredFields = ['amount', 'type', 'category'];
    const optionalFields = ['description', 'date', 'recieptUrl', 'location'];

    /**
     * Validates that validation fails when any required field (amount, type, category)
     * is omitted from the transaction payload.
     */
    test('fails when any required field is missing', () => {
        requiredFields.forEach(field => {
            const {[field]: removedField, ...inputWithoutField } = transactionData;
            const { error } = createTransactionSchema.validate({...inputWithoutField});
            expect(error).toBeDefined();
            expect(error.message).toContain(field);
        });
    });

    /**
     * Validates that the amount field rejects non-numeric values.
     * Amount must be a valid number.
     */
    test('fails when transaction amount is not a number', () => {
        const { error } = createTransactionSchema.validate({
            ...transactionData,
            amount: '500.00A'
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('amount');
    });

    /**
     * Validates that the amount field rejects negative values.
     * Transaction amounts must be positive.
     */
    test('fails when transaction amount is negative', () => {
        const { error } = createTransactionSchema.validate({
            ...transactionData,
            amount: '-500.00'
        });

        expect(error).toBeDefined();
        expect(error.message).toContain('amount');
    });

    /**
     * Validates that validation succeeds when any optional field
     * (description, date, receiptUrl, location) is omitted from the payload.
     */
    test('passes even if any optional field is missing', () => {
        optionalFields.forEach(field => {
            const {[field]: removedField, ...inputWithoutField } = transactionData;
            const { error, value } = createTransactionSchema.validate({...inputWithoutField});
            expect(error).toBeUndefined();
            expect(value).toBeDefined();
            expect(JSON.stringify(value)).not.toContain(JSON.stringify(field));
        })
    })

    /**
     * Validates that the type field rejects invalid transaction types.
     * Only uppercase INCOME and EXPENSE are accepted.
     */
    test('fails for invalid transaction type', () => {
        const invalidTransactionType = ['Income', 'Expense', 'income', 'expense'];
        invalidTransactionType.forEach(transType => {
            const { error } = createTransactionSchema.validate({
                ...transactionData,
                type: transType
            });

            expect(error).toBeDefined();
            expect(error.message).toContain('type');
        });
    });

    /**
     * Validates that the type field accepts valid transaction types.
     * Only uppercase INCOME and EXPENSE are valid.
     */
    test('validates for valid transaction type [INCOME, EXPENSE]', () => {
        const validTransactionTypes = ['INCOME', 'EXPENSE'];
        validTransactionTypes.forEach(transType => {
            const { error, value } = createTransactionSchema.validate({
                ...transactionData,
                type: transType
            });

            expect(error).toBeUndefined();
            expect(JSON.stringify(value)).toEqual(JSON.stringify({...transactionData, type: transType}));
        });
    });

    /**
     * Validates that the date field rejects invalid date formats.
     * Date must be a valid ISO date string.
     */
    test('fails invalid transaction date format', () => {
        const invalidDates = ['26/15/2026'];
        invalidDates.forEach(date => {
            const { error } = createTransactionSchema.validate({
                ...transactionData,
                date: date
            });
            expect(error).toBeDefined();
            expect(error.message).toContain('date');
        });
    });

    /**
     * Validates that the description field has a maximum length of 500 characters.
     * Descriptions exceeding this limit should be rejected.
     */
    test('fails when description is more than 500 characters', () => {
        const { error } = createTransactionSchema.validate({
            ...transactionData,
            description: 'This is some random text'.repeat(30)
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('description');
    })

    /**
     * Validates that the receiptUrl field must be a valid URI.
     * Invalid URLs should be rejected.
     */
    test('fails if reciept url is not a valid uri', () => {
        const { error } = createTransactionSchema.validate({
            ...transactionData,
            recieptUrl: 'welcome'
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('recieptUrl');
    })


});


/**
 * Update Transaction Schema Validation Tests
 *
 * Validates the updateTransactionSchema which enforces constraints on
 * transaction update requests. Same field constraints as createTransactionSchema
 * but all fields are optional for partial updates.
 *
 * @module transaction.validation.test
 */
describe('Update Transaction Schema Test Suite - updateTransactionSchema', () => {

    const transactionData = {
        amount: 500.00,
        type: 'INCOME',
        category: 'Salary',
        description: `My salary for the month of ${new Date().toISOString().split('T')}`,
        date: new Date().toISOString(),
        recieptUrl: 'http://localhost:800/api/reports/reciept.jpg',
        location: 'United Kingdom'
    }

    const requiredFields = ['amount', 'type', 'category'];
    const optionalFields = ['description', 'date', 'recieptUrl', 'location'];


    /**
     * Validates that the amount field rejects non-numeric values during update.
     * Amount must be a valid number.
     */
    test('update transaction fails when transaction amount is not a number', () => {
        const { error } = updateTransactionSchema.validate({
            ...transactionData,
            amount: '500.00A'
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('amount');
    });

    /**
     * Validates that the amount field rejects negative values during update.
     * Transaction amounts must be positive.
     */
    test('update transaction fails when transaction amount is negative', () => {
        const { error } = updateTransactionSchema.validate({
            ...transactionData,
            amount: '-500.00'
        });

        expect(error).toBeDefined();
        expect(error.message).toContain('amount');
    });

    /**
     * Validates that validation succeeds when any optional field
     * (description, date, receiptUrl, location) is omitted during update.
     */
    test('update transaction validates even if any optional field is missing', () => {
        optionalFields.forEach(field => {
            const {[field]: removedField, ...inputWithoutField } = transactionData;
            const { error, value } = updateTransactionSchema.validate({...inputWithoutField});
            expect(error).toBeUndefined();
            expect(value).toBeDefined();
            expect(JSON.stringify(value)).not.toContain(JSON.stringify(field));
        })
    })

    /**
     * Validates that the type field rejects invalid transaction types during update.
     * Only uppercase INCOME and EXPENSE are accepted.
     */
    test('update transaction fails for invalid transaction type', () => {
        const invalidTransactionType = ['Income', 'Expense', 'income', 'expense'];
        invalidTransactionType.forEach(transType => {
            const { error } = updateTransactionSchema.validate({
                ...transactionData,
                type: transType
            });

            expect(error).toBeDefined();
            expect(error.message).toContain('type');
        });
    });

    /**
     * Validates that the type field accepts valid transaction types during update.
     * Only uppercase INCOME and EXPENSE are valid.
     */
    test('update transaction validates for valid transaction type [INCOME, EXPENSE]', () => {
        const validTransactionTypes = ['INCOME', 'EXPENSE'];
        validTransactionTypes.forEach(transType => {
            const { error, value } = updateTransactionSchema.validate({
                ...transactionData,
                type: transType
            });

            expect(error).toBeUndefined();
            expect(JSON.stringify(value)).toEqual(JSON.stringify({...transactionData, type: transType}));
        });
    });

    /**
     * Validates that the date field rejects invalid date formats during update.
     * Date must be a valid ISO date string.
     */
    test('update transaction fails invalid transaction date format', () => {
        const invalidDates = ['26/15/2026'];
        invalidDates.forEach(date => {
            const { error } = updateTransactionSchema.validate({
                ...transactionData,
                date: date
            });
            expect(error).toBeDefined();
            expect(error.message).toContain('date');
        });
    });

    /**
     * Validates that the description field has a maximum length of 500 characters during update.
     * Descriptions exceeding this limit should be rejected.
     */
    test('update transaction fails when description is more than 500 characters', () => {
        const { error } = updateTransactionSchema.validate({
            ...transactionData,
            description: 'This is some random text'.repeat(30)
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('description');
    })

    /**
     * Validates that the receiptUrl field must be a valid URI during update.
     * Invalid URLs should be rejected.
     */
    test('update transaction fails if reciept url is not a valid uri', () => {
        const { error } = updateTransactionSchema.validate({
            ...transactionData,
            recieptUrl: 'welcome'
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('recieptUrl');
    })


});


/**
 * Bulk Create Schema Validation Tests
 *
 * Validates the bulkCreateSchema which accepts an array of transactions.
 * The array must contain between 1 and 100 transactions, each conforming
 * to the createTransactionSchema.
 *
 * @module transaction.validation.test
 */
describe('Bulk Create Schema Validation - bulkCreateSchema', () => {
    const validTransaction = {
        amount: 500.00,
        type: 'INCOME',
        category: 'Salary',
        description: `My salary for the month of ${new Date().toISOString().split('T')}`,
        date: new Date().toISOString(),
        recieptUrl: 'http://localhost:800/api/reports/reciept.jpg',
        location: 'United Kingdom'
    }

    /**
     * Validates that a single valid transaction passes validation.
     */
    test('accepts a single valid transaction', () => {
        const { error } = bulkCreateSchema.validate({
            transactions: [validTransaction]
        });
        expect(error).toBeUndefined();
    })

    /**
     * Validates that multiple valid transactions pass validation.
     */
    test('accepts multiple valid transactions', () => {
        const { error } = bulkCreateSchema.validate({
            transactions: [validTransaction, validTransaction, validTransaction]
        });
        expect(error).toBeUndefined();
    });

    /**
     * Validates that the maximum of 100 transactions is accepted.
     */
    test('accepts upto 100 transactions', () => {
        const transactions = Array(100).fill(validTransaction);
        const { error } = bulkCreateSchema.validate({transactions});
        expect(error).toBeUndefined();
    })

    /**
     * Validates that the transactions field is required.
     */
    test('fails when transaction field is missing', () => {
        const { error } = bulkCreateSchema.validate({});
        expect(error).toBeDefined();
        expect(error.message).toContain('transactions');
    });

    /**
     * Validates that at least 1 transaction is required.
    */
    test('fails when transactions array is empty', () => {
        const { error } = bulkCreateSchema.validate({ transactions: [] });
        expect(error).toBeDefined();
        expect(error.message).toContain('transactions');
    });

    /**
     * Validates that the max limit of 100 transactions is enforced.
    */
    test('fails when exceeding 100 transactions', () => {
        const transactions = Array(101).fill(validTransaction);
        const { error } = bulkCreateSchema.validate({ transactions });
        expect(error).toBeDefined();
        expect(error.message).toContain('transactions');
    });

    /**
     * Validates that invalid transactions within the array are rejected.
    */
    test('fails when any transaction in the array is invalid', () => {
        const { error } = bulkCreateSchema.validate({
            transactions: [
                validTransaction,
                { amount: 'not-a-number' },
            ]
        });
        expect(error).toBeDefined();
    });

})