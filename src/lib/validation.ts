import { z } from "zod";
import { isSafeImageUrl, MEDIA_POLICY } from "@/lib/media";

/** Phone: accept digits, spaces, +, -, parentheses; must contain 7+ digits. */
const phoneRegex = /^[+]?[\d\s()-]{7,}$/;

const imageUrlValue = z.string().trim().max(500, { message: "validation.url.max" }).refine(isSafeImageUrl, { message: "validation.url.invalid" });

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "validation.name.min" })
    .max(80, { message: "validation.name.max" }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, { message: "validation.email.invalid" })
    .email({ message: "validation.email.invalid" }),
  phone: z
    .string()
    .trim()
    .max(40, { message: "validation.phone.invalid" })
    .regex(phoneRegex, { message: "validation.phone.invalid" }),
  note: z.string().trim().max(500, { message: "validation.note.max" }).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, { message: "validation.name.min" }).max(80, { message: "validation.name.max" }),
  email: z.string().trim().toLowerCase().max(254, { message: "validation.email.invalid" }).email({ message: "validation.email.invalid" }),
  message: z.string().trim().min(10, { message: "validation.message.min" }).max(2000, { message: "validation.message.max" }),
  locale: z.enum(["en", "fr"]).default("en"),
}).strict();

/** Public request submission: a preferred date + preferred time, no computed slots. */
export const bookingRequestSchema = z.object({
  locale: z.enum(["en", "fr"]).optional(),
  serviceId: z.string().min(1, { message: "validation.service.required" }),
  staffId: z.string().min(1, { message: "validation.staff.required" }),
  dayKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "validation.date.invalid" }),
  startMinutes: z.number().int().min(0).max(1439),
  customer: customerSchema,
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

/** Admin-side time adjust when confirming a request. */
export const confirmRequestSchema = z.object({
  durationMin: z.number().int().min(5).max(480).optional(),
  dayKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "validation.date.invalid" }),
  startMinutes: z.number().int().min(0).max(1439),
  staffId: z.string().min(1).optional(),
});

/** Admin decline: an optional reason shown to the customer. */
export const declineRequestSchema = z.object({
  reason: z.string().trim().max(500, { message: "validation.note.max" }).optional().or(z.literal("")),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254, { message: "validation.email.invalid" }).email({ message: "validation.email.invalid" }),
  password: z.string().min(8, { message: "validation.password.min" }).max(72, { message: "validation.password.min" }),
});

/** Turn raw Zod errors into a flat {field: messageKey} map for i18n forms. */
export function flattenZodErrors<T>(result: { success: false; error: z.ZodError<T> }):
  Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".").replace(/\.\d+/g, "") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
/* ============================================================
 * Admin CRUD schemas (Phase 4). Every /api/admin mutation below
 * validates its body with one of these before touching the DB, and
 * flattenZodErrors turns failures into {field: messageKey} for i18n.
 * ============================================================ */

/** Admin: create/update a service. Price is integer cents, duration in minutes. */
export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "validation.name.min" })
    .max(80, { message: "validation.name.max" }),
  nameFr: z.string().trim().min(2, { message: "validation.name.min" }).max(80, { message: "validation.name.max" }).optional(),
  description: z
    .string()
    .trim()
    .max(16000, { message: "validation.description.max" })
    .optional()
    .or(z.literal("")),
  descriptionFr: z.string().trim().max(16000, { message: "validation.description.max" }).optional().or(z.literal("")),
  price: z
    .number()
    .int()
    .min(0, { message: "validation.price.invalid" })
    .max(1_000_000, { message: "validation.price.invalid" }),
  duration: z
    .number()
    .int()
    .refine((value) => value === 0 || value >= 5, { message: "validation.duration.invalid" })
    .refine((value) => value <= 480, { message: "validation.duration.invalid" }),
  bufferMin: z
    .number()
    .int()
    .min(0, { message: "validation.buffer.invalid" })
    .max(240, { message: "validation.buffer.invalid" })
    .optional(),
  category: z
    .string()
    .trim()
    .max(40, { message: "validation.category.max" })
    .optional(),
  imageUrl: imageUrlValue.optional().or(z.literal("")),
  images: z.array(z.object({
    url: imageUrlValue.refine(Boolean, { message: "validation.url.invalid" }),
    altEn: z.string().trim().min(1).max(160),
    altFr: z.string().trim().min(1).max(160),
  }).strict()).max(8).optional(),
  active: z.boolean().optional(),
  order: z.number().int().min(0).max(100_000).optional(),
}).strict();
export type ServiceInput = z.infer<typeof serviceSchema>;

/** Admin: create/update staff. serviceIds replaces the set of services they can perform. */
export const staffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "validation.name.min" })
    .max(80, { message: "validation.name.max" }),
  role: z.string().trim().max(60, { message: "validation.role.max" }).optional(),
  bio: z
    .string()
    .trim()
    .max(500, { message: "validation.note.max" })
    .optional()
    .or(z.literal("")),
  bioFr: z.string().trim().max(1000, { message: "validation.description.max" }).optional().or(z.literal("")),
  avatarUrl: imageUrlValue.optional().or(z.literal("")),
  active: z.boolean().optional(),
  order: z.number().int().min(0).max(100_000).optional(),
  serviceIds: z.array(z.string().min(1)).max(64).optional(),
}).strict();
export type StaffInput = z.infer<typeof staffSchema>;

const minutesField = z.number().int().min(0).max(1439);

/**
 * One weekly working-hours window with optional breaks. Times are minutes from midnight in
 * the salon timezone; dayOfWeek is 0=Sunday..6=Saturday (JS Date.getDay()).
 */
export const scheduleWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: minutesField,
    endTime: minutesField,
    breaks: z
      .array(z.object({ startTime: minutesField, endTime: minutesField }))
      .max(8)
      .optional(),
  })
  .superRefine((w, ctx) => {
    if (w.startTime >= w.endTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "validation.time.order" });
      return;
    }
    for (const b of w.breaks ?? []) {
      if (b.startTime >= b.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["breaks", "endTime"],
          message: "validation.time.order",
        });
      } else if (b.startTime < w.startTime || b.endTime > w.endTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["breaks"], message: "validation.time.invalid" });
      }
    }
  });
export type ScheduleWindow = z.infer<typeof scheduleWindowSchema>;

/** Admin: replace a staff member's whole weekly schedule. */
export const scheduleSchema = z.object({
  windows: z.array(scheduleWindowSchema).max(56),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

/** Admin: add a full or partial day off. */
export const dayOffSchema = z
  .object({
    staffId: z.string().min(1).optional(),
    dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "validation.date.invalid" }),
    startMin: minutesField.optional(),
    endMin: minutesField.optional(),
    note: z
      .string()
      .trim()
      .max(200, { message: "validation.note.max" })
      .optional()
      .or(z.literal("")),
  })
  .superRefine((d, ctx) => {
    if (d.startMin !== undefined && d.endMin !== undefined && d.startMin >= d.endMin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endMin"], message: "validation.time.order" });
    }
  });
export type DayOffInput = z.infer<typeof dayOffSchema>;

/* ============================================================
 * Store schemas (e-commerce extension). The public checkout and the admin product CRUD
 * each validate with one of these before touching the DB, and flattenZodErrors turns
 * failures into {field: messageKey} for i18n - same pattern as the booking schemas above.
 * ============================================================ */

/** Admin: create/update a product. Price is integer cents, stock is units on hand. */
export const safeImageUrl = z
  .string()
  .trim()
  .max(500, { message: "validation.url.max" })
  .refine(isSafeImageUrl, { message: "validation.url.invalid" });

export const productImageSchema = z.object({
  url: safeImageUrl.refine(Boolean, { message: "validation.url.invalid" }),
  altEn: z.string().trim().min(1, { message: "validation.imageAlt.required" }).max(160),
  altFr: z.string().trim().min(1, { message: "validation.imageAlt.required" }).max(160),
}).strict();

const productObjectSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9._-]{1,39}$/, { message: "validation.sku.invalid" }),
  name: z
    .string()
    .trim()
    .min(2, { message: "validation.name.min" })
    .max(80, { message: "validation.name.max" }),
  nameFr: z
    .string()
    .trim()
    .min(2, { message: "validation.name.min" })
    .max(80, { message: "validation.name.max" }),
  description: z
    .string()
    .trim()
    .max(1000, { message: "validation.description.max" })
    .optional()
    .or(z.literal("")),
  descriptionFr: z
    .string()
    .trim()
    .max(1000, { message: "validation.description.max" })
    .optional()
    .or(z.literal("")),
  price: z
    .number()
    .int()
    .min(0, { message: "validation.price.invalid" })
    .max(1_000_000, { message: "validation.price.invalid" }),
  compareAtPrice: z
    .number()
    .int()
    .min(0, { message: "validation.price.invalid" })
    .max(1_000_000, { message: "validation.price.invalid" })
    .optional(),
  salePrice: z.number().int().min(1, { message: "validation.salePrice.invalid" }).max(1_000_000, { message: "validation.price.invalid" }).nullable().optional(),
  category: z
    .string()
    .trim()
    .max(40, { message: "validation.category.max" })
    .optional(),
  imageUrl: safeImageUrl.optional().or(z.literal("")),
  images: z.array(productImageSchema).max(8, { message: "validation.images.max" }).optional(),
  stock: z
    .number()
    .int()
    .min(0, { message: "validation.stock.invalid" })
    .max(1_000_000, { message: "validation.stock.invalid" })
    .optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  order: z.number().int().min(0).max(100_000).optional(),
}).strict();

function validateCompareAt(
  product: { price?: number; compareAtPrice?: number; salePrice?: number | null },
  ctx: z.RefinementCtx,
) {
  if (
    product.price !== undefined &&
    product.compareAtPrice !== undefined &&
    product.compareAtPrice <= product.price
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["compareAtPrice"],
      message: "validation.compareAtPrice.invalid",
    });
  }
  if (product.price !== undefined && product.salePrice != null && product.salePrice > 0 && product.salePrice >= product.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["salePrice"], message: "validation.salePrice.invalid" });
  }
}

export const productSchema = productObjectSchema.superRefine(validateCompareAt);
export const productPatchSchema = productObjectSchema.partial().superRefine(validateCompareAt);
export type ProductInput = z.infer<typeof productSchema>;

const localizedImageSchema = z.object({
  url: safeImageUrl.refine(Boolean, { message: "validation.url.invalid" }),
  altEn: z.string().trim().min(1, { message: "validation.imageAlt.required" }).max(160),
  altFr: z.string().trim().min(1, { message: "validation.imageAlt.required" }).max(160),
}).strict();

export const packageSchema = z.object({
  name: z.string().trim().min(2, { message: "validation.name.min" }).max(80),
  nameFr: z.string().trim().min(2, { message: "validation.name.min" }).max(80),
  description: z.string().trim().max(1000, { message: "validation.description.max" }).optional().or(z.literal("")),
  descriptionFr: z.string().trim().max(1000, { message: "validation.description.max" }).optional().or(z.literal("")),
  price: z.number().int().min(0, { message: "validation.price.invalid" }).max(1_000_000),
  serviceIds: z.array(z.string().min(1)).min(1, { message: "validation.service.required" }).max(64).refine(ids => new Set(ids).size === ids.length, { message: "validation.service.required" }),
  sessions: z.number().int().min(1).max(100),
  validityDays: z.number().int().min(1).max(3650).nullable().optional(),
  imageUrl: safeImageUrl.optional().or(z.literal("")),
  images: z.array(localizedImageSchema).max(8, { message: "validation.images.max" }).optional(),
  active: z.boolean().optional(),
  order: z.number().int().min(0).max(100_000).optional(),
  badge: z.string().trim().max(40).optional().or(z.literal("")),
}).strict();
export const packagePatchSchema = packageSchema.partial();
export type PackageInput = z.infer<typeof packageSchema>;

export const galleryItemSchema = z.object({
  imageUrl: safeImageUrl.refine(Boolean, { message: "validation.url.invalid" }),
  altEn: z.string().trim().min(1, { message: "validation.imageAlt.required" }).max(160),
  altFr: z.string().trim().min(1, { message: "validation.imageAlt.required" }).max(160),
  captionEn: z.string().trim().max(300).optional().or(z.literal("")),
  captionFr: z.string().trim().max(300).optional().or(z.literal("")),
  category: z.string().trim().min(1).max(40),
  active: z.boolean().optional(),
  order: z.number().int().min(0).max(100_000).optional(),
  mimeType: z.enum(MEDIA_POLICY.mimeTypes).optional(),
  sizeBytes: z.number().int().positive().max(MEDIA_POLICY.maxBytes, { message: "validation.imageSize.invalid" }).optional(),
}).strict();
export const galleryItemPatchSchema = galleryItemSchema.partial();
export type GalleryItemInput = z.infer<typeof galleryItemSchema>;

/** One line submitted at checkout. Only slug + quantity are trusted; price is re-read. */
export const checkoutLineSchema = z.object({
  slug: z.string().trim().min(1, { message: "validation.product.required" }),
  quantity: z.number().int().min(1, { message: "validation.quantity.invalid" }).max(99, { message: "validation.quantity.invalid" }),
}).strict();

export const cartQuoteSchema = z.object({
  locale: z.enum(["en", "fr"]),
  lines: z.array(checkoutLineSchema).min(1, { message: "validation.cart.empty" }).max(100),
}).strict();

/** Public store checkout: contact + shipping + the cart lines. */
export const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid({ message: "validation.checkout.invalid" }),
  locale: z.enum(["en", "fr"]),
  name: z
    .string()
    .trim()
    .min(2, { message: "validation.name.min" })
    .max(80, { message: "validation.name.max" }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "validation.email.invalid" }),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, { message: "validation.phone.invalid" }),
  address: z
    .string()
    .trim()
    .min(5, { message: "validation.address.min" })
    .max(200, { message: "validation.address.max" }),
  city: z
    .string()
    .trim()
    .min(2, { message: "validation.city.min" })
    .max(80, { message: "validation.city.max" }),
  province: z.string().trim().max(60, { message: "validation.province.max" }).optional(),
  postalCode: z.string().trim().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, { message: "validation.postalCode.max" }),
  country: z.string().trim().refine((country) => country.toLowerCase() === "canada", { message: "validation.country.unsupported" }).default("Canada"),
  note: z.string().trim().max(500, { message: "validation.note.max" }).optional().or(z.literal("")),
  lines: z.array(checkoutLineSchema).min(1, { message: "validation.cart.empty" }).max(100),
}).strict();
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Admin-controlled store availability and shipping rules. Values are integer CAD cents. */
export const storeSettingsSchema = z.object({
  enabled: z.boolean(),
  shippingFeeCents: z.number().int().min(0).max(500_000),
  freeShippingThresholdCents: z.number().int().min(0).max(5_000_000),
  reservationMinutes: z.number().int().min(30).max(60),
}).strict();
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

/** Admin: create or rename a bilingual retail category. */
export const storeCategorySchema = z.object({
  name: z.string().trim().min(2, { message: "validation.category.min" }).max(40, { message: "validation.category.max" }),
  nameFr: z.string().trim().max(40, { message: "validation.category.frenchMax" }).optional().or(z.literal("")),
}).strict();
export type StoreCategoryInput = z.infer<typeof storeCategorySchema>;

/** Admin: advance an order's status. */
export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"], {
    message: "validation.orderStatus.invalid",
  }),
}).strict();
export type OrderStatusInput = z.infer<typeof orderStatusSchema>;
