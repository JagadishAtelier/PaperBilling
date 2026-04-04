import bomService from "../service/bom.service.js";
import { saveBOMSchema } from "../dto/bom.dto.js";

const bomController = {
  // GET /product/:productId/bom
  async getByProduct(req, res) {
    try {
      const result = await bomService.getBOMByProduct(req.params.productId);
      return res.json(result);
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  },

  // POST /product/:productId/bom  — replaces entire BOM
  async save(req, res) {
    try {
      const validated = saveBOMSchema.parse(req.body);
      const items = await bomService.saveBOM(req.params.productId, validated.items, req.user);
      return res.json({ message: "BOM saved successfully", data: items });
    } catch (err) {
      return res.status(400).json({ error: err.errors || err.message });
    }
  },

  // DELETE /product/bom/:bomId  — remove single item
  async deleteItem(req, res) {
    try {
      await bomService.deleteBOMItem(req.params.bomId, req.user);
      return res.json({ message: "BOM item removed" });
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  },

  // GET /rawmaterial/:rawMaterialId/products  — which products use this material
  async getProductsByMaterial(req, res) {
    try {
      const result = await bomService.getProductsByRawMaterial(req.params.rawMaterialId);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};

export default bomController;
