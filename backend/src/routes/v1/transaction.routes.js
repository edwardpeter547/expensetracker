import express from 'express';
import {
    createTransaction,
    deleteTransaction,
    getTransaction,
    getTransactions,
    updateTransaction
} from '../../controllers/transaction.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate, validateParams } from '../../middleware/validation.middleware.js';
import { createTransactionSchema, transactionIdSchema, updateTransactionSchema } from '../../validations/transaction.validation.js';


const transactionRoutes = express.Router()

transactionRoutes.use(authenticate);

transactionRoutes.get('/', getTransactions);
transactionRoutes.get('/:id', validateParams(transactionIdSchema), getTransaction);
transactionRoutes.post('/', validate(createTransactionSchema), createTransaction);
transactionRoutes.delete('/:id', validateParams(transactionIdSchema), deleteTransaction);
transactionRoutes.put('/:id', validate(updateTransactionSchema), updateTransaction);


export default transactionRoutes;