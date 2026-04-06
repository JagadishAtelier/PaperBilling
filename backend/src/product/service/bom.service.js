import { sequelize } from '../../db/index.js';
import BOM from '../models/bom.model.js';
import Product from '../models/product.model.js';
import RawMaterial from '../../rawmaterial/models/rawmaterial.model.js';

const bomService = {
  // Get BOM for a product (all raw materials needed)
  async getBOMByProduct(productId) {
    const product = await Product.findByPk(productId);
    if (!product) throw new Error("Product not found");

    const items = await BOM.findAll({
      where: { product_id: productId, is_active: true },
      include: [
        {
          model: RawMaterial,
          as: "rawMaterial",
          attributes: ["id", "material_name", "material_code", "unit", "purchase_price", "category"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    return {
      product: {
        id: product.id,
        product_name: product.product_name,
        product_code: product.product_code,
      },
      items,
    };
  },

  // Save (replace) full BOM for a product in one transaction
  async saveBOM(productId, items, user) {
    return await sequelize.transaction(async (t) => {
      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) throw new Error("Product not found");

      // Validate all raw materials exist
      for (const item of items) {
        const material = await RawMaterial.findByPk(item.raw_material_id, { transaction: t });
        if (!material) throw new Error(`Raw material ${item.raw_material_id} not found`);
      }

      // Hard-delete existing BOM items so unique constraint is cleared
      await BOM.destroy({ where: { product_id: productId }, transaction: t });

      // Create fresh BOM items
      const bomItems = items.map(item => ({
        product_id: productId,
        raw_material_id: item.raw_material_id,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        notes: item.notes || null,
        is_active: true,
        created_by: user?.id,
        created_by_name: user?.username || user?.name,
        created_by_email: user?.email,
      }));

      await BOM.bulkCreate(bomItems, { transaction: t });

      // Return updated BOM
      return await BOM.findAll({
        where: { product_id: productId, is_active: true },
        include: [{ model: RawMaterial, as: "rawMaterial", attributes: ["id", "material_name", "material_code", "unit", "purchase_price"] }],
        transaction: t,
      });
    });
  },

  // Delete a single BOM item (hard delete to avoid unique constraint issues)
  async deleteBOMItem(bomId) {
    const item = await BOM.findByPk(bomId);
    if (!item) throw new Error("BOM item not found");
    return await item.destroy();
  },

  // Get all products that use a specific raw material
  async getProductsByRawMaterial(rawMaterialId) {
    return await BOM.findAll({
      where: { raw_material_id: rawMaterialId, is_active: true },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "product_name", "product_code", "status"],
        },
      ],
    });
  },
};

export default bomService;
