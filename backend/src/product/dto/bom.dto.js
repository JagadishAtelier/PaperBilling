import { z } from "zod";

const bomItemSchema = z.object({
  raw_material_id: z.string().uuid("Raw material ID must be a valid UUID"),
  quantity: z.number({ invalid_type_error: "Quantity must be a number" }).min(0.001, "Quantity must be greater than 0"),
  unit: z.string().max(20).optional(),
  notes: z.string().optional(),
});

export const saveBOMSchema = z.object({
  items: z.array(bomItemSchema).min(1, "At least one BOM item is required"),
});
