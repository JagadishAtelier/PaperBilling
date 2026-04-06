import express from "express";
import rawMaterialRoutes from "./rawmaterial.routes.js";

const router = express.Router();

router.use("/rawmaterial", rawMaterialRoutes);

export default router;
