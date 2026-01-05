// routes/transporterRoutes.js
import express from 'express';
import multer from "multer";

import {
  addTiedUpCompany,
  calculatePrice,
  getAllTransporters,
  getPackingList,
  getTiedUpCompanies,
  getTemporaryTransporters,
  updateTemporaryTransporterStatus,
  updateTemporaryTransporter,
  getTransporters,
  getTrasnporterDetails,
  savePckingList,
  deletePackingList,
  removeTiedUpVendor,
  updateVendor,
  getZoneMatrix,
  updateZoneMatrix,
  deleteZoneMatrix,
  saveWizardData,
  getWizardData,
  searchTransporters  // NEW: Quick Lookup search
} from '../controllers/transportController.js';

import {
  addPrice,
  addTransporter,
  downloadTransporterTemplate,
  transporterLogin
} from '../controllers/transporterAuth.js';

import { protect } from '../middleware/authMiddleware.js';
import { uploadLimiter, apiLimiter, authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,      // 10MB for file uploads
    fieldSize: 10 * 1024 * 1024,     // 10MB for JSON fields (serviceability array)
    fields: 100                       // Allow many form fields
  }
});

// Auth / admin endpoints
router.post("/auth/addtransporter", uploadLimiter, upload.single('sheet'), addTransporter);
router.get("/auth/downloadtemplate", downloadTransporterTemplate);
router.post("/auth/addprice", apiLimiter, addPrice);
router.post("/auth/signin", authLimiter, transporterLogin);

// Calculator & add vendor
router.post('/calculate', protect, calculatePrice);
router.get('/search-transporters', protect, searchTransporters);  // NEW: Quick Lookup search
router.post("/addtiedupcompanies", protect, upload.single('priceChart'), addTiedUpCompany);
router.post("/add-tied-up", protect, addTiedUpCompany);

// Tied-up & temporary vendors
router.get("/gettiedupcompanies", protect, getTiedUpCompanies);

// DELETE endpoints: support both param-style and legacy body/query style
// New frontend calls DELETE /api/transporter/delete-vendor/:id
router.delete('/delete-vendor/:id', protect, removeTiedUpVendor);
// Older callers may call /remove-tied-up with id in body or query
router.delete("/remove-tied-up", protect, removeTiedUpVendor);

// Temporary transporters aliases (keeps backward compatibility)
router.get('/temporary', protect, (req, res, next) => {
  req.query.customerID = req.query.customerID || req.query.customerId || req.query.customerid;
  return getTemporaryTransporters(req, res, next);
});
router.get("/gettemporarytransporters", protect, getTemporaryTransporters);
router.put("/temporary/:id", protect, updateTemporaryTransporter);
router.put("/temporary/:id/status", protect, updateTemporaryTransporterStatus);

// Transporter listings & details
router.get("/gettransporter", getTransporters);
router.get("/getalltransporter", getAllTransporters);
router.get("/gettransporterdetails/:id", getTrasnporterDetails);

// Packing list endpoints
router.post("/savepackinglist", protect, savePckingList);
router.get("/getpackinglist", protect, getPackingList);
router.delete('/deletepackinglist/:id', protect, deletePackingList);

// Vendor update
router.put('/update-vendor/:id', protect, updateVendor);

// Zone Matrix CRUD endpoints
router.get('/zone-matrix/:vendorId', protect, getZoneMatrix);
router.put('/zone-matrix/:vendorId', protect, updateZoneMatrix);
router.delete('/zone-matrix/:vendorId', protect, deleteZoneMatrix);

// Wizard Data Sync endpoints
router.post('/wizard-data', protect, saveWizardData);
router.get('/wizard-data', protect, getWizardData);

export default router;
