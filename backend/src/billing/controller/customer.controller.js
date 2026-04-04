import customerService from '../service/customer.service.js';

const customerController = {
    // Create customer
    async createCustomer(req, res) {
        try {
            const customer = await customerService.createCustomer(req.body, req.user.id);
            res.status(201).json({
                success: true,
                message: 'Customer created successfully',
                data: customer
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get all customers
    async getAllCustomers(req, res) {
        try {
            const customers = await customerService.getAllCustomers(req.query);
            res.status(200).json({
                success: true,
                data: customers
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get customer by ID
    async getCustomerById(req, res) {
        try {
            const customer = await customerService.getCustomerById(req.params.id);
            res.status(200).json({
                success: true,
                data: customer
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get customer by phone
    async getCustomerByPhone(req, res) {
        try {
            const customer = await customerService.getCustomerByPhone(req.params.phone);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }
            res.status(200).json({
                success: true,
                data: customer
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Update customer
    async updateCustomer(req, res) {
        try {
            const customer = await customerService.updateCustomer(
                req.params.id,
                req.body,
                req.user.id
            );
            res.status(200).json({
                success: true,
                message: 'Customer updated successfully',
                data: customer
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Delete customer
    async deleteCustomer(req, res) {
        try {
            await customerService.deleteCustomer(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Customer deleted successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get customer purchase history
    async getCustomerHistory(req, res) {
        try {
            const history = await customerService.getCustomerHistory(req.params.id);
            res.status(200).json({
                success: true,
                data: history
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get customer analytics
    async getCustomerAnalytics(req, res) {
        try {
            const { start_date, end_date } = req.query;
            const analytics = await customerService.getCustomerAnalytics(
                req.params.id,
                start_date,
                end_date
            );
            res.status(200).json({
                success: true,
                data: analytics
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default customerController;
