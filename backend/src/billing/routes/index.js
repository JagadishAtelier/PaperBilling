import express from 'express';
import billingRoutes from './billing.routes.js';
import customerRoutes from './customer.routes.js';
import couponRoutes from './coupon.routes.js';
import reportRoutes from './report.routes.js';
import shipmentRoutes from './shipment.routes.js';

const router = express.Router();

router.use('/billing', billingRoutes);
router.use('/billing', customerRoutes);
router.use('/billing', couponRoutes);
router.use('/billing/reports', reportRoutes);
router.use('/shipment', shipmentRoutes);

export default router;  