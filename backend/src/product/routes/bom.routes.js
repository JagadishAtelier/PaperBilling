import express from "express";
import bomController from "../controller/bom.controller.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

// BOM for a product
router.get("/product/:productId/bom", verifyToken, bomController.getByProduct);
router.post("/product/:productId/bom", verifyToken, bomController.save);
router.delete("/bom/:bomId", verifyToken, bomController.deleteItem);

// Which products use a raw material
router.get("/rawmaterial/:rawMaterialId/products", verifyToken, bomController.getProductsByMaterial);

export default router;
