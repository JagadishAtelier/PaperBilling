import api from "../../api/api.js";

const getBranchId = () => {
  const branchId = localStorage.getItem("selectedBranchId");
  return branchId === "all" ? null : branchId;
};

const rawMaterialService = {
  // ─── Raw Materials ───────────────────────────────────────────────────────────

  async getAll(params = {}) {
    const res = await api.get("/rawmaterial", { params });
    return res.data;
  },

  async getById(id) {
    const res = await api.get(`/rawmaterial/${id}`);
    return res.data;
  },

  async create(data) {
    const res = await api.post("/rawmaterial", data);
    return res.data;
  },

  async update(id, data) {
    const res = await api.put(`/rawmaterial/${id}`, data);
    return res.data;
  },

  async remove(id) {
    const res = await api.delete(`/rawmaterial/${id}`);
    return res.data;
  },

  // ─── Inwards ─────────────────────────────────────────────────────────────────

  async getAllInwards(params = {}) {
    const branchId = getBranchId();
    const queryParams = { ...params };
    if (branchId) queryParams.branch_id = branchId;
    const res = await api.get("/rawmaterial/inward/list", { params: queryParams });
    return res.data;
  },

  async getInwardById(id) {
    const res = await api.get(`/rawmaterial/inward/${id}`);
    return res.data;
  },

  async createInward(data) {
    const branchId = getBranchId();
    if (!branchId) throw new Error("Please select a specific branch to create inward");
    const res = await api.post("/rawmaterial/inward/create", { ...data, branch_id: branchId });
    return res.data;
  },

  async removeInward(id) {
    const res = await api.delete(`/rawmaterial/inward/${id}`);
    return res.data;
  },

  // ─── Stock ───────────────────────────────────────────────────────────────────

  async getStock(params = {}) {
    const branchId = getBranchId();
    const queryParams = { ...params };
    if (branchId) queryParams.branch_id = branchId;
    const res = await api.get("/rawmaterial/stock/list", { params: queryParams });
    return res.data;
  },
};

export default rawMaterialService;
