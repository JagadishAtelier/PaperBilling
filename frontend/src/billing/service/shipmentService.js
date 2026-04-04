import api from "../../api/api.js";

const shipmentService = {
  // Get shipment by billing ID
  getByBillingId: async (billingId) => {
    try {
      const response = await api.get(`/shipment/${billingId}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // No shipment yet
      }
      throw error;
    }
  },

  // Update or create shipment
  upsert: async (billingId, data) => {
    const response = await api.post(`/shipment/${billingId}`, data);
    return response.data;
  },

  // Update status only
  updateStatus: async (billingId, status) => {
    const response = await api.patch(`/shipment/${billingId}/status`, { status });
    return response.data;
  }
};

export default shipmentService;
