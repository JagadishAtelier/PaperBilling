-- Raw Materials table
CREATE TABLE IF NOT EXISTS raw_materials (
  id CHAR(36) NOT NULL PRIMARY KEY,
  material_name VARCHAR(100) NOT NULL,
  material_code VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(100),
  unit VARCHAR(20) DEFAULT 'kg',
  purchase_price DECIMAL(10,2) DEFAULT 0.00,
  min_stock DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  supplier_name VARCHAR(100),
  status ENUM('active','inactive') DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  created_by CHAR(36),
  updated_by CHAR(36),
  deleted_by CHAR(36),
  created_by_name VARCHAR(255),
  updated_by_name VARCHAR(255),
  deleted_by_name VARCHAR(255),
  created_by_email VARCHAR(255),
  updated_by_email VARCHAR(255),
  deleted_by_email VARCHAR(255),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

-- Raw Material Stock table
CREATE TABLE IF NOT EXISTS raw_material_stock (
  id CHAR(36) NOT NULL PRIMARY KEY,
  branch_id CHAR(36) NOT NULL,
  raw_material_id CHAR(36) NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'kg',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
);

-- Raw Material Inward table
CREATE TABLE IF NOT EXISTS raw_material_inward (
  id CHAR(36) NOT NULL PRIMARY KEY,
  branch_id CHAR(36) NOT NULL,
  inward_no VARCHAR(50) NOT NULL UNIQUE,
  supplier_name VARCHAR(100) NOT NULL,
  received_date DATETIME NOT NULL,
  supplier_invoice VARCHAR(100),
  total_amount DECIMAL(10,2) DEFAULT 0,
  total_quantity DECIMAL(10,3) DEFAULT 0,
  status ENUM('pending','completed','cancelled') DEFAULT 'pending',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by CHAR(36),
  updated_by CHAR(36),
  deleted_by CHAR(36),
  created_by_name VARCHAR(255),
  updated_by_name VARCHAR(255),
  deleted_by_name VARCHAR(255),
  created_by_email VARCHAR(255),
  updated_by_email VARCHAR(255),
  deleted_by_email VARCHAR(255),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

-- Raw Material Inward Items table
CREATE TABLE IF NOT EXISTS raw_material_inward_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  inward_id CHAR(36) NOT NULL,
  raw_material_id CHAR(36) NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'kg',
  unit_price DECIMAL(10,2) DEFAULT 0.00,
  total_price DECIMAL(10,2) DEFAULT 0.00,
  batch_number VARCHAR(50),
  expiry_date DATETIME,
  notes TEXT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (inward_id) REFERENCES raw_material_inward(id),
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
);
