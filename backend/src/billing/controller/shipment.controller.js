import shipmentService from '../service/shipment.service.js';

const shipmentController = {
  // ✅ Create or update shipment
  async upsert(req, res) {
    try {
      const billingId = req.params.billingId;
      const data = req.body;
      const result = await shipmentService.upsertShipment(billingId, data);
      res.json({
        message: "Shipment details updated successfully",
        data: result
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // ✅ Get shipment info for a billing
  async getByBillingId(req, res) {
    try {
      const billingId = req.params.billingId;
      const result = await shipmentService.getByBillingId(billingId);
      if (!result) {
        return res.status(404).json({ error: "No shipment details found for this billing" });
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // ✅ Update status only
  async updateStatus(req, res) {
    try {
      const billingId = req.params.billingId;
      const { status, ...additionalData } = req.body;
      const result = await shipmentService.updateStatus(billingId, status, additionalData);
      res.json({
        message: "Shipment status updated successfully",
        data: result
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // ✅ List all shipments
  async getAll(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const result = await shipmentService.getAllShipments({
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

export default shipmentController;
