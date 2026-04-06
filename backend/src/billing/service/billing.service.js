// services/billing.service.js
import { Op } from "sequelize";
import { sequelize } from "../../db/index.js";
import Billing from "../models/billing.models.js";
import BillingItem from "../models/billingiteam.models.js";
import Product from "../../product/models/product.model.js";
import Stock from "../../stock/models/stock.models.js";
import Customer from "../models/customer.model.js";
import Branch from "../../user/models/branch.model.js";
import customerService from "./customer.service.js";
import couponService from "./coupon.service.js";
import Shipment from "../models/shipment.model.js";
import "../models/associations.js";

const billingService = {
  // ✅ Create Billing with Items
  async createBillingWithItems(data) {
    return await sequelize.transaction(async (t) => {
      // 1️⃣ Handle Customer - Find or Create
      let customer = null;
      if (data.customer_phone) {
        customer = await customerService.findOrCreateCustomer({
          customer_phone: data.customer_phone,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          address: data.customer_address
        }, data.created_by);
      }

      // 2️⃣ Generate billing_no automatically
      const lastBilling = await Billing.findOne({
        order: [["createdAt", "DESC"]],
        transaction: t,
      });
      const lastNo = lastBilling
        ? parseInt(lastBilling.billing_no.split("-")[1])
        : 1000;
      const billingNo = `BILL-${lastNo + 1}`;

      // 3️⃣ Validate products and prepare items
      let subtotal = 0;
      let totalQuantity = 0;
      const itemsToCreate = [];

      const itemsList = data.items || data.billing_items;
      if (!itemsList || itemsList.length === 0) {
        throw new Error("Billing must have at least one item");
      }

      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];

        // Check if product exists
        const product = await Product.findByPk(item.product_id, {
          transaction: t,
        });
        if (!product) {
          throw new Error(`Product with ID ${item.product_id} does not exist`);
        }

        const quantity = item.quantity || 0;
        const unitPrice = item.unit_price || product.selling_price || 0;
        const itemSubtotal = quantity * unitPrice; // Subtotal without tax

        subtotal += itemSubtotal;
        totalQuantity += quantity;

        itemsToCreate.push({
          product_id: item.product_id,
          size: item.size,
          color: item.color,
          quantity,
          unit_price: unitPrice,
          mrp: item.mrp || product.mrp,
          discount_percentage: item.discount_percentage || 0,
          discount: item.discount_amount || item.discount || 0,
          tax: item.tax_amount || item.tax || 0,
          total_price: item.total_price || (quantity * unitPrice + (item.tax_amount || 0) - (item.discount_amount || 0)),
          barcode: item.barcode
        });

        // 4️⃣ Update Stock (reduce quantity) - Allow negative stock
        const stockWhere = {
          product_id: item.product_id,
          branch_id: data.branch_id
        };

        // If size and color specified, find exact match
        if (item.size) stockWhere.size = item.size;
        if (item.color) stockWhere.color = item.color;

        let stock = await Stock.findOne({
          where: stockWhere,
          transaction: t,
        });

        // If stock doesn't exist, create it with negative quantity
        if (!stock) {
          stock = await Stock.create({
            product_id: item.product_id,
            branch_id: data.branch_id,
            size: item.size || null,
            color: item.color || null,
            quantity: -quantity, // Start with negative quantity
            unit: product.unit || 'piece',
            cost_price: product.cost_price || 0,
            selling_price: product.selling_price || unitPrice,
            mrp: product.mrp || item.mrp || 0,
            inward_quantity: 0,
            return_quantity: 0,
            billing_quantity: quantity,
            customer_billing_quantity: 0,
            barcode: item.barcode || null,
            sku: null,
            created_by: data.created_by,
            created_by_name: data.created_by_name
          }, { transaction: t });
        } else {
          // Stock exists - update it (allow negative values)
          stock.quantity -= quantity;
          stock.billing_quantity += quantity;
          await stock.save({ transaction: t });
        }
      }

      // 5️⃣ Handle Coupon if provided
      let couponDiscount = 0;
      let appliedCoupon = null;

      if (data.coupon_code && data.customer_phone) {
        // Validate coupon
        const validation = await couponService.validateCoupon(
          data.coupon_code,
          data.customer_phone,
          subtotal
        );

        if (!validation.valid) {
          throw new Error(validation.message);
        }

        couponDiscount = validation.discount_amount;
        appliedCoupon = validation.coupon;
      }

      // 6️⃣ Calculate Final Amount
      const discountAmount = (data.discount_amount || 0) + couponDiscount;
      const taxAmount = data.tax_amount || 0;
      const totalAmount = subtotal - discountAmount + taxAmount;
      const paidAmount = data.paid_amount || 0;
      const dueAmount = totalAmount - paidAmount;

      // 7️⃣ Create Billing (without customer_id, using customer_phone)
      const billing = await Billing.create(
        {
          billing_no: billingNo,
          branch_id: data.branch_id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          type: data.type,
          billing_date: data.billing_date || new Date(),
          inward_id: data.inward_id || null,
          total_quantity: totalQuantity,
          subtotal_amount: subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          due_amount: dueAmount,
          payment_method: data.payment_method,
          payment_details: data.payment_details || null,
          status: data.status,
          counter_no: data.counter_no || null,
          notes: data.notes || null,
          custom_phone: data.custom_phone || null,
          customer_address: data.customer_address || null,
          created_by: data.created_by,
          created_by_name: data.created_by_name,
          created_by_email: data.created_by_email,
        },
        { transaction: t }
      );

      // 8️⃣ Create Billing Items
      const itemsWithBillingId = itemsToCreate.map((item) => ({
        ...item,
        billing_id: billing.id,
      }));
      await BillingItem.bulkCreate(itemsWithBillingId, { transaction: t });

      // 9️⃣ Apply coupon if used (mark as used and award points)
      if (appliedCoupon && data.customer_phone) {
        await couponService.applyCoupon(
          data.coupon_code,
          data.customer_phone,
          billing.id,
          couponDiscount
        );
      }

      // 🔟 Check if customer qualifies for new coupon (purchase >= 2000)
      let generatedCoupon = null;
      if (data.customer_phone && totalAmount >= 2000) {
        generatedCoupon = await couponService.checkAndGenerateCoupon(
          totalAmount,
          data.customer_phone,
          billing.id
        );
      }

      // 1️⃣0️⃣.5️⃣ Create Shipment if requested
      if (data.is_shipping) {
        await Shipment.create({
          billing_id: billing.id,
          shipping_address: data.shipping_address,
          status: 'Pending',
        }, { transaction: t });
      }

      // 1️⃣1️⃣ Return Billing with Items, Customer, and Coupon info
      const result = await Billing.findByPk(billing.id, {
        include: [
          { model: BillingItem, as: "items" },
          { model: Customer, as: "customer" }
        ],
        transaction: t,
      });

      // Add coupon info to result
      return {
        ...result.toJSON(),
        coupon_applied: appliedCoupon ? {
          code: appliedCoupon.coupon_code,
          discount: couponDiscount,
          referrer_rewarded: true
        } : null,
        coupon_generated: generatedCoupon ? {
          code: generatedCoupon.coupon_code,
          valid_from: generatedCoupon.valid_from,
          valid_until: generatedCoupon.valid_until,
          discount: `${generatedCoupon.discount_value}% off`,
          message: 'Share this code with friends! Valid after 24 hours.'
        } : null
      };
    });
  },

  // ✅ Get All Billings with Filters + Pagination
  async getAllBillings({ filters = {}, limit = 10, offset = 0 } = {}) {
    const where = {};

    // Filter by branch_id or branch_ids
    if (filters.branch_id) {
      where.branch_id = filters.branch_id;
    } else if (filters.branch_ids && filters.branch_ids.length > 0) {
      where.branch_id = { [Op.in]: filters.branch_ids };
    }

    // Generic search across multiple fields
    if (filters.search) {
      where[Op.or] = [
        { billing_no: { [Op.like]: `%${filters.search}%` } },
        { customer_name: { [Op.like]: `%${filters.search}%` } },
        { customer_phone: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    // Specific field filters (override search if provided)
    if (filters.billing_no) {
      where.billing_no = { [Op.like]: `%${filters.billing_no}%` };
    }
    if (filters.customer_name) {
      where.customer_name = { [Op.like]: `%${filters.customer_name}%` };
    }
    if (filters.customer_phone) {
      where.customer_phone = { [Op.like]: `%${filters.customer_phone}%` };
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.billing_date) {
      where.billing_date = filters.billing_date;
    }

    const { count, rows } = await Billing.findAndCountAll({
      where,
      distinct: true,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: BillingItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "product_name", "product_code", "unit", "hsn_code"],
            },
          ],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "customer_name", "customer_phone", "customer_email"]
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["id", "branch_name", "branch_code", "city"],
        },
      ],
    });

    return {
      total: count,
      page: Math.floor(offset / limit) + 1,
      limit,
      data: rows,
    };
  },

  // ✅ Get Billing by ID
  async getBillingById(id) {
    return await Billing.findByPk(id, {
      include: [
        {
          model: BillingItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "product_name", "product_code", "unit", "hsn_code"],
            },
          ],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "customer_name", "customer_phone", "customer_email", "address", "city"]
        }
      ],
    });
  },

  // ✅ Update Billing with Items
  async updateBillingWithItems(id, data) {
    return await sequelize.transaction(async (t) => {
      const billing = await Billing.findByPk(id, {
        include: [{ model: BillingItem, as: "items" }],
        transaction: t
      });

      if (!billing) return null;

      console.log("=== UPDATE BILLING WITH ITEMS START ===");
      console.log("Billing ID:", id);

      // 1. Update Billing header
      await billing.update(
        {
          customer_name: data.customer_name || billing.customer_name,
          customer_phone: data.customer_phone || billing.customer_phone,
          billing_date: data.billing_date || billing.billing_date,
          payment_method: data.payment_method || billing.payment_method,
          status: data.status || billing.status,
          notes: data.notes !== undefined ? data.notes : billing.notes,
          custom_phone: data.custom_phone !== undefined ? data.custom_phone : billing.custom_phone,
          customer_address: data.customer_address !== undefined ? data.customer_address : billing.customer_address,
          updated_by: data.updated_by,
          updated_by_name: data.updated_by_name,
          updated_by_email: data.updated_by_email,
        },
        { transaction: t }
      );

      // 2. If items exist → adjust stock and replace items
      if (data.billing_items && data.billing_items.length > 0) {
        // Step A: Reverse old stock changes
        console.log("=== REVERSING OLD STOCK CHANGES ===");
        for (const oldItem of billing.items) {
          const stock = await Stock.findOne({
            where: {
              product_id: oldItem.product_id,
              branch_id: billing.branch_id
            },
            transaction: t,
          });

          if (stock) {
            // Add back the old quantities to stock
            stock.quantity += oldItem.quantity;
            stock.billing_quantity -= oldItem.quantity;

            console.log(`Product ${oldItem.product_id}: Added back ${oldItem.quantity} units`);
            await stock.save({ transaction: t });
          }
        }

        // Step B: Delete old items
        await BillingItem.destroy({
          where: { billing_id: id },
          transaction: t,
        });

        // Step C: Apply new stock changes and create new items
        console.log("=== APPLYING NEW STOCK CHANGES ===");
        let subtotal = 0;
        let totalQuantity = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        const itemsToCreate = [];

        for (const item of data.billing_items) {
          // Validate product exists
          const product = await Product.findByPk(item.product_id, { transaction: t });
          if (!product) {
            throw new Error(`Product with ID ${item.product_id} does not exist`);
          }

          const quantity = item.quantity || 0;
          const unitPrice = item.unit_price || 0;
          const discount = item.discount_amount || 0;
          const tax = item.tax_amount || 0;
          const totalPrice = item.total_price || (quantity * unitPrice + tax - discount);

          subtotal += quantity * unitPrice;
          totalQuantity += quantity;
          totalDiscount += discount;
          totalTax += tax;

          itemsToCreate.push({
            billing_id: id,
            product_id: item.product_id,
            quantity,
            unit_price: unitPrice,
            unit: item.unit || product.unit,
            mrp: item.mrp || product.mrp,
            discount_percentage: item.discount_percentage || 0,
            discount: discount,
            tax: tax,
            total_price: totalPrice,
            size: item.size || null,
            color: item.color || null,
            barcode: item.barcode || null,
          });

          // Update stock with new quantities - Allow negative stock
          let stock = await Stock.findOne({
            where: {
              product_id: item.product_id,
              branch_id: billing.branch_id,
              ...(item.size && { size: item.size }),
              ...(item.color && { color: item.color })
            },
            transaction: t,
          });

          // If stock doesn't exist, create it with negative quantity
          if (!stock) {
            stock = await Stock.create({
              product_id: item.product_id,
              branch_id: billing.branch_id,
              size: item.size || null,
              color: item.color || null,
              quantity: -quantity, // Start with negative quantity
              unit: product.unit || 'piece',
              cost_price: product.cost_price || 0,
              selling_price: product.selling_price || unitPrice,
              mrp: product.mrp || item.mrp || 0,
              inward_quantity: 0,
              return_quantity: 0,
              billing_quantity: quantity,
              customer_billing_quantity: 0,
              barcode: item.barcode || null,
              sku: null,
              created_by: data.updated_by,
              created_by_name: data.updated_by_name
            }, { transaction: t });
          } else {
            // Stock exists - update it (allow negative values)
            stock.quantity -= quantity;
            stock.billing_quantity += quantity;
            await stock.save({ transaction: t });
          }

          console.log(`Product ${item.product_id}: Removed ${quantity} units (Current stock: ${stock.quantity})`);
        }

        // Step D: Create new items
        await BillingItem.bulkCreate(itemsToCreate, { transaction: t });

        // Step E: Update billing totals
        const totalAmount = subtotal - totalDiscount + totalTax - (data.coupon_discount || 0);
        const paidAmount = data.paid_amount || totalAmount;
        const dueAmount = totalAmount - paidAmount;

        await billing.update(
          {
            total_quantity: totalQuantity,
            subtotal_amount: subtotal,
            discount_amount: totalDiscount + (data.coupon_discount || 0),
            tax_amount: totalTax,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            due_amount: dueAmount,
          },
          { transaction: t }
        );
      }

      console.log("=== UPDATE BILLING WITH ITEMS COMPLETE ===");

      // Return updated billing with items
      return await Billing.findByPk(id, {
        include: [
          {
            model: BillingItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: ["id", "product_name", "product_code", "hsn_code"],
              },
            ],
          },
          {
            model: Customer,
            as: "customer",
            attributes: ["id", "customer_name", "customer_phone", "customer_email"]
          }
        ],
        transaction: t,
      });
    });
  },


  // ✅ Delete Billing (soft delete)
  async deleteBilling(id, user) {
    return await sequelize.transaction(async (t) => {
      const billing = await Billing.findByPk(id, { transaction: t });
      if (!billing) return null;

      await billing.update(
        {
          is_active: false,
          deleted_by: user.id || null,
          deleted_by_name: user.username || user.name || null,
          deleted_by_email: user.email || null,
        },
        { transaction: t }
      );

      return { message: "Billing soft deleted successfully" };
    });
  },
};

export default billingService;
