import { sequelize } from '../../db/index.js';
import { DataTypes } from 'sequelize';
import Product from './product.model.js';
import RawMaterial from '../../rawmaterial/models/rawmaterial.model.js';

const BOM = sequelize.define("BOM", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: "products", key: "id" },
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
    comment: 'Quantity of raw material needed to produce one unit of product',
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'kg',
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
  created_by_name: { type: DataTypes.STRING, allowNull: true },
  updated_by_name: { type: DataTypes.STRING, allowNull: true },
  created_by_email: { type: DataTypes.STRING, allowNull: true },
  updated_by_email: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: "product_bom",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['product_id', 'raw_material_id'],
      name: 'bom_product_material_unique',
    },
  ],
});

// Associations
Product.hasMany(BOM, { foreignKey: "product_id", as: "bomItems" });
BOM.belongsTo(Product, { foreignKey: "product_id", as: "product" });

RawMaterial.hasMany(BOM, { foreignKey: "raw_material_id", as: "bomUsages" });
BOM.belongsTo(RawMaterial, { foreignKey: "raw_material_id", as: "rawMaterial" });

export default BOM;
