import { sequelize } from '../../db/index.js';
import { DataTypes } from 'sequelize';

const RawMaterialInward = sequelize.define("RawMaterialInward", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  inward_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  supplier_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  received_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  supplier_invoice: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  total_quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: { type: DataTypes.UUID, allowNull: true },
  updated_by: { type: DataTypes.UUID, allowNull: true },
  deleted_by: { type: DataTypes.UUID, allowNull: true },
  created_by_name: { type: DataTypes.STRING, allowNull: true },
  updated_by_name: { type: DataTypes.STRING, allowNull: true },
  deleted_by_name: { type: DataTypes.STRING, allowNull: true },
  created_by_email: { type: DataTypes.STRING, allowNull: true },
  updated_by_email: { type: DataTypes.STRING, allowNull: true },
  deleted_by_email: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: "raw_material_inward",
  timestamps: true,
});

export default RawMaterialInward;
