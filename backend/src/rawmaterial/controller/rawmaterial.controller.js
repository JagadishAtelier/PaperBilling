import rawMaterialService from "../service/rawmaterial.service.js";

const rawMaterialController = {
  // ─── Raw Material CRUD ───────────────────────────────────────────────────────

  async create(req, res) {
    try {
      const data = { ...req.body };
      if (req.user) {
        data.created_by = req.user.id;
        data.created_by_name = req.user.username || req.user.name;
        data.created_by_email = req.user.email;
      }
      const material = await rawMaterialService.createRawMaterial(data);
      return res.status(201).json({ message: "Raw material created successfully", data: material });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  async getAll(req, res) {
    try {
      let { page = 1, limit = 10, ...filters } = req.query;
      page = parseInt(page, 10);
      limit = parseInt(limit, 10);
      const offset = (page - 1) * limit;
      const result = await rawMaterialService.getAllRawMaterials({ filters, limit, offset });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getById(req, res) {
    try {
      const material = await rawMaterialService.getRawMaterialById(req.params.id);
      if (!material) return res.status(404).json({ error: "Raw material not found" });
      return res.json(material);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const data = { ...req.body };
      if (req.user) {
        data.updated_by = req.user.id;
        data.updated_by_name = req.user.username || req.user.name;
        data.updated_by_email = req.user.email;
      }
      const material = await rawMaterialService.updateRawMaterial(req.params.id, data);
      if (!material) return res.status(404).json({ error: "Raw material not found" });
      return res.json({ message: "Raw material updated successfully", data: material });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  async delete(req, res) {
    try {
      const result = await rawMaterialService.deleteRawMaterial(req.params.id, req.user || {});
      if (!result) return res.status(404).json({ error: "Raw material not found" });
      return res.json({ message: "Raw material deleted successfully" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Inward ──────────────────────────────────────────────────────────────────

  async createInward(req, res) {
    try {
      const data = { ...req.body };
      const branchId = req.branchContext?.branchId || req.body.branch_id;
      if (!branchId) return res.status(400).json({ error: "Branch ID is required" });
      data.branch_id = branchId;
      if (req.user) {
        data.created_by = req.user.id;
        data.created_by_name = req.user.username || req.user.name;
        data.created_by_email = req.user.email;
      }
      const inward = await rawMaterialService.createInwardWithItems(data);
      return res.status(201).json({ message: "Raw material inward created successfully", data: inward });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  async getAllInwards(req, res) {
    try {
      let { page = 1, limit = 10, ...filters } = req.query;
      if (req.branchContext) {
        if (req.branchContext.multipleBranches) {
          if (filters.branch_id) {
            const hasAccess = req.branchContext.branches.some(b => b.branchId === filters.branch_id);
            if (!hasAccess) return res.status(403).json({ error: "You don't have access to this branch" });
          } else {
            filters.branch_ids = req.branchContext.branches.map(b => b.branchId);
          }
        } else if (req.branchContext.branchId) {
          filters.branch_id = req.branchContext.branchId;
        }
      }
      page = parseInt(page, 10);
      limit = parseInt(limit, 10);
      const offset = (page - 1) * limit;
      const result = await rawMaterialService.getAllInwards({ filters, limit, offset });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  async getInwardById(req, res) {
    try {
      const inward = await rawMaterialService.getInwardById(req.params.id);
      if (!inward) return res.status(404).json({ error: "Inward not found" });
      return res.json(inward);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  async deleteInward(req, res) {
    try {
      const result = await rawMaterialService.deleteInward(req.params.id, req.user || {});
      if (!result) return res.status(404).json({ error: "Inward not found" });
      return res.json({ message: "Inward deleted successfully" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // ─── Stock ───────────────────────────────────────────────────────────────────

  async getStock(req, res) {
    try {
      let { page = 1, limit = 10, ...filters } = req.query;
      if (req.branchContext) {
        if (req.branchContext.multipleBranches) {
          if (filters.branch_id) {
            const hasAccess = req.branchContext.branches.some(b => b.branchId === filters.branch_id);
            if (!hasAccess) return res.status(403).json({ error: "You don't have access to this branch" });
          } else {
            filters.branch_ids = req.branchContext.branches.map(b => b.branchId);
          }
        } else if (req.branchContext.branchId) {
          filters.branch_id = req.branchContext.branchId;
        }
      }
      page = parseInt(page, 10);
      limit = parseInt(limit, 10);
      const offset = (page - 1) * limit;
      const result = await rawMaterialService.getStock({ filters, limit, offset });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};

export default rawMaterialController;
