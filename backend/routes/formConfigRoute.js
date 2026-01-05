import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { isSuperAdmin } from "../middleware/superAdminMiddleware.js";
import {
    getFormConfig,
    getFullFormConfig,
    updateField,
    deleteField,
    restoreField,
    getChangeHistory,
} from "../controllers/formConfigController.js";

const router = express.Router();

// Public route - Get form config (for Add Vendor page)
// Returns only visible fields
router.get("/:pageId", getFormConfig);

// Admin routes - require authentication + super admin
router.get("/:pageId/full", protect, isSuperAdmin, getFullFormConfig);
router.get("/:pageId/history", protect, isSuperAdmin, getChangeHistory);
router.put("/:pageId/field/:fieldId", protect, isSuperAdmin, updateField);
router.delete("/:pageId/field/:fieldId", protect, isSuperAdmin, deleteField);
router.post("/:pageId/field/:fieldId/restore", protect, isSuperAdmin, restoreField);

export default router;

