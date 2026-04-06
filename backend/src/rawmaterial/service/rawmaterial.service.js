import { Op } from "sequelize";
import { sequelize } from "../../db/index.js";import RawMaterial from "../models/rawmaterial.model.js";
import RawMaterialInward from "../models/rawmaterialinward.model.js";
import RawMaterialInwardItem from "../models/rawmaterialinwarditem.model.js";
import RawMaterialStock from "../models/rawmaterialstock.model.js";
import Branch from "../../user/models/branch.model.js";
import "../models/index.js";

const rawMaterialService = {
  // ─── Raw Material CRUD ───────────────────────────────────────────────────────

  async createRawMaterial(data) {
    return await RawMaterial.create(data);
  },

  async getAllRawMaterials({ filters = {}, limit = 10, offset = 0 } = {}) {
    const where = { is_active: true };
    if (filters.search) {
      where[Op.or] = [
        { material_name: { [Op.like]: `%${filters.search}%` } },
        { material_code: { [Op.like]: `%${filters.search}%` } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = { [Op.like]: `%${filters.category}%` };

    const { count, rows } = await RawMaterial.findAndCountAll({
      where, limit, offset, order: [["createdAt", "DESC"]],
    });
    return { total: count, page: Math.floor(offset / limit) + 1, limit, data: rows };
  },

  async getRawMaterialById(id) {
    return await RawMaterial.findByPk(id);
  },

  async updateRawMaterial(id, data) {
    const material = await RawMaterial.findByPk(id);
    if (!material) return null;
    return await material.update(data);
  },

  async deleteRawMaterial(id, user) {
    const material = await RawMaterial.findByPk(id);
    if (!material) return null;
    return await material.update({
      is_active: false,
      deleted_by: user?.id,
      deleted_by_name: user?.username || user?.name,
      deleted_by_email: user?.email,
    });
  },

  async bulkUploadRawMaterials(materialsArray, userInfo) {
    const results = [];

    // Get last material code once to avoid race conditions
    const lastMaterial = await RawMaterial.findOne({
      where: { material_code: { [Op.like]: 'RM%' } },
      order: [["material_code", "DESC"]],
    });
    let lastNumber = 0;
    if (lastMaterial?.material_code) {
      const match = lastMaterial.material_code.match(/RM(\d+)/);
      if (match) lastNumber = parseInt(match[1]);
    }

    for (const row of materialsArray) {
      try {
        if (!row.material_name?.trim()) throw new Error("Material name is required");

        // Skip duplicates by name (case-insensitive)
        const existing = await RawMaterial.findOne({
          where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('material_name')),
            row.material_name.trim().toLowerCase()
          ),
        });
        if (existing) {
          results.push({ success: false, skipped: true, material_name: row.material_name, error: `Already exists: "${existing.material_name}"` });
          continue;
        }

        lastNumber++;
        const material_code = row.material_code?.trim() || `RM${String(lastNumber).padStart(5, '0')}`;

        const material = await RawMaterial.create({
          material_name: row.material_name.trim(),
          material_code,
          category: row.category?.trim() || null,
          unit: row.unit?.trim() || 'kg',
          purchase_price: parseFloat(row.purchase_price) || 0,
          min_stock: parseFloat(row.min_stock) || 0,
          description: row.description?.trim() || null,
          supplier_name: row.supplier_name?.trim() || null,
          status: row.status || 'active',
          is_active: true,
          created_by: userInfo?.id,
          created_by_name: userInfo?.username,
          created_by_email: userInfo?.email,
        });

        results.push({ success: true, material });
      } catch (err) {
        let errorMessage = err.message;
        if (err.name === 'SequelizeUniqueConstraintError') {
          errorMessage = `Duplicate code: ${err.errors.map(e => e.path).join(', ')}`;
        }
        results.push({ success: false, material_name: row.material_name, error: errorMessage });
      }
    }

    return results;
  },

  // ─── Inward CRUD ─────────────────────────────────────────────────────────────

  async createInwardWithItems(data) {
    return await sequelize.transaction(async (t) => {
      if (!data.branch_id) throw new Error("Branch ID is required");

      const lastInward = await RawMaterialInward.findOne({
        order: [["createdAt", "DESC"]], transaction: t,
      });
      const lastNo = lastInward ? parseInt(lastInward.inward_no.split("-")[1]) : 1000;
      const inwardNo = `RMI-${lastNo + 1}`;

      let totalAmount = 0;
      let totalQuantity = 0;
      const itemsToCreate = [];

      if (!data.items || data.items.length === 0) throw new Error("At least one item is required");

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const material = await RawMaterial.findByPk(item.raw_material_id, { transaction: t });
        if (!material) throw new Error(`Raw material with ID ${item.raw_material_id} does not exist`);

        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        // Use provided total_price if > 0, otherwise calculate
        const totalPrice = (item.total_price != null && parseFloat(item.total_price) > 0)
          ? parseFloat(item.total_price)
          : quantity * unitPrice;

        totalAmount += totalPrice;
        totalQuantity += quantity;

        itemsToCreate.push({
          raw_material_id: item.raw_material_id,
          quantity,
          unit: item.unit || material.unit || "kg",
          unit_price: unitPrice,
          total_price: totalPrice,
          batch_number: item.batch_number || `BATCH-${String(i + 1).padStart(3, "0")}`,
          expiry_date: item.expiry_date || null,
          notes: item.notes || null,
        });

        // ✅ Update stock: add quantity to existing or create new stock record
        const stock = await RawMaterialStock.findOne({
          where: { raw_material_id: item.raw_material_id, branch_id: data.branch_id },
          transaction: t,
        });
        if (stock) {
          stock.quantity = parseFloat(stock.quantity) + quantity;
          stock.unit = item.unit || material.unit || stock.unit;
          await stock.save({ transaction: t });
          console.log(`Stock updated for material ${material.material_name}: +${quantity} → total ${stock.quantity}`);
        } else {
          await RawMaterialStock.create({
            branch_id: data.branch_id,
            raw_material_id: material.id,
            unit: item.unit || material.unit || "kg",
            quantity,
          }, { transaction: t });
          console.log(`Stock created for material ${material.material_name}: ${quantity}`);
        }
      }

      const inward = await RawMaterialInward.create({
        branch_id: data.branch_id,
        inward_no: inwardNo,
        supplier_name: data.supplier_name,
        supplier_invoice: data.supplier_invoice || null,
        received_date: data.received_date || new Date(),
        status: data.status || "pending",
        notes: data.notes || null,
        total_amount: totalAmount,
        total_quantity: totalQuantity,
        created_by: data.created_by,
        created_by_name: data.created_by_name,
        created_by_email: data.created_by_email,
      }, { transaction: t });

      await RawMaterialInwardItem.bulkCreate(
        itemsToCreate.map(item => ({ ...item, inward_id: inward.id })),
        { transaction: t }
      );

      return await RawMaterialInward.findByPk(inward.id, {
        include: [{ model: RawMaterialInwardItem, as: "items", include: [{ model: RawMaterial, as: "rawMaterial" }] }],
        transaction: t,
      });
    });
  },

  async getAllInwards({ filters = {}, limit = 10, offset = 0 } = {}) {
    const where = { is_active: true };
    if (filters.branch_id) where.branch_id = filters.branch_id;
    else if (filters.branch_ids?.length) where.branch_id = { [Op.in]: filters.branch_ids };
    if (filters.search) {
      where[Op.or] = [
        { inward_no: { [Op.like]: `%${filters.search}%` } },
        { supplier_name: { [Op.like]: `%${filters.search}%` } },
      ];
    }
    if (filters.status) where.status = filters.status;

    const { count, rows } = await RawMaterialInward.findAndCountAll({
      where, distinct: true, limit, offset, order: [["createdAt", "DESC"]],
      include: [
        {
          model: RawMaterialInwardItem, as: "items",
          include: [{ model: RawMaterial, as: "rawMaterial", attributes: ["id", "material_name", "material_code", "unit"] }],
        },
        { model: Branch, as: "branch", attributes: ["id", "branch_name", "branch_code"] },
      ],
    });
    return { total: count, page: Math.floor(offset / limit) + 1, limit, data: rows };
  },

  async getInwardById(id) {
    return await RawMaterialInward.findByPk(id, {
      include: [
        {
          model: RawMaterialInwardItem, as: "items",
          include: [{ model: RawMaterial, as: "rawMaterial" }],
        },
        { model: Branch, as: "branch", attributes: ["id", "branch_name", "branch_code"] },
      ],
    });
  },

  // ─── Stock ───────────────────────────────────────────────────────────────────

  async getStock({ filters = {}, limit = 10, offset = 0 } = {}) {
    const where = {};
    if (filters.branch_id) where.branch_id = filters.branch_id;
    else if (filters.branch_ids?.length) where.branch_id = { [Op.in]: filters.branch_ids };

    const materialWhere = { is_active: true };
    if (filters.search) {
      materialWhere[Op.or] = [
        { material_name: { [Op.like]: `%${filters.search}%` } },
        { material_code: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await RawMaterialStock.findAndCountAll({
      where,
      distinct: true,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: RawMaterial,
          as: "rawMaterial",
          where: materialWhere,
          attributes: ["id", "material_name", "material_code", "unit", "min_stock", "category"],
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "branch_name", "branch_code"],
        },
      ],
    });
    return { total: count, page: Math.floor(offset / limit) + 1, limit, data: rows };
  },

  async deleteInward(id, user) {    return await sequelize.transaction(async (t) => {
      const inward = await RawMaterialInward.findByPk(id, {
        include: [{ model: RawMaterialInwardItem, as: "items" }],
        transaction: t,
      });
      if (!inward) return null;

      // ✅ Reverse stock for each item before soft-deleting
      for (const item of inward.items) {
        const stock = await RawMaterialStock.findOne({
          where: { raw_material_id: item.raw_material_id, branch_id: inward.branch_id },
          transaction: t,
        });
        if (stock) {
          const newQty = parseFloat(stock.quantity) - parseFloat(item.quantity);
          stock.quantity = newQty < 0 ? 0 : newQty;
          await stock.save({ transaction: t });
          console.log(`Stock reversed for material ${item.raw_material_id}: -${item.quantity} → total ${stock.quantity}`);
        }
      }

      return await inward.update({
        is_active: false,
        deleted_by: user?.id,
        deleted_by_name: user?.username || user?.name,
        deleted_by_email: user?.email,
      }, { transaction: t });
    });
  },
};

export default rawMaterialService;
