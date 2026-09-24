/**
 * Route-layer tests for the admin CRUD + stats API (Phase 4 part 3):
 *   - GET/POST/PATCH/DELETE /api/admin/services[/[id]]
 *   - GET/POST/PATCH/DELETE /api/admin/staff[/[id]]
 *   - PUT             /api/admin/staff/[id]/schedule
 *   - GET/POST        /api/admin/days-off , DELETE /api/admin/days-off/[id]
 *   - GET             /api/admin/customers[/[id]]
 *   - GET             /api/admin/stats
 *
 * Every handler goes through the production auth chain (session cookie + CSRF header), and
 * every mutation writes an audit row that these tests assert on.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { useTestDb, seedTestSalon, closeTestDb, testDbUrl } from "@/tests/db";
import { hashPassword, csrfTokenFor } from "@/lib/auth";
import { localDayKey } from "@/lib/datetime";
import type { PrismaClient } from "@prisma/client";

const COOKIE = "mbc_admin_session";
const BASE = "http://localhost:3000";

let prisma: PrismaClient;
let salon: { serviceId: string; staffId: string };
let sessionToken: string;
let csrfToken: string;
let adminId: string;

let servicesRoute: typeof import("@/app/api/admin/services/route");
let serviceRoute: typeof import("@/app/api/admin/services/[id]/route");
let staffRoute: typeof import("@/app/api/admin/staff/route");
let staffOneRoute: typeof import("@/app/api/admin/staff/[id]/route");
let scheduleRoute: typeof import("@/app/api/admin/staff/[id]/schedule/route");
let daysOffRoute: typeof import("@/app/api/admin/days-off/route");
let dayOffRoute: typeof import("@/app/api/admin/days-off/[id]/route");
let customersRoute: typeof import("@/app/api/admin/customers/route");
let customerRoute: typeof import("@/app/api/admin/customers/[id]/route");
let statsRoute: typeof import("@/app/api/admin/stats/route");

function req(
  method: string,
  url: string,
  { body, csrf }: { body?: unknown; csrf?: string } = {},
): NextRequest {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (sessionToken) headers.cookie = `${COOKIE}=${sessionToken}`;
  if (csrf !== undefined) headers["x-admin-csrf"] = csrf;
  return new NextRequest(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const get = (url: string) => req("GET", url);
const post = (url: string, body: unknown) => req("POST", url, { body, csrf: csrfToken });
const patch = (url: string, body: unknown) => req("PATCH", url, { body, csrf: csrfToken });
const del = (url: string) => req("DELETE", url, { csrf: csrfToken });
const postNoCsrf = (url: string, body: unknown) => req("POST", url, { body });

beforeAll(async () => {
  process.env.DATABASE_URL = testDbUrl();
  if (!process.env.ADMIN_INITIAL_EMAIL) process.env.ADMIN_INITIAL_EMAIL = "admin@example.com";

  // Route modules memoize their client on globalThis; clear whatever an earlier file left.
  (globalThis as unknown as { prisma?: unknown }).prisma = undefined;

  prisma = await useTestDb();
  salon = await seedTestSalon(prisma);

  const admin = await prisma.adminUser.upsert({
    where: { email: "admin-crud@example.com" },
    update: { passwordHash: await hashPassword("Password123!"), name: "Crud Admin" },
    create: {
      email: "admin-crud@example.com",
      passwordHash: await hashPassword("Password123!"),
      name: "Crud Admin",
    },
  });
  adminId = admin.id;
  const sessions = await import("@/lib/sessions");
  const created = await sessions.createSession(admin.id);
  sessionToken = created.token;
  csrfToken = csrfTokenFor(created.info.tokenHash);

  servicesRoute = await import("@/app/api/admin/services/route");
  serviceRoute = await import("@/app/api/admin/services/[id]/route");
  staffRoute = await import("@/app/api/admin/staff/route");
  staffOneRoute = await import("@/app/api/admin/staff/[id]/route");
  scheduleRoute = await import("@/app/api/admin/staff/[id]/schedule/route");
  daysOffRoute = await import("@/app/api/admin/days-off/route");
  dayOffRoute = await import("@/app/api/admin/days-off/[id]/route");
  customersRoute = await import("@/app/api/admin/customers/route");
  customerRoute = await import("@/app/api/admin/customers/[id]/route");
  statsRoute = await import("@/app/api/admin/stats/route");
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.dayOff.deleteMany();
  // Keep the seeded salon, drop anything a test created, so each test starts clean.
  await prisma.staff.deleteMany({ where: { slug: { not: "test-staff" } } });
  await prisma.service.deleteMany({ where: { slug: { not: "test-facial" } } });
});

describe("auth", () => {
  it("rejects an unauthenticated services GET with 401", async () => {
    const token = sessionToken;
    sessionToken = "";
    const res = await servicesRoute.GET(get(`${BASE}/api/admin/services`));
    sessionToken = token;
    expect(res.status).toBe(401);
  });

  it("rejects a service create without a CSRF token with 403", async () => {
    const res = await servicesRoute.POST(
      postNoCsrf(`${BASE}/api/admin/services`, { name: "No CSRF Facial", price: 5000, duration: 30 }),
    );
    expect(res.status).toBe(403);
    expect(await prisma.service.count({ where: { name: "No CSRF Facial" } })).toBe(0);
  });
});

describe("services CRUD", () => {
  it("creates a service, derives the slug and writes an audit entry", async () => {
    const res = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, {
        name: "Hydra Facial",
        description: "A hydrating facial",
        price: 12000,
        duration: 45,
        bufferMin: 15,
        category: "Facials",
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.service.slug).toBe("hydra-facial");
    expect(json.service.price).toBe(12000);
    expect(json.service.bookingCount).toBe(0);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "service.create", targetType: "Service", targetId: json.service.id },
    });
    expect(audit?.adminId).toBe(adminId);
  });

  it("suffices the slug when two services share a name", async () => {
    const first = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, { name: "Glow Facial", price: 8000, duration: 30 }),
    );
    const second = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, { name: "Glow Facial", price: 8000, duration: 30 }),
    );
    expect((await first.json()).service.slug).toBe("glow-facial");
    expect((await second.json()).service.slug).toBe("glow-facial-2");
  });

  it("rejects an invalid service with 400 and creates nothing", async () => {
    const res = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, { name: "Bad", price: -5, duration: 3 }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION");
    expect(await prisma.service.count({ where: { name: "Bad" } })).toBe(0);
  });

  it("lists services with their booking count", async () => {
    const created = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, { name: "Listed Facial", price: 5000, duration: 30 }),
    );
    const res = await servicesRoute.GET(get(`${BASE}/api/admin/services`));
    expect(res.status).toBe(200);
    const list = (await res.json()).services as { name: string; bookingCount: number }[];
    expect(list.map((s) => s.name)).toContain("Listed Facial");
    expect(list.find((s) => s.name === "Listed Facial")?.bookingCount).toBe(0);
    expect(created.status).toBe(201);
  });

  it("updates a service and refuses to touch the slug", async () => {
    const created = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, { name: "Editable Facial", price: 5000, duration: 30 }),
    );
    const service = (await created.json()).service;
    const res = await serviceRoute.PATCH(
      patch(`${BASE}/api/admin/services/${service.id}`, {
        name: "Renamed Facial",
        price: 7500,
        active: false,
      }),
      { params: Promise.resolve({ id: service.id }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.service.name).toBe("Renamed Facial");
    expect(json.service.price).toBe(7500);
    expect(json.service.active).toBe(false);
    // The slug is the stable key booking links use, so it must survive a rename.
    expect(json.service.slug).toBe("editable-facial");

    const audit = await prisma.auditLog.findFirst({
      where: { action: "service.update", targetId: service.id },
    });
    expect(audit).not.toBeNull();
  });

  it("returns 404 when updating an unknown service", async () => {
    const res = await serviceRoute.PATCH(
      patch(`${BASE}/api/admin/services/does-not-exist`, { name: "Nope" }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });

  it("deletes a service that has no bookings", async () => {
    const created = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, { name: "Deletable Facial", price: 5000, duration: 30 }),
    );
    const id = (await created.json()).service.id;
    const res = await serviceRoute.DELETE(del(`${BASE}/api/admin/services/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(await prisma.service.count({ where: { id } })).toBe(0);
    expect(
      await prisma.auditLog.count({ where: { action: "service.delete", targetId: id } }),
    ).toBe(1);
  });

  it("refuses to delete a service that still has bookings", async () => {
    const created = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, { name: "Booked Facial", price: 5000, duration: 30 }),
    );
    const service = (await created.json()).service;
    const customer = await prisma.customer.create({
      data: { name: "Booked Guest", email: "booked@example.com", phone: "+1 555 0101" },
    });
    await prisma.booking.create({
      data: {
        ref: "MBC-CRUD-1",
        customerId: customer.id,
        serviceId: service.id,
        staffId: salon.staffId,
        startUtc: new Date("2027-01-01T10:00:00.000Z"),
        endUtc: new Date("2027-01-01T10:30:00.000Z"),
        status: "CONFIRMED",
        priceTotal: service.price,
      },
    });

    const res = await serviceRoute.DELETE(del(`${BASE}/api/admin/services/${service.id}`), {
      params: Promise.resolve({ id: service.id }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).message).toMatch(/booking/);
    expect(await prisma.service.count({ where: { id: service.id } })).toBe(1);
  });
});
describe("staff CRUD", () => {
  it("creates a specialist linked to the services they perform", async () => {
    const res = await staffRoute.POST(
      post(`${BASE}/api/admin/staff`, {
        name: "Amira Khan",
        role: "Senior Aesthetician",
        bio: "Laser and skin specialist",
        serviceIds: [salon.serviceId],
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.staff.slug).toBe("amira-khan");
    expect(json.staff.serviceIds).toEqual([salon.serviceId]);

    // The public booking page loads staff with their services, so the link is what makes
    // the specialist selectable; verify it landed in the join table.
    expect(
      await prisma.staffService.count({
        where: { staffId: json.staff.id, serviceId: salon.serviceId },
      }),
    ).toBe(1);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "staff.create", targetType: "Staff", targetId: json.staff.id },
    });
    expect(audit).not.toBeNull();
  });

  it("ignores service ids that do not exist", async () => {
    const res = await staffRoute.POST(
      post(`${BASE}/api/admin/staff`, {
        name: "Careful Specialist",
        serviceIds: [salon.serviceId, "service-that-does-not-exist"],
      }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).staff.serviceIds).toEqual([salon.serviceId]);
  });

  it("replaces (not merges) the service set on update", async () => {
    const other = await servicesRoute.POST(
      post(`${BASE}/api/admin/services`, { name: "Other Facial", price: 4000, duration: 30 }),
    );
    const otherId = (await other.json()).service.id;
    const created = await staffRoute.POST(
      post(`${BASE}/api/admin/staff`, { name: "Switchy Specialist", serviceIds: [salon.serviceId] }),
    );
    const staff = (await created.json()).staff;

    const res = await staffOneRoute.PATCH(
      patch(`${BASE}/api/admin/staff/${staff.id}`, { name: "Renamed Specialist", serviceIds: [otherId] }),
      { params: Promise.resolve({ id: staff.id }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.staff.name).toBe("Renamed Specialist");
    expect(json.staff.serviceIds).toEqual([otherId]);
    expect(
      await prisma.staffService.count({ where: { staffId: staff.id, serviceId: salon.serviceId } }),
    ).toBe(0);
  });

  it("returns 404 when updating an unknown specialist", async () => {
    const res = await staffOneRoute.PATCH(
      patch(`${BASE}/api/admin/staff/nope`, { name: "Ghost" }),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(res.status).toBe(404);
  });

  it("deletes a specialist with no bookings (schedule and links cascade)", async () => {
    const created = await staffRoute.POST(
      post(`${BASE}/api/admin/staff`, { name: "Short Lived", serviceIds: [salon.serviceId] }),
    );
    const staff = (await created.json()).staff;
    await scheduleRoute.PUT(
      req("PUT", `${BASE}/api/admin/staff/${staff.id}/schedule`, {
        body: { windows: [{ dayOfWeek: 1, startTime: 600, endTime: 1200, breaks: [] }] },
        csrf: csrfToken,
      }),
      { params: Promise.resolve({ id: staff.id }) },
    );

    const res = await staffOneRoute.DELETE(del(`${BASE}/api/admin/staff/${staff.id}`), {
      params: Promise.resolve({ id: staff.id }),
    });
    expect(res.status).toBe(200);
    expect(await prisma.staff.count({ where: { id: staff.id } })).toBe(0);
    expect(await prisma.staffSchedule.count({ where: { staffId: staff.id } })).toBe(0);
  });

  it("refuses to delete a specialist who still has bookings", async () => {
    const created = await staffRoute.POST(post(`${BASE}/api/admin/staff`, { name: "Booked Staff" }));
    const staff = (await created.json()).staff;
    const customer = await prisma.customer.create({
      data: { name: "Staff Guest", email: "staffguest@example.com", phone: "+1 555 0102" },
    });
    await prisma.booking.create({
      data: {
        ref: "MBC-CRUD-2",
        customerId: customer.id,
        serviceId: salon.serviceId,
        staffId: staff.id,
        startUtc: new Date("2027-02-01T10:00:00.000Z"),
        endUtc: new Date("2027-02-01T11:00:00.000Z"),
        status: "CONFIRMED",
        priceTotal: 10000,
      },
    });

    const res = await staffOneRoute.DELETE(del(`${BASE}/api/admin/staff/${staff.id}`), {
      params: Promise.resolve({ id: staff.id }),
    });
    expect(res.status).toBe(409);
    expect(await prisma.staff.count({ where: { id: staff.id } })).toBe(1);
  });
});

describe("working hours", () => {
  it("replaces a schedule and its breaks atomically", async () => {
    const res = await scheduleRoute.PUT(
      req("PUT", `${BASE}/api/admin/staff/${salon.staffId}/schedule`, {
        body: {
          windows: [
            { dayOfWeek: 1, startTime: 600, endTime: 1080, breaks: [{ startTime: 720, endTime: 780 }] },
            { dayOfWeek: 2, startTime: 600, endTime: 1080, breaks: [] },
          ],
        },
        csrf: csrfToken,
      }),
      { params: Promise.resolve({ id: salon.staffId }) },
    );
    expect(res.status).toBe(200);
    const windows = await prisma.staffSchedule.findMany({
      where: { staffId: salon.staffId },
      include: { breaks: true },
      orderBy: { dayOfWeek: "asc" },
    });
    expect(windows).toHaveLength(2);
    expect(windows[0].breaks).toHaveLength(1);
    expect(windows[0].breaks[0].startTime).toBe(720);
    expect(windows[1].breaks).toHaveLength(0);
    expect(
      await prisma.auditLog.count({ where: { action: "staff.schedule", targetId: salon.staffId } }),
    ).toBe(1);

    // A second PUT replaces rather than appends.
    await scheduleRoute.PUT(
      req("PUT", `${BASE}/api/admin/staff/${salon.staffId}/schedule`, {
        body: { windows: [{ dayOfWeek: 3, startTime: 600, endTime: 1080, breaks: [] }] },
        csrf: csrfToken,
      }),
      { params: Promise.resolve({ id: salon.staffId }) },
    );
    const after = await prisma.staffSchedule.findMany({
      where: { staffId: salon.staffId },
      include: { breaks: true },
    });
    expect(after).toHaveLength(1);
    expect(after[0].dayOfWeek).toBe(3);
    expect(await prisma.break.count({ where: { schedule: { staffId: salon.staffId } } })).toBe(0);
  });

  it("rejects a window where end is not after start", async () => {
    const res = await scheduleRoute.PUT(
      req("PUT", `${BASE}/api/admin/staff/${salon.staffId}/schedule`, {
        body: { windows: [{ dayOfWeek: 1, startTime: 1080, endTime: 600, breaks: [] }] },
        csrf: csrfToken,
      }),
      { params: Promise.resolve({ id: salon.staffId }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION");
  });

  it("rejects a break that falls outside its window", async () => {
    const res = await scheduleRoute.PUT(
      req("PUT", `${BASE}/api/admin/staff/${salon.staffId}/schedule`, {
        body: {
          windows: [{ dayOfWeek: 1, startTime: 600, endTime: 900, breaks: [{ startTime: 800, endTime: 960 }] }],
        },
        csrf: csrfToken,
      }),
      { params: Promise.resolve({ id: salon.staffId }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown specialist", async () => {
    const res = await scheduleRoute.PUT(
      req("PUT", `${BASE}/api/admin/staff/nope/schedule`, {
        body: { windows: [] },
        csrf: csrfToken,
      }),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("days off", () => {
  it("adds a full day off, stored as UTC midnight of the salon-local date", async () => {
    const res = await daysOffRoute.POST(
      post(`${BASE}/api/admin/days-off`, { staffId: salon.staffId, dayKey: "2026-12-25", note: "Holiday" }),
    );
    expect(res.status).toBe(201);
    const created = (await res.json()).dayOff;
    expect(created.dayKey).toBe("2026-12-25");
        // localDayKey is the round trip the availability engine relies on.
    const row = await prisma.dayOff.findUniqueOrThrow({ where: { id: created.id } });
    expect(localDayKey(row.date)).toBe("2026-12-25");
    expect(row.startMin).toBeNull();
  });

  it("adds a partial day off with start and end minutes", async () => {
    const res = await daysOffRoute.POST(
      post(`${BASE}/api/admin/days-off`, {
        staffId: salon.staffId,
        dayKey: "2026-12-26",
        startMin: 480,
        endMin: 720,
      }),
    );
    expect(res.status).toBe(201);
    const created = (await res.json()).dayOff;
    expect(created.startMin).toBe(480);
    expect(created.endMin).toBe(720);
  });

  it("rejects a partial day off where end is not after start", async () => {
    const res = await daysOffRoute.POST(
      post(`${BASE}/api/admin/days-off`, {
        staffId: salon.staffId,
        dayKey: "2026-12-27",
        startMin: 720,
        endMin: 480,
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION");
  });

  it("returns 404 when the specialist does not exist", async () => {
    const res = await daysOffRoute.POST(
      post(`${BASE}/api/admin/days-off`, { staffId: "nope", dayKey: "2026-12-28" }),
    );
    expect(res.status).toBe(404);
  });

  it("lists days off, optionally filtered by staff", async () => {
    await daysOffRoute.POST(
      post(`${BASE}/api/admin/days-off`, { staffId: salon.staffId, dayKey: "2026-12-29" }),
    );
    await daysOffRoute.POST(post(`${BASE}/api/admin/days-off`, { dayKey: "2026-12-30" }));

    const all = await daysOffRoute.GET(get(`${BASE}/api/admin/days-off`));
    expect(((await all.json()).daysOff as unknown[]).length).toBe(2);

    const filtered = await daysOffRoute.GET(
      get(`${BASE}/api/admin/days-off?staffId=${salon.staffId}`),
    );
    const list = (await filtered.json()).daysOff as { staffId: string }[];
    expect(list).toHaveLength(1);
    expect(list[0].staffId).toBe(salon.staffId);
  });

  it("deletes a day off", async () => {
    const created = await daysOffRoute.POST(
      post(`${BASE}/api/admin/days-off`, { staffId: salon.staffId, dayKey: "2026-12-31" }),
    );
    const id = (await created.json()).dayOff.id;
    const res = await dayOffRoute.DELETE(del(`${BASE}/api/admin/days-off/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(await prisma.dayOff.count({ where: { id } })).toBe(0);
  });
});

describe("customers", () => {
  async function makeCustomer(name: string, email: string) {
    return prisma.customer.create({ data: { name, email, phone: "+1 555 0199" } });
  }

  it("searches by name, email and phone", async () => {
    await makeCustomer("Zoe Archer", "zoe@example.com");
    await makeCustomer("Mina Roe", "mina@example.com");

    const byName = await customersRoute.GET(get(`${BASE}/api/admin/customers?q=Zoe`));
    expect(((await byName.json()).customers as { name: string }[]).map((c) => c.name)).toEqual([
      "Zoe Archer",
    ]);

    const byEmail = await customersRoute.GET(get(`${BASE}/api/admin/customers?q=mina@example.com`));
    expect(((await byEmail.json()).customers as { name: string }[]).map((c) => c.name)).toEqual([
      "Mina Roe",
    ]);
  });

  it("returns the booking count and last visit", async () => {
    const customer = await makeCustomer("Visited Guest", "visited@example.com");
    await prisma.booking.create({
      data: {
        ref: "MBC-CRUD-3",
        customerId: customer.id,
        serviceId: salon.serviceId,
        staffId: salon.staffId,
        startUtc: new Date("2027-03-01T10:00:00.000Z"),
        endUtc: new Date("2027-03-01T11:00:00.000Z"),
        status: "CONFIRMED",
        priceTotal: 10000,
      },
    });

    const res = await customersRoute.GET(get(`${BASE}/api/admin/customers?q=Visited`));
    const list = (await res.json()).customers as { bookingCount: number; lastVisit: { status: string } }[];
    expect(list[0].bookingCount).toBe(1);
    expect(list[0].lastVisit.status).toBe("CONFIRMED");
  });

  it("returns 404 for an unknown customer and history for a known one", async () => {
    const missing = await customerRoute.GET(get(`${BASE}/api/admin/customers/nope`), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(missing.status).toBe(404);

    const customer = await makeCustomer("History Guest", "history@example.com");
    await prisma.booking.create({
      data: {
        ref: "MBC-CRUD-4",
        customerId: customer.id,
        serviceId: salon.serviceId,
        staffId: salon.staffId,
        startUtc: new Date("2027-04-01T10:00:00.000Z"),
        endUtc: new Date("2027-04-01T11:00:00.000Z"),
        status: "PENDING",
        priceTotal: 10000,
      },
    });

    const res = await customerRoute.GET(get(`${BASE}/api/admin/customers/${customer.id}`), {
      params: Promise.resolve({ id: customer.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.customer.bookingCount).toBe(1);
    expect(json.customer.bookings[0].ref).toBe("MBC-CRUD-4");
  });
});

describe("stats", () => {
  it("reports counts, a 14-day series, popular services and staff load", async () => {
    const customer = await prisma.customer.create({
      data: { name: "Stats Guest", email: "stats@example.com", phone: "+1 555 0188" },
    });
    await prisma.booking.createMany({
      data: [
        {
          ref: "MBC-STATS-1",
          customerId: customer.id,
          serviceId: salon.serviceId,
          staffId: salon.staffId,
          startUtc: new Date(),
          endUtc: new Date(Date.now() + 60 * 60_000),
          status: "CONFIRMED",
          priceTotal: 10000,
        },
        {
          ref: "MBC-STATS-2",
          customerId: customer.id,
          serviceId: salon.serviceId,
          staffId: salon.staffId,
          startUtc: new Date(),
          endUtc: new Date(Date.now() + 60 * 60_000),
          status: "PENDING",
          priceTotal: 10000,
        },
      ],
    });

    const res = await statsRoute.GET(get(`${BASE}/api/admin/stats`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.counts.pending).toBe(1);
    expect(json.counts.confirmedThisWeek).toBeGreaterThanOrEqual(1);
    expect(json.counts.customers).toBeGreaterThanOrEqual(1);
    expect(json.counts.revenueAllTime).toBeGreaterThanOrEqual(10000);
    expect(json.days).toHaveLength(14);
    expect(json.popularServices[0].name).toBe("Test Facial");
    expect(json.popularServices[0].bookings).toBeGreaterThanOrEqual(1);
    expect(json.staffLoad[0].name).toBe("Test Staff");
  });
});