import express from "express";
import rawMaterialController from "../controller/rawmaterial.controller.js";
import { verifyToken } from "../../middleware/auth.js";
import { authenticateBranch, authenticateBranchRole } from "../../middleware/authenticateBranch.js";

const router = express.Router();

// Raw Material Stock
router.get("/stock/list", verifyToken, authenticateBranch(true), rawMaterialController.getStock);

// Raw Material Inwards (must be before /:id to avoid route conflicts)
router.post("/inward/create", verifyToken, authenticateBranch(), rawMaterialController.createInward);
router.get("/inward/list", verifyToken, authenticateBranch(true), rawMaterialController.getAllInwards);
router.get("/inward/:id", verifyToken, authenticateBranch(), rawMaterialController.getInwardById);
router.delete("/inward/:id", verifyToken, authenticateBranch(), authenticateBranchRole(['admin']), rawMaterialController.deleteInward);

// Raw Materials CRUD
router.post("/bulk-upload", verifyToken, rawMaterialController.bulkUpload);
router.post("/", verifyToken, rawMaterialController.create);
router.get("/", verifyToken, rawMaterialController.getAll);
router.get("/:id", verifyToken, rawMaterialController.getById);
router.put("/:id", verifyToken, rawMaterialController.update);
router.delete("/:id", verifyToken, rawMaterialController.delete);

export default router;
