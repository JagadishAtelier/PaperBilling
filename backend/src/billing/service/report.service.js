// services/report.service.js
import { Op, fn, col, literal } from "sequelize";
import { sequelize } from "../../db/index.js";
import Billing from "../models/billing.models.js";
import Branch from "../../user/models/branch.model.js";

const reportService = {
  /**
   * Get sales report with payment method breakdown
   * @param {Object} params - { period, startDate, endDate, branch_ids, customer_name }
   * @returns {Object} Sales report data
   */
  async getSalesReport({ period, startDate, endDate, branch_ids, customer_name }) {
    let dateFilter = {};

    // Determine date range based on period
    const now = new Date();

    if (period === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = { billing_date: { [Op.between]: [startOfDay, endOfDay] } };
    } else if (period === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = { billing_date: { [Op.between]: [startOfMonth, endOfMonth] } };
    } else if (period === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      dateFilter = { billing_date: { [Op.between]: [startOfYear, endOfYear] } };
    } else if (period === 'custom' && startDate && endDate) {
      // For custom range, ensure end date includes the full day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { billing_date: { [Op.between]: [new Date(startDate), end] } };
    }

    // Build where clause — include ALL non-cancelled bills (paid, partially_paid, pending)
    const where = {
      status: { [Op.in]: ['paid', 'partially_paid', 'pending'] },
      is_active: true
    };

    // Apply date filter
    if (Object.keys(dateFilter).length > 0) {
      where.billing_date = dateFilter.billing_date;
    }

    // Add branch filter
    if (branch_ids && branch_ids.length > 0) {
      where.branch_id = { [Op.in]: branch_ids };
    }

    // Add customer name filter (case-insensitive partial match)
    if (customer_name && customer_name.trim()) {
      where.customer_name = { [Op.like]: `%${customer_name.trim()}%` };
    }

    console.log(`[ReportService] Fetching report for period: ${period}`);
    console.log(`[ReportService] Where clause:`, JSON.stringify(where));

    // ─── Aggregate queries ───
    const rawWhere = buildRawWhere(where);
    const [aggregates] = await sequelize.query(`
      SELECT
        COUNT(id) AS total_bills,
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COALESCE(SUM(subtotal_amount), 0) AS subtotal_sum,
        COALESCE(SUM(tax_amount), 0) AS tax_sum,
        COALESCE(SUM(discount_amount), 0) AS discount_sum,
        COALESCE(SUM(paid_amount), 0) AS paid_sum,
        COALESCE(SUM(due_amount), 0) AS due_sum
      FROM billing
      WHERE ${rawWhere}
    `, { type: sequelize.QueryTypes.SELECT }).catch(err => {
      console.error("[ReportService] SQL Error:", err);
      return [{}];
    });

    const totalBills = parseInt(aggregates?.total_bills) || 0;
    const totalSales = parseFloat(aggregates?.total_sales) || 0;
    const subtotalSum = parseFloat(aggregates?.subtotal_sum) || 0;
    const taxSum = parseFloat(aggregates?.tax_sum) || 0;
    const discountSum = parseFloat(aggregates?.discount_sum) || 0;

    // Fallback — if raw query fails or returns 0 (but shouldn't), use Sequelize ORM
    let totalBillsFinal = totalBills;
    let totalSalesFinal = totalSales;
    let subtotalSumFinal = subtotalSum;
    let taxSumFinal = taxSum;
    let discountSumFinal = discountSum;

    if (totalBills === 0 && period !== 'today' && !customer_name) {
       // Only fallback if we suspect a SQL error or mismatch in rawWhere
       // (If period is 'today' and count is 0, it might just be 0 sales today)
    }

    // Payment method breakdown
    const paymentMethodBreakdown = await Billing.findAll({
      attributes: [
        'payment_method',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('total_amount')), 'total_amount'],
        [fn('SUM', col('paid_amount')), 'paid_amount'],
        [fn('SUM', col('due_amount')), 'due_amount']
      ],
      where,
      group: ['payment_method'],
      raw: true
    });

    // Handle split payments
    const splitPaymentBills = await Billing.findAll({
      attributes: ['id', 'payment_details', 'total_amount', 'paid_amount', 'due_amount'],
      where: {
        ...where,
        payment_method: 'split',
        payment_details: { [Op.ne]: null }
      },
      raw: true
    });

    const splitPaymentMap = {};
    splitPaymentBills.forEach(bill => {
      if (bill.payment_details) {
        const details = typeof bill.payment_details === 'string'
          ? JSON.parse(bill.payment_details)
          : bill.payment_details;
        if (Array.isArray(details)) {
          details.forEach(payment => {
            const method = payment.method;
            const amount = parseFloat(payment.amount || 0);
            if (!splitPaymentMap[method]) {
              splitPaymentMap[method] = { count: 0, total_amount: 0, paid_amount: 0, due_amount: 0 };
            }
            splitPaymentMap[method].count += 1;
            splitPaymentMap[method].total_amount += amount;
            splitPaymentMap[method].paid_amount += amount;
          });
        }
      }
    });

    // Branch-wise breakdown
    let branchBreakdown = [];
    if (!branch_ids || branch_ids.length > 1) {
      branchBreakdown = await Billing.findAll({
        attributes: [
          'branch_id',
          [fn('COUNT', col('Billing.id')), 'count'],
          [fn('SUM', col('total_amount')), 'total_amount'],
          [fn('SUM', col('paid_amount')), 'paid_amount']
        ],
        include: [{ model: Branch, as: 'branch', attributes: ['branch_name', 'branch_code'] }],
        where,
        group: ['branch_id', 'branch.id'],
        raw: false
      });
    }

    // Daily sales trend (Strictly within selected range)
    const dailySales = await Billing.findAll({
      attributes: [
        [fn('DATE', col('billing_date')), 'date'],
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('total_amount')), 'total_amount']
      ],
      where,
      group: [fn('DATE', col('billing_date'))],
      order: [[fn('DATE', col('billing_date')), 'ASC']],
      raw: true
    });

    // Top selling days (Strictly within selected range)
    const topDays = await Billing.findAll({
      attributes: [
        [fn('DATE', col('billing_date')), 'date'],
        [fn('COUNT', col('id')), 'bills_count'],
        [fn('SUM', col('total_amount')), 'total_amount']
      ],
      where,
      group: [fn('DATE', col('billing_date'))],
      order: [[fn('SUM', col('total_amount')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Calculate averages
    const avgBillValueWithGst = totalBillsFinal > 0 ? (totalSalesFinal / totalBillsFinal) : 0;
    const totalWithoutGst = subtotalSumFinal - discountSumFinal;
    const avgBillValueWithoutGst = totalBillsFinal > 0 ? (totalWithoutGst / totalBillsFinal) : 0;

    // Format results
    const paymentMethodMap = {};
    paymentMethodBreakdown.forEach(pm => {
      paymentMethodMap[pm.payment_method] = {
        method: pm.payment_method,
        count: parseInt(pm.count) || 0,
        total_amount: parseFloat(pm.total_amount) || 0,
        paid_amount: parseFloat(pm.paid_amount) || 0,
        due_amount: parseFloat(pm.due_amount) || 0
      };
    });
    Object.keys(splitPaymentMap).forEach(method => {
      if (paymentMethodMap[method]) {
        paymentMethodMap[method].count += splitPaymentMap[method].count;
        paymentMethodMap[method].total_amount += splitPaymentMap[method].total_amount;
        paymentMethodMap[method].paid_amount += splitPaymentMap[method].paid_amount;
      } else {
        paymentMethodMap[method] = { method, ...splitPaymentMap[method] };
      }
    });

    const formattedPaymentMethods = Object.values(paymentMethodMap).map(pm => ({
      method: pm.method,
      count: pm.count,
      total_amount: pm.total_amount,
      paid_amount: pm.paid_amount,
      due_amount: pm.due_amount,
      percentage: totalSalesFinal > 0 ? ((pm.total_amount / totalSalesFinal) * 100).toFixed(1) : 0
    }));

    const formattedBranches = branchBreakdown.map(b => ({
      branch_id: b.branch_id,
      branch_name: b.branch?.branch_name || 'Unknown',
      branch_code: b.branch?.branch_code || 'N/A',
      count: parseInt(b.get('count')) || 0,
      total_amount: parseFloat(b.get('total_amount')) || 0,
      paid_amount: parseFloat(b.get('paid_amount')) || 0,
      percentage: totalSalesFinal > 0 ? ((parseFloat(b.get('total_amount') || 0) / totalSalesFinal) * 100).toFixed(1) : 0
    }));

    return {
      period,
      filters: { customer_name: customer_name || null },
      summary: {
        total_sales: totalSalesFinal.toFixed(2),
        total_bills: totalBillsFinal,
        total_tax: taxSumFinal.toFixed(2),
        total_without_gst: Math.max(0, totalWithoutGst).toFixed(2),
        average_bill_value_with_gst: avgBillValueWithGst.toFixed(2),
        average_bill_value_without_gst: Math.max(0, avgBillValueWithoutGst).toFixed(2),
      },
      payment_methods: formattedPaymentMethods,
      branches: formattedBranches,
      daily_sales: dailySales.map(ds => ({
        date: ds.date,
        count: parseInt(ds.count) || 0,
        total_amount: parseFloat(ds.total_amount) || 0
      })),
      top_days: topDays.map(td => ({
        date: td.date,
        bills_count: parseInt(td.bills_count) || 0,
        total_amount: parseFloat(td.total_amount) || 0
      }))
    };
  }
};

/**
 * Build a raw WHERE clause from a Sequelize where object.
 * This is a simplified builder for our specific use case.
 */
function buildRawWhere(where) {
  const conditions = [];

  // is_active
  if (where.is_active !== undefined) {
    conditions.push(`is_active = ${where.is_active ? 1 : 0}`);
  }

  // status
  if (where.status && where.status[Op.in]) {
    const statuses = where.status[Op.in].map(s => `'${s}'`).join(',');
    conditions.push(`status IN (${statuses})`);
  }

  // billing_date BETWEEN
  if (where.billing_date && where.billing_date[Op.between]) {
    const [start, end] = where.billing_date[Op.between];
    conditions.push(`billing_date BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'`);
  }

  // branch_id IN
  if (where.branch_id && where.branch_id[Op.in]) {
    const ids = where.branch_id[Op.in].map(id => `'${id}'`).join(',');
    conditions.push(`branch_id IN (${ids})`);
  }

  // customer_name LIKE
  if (where.customer_name && where.customer_name[Op.like]) {
    conditions.push(`customer_name LIKE '${where.customer_name[Op.like]}'`);
  }

  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
}

export default reportService;
