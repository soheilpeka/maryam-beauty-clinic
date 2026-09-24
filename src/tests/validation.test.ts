import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  adminLoginSchema,
  bookingRequestSchema,
  confirmRequestSchema,
  customerSchema,
  dayOffSchema,
  declineRequestSchema,
  flattenZodErrors,
  scheduleSchema,
  scheduleWindowSchema,
  serviceSchema,
  staffSchema,
} from "@/lib/validation";

/**
 * Unit tests for the shared Zod schemas. These are the same schemas the client validates
 * with before submit and the server validates again, so a behaviour change here is a
 * behaviour change in every form and every route. No database is involved.
 */

/** Run a schema against bad input and return its issues, asserting that it did fail. */
function issuesFor(schema: z.ZodType, value: unknown) {
  const parsed = schema.safeParse(value);
  expect(parsed.success).toBe(false);
  if (parsed.success) throw new Error("expected the schema to reject this input");
  return parsed.error.issues;
}

/** True when at least one issue touches the given path and carries the given message. */
function hasIssue(
  issues: z.ZodIssue[],
  path: (string | number)[],
  message?: string,
): boolean {
  return issues.some(
    (i) =>
      i.path.join(".") === path.join(".") &&
      (message === undefined || i.message === message),
  );
}

const validCustomer = {
  name: "Maryam Zahedi",
  email: "MARYAM@Example.COM",
  phone: "+1 (416) 555-0199",
  note: "Prefers a window seat.",
};

describe("customerSchema", () => {
  it("accepts a valid customer, trimming and lowercasing the email", () => {
    const parsed = customerSchema.safeParse(validCustomer);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.name).toBe("Maryam Zahedi");
    expect(parsed.data.email).toBe("maryam@example.com");
    expect(parsed.data.phone).toBe("+1 (416) 555-0199");
  });

  it("treats a missing note and an empty note the same way (optional)", () => {
    expect(customerSchema.safeParse({ ...validCustomer, note: "" }).success).toBe(true);
    const withoutNote = customerSchema.safeParse({ ...validCustomer, note: undefined });
    expect(withoutNote.success).toBe(true);
  });

  it("rejects a name shorter than 2 characters", () => {
    expect(hasIssue(issuesFor(customerSchema, { ...validCustomer, name: "M" }), ["name"], "validation.name.min")).toBe(true);
  });

  it("rejects a name longer than 80 characters", () => {
    expect(hasIssue(issuesFor(customerSchema, { ...validCustomer, name: "a".repeat(81) }), ["name"], "validation.name.max")).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(hasIssue(issuesFor(customerSchema, { ...validCustomer, email: "not-an-email" }), ["email"], "validation.email.invalid")).toBe(true);
  });

  it("rejects a phone with fewer than 7 characters", () => {
    expect(hasIssue(issuesFor(customerSchema, { ...validCustomer, phone: "123-45" }), ["phone"], "validation.phone.invalid")).toBe(true);
  });

  it("rejects a phone that contains letters", () => {
    expect(hasIssue(issuesFor(customerSchema, { ...validCustomer, phone: "416555abc9" }), ["phone"], "validation.phone.invalid")).toBe(true);
  });

  it("accepts an international phone with spaces, parentheses and a leading plus", () => {
    expect(customerSchema.safeParse({ ...validCustomer, phone: "+98 21 22 33 44 55" }).success).toBe(true);
  });

  it("rejects a note longer than 500 characters", () => {
    expect(hasIssue(issuesFor(customerSchema, { ...validCustomer, note: "a".repeat(501) }), ["note"], "validation.note.max")).toBe(true);
  });
});

describe("bookingRequestSchema", () => {
  const validRequest = {
    serviceId: "svc-1",
    staffId: "staff-1",
    dayKey: "2026-10-06",
    startMinutes: 540,
    customer: validCustomer,
  };

  it("accepts a well-formed request", () => {
    expect(bookingRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("requires a service and a staff id", () => {
    expect(hasIssue(issuesFor(bookingRequestSchema, { ...validRequest, serviceId: "" }), ["serviceId"], "validation.service.required")).toBe(true);
    expect(hasIssue(issuesFor(bookingRequestSchema, { ...validRequest, staffId: "" }), ["staffId"], "validation.staff.required")).toBe(true);
  });

  it("rejects a date that is not a YYYY-MM-DD day key", () => {
    expect(hasIssue(issuesFor(bookingRequestSchema, { ...validRequest, dayKey: "2026/10/06" }), ["dayKey"], "validation.date.invalid")).toBe(true);
    expect(hasIssue(issuesFor(bookingRequestSchema, { ...validRequest, dayKey: "2026-10-6" }), ["dayKey"], "validation.date.invalid")).toBe(true);
  });

  it("bounds startMinutes to a valid minute of day [0, 1439]", () => {
    expect(issuesFor(bookingRequestSchema, { ...validRequest, startMinutes: -1 }).length).toBeGreaterThan(0);
    expect(issuesFor(bookingRequestSchema, { ...validRequest, startMinutes: 1440 }).length).toBeGreaterThan(0);
    expect(bookingRequestSchema.safeParse({ ...validRequest, startMinutes: 0 }).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ ...validRequest, startMinutes: 1439 }).success).toBe(true);
  });

  it("rejects a fractional start time", () => {
    expect(issuesFor(bookingRequestSchema, { ...validRequest, startMinutes: 540.5 }).length).toBeGreaterThan(0);
  });

  it("surfaces nested customer errors under customer.<field>", () => {
    const issues = issuesFor(bookingRequestSchema, {
      ...validRequest,
      customer: { ...validCustomer, email: "nope" },
    });
    expect(hasIssue(issues, ["customer", "email"], "validation.email.invalid")).toBe(true);
  });
});

describe("confirmRequestSchema", () => {
  it("accepts a time adjust, with staffId optional", () => {
    expect(confirmRequestSchema.safeParse({ dayKey: "2026-10-06", startMinutes: 600 }).success).toBe(true);
    expect(confirmRequestSchema.safeParse({ dayKey: "2026-10-06", startMinutes: 600, staffId: "staff-1" }).success).toBe(true);
  });

  it("rejects a bad day key and out-of-range minutes", () => {
    expect(issuesFor(confirmRequestSchema, { dayKey: "tomorrow", startMinutes: 600 }).length).toBeGreaterThan(0);
    expect(issuesFor(confirmRequestSchema, { dayKey: "2026-10-06", startMinutes: 2000 }).length).toBeGreaterThan(0);
  });
});

describe("declineRequestSchema", () => {
  it("accepts an absent reason and an empty reason", () => {
    expect(declineRequestSchema.safeParse({}).success).toBe(true);
    expect(declineRequestSchema.safeParse({ reason: "" }).success).toBe(true);
    expect(declineRequestSchema.safeParse({ reason: "Fully booked that day." }).success).toBe(true);
  });

  it("rejects a reason longer than 500 characters", () => {
    expect(hasIssue(issuesFor(declineRequestSchema, { reason: "a".repeat(501) }), ["reason"], "validation.note.max")).toBe(true);
  });
});

describe("adminLoginSchema", () => {
  it("normalizes the email before validating it", () => {
    const parsed = adminLoginSchema.safeParse({ email: "ADMIN@Clinic.COM", password: "hunter2hunter2" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.email).toBe("admin@clinic.com");
  });

  it("rejects a short password and a malformed email", () => {
    expect(hasIssue(issuesFor(adminLoginSchema, { email: "admin@clinic.com", password: "short" }), ["password"], "validation.password.min")).toBe(true);
    expect(hasIssue(issuesFor(adminLoginSchema, { email: "admin@", password: "hunter2hunter2" }), ["email"], "validation.email.invalid")).toBe(true);
  });
});

describe("serviceSchema", () => {
  const validService = {
    name: "LED Light Therapy",
    description: "Calming light facial.",
    price: 8500,
    duration: 30,
  };

  it("accepts a valid service with optional fields", () => {
    expect(serviceSchema.safeParse(validService).success).toBe(true);
    expect(serviceSchema.safeParse({ ...validService, bufferMin: 10, category: "Facials", active: false }).success).toBe(true);
  });

  it("rejects a negative or absurd price", () => {
    expect(hasIssue(issuesFor(serviceSchema, { ...validService, price: -1 }), ["price"], "validation.price.invalid")).toBe(true);
    expect(hasIssue(issuesFor(serviceSchema, { ...validService, price: 1_000_001 }), ["price"], "validation.price.invalid")).toBe(true);
  });

  it("rejects a duration outside 5..480 minutes", () => {
    expect(hasIssue(issuesFor(serviceSchema, { ...validService, duration: 4 }), ["duration"], "validation.duration.invalid")).toBe(true);
    expect(hasIssue(issuesFor(serviceSchema, { ...validService, duration: 481 }), ["duration"], "validation.duration.invalid")).toBe(true);
  });

  it("rejects a buffer outside 0..240 minutes", () => {
    expect(hasIssue(issuesFor(serviceSchema, { ...validService, bufferMin: -5 }), ["bufferMin"], "validation.buffer.invalid")).toBe(true);
    expect(hasIssue(issuesFor(serviceSchema, { ...validService, bufferMin: 241 }), ["bufferMin"], "validation.buffer.invalid")).toBe(true);
  });
});

describe("staffSchema", () => {
  const validStaff = { name: "Ana Costa", role: "Esthetician", serviceIds: ["svc-1"] };

  it("accepts a valid specialist and trims the name", () => {
    const parsed = staffSchema.safeParse({ ...validStaff, name: "  Ana Costa  " });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.name).toBe("Ana Costa");
  });

  it("rejects a non-URL avatar", () => {
    expect(hasIssue(issuesFor(staffSchema, { ...validStaff, avatarUrl: "ana-photo" }), ["avatarUrl"], "validation.url.invalid")).toBe(true);
  });

  it("accepts an empty-string avatar as 'none'", () => {
    expect(staffSchema.safeParse({ ...validStaff, avatarUrl: "" }).success).toBe(true);
  });

  it("rejects an empty service id inside the serviceIds array", () => {
    const issues = issuesFor(staffSchema, { ...validStaff, serviceIds: ["svc-1", ""] });
    expect(issues.some((i) => i.path.join(".").startsWith("serviceIds"))).toBe(true);
  });
});

describe("scheduleWindowSchema", () => {
  const validWindow = {
    dayOfWeek: 2,
    startTime: 600,
    endTime: 1080,
    breaks: [{ startTime: 780, endTime: 840 }],
  };

  it("accepts a window with a break inside it", () => {
    expect(scheduleWindowSchema.safeParse(validWindow).success).toBe(true);
    expect(scheduleWindowSchema.safeParse({ ...validWindow, breaks: undefined }).success).toBe(true);
  });

  it("rejects a window whose end is not after its start", () => {
    expect(hasIssue(issuesFor(scheduleWindowSchema, { ...validWindow, endTime: 600 }), ["endTime"], "validation.time.order")).toBe(true);
    expect(hasIssue(issuesFor(scheduleWindowSchema, { ...validWindow, endTime: 599 }), ["endTime"], "validation.time.order")).toBe(true);
  });

  it("rejects a break whose end is not after its start", () => {
    expect(hasIssue(issuesFor(scheduleWindowSchema, { ...validWindow, breaks: [{ startTime: 800, endTime: 800 }] }), ["breaks", "endTime"], "validation.time.order")).toBe(true);
  });

  it("rejects a break that falls outside its window", () => {
    expect(hasIssue(issuesFor(scheduleWindowSchema, { ...validWindow, breaks: [{ startTime: 500, endTime: 700 }] }), ["breaks"], "validation.time.invalid")).toBe(true);
    expect(hasIssue(issuesFor(scheduleWindowSchema, { ...validWindow, breaks: [{ startTime: 1000, endTime: 1200 }] }), ["breaks"], "validation.time.invalid")).toBe(true);
  });
});

describe("scheduleSchema", () => {
  it("caps a weekly schedule at 56 windows (8 per day)", () => {
    const windows = Array.from({ length: 57 }, (_, i) => ({
      dayOfWeek: i % 7,
      startTime: 600,
      endTime: 700,
    }));
    expect(issuesFor(scheduleSchema, { windows }).length).toBeGreaterThan(0);
    expect(scheduleSchema.safeParse({ windows: windows.slice(0, 56) }).success).toBe(true);
  });
});

describe("dayOffSchema", () => {
  it("accepts a full day off with no minutes", () => {
    expect(dayOffSchema.safeParse({ dayKey: "2026-12-25" }).success).toBe(true);
    expect(dayOffSchema.safeParse({ dayKey: "2026-12-25", staffId: "staff-1" }).success).toBe(true);
  });

  it("accepts a partial day off whose end is after its start", () => {
    expect(dayOffSchema.safeParse({ dayKey: "2026-12-25", startMin: 600, endMin: 900 }).success).toBe(true);
  });

  it("rejects a partial day off whose end is not after its start", () => {
    expect(hasIssue(issuesFor(dayOffSchema, { dayKey: "2026-12-25", startMin: 900, endMin: 900 }), ["endMin"], "validation.time.order")).toBe(true);
    expect(hasIssue(issuesFor(dayOffSchema, { dayKey: "2026-12-25", startMin: 900, endMin: 600 }), ["endMin"], "validation.time.order")).toBe(true);
  });
});

describe("flattenZodErrors", () => {
  it("turns a failed parse into a {field: messageKey} map", () => {
    const parsed = customerSchema.safeParse({
      name: "M",
      email: "nope",
      phone: "12",
    });
    if (parsed.success) throw new Error("expected failure");
    const map = flattenZodErrors(parsed);
    expect(map.name).toBe("validation.name.min");
    expect(map.email).toBe("validation.email.invalid");
    expect(map.phone).toBe("validation.phone.invalid");
  });

  it("keeps only the first issue for a field that has several", () => {
    // An over-long note also has the note path, but only one key survives per field.
    const parsed = customerSchema.safeParse({ name: "M", email: "nope", phone: "12", note: "a".repeat(600) });
    if (parsed.success) throw new Error("expected failure");
    const map = flattenZodErrors(parsed);
    expect(Object.keys(map).sort()).toEqual(["email", "name", "note", "phone"]);
  });

  it("strips array indices so repeated array errors collapse to one field key", () => {
    const parsed = staffSchema.safeParse({ name: "Ana Costa", serviceIds: ["svc-1", "", ""] });
    if (parsed.success) throw new Error("expected failure");
    const map = flattenZodErrors(parsed);
    expect(map.serviceIds).toBeDefined();
    expect(Object.keys(map)).toEqual(["serviceIds"]);
  });

  it("falls back to a form-level key for a whole-body issue", () => {
    const wholeBody = z.object({ a: z.string() }).superRefine((_v, ctx) => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.form.closed" });
    });
    const parsed = wholeBody.safeParse({ a: "ok" });
    if (parsed.success) throw new Error("expected failure");
    expect(flattenZodErrors(parsed)).toEqual({ form: "validation.form.closed" });
  });
});
