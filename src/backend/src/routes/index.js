import express from 'express';
import Config from '../configurations/env.config.js';
import authRoutes from './v1/auth.routes.js';
import budgetRoutes from './v1/budget.routes.js';
import categoryRoutes from './v1/category.routes.js';
import notificationRoutes from './v1/notification.routes.js';
import recurringRoutes from './v1/recurring.routes.js';
import transactionRoutes from './v1/transaction.routes.js';
import userRoutes from './v1/user.routes.js';


const router = express.Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/categories', categoryRoutes);
router.use('/budgets', budgetRoutes);
router.use('/recurring', recurringRoutes);
router.use('/notifications', notificationRoutes);
router.use('/user', userRoutes);

// Api Health check endpoint
router.get('/health', (request, response) => {
    response.status(200).json({
        status: 'OK',
        timestamp: new Date(),
        environment: Config.nodeEnv,
        info: request.__('HEALTH_MSG'),
    });
});

export default router;