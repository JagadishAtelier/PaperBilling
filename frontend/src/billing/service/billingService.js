// billingService.js
import api from "../../api/api.js";

// Function to get branch from localStorage
const getBranchId = () => {
  const branchId = localStorage.getItem("selectedBranchId");
  // Don't send branch_id if "all" is selected
  return branchId === 'all' ? null : branchId;
};

const billingService = {
  // 🔹 Get all billings (with optional filters + pagination)
  async getAll(params = {}) {
    const branchId = getBranchId();
    const queryParams = { ...params };
    
    // Only add branch_id if it's not "all"
    if (branchId) {
      queryParams.branch_id = branchId;
    }
    
    const res = await api.get("/billing/billing", { params: queryParams });
    return res.data;
  },

  // 🔹 Get single billing by ID (with items)
  async getById(id) {
    const branchId = getBranchId();
    const queryParams = {};
    
    if (branchId) {
      queryParams.branch_id = branchId;
    }
    
    const res = await api.get(`/billing/billing/${id}`, { params: queryParams });
    return res.data;
  },
  
  // 🔹 Get single billing by ID (alias for getById)
  async get(id) {
    return this.getById(id);
  },

  // 🔹 Create new billing with items
  async create(data) {
    const branchId = getBranchId();
    
    // For create, we need a specific branch
    if (!branchId) {
      throw new Error("Please select a specific branch to create billing");
    }
    
    const res = await api.post("/billing/billing", { ...data, branch_id: branchId });
    return res.data;
  },

  // 🔹 Update billing (requires manager/admin role)
  async update(id, data) {
    const branchId = getBranchId();
    const payload = { ...data };
    
    if (branchId) {
      payload.branch_id = branchId;
    }
    
    const res = await api.put(`/billing/billing/${id}`, payload);
    return res.data;
  },

  // 🔹 Delete billing (requires admin role)
  async remove(id) {
    const branchId = getBranchId();
    const queryParams = {};
    
    if (branchId) {
      queryParams.branch_id = branchId;
    }
    
    const res = await api.delete(`/billing/billing/${id}`, { params: queryParams });
    return res.data;
  },
};

export default billingService;
