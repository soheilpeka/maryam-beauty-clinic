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