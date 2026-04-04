import express from 'express';
import shipmentController from '../controller/shipment.controller.js';
import { verifyToken as authenticate } from '../../middleware/auth.js'; 

const router = express.Router();

// All shipment routes require authentication
router.use(authenticate);

// List all shipments
router.get('/', shipmentController.getAll);

// Get shipment by billing ID
router.get('/:billingId', shipmentController.getByBillingId);

// Create or update shipment
router.post('/:billingId', shipmentController.upsert);

// Update status only
router.patch('/:billingId/status', shipmentController.updateStatus);

export default router;
