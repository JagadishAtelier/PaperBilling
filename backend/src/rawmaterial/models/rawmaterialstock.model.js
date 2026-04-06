import { sequelize } from '../../db/index.js';
import { DataTypes } from 'sequelize';
import RawMaterial from './rawmaterial.model.js';

const RawMaterialStock = sequelize.define("RawMaterialStock", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: false,
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
}, {
  tableName: "raw_material_stock",
  timestamps: true,
});

RawMaterial.hasMany(RawMaterialStock, { foreignKey: "raw_material_id", as: "stocks" });
RawMaterialStock.belongsTo(RawMaterial, { foreignKey: "raw_material_id", as: "rawMaterial" });

export default RawMaterialStock;
