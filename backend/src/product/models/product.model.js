import { sequelize } from '../../db/index.js';
import { DataTypes } from 'sequelize';

const Product = sequelize.define("Product", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    product_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    product_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    sub_category_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    brand: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    // Paper Manufacture Specific Fields
    gsm: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Grams per Square Meter - paper weight (e.g., 60, 80, 100, 150, 200, 300)'
    },
    paper_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'e.g., Kraft, Art, Duplex, Chromo, Maplitho, Newsprint, Poster'
    },
    finish: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'e.g., Glossy, Matte, Semi-Gloss, Uncoated, UV Coated, Laminated'
    },
    size: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'e.g., A4, A3, 20x30, 23x36, 30x40 inches'
    },
    color: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Paper color e.g., White, Natural, Cream, Yellow'
    },
    grain_direction: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Long Grain or Short Grain'
    },
    opacity: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Opacity percentage (0-100)'
    },
    brightness: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Brightness value (0-100)'
    },
    // Legacy fields (kept for DB compatibility, not used in UI)
    material: { type: DataTypes.STRING(100), allowNull: true },
    style: { type: DataTypes.STRING(100), allowNull: true },
    pattern: { type: DataTypes.STRING(50), allowNull: true },
    sleeve_type: { type: DataTypes.STRING(50), allowNull: true },
    length: { type: DataTypes.STRING(50), allowNull: true },
    occasion: { type: DataTypes.STRING(100), allowNull: true },
    season: { type: DataTypes.STRING(50), allowNull: true },
    gender: { type: DataTypes.STRING(20), allowNull: true },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'piece'
    },
    purchase_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
    },
    selling_price: {    
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
    },
    mrp: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Maximum Retail Price'
    },
    discount_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    care_instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Washing and care instructions'
    },
    tax_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00,
    },
    barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Product barcode for scanning'
    },
    sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Stock Keeping Unit'
    },
    image_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Product image URL'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'out_of_stock'),
        defaultValue: 'active',
        allowNull: false,
    },
    min_stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: 'Threshold for low stock alerts'
    },
    hsn_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Harmonized System of Nomenclature code for GST'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  deleted_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  created_by_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updated_by_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deleted_by_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  created_by_email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updated_by_email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deleted_by_email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
},

  {
    tableName: "products",
    timestamps: true,
  });


export default Product;