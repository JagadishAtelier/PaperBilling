import { sequelize } from '../../db/index.js';
import { DataTypes } from 'sequelize';

const RawMaterial = sequelize.define("RawMaterial", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  material_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  material_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'kg',
  },
  purchase_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  min_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  supplier_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false,
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
  tableName: "raw_materials",
  timestamps: true,
});

export default RawMaterial;
