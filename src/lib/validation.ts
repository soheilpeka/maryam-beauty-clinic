import { z } from "zod";

/** Phone: accept digits, spaces, +, -, parentheses; must contain 7+ digits. */
const phoneRegex = /^[+]?[\d\s()-]{7,}$/;

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
    .email({ message: "validation.email.invalid" }),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, { message: "validation.phone.invalid" }),
  note: z.string().trim().max(500, { message: "validation.note.max" }).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/** Public request submission: a preferred date + preferred time, no computed slots. */
export const bookingRequestSchema = z.object({
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
  email: z.string().trim().toLowerCase().email({ message: "validation.email.invalid" }),
  password: z.string().min(8, { message: "validation.password.min" }),
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
  description: z
    .string()
    .trim()
    .max(500, { message: "validation.note.max" })
    .optional()
    .or(z.literal("")),
  price: z
    .number()
    .int()
    .min(0, { message: "validation.price.invalid" })
    .max(1_000_000, { message: "validation.price.invalid" }),
  duration: z
    .number()
    .int()
    .min(5, { message: "validation.duration.invalid" })
    .max(480, { message: "validation.duration.invalid" }),
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
  active: z.boolean().optional(),
});
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
  avatarUrl: z
    .string()
    .trim()
    .url({ message: "validation.url.invalid" })
    .optional()
    .or(z.literal("")),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string().min(1)).max(64).optional(),
});
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