import { z } from "zod";

export const createRawMaterialSchema = z.object({
  material_name: z.string().min(1, "Material name is required").max(100),
  material_code: z.string().min(1, "Material code is required").max(50),
  category: z.string().max(100).optional(),
  unit: z.string().max(20).optional().default('kg'),
  purchase_price: z.number().min(0).optional().default(0),
  min_stock: z.number().min(0).optional().default(0),
  description: z.string().optional(),
  supplier_name: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const updateRawMaterialSchema = createRawMaterialSchema.partial();

const inwardItemSchema = z.object({
  raw_material_id: z.string().uuid("Raw material ID must be a valid UUID"),
  quantity: z.number({ invalid_type_error: "Quantity must be a number" }).min(0.001, "Quantity must be greater than 0"),
  unit: z.string().max(20).optional(),
  unit_price: z.number().min(0).default(0),
  total_price: z.number().min(0).default(0),
  batch_number: z.string().max(50).optional(),
  expiry_date: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const createRawMaterialInwardSchema = z.object({
  supplier_name: z.string().min(1, "Supplier name is required").max(100),
  received_date: z.string().datetime("Received date must be a valid datetime"),
  supplier_invoice: z.string().max(100).optional(),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  notes: z.string().optional(),
  items: z.array(inwardItemSchema).min(1, "At least one item is required"),
});

export const updateRawMaterialInwardSchema = createRawMaterialInwardSchema.partial();
