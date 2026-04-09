import { sequelize } from '../../db/index.js';
import { DataTypes } from 'sequelize';

const BillingPayment = sequelize.define("BillingPayment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  billing_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "billing_payments",
  timestamps: true,
});

export default BillingPayment;
