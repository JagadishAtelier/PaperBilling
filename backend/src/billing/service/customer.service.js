import Customer from '../models/customer.model.js';
import Billing from '../models/billing.models.js';
import BillingItem from '../models/billingiteam.models.js';
import Product from '../../product/models/product.model.js';
import { Op } from 'sequelize';
import { sequelize } from '../../db/index.js';

const customerService = {
    // Create or get customer by phone
    async findOrCreateCustomer(customerData, created_by) {
        const { customer_phone, customer_name, customer_email } = customerData;

        // Check if customer exists by phone
        let customer = await Customer.findOne({
            where: { customer_phone }
        });

        if (customer) {
            // Update customer name if provided and different
            if (customer_name && customer.customer_name !== customer_name) {
                await customer.update({ 
                    customer_name,
                    customer_email: customer_email || customer.customer_email,
                    updated_by: created_by 
                });
            }
            return customer;
        }

        // Create new customer
        customer = await Customer.create({
            customer_name: customer_name || 'Guest',
            customer_phone,
            customer_email,
            created_by
        });

        return customer;
    },

    // Create customer
    async createCustomer(data, created_by) {
        const exists = await Customer.findOne({
            where: { customer_phone: data.customer_phone }
        });

        if (exists) {
            throw new Error('Customer with this phone number already exists');
        }

        return await Customer.create({
            ...data,
            created_by
        });
    },

    // Get all customers
    async getAllCustomers(filters = {}) {
        const where = { is_active: true };

        if (filters.phone) {
            where.customer_phone = { [Op.like]: `%${filters.phone}%` };
        }

        if (filters.name) {
            where.customer_name = { [Op.like]: `%${filters.name}%` };
        }

        if (filters.email) {
            where.customer_email = { [Op.like]: `%${filters.email}%` };
        }

        return await Customer.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
    },

    // Get customer by ID
    async getCustomerById(id) {
        const customer = await Customer.findByPk(id);
        if (!customer) {
            throw new Error('Customer not found');
        }
        return customer;
    },

    // Get customer by phone
    async getCustomerByPhone(phone) {
        const customer = await Customer.findOne({
            where: { customer_phone: phone }
        });
        return customer;
    },

    // Update customer
    async updateCustomer(id, data, updated_by) {
        const customer = await Customer.findByPk(id);
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Check if phone is being changed and if it already exists
        if (data.customer_phone && data.customer_phone !== customer.customer_phone) {
            const exists = await Customer.findOne({
                where: { 
                    customer_phone: data.customer_phone,
                    id: { [Op.ne]: id }
                }
            });

            if (exists) {
                throw new Error('Customer with this phone number already exists');
            }
        }

        return await customer.update({
            ...data,
            updated_by
        });
    },

    // Soft delete customer
    async deleteCustomer(id) {
        const customer = await Customer.findByPk(id);
        if (!customer) {
            throw new Error('Customer not found');
        }

        await customer.update({ is_active: false });
        return true;
    },

    // Get customer purchase history
    async getCustomerHistory(customerId) {
        const customer = await Customer.findByPk(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Get all billings for this customer using phone number
        const billings = await Billing.findAll({
            where: { 
                customer_phone: customer.customer_phone,
                is_active: true 
            },
            include: [
                {
                    model: BillingItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'product_name', 'product_code']
                        }
                    ]
                }
            ],
            order: [['billing_date', 'DESC']]
        });

        // Calculate statistics
        const totalPurchases = billings.length;
        const totalAmount = billings.reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0);
        
        // Get last purchase
        const lastPurchase = billings.length > 0 ? {
            date: billings[0].billing_date,
            amount: billings[0].total_amount,
            billing_no: billings[0].billing_no
        } : null;

        // Get top products
        const productMap = {};
        billings.forEach(billing => {
            billing.items.forEach(item => {
                const productId = item.product_id;
                if (!productMap[productId]) {
                    productMap[productId] = {
                        product_id: productId,
                        product_name: item.product?.product_name || 'Unknown',
                        product_code: item.product?.product_code || 'N/A',
                        total_quantity: 0,
                        total_amount: 0,
                        purchase_count: 0
                    };
                }
                productMap[productId].total_quantity += item.quantity;
                productMap[productId].total_amount += parseFloat(item.total_price);
                productMap[productId].purchase_count += 1;
            });
        });

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.total_amount - a.total_amount)
            .slice(0, 10);

        // Get size and color preferences
        const sizeMap = {};
        const colorMap = {};
        billings.forEach(billing => {
            billing.items.forEach(item => {
                if (item.size) {
                    sizeMap[item.size] = (sizeMap[item.size] || 0) + item.quantity;
                }
                if (item.color) {
                    colorMap[item.color] = (colorMap[item.color] || 0) + item.quantity;
                }
            });
        });

        const preferredSizes = Object.entries(sizeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([size, count]) => ({ size, count }));

        const preferredColors = Object.entries(colorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([color, count]) => ({ color, count }));

        return {
            customer: {
                id: customer.id,
                name: customer.customer_name,
                phone: customer.customer_phone,
                email: customer.customer_email,
                address: customer.address,
                city: customer.city,
                state: customer.state,
                gender: customer.gender,
                date_of_birth: customer.date_of_birth,
                anniversary_date: customer.anniversary_date
            },
            statistics: {
                total_purchases: totalPurchases,
                total_amount: parseFloat(totalAmount.toFixed(2)),
                average_purchase_value: totalPurchases > 0 ? parseFloat((totalAmount / totalPurchases).toFixed(2)) : 0,
                last_purchase: lastPurchase
            },
            top_products: topProducts,
            preferences: {
                sizes: preferredSizes,
                colors: preferredColors
            },
            recent_purchases: billings.slice(0, 10).map(bill => ({
                id: bill.id,
                billing_no: bill.billing_no,
                billing_date: bill.billing_date,
                total_amount: bill.total_amount,
                total_quantity: bill.total_quantity,
                payment_method: bill.payment_method,
                status: bill.status,
                items_count: bill.items.length,
                items: bill.items.map(item => ({
                    id: item.id,
                    product_id: item.product_id,
                    product_name: item.product?.product_name || 'Unknown',
                    product_code: item.product?.product_code || 'N/A',
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    discount_amount: item.discount_amount,
                    tax_amount: item.tax_amount
                }))
            }))
        };
    },

    // Get customer analytics
    async getCustomerAnalytics(customerId, startDate, endDate) {
        const customer = await Customer.findByPk(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        const where = {
            customer_phone: customer.customer_phone,
            is_active: true
        };

        if (startDate && endDate) {
            where.billing_date = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const billings = await Billing.findAll({
            where,
            include: [
                {
                    model: BillingItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product'
                        }
                    ]
                }
            ]
        });

        // Monthly spending
        const monthlySpending = {};
        billings.forEach(bill => {
            const month = new Date(bill.billing_date).toISOString().slice(0, 7); // YYYY-MM
            monthlySpending[month] = (monthlySpending[month] || 0) + parseFloat(bill.total_amount);
        });

        return {
            customer_id: customerId,
            period: { start_date: startDate, end_date: endDate },
            total_purchases: billings.length,
            total_spent: billings.reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0),
            monthly_spending: Object.entries(monthlySpending).map(([month, amount]) => ({
                month,
                amount: parseFloat(amount.toFixed(2))
            }))
        };
    }
};

export default customerService;
