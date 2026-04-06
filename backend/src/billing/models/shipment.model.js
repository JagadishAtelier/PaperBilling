import { sequelize } from '../../db/index.js';
import { DataTypes } from 'sequelize';

const Shipment = sequelize.define("Shipment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  billing_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'billing',
      key: 'id'
    }
  },
  carrier_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tracking_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Pending',
  },
  shipment_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  estimated_delivery: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  delivery_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  shipping_address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  vehicle_no: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  driver_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  driver_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "shipments",
  timestamps: true,
});

export default Shipment;
