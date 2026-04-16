import express from 'express';
import customerController from '../controller/customer.controller.js';
import { verifyToken } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Customer CRUD
router.post('/customers', customerController.createCustomer);
router.get('/customers', customerController.getAllCustomers);
router.get('/customers/:id', customerController.getCustomerById);
router.get('/customers/phone/:phone', customerController.getCustomerByPhone);
router.put('/customers/:id', customerController.updateCustomer);
router.delete('/customers/:id', customerController.deleteCustomer);

// Customer history and analytics
router.get('/customers/:id/history', customerController.getCustomerHistory);
router.get('/customers/:id/analytics', customerController.getCustomerAnalytics);

// Email Verification
router.post('/customers/send-otp', customerController.sendVerificationOTP);
router.post('/customers/verify-otp', customerController.verifyOTP);

export default router;
