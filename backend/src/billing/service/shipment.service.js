import Shipment from '../models/shipment.model.js';
import Billing from '../models/billing.models.js';

const shipmentService = {
  // ✅ Create or Update Shipment for a Billing
  async upsertShipment(billingId, data) {
    const billing = await Billing.findByPk(billingId);
    if (!billing) throw new Error("Billing record not found");

    let shipment = await Shipment.findOne({ where: { billing_id: billingId } });

    if (shipment) {
      // Update existing
      await shipment.update(data);
    } else {
      // Create new
      shipment = await Shipment.create({
        ...data,
        billing_id: billingId
      });
    }

    return shipment;
  },

  // ✅ Get Shipment by Billing ID
  async getByBillingId(billingId) {
    const shipment = await Shipment.findOne({
      where: { billing_id: billingId },
      include: [{ model: Billing, as: 'billing' }]
    });
    return shipment;
  },

  // ✅ Update Shipment Status
  async updateStatus(billingId, status, additionalData = {}) {
    const shipment = await Shipment.findOne({ where: { billing_id: billingId } });
    if (!shipment) throw new Error("Shipment record not found for this billing");

    await shipment.update({
      status,
      ...additionalData
    });

    return shipment;
  },

  // ✅ Get all shipments with filters (can be expanded)
  async getAllShipments({ status, limit = 10, offset = 0 } = {}) {
    const where = { is_active: true };
    if (status) where.status = status;

    const { count, rows } = await Shipment.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{ model: Billing, as: 'billing', attributes: ['billing_no', 'customer_name', 'customer_phone'] }]
    });

    return {
      total: count,
      data: rows
    };
  }
};

export default shipmentService;
