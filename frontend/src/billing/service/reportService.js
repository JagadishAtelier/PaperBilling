// reportService.js
import api from "../../api/api.js";

// Function to get branch from localStorage
const getBranchId = () => {
  const branchId = localStorage.getItem("selectedBranchId");
  // Don't send branch_id if "all" is selected
  return branchId === 'all' ? null : branchId;
};

const reportService = {
  /**
   * Get sales report
   * @param {Object} params - { period, startDate, endDate, customer_name }
   * @returns {Promise} Sales report data — always returns { data: reportObject }
   */
  async getSalesReport(params = {}) {
    const branchId = getBranchId();
    const queryParams = { ...params };

    // Only add branch_id if it's not "all"
    if (branchId) {
      queryParams.branch_id = branchId;
    }

    // Remove empty/null values to keep query clean
    Object.keys(queryParams).forEach((key) => {
      if (!queryParams[key] && queryParams[key] !== 0) {
        delete queryParams[key];
      }
    });

    const res = await api.get("/billing/reports/sales", { params: queryParams });

    // Normalize response: API returns { success, data: reportObj, message }
    // axios wraps it in res.data → { success, data, message }
    // We need to return { data: reportObj } so frontend does response.data
    const payload = res.data;

    // If the backend wraps in { success, data }
    if (payload && payload.data) {
      return payload; // { success, data: reportObj }
    }

    // If payload IS the report object directly
    return { data: payload };
  }
};

export default reportService;
