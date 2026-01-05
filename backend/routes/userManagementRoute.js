import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { isSuperAdmin } from '../middleware/superAdminMiddleware.js';
import {
  getAllCustomers,
  getCustomerById,
  updateCustomerSubscription,
  updateCustomer,
  deleteCustomer,
  getAllTransporters,
  getPlatformStats,
} from '../controllers/userManagementController.js';

const router = express.Router();

// All routes require authentication and super admin privileges
router.use(protect);
router.use(isSuperAdmin);

// Platform statistics
router.get('/stats', getPlatformStats);

// Customer management routes
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerById);
router.put('/customers/:id/subscription', updateCustomerSubscription);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Transporter management routes
router.get('/transporters', getAllTransporters);

export default router;
