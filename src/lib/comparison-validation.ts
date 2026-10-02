import { z } from "zod";
import { safeImageUrl } from "@/lib/validation";
export const FULL_PHOTO = { x: 0, y: 0, width: 1, height: 1 };
export const photoCropSchema = z.object({
  x: z.number().min(0).max(1), y: z.number().min(0).max(1),
  width: z.number().min(0.01).max(1), height: z.number().min(0.01).max(1),
}).strict().refine(c => c.x + c.width <= 1.000001 && c.y + c.height <= 1.000001, { message: "Crop must stay inside the photograph." });
export const comparisonSchema = z.object({
  name: z.string().trim().min(2).max(160), nameFr: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(""), descriptionFr: z.string().trim().max(1000).default(""),
  imageUrl: safeImageUrl.refine(Boolean), afterImageUrl: safeImageUrl.refine(Boolean),
  beforeCrop: photoCropSchema, afterCrop: photoCropSchema,
  aspectRatio: z.number().min(0.25).max(4), category: z.enum(["laser", "rf", "other"]),
  active: z.boolean().default(true), order: z.number().int().min(0).max(100000).default(0),
}).strict();
// PATCH must not apply create defaults: an activation change must preserve copy/order.
export const comparisonPatchSchema = comparisonSchema.omit({ description: true, descriptionFr: true, active: true, order: true }).partial().extend({
  description: z.string().trim().max(1000).optional(), descriptionFr: z.string().trim().max(1000).optional(),
  active: z.boolean().optional(), order: z.number().int().min(0).max(100000).optional(),
}).refine(data => Object.keys(data).length > 0);
export type ComparisonContent = z.infer<typeof comparisonSchema> & { id: string };
