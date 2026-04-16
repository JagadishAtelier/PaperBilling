import Billing from './billing.models.js';
import BillingItem from './billingiteam.models.js';
import Customer from './customer.model.js';
import Shipment from './shipment.model.js';
import BillingPayment from './billing_payment.models.js';
import Product from '../../product/models/product.model.js';
import Branch from '../../user/models/branch.model.js';
import Otp from './otp.model.js';

// Billing has many BillingItems
Billing.hasMany(BillingItem, { foreignKey: 'billing_id', as: 'items' });
BillingItem.belongsTo(Billing, { foreignKey: 'billing_id', as: 'billing' });

// Billing has many BillingPayments
Billing.hasMany(BillingPayment, { foreignKey: 'billing_id', as: 'payments' });
BillingPayment.belongsTo(Billing, { foreignKey: 'billing_id', as: 'billing' });

// BillingItem belongs to Product
BillingItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(BillingItem, { foreignKey: 'product_id', as: 'billingItems' });

// Billing belongs to Customer (using customer_phone as foreign key)
Billing.belongsTo(Customer, { 
    foreignKey: 'customer_phone', 
    targetKey: 'customer_phone',
    as: 'customer' 
});
Customer.hasMany(Billing, { 
    foreignKey: 'customer_phone',
    sourceKey: 'customer_phone',
    as: 'billings' 
});

// Billing belongs to Branch
Billing.belongsTo(Branch, {
    foreignKey: 'branch_id',
    as: 'branch'
});
Branch.hasMany(Billing, {
    foreignKey: 'branch_id',
});

// Billing and Shipment
Billing.hasOne(Shipment, { foreignKey: 'billing_id', as: 'shipment' });
Shipment.belongsTo(Billing, { foreignKey: 'billing_id', as: 'billing' });

export { Billing, BillingItem, BillingPayment, Customer, Product, Branch, Shipment, Otp };
