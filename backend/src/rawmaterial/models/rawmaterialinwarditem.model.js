import { sequelize } from '../../db/index.js';
import { DataTypes } from 'sequelize';
import RawMaterialInward from './rawmaterialinward.model.js';
import RawMaterial from './rawmaterial.model.js';

const RawMaterialInwardItem = sequelize.define("RawMaterialInwardItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  inward_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: "raw_material_inward", key: "id" },
  },
  raw_material_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: "raw_materials", key: "id" },
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'kg',
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  batch_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "raw_material_inward_items",
  timestamps: true,
});

RawMaterialInward.hasMany(RawMaterialInwardItem, { foreignKey: "inward_id", as: "items" });
RawMaterialInwardItem.belongsTo(RawMaterialInward, { foreignKey: "inward_id", as: "inward" });

RawMaterial.hasMany(RawMaterialInwardItem, { foreignKey: "raw_material_id", as: "inwardItems" });
RawMaterialInwardItem.belongsTo(RawMaterial, { foreignKey: "raw_material_id", as: "rawMaterial" });

export default RawMaterialInwardItem;
