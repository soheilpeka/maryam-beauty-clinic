/** Route authorization and body limits use only prisma/test.db and mocked deliveries. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { closeTestDb, seedTestSalon, testDbUrl, useTestDb } from "@/tests/db";
import { csrfTokenFor, hashPassword } from "@/lib/auth";
import { resetRateLimiter } from "@/lib/rate-limit";

const deliveries = vi.hoisted(() => ({
  email: vi.fn().mockResolvedValue(undefined), sms: vi.fn().mockResolvedValue(undefined),
  contact: vi.fn().mockResolvedValue(undefined), receipt: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue([]), adminRequest: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/notifications", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/notifications")>(),
  notificationProvider: { sendEmail: deliveries.email, sendSms: deliveries.sms },
  sendContactMessage: deliveries.contact, sendRequestReceipt: deliveries.receipt,
  sendBookingNotifications: deliveries.confirm, notifyAdminNewRequest: deliveries.adminRequest,
}));

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Context = { params: Promise<{ id: string; ref: string }> };
type Handler = (request: NextRequest, context: Context) => Promise<Response>;
type RouteModule = Partial<Record<Method, Handler>>;
type RouteDefinition = { path: string; methods: Method[]; load: () => Promise<unknown> };

const adminRoutes: RouteDefinition[] = [
  { path: "session", methods: ["GET"], load: () => import("@/app/api/admin/session/route") },
  { path: "stats", methods: ["GET"], load: () => import("@/app/api/admin/stats/route") },
  { path: "customers", methods: ["GET"], load: () => import("@/app/api/admin/customers/route") },
  { path: "customers/[id]", methods: ["GET"], load: () => import("@/app/api/admin/customers/[id]/route") },
  { path: "requests", methods: ["GET"], load: () => import("@/app/api/admin/requests/route") },
  { path: "requests/[id]/confirm", methods: ["POST"], load: () => import("@/app/api/admin/requests/[id]/confirm/route") },
  { path: "requests/[id]/decline", methods: ["POST"], load: () => import("@/app/api/admin/requests/[id]/decline/route") },
  { path: "services", methods: ["GET", "POST"], load: () => import("@/app/api/admin/services/route") },
  { path: "services/[id]", methods: ["PATCH", "DELETE"], load: () => import("@/app/api/admin/services/[id]/route") },
  { path: "staff", methods: ["GET", "POST"], load: () => import("@/app/api/admin/staff/route") },
  { path: "staff/[id]", methods: ["GET", "PATCH", "DELETE"], load: () => import("@/app/api/admin/staff/[id]/route") },
  { path: "staff/[id]/schedule", methods: ["PUT"], load: () => import("@/app/api/admin/staff/[id]/schedule/route") },
  { path: "days-off", methods: ["GET", "POST"], load: () => import("@/app/api/admin/days-off/route") },
  { path: "days-off/[id]", methods: ["DELETE"], load: () => import("@/app/api/admin/days-off/[id]/route") },
  { path: "products", methods: ["GET", "POST"], load: () => import("@/app/api/admin/products/route") },
  { path: "products/[id]", methods: ["GET", "PATCH", "DELETE"], load: () => import("@/app/api/admin/products/[id]/route") },
  { path: "orders", methods: ["GET"], load: () => import("@/app/api/admin/orders/route") },
  { path: "orders/[id]", methods: ["GET"], load: () => import("@/app/api/admin/orders/[id]/route") },
  { path: "orders/[id]/status", methods: ["PATCH"], load: () => import("@/app/api/admin/orders/[id]/status/route") },
  { path: "packages", methods: ["GET", "POST"], load: () => import("@/app/api/admin/packages/route") },
  { path: "packages/[id]", methods: ["GET", "PATCH", "DELETE"], load: () => import("@/app/api/admin/packages/[id]/route") },
  { path: "gallery", methods: ["GET", "POST"], load: () => import("@/app/api/admin/gallery/route") },
  { path: "gallery/[id]", methods: ["PATCH", "DELETE"], load: () => import("@/app/api/admin/gallery/[id]/route") },
  { path: "comparisons", methods: ["GET", "POST"], load: () => import("@/app/api/admin/comparisons/route") },
  { path: "comparisons/[id]", methods: ["PATCH"], load: () => import("@/app/api/admin/comparisons/[id]/route") },
  { path: "logout", methods: ["POST"], load: () => import("@/app/api/admin/logout/route") },
];

const protectedCases = adminRoutes.flatMap(route => route.methods.map(method => ({ path: `/api/admin/${route.path}`, method })));
const mutationCases = protectedCases.filter(route => route.method !== "GET");
const adminBodyCases = mutationCases.filter(route => route.method !== "DELETE" && route.path !== "/api/admin/logout");
const publicBodyRoutes: RouteDefinition[] = [
  { path: "/api/admin/login", methods: ["POST"], load: () => import("@/app/api/admin/login/route") },
  { path: "/api/contact", methods: ["POST"], load: () => import("@/app/api/contact/route") },
  { path: "/api/bookings", methods: ["POST"], load: () => import("@/app/api/bookings/route") },
  { path: "/api/bookings/[ref]", methods: ["DELETE"], load: () => import("@/app/api/bookings/[ref]/route") },
  { path: "/api/store/orders", methods: ["POST"], load: () => import("@/app/api/store/orders/route") },
  { path: "/api/store/cart/quote", methods: ["POST"], load: () => import("@/app/api/store/cart/quote/route") },
];
const bodyCases = [...adminBodyCases, ...publicBodyRoutes.flatMap(route => route.methods.map(method => ({ path: route.path, method })))];
const handlers = new Map<string, RouteModule>();
const COOKIE = "security_matrix_session";
const EMAIL = "security-matrix-guest@example.test";
let prisma: PrismaClient;
let sessionToken: string;
let csrfToken: string;
let customerId: string;
let bookingId: string;
let baseline: Awaited<ReturnType<typeof databaseState>>;

function context(path: string): Context {
  const id = path.includes("/customers/") ? customerId : path.includes("/requests/") ? bookingId : "security-missing-record";
  return { params: Promise.resolve({ id, ref: "SECURITY-MATRIX-REQUEST" }) };
}

function request(path: string, method: Method, options: { authenticated?: boolean; csrf?: string; raw?: string; declaredLength?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.authenticated) headers.cookie = `${COOKIE}=${sessionToken}`;
  if (options.csrf !== undefined) headers["x-admin-csrf"] = options.csrf;
  if (options.declaredLength !== undefined) headers["content-length"] = options.declaredLength;
  const raw = method === "GET" ? undefined : options.raw ?? "{}";
  if (raw !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(`http://localhost:3000${path.replace("[id]", "security-record").replace("[ref]", "SECURITY-MATRIX-REQUEST")}`, { method, headers, body: raw });
}

async function call(path: string, method: Method, req: NextRequest) {
  const handler = handlers.get(path)?.[method];
  if (!handler) throw new Error(`Missing tested handler: ${method} ${path}`);
  return handler(req, context(path));
}

async function databaseState() {
  return {
    customer: await prisma.customer.findUnique({ where: { id: customerId }, select: { email: true, name: true, notes: true } }),
    booking: await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true, note: true } }),
    customers: await prisma.customer.count(), bookings: await prisma.booking.count(),
    packages: await prisma.package.count(), gallery: await prisma.galleryItem.count(),
    comparisons: await prisma.comparisonItem.count(), orders: await prisma.order.count(),
    audits: await prisma.auditLog.count(), sessions: await prisma.adminSession.count(),
  };
}

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", testDbUrl());
  vi.stubEnv("ADMIN_SESSION_COOKIE", COOKIE);
  vi.stubEnv("NOTIFICATION_PROVIDER", "mock");
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = undefined;
  prisma = await useTestDb();
  const salon = await seedTestSalon(prisma);
  const admin = await prisma.adminUser.upsert({
    where: { email: "security-matrix-admin@example.test" },
    update: {}, create: { email: "security-matrix-admin@example.test", passwordHash: await hashPassword("SyntheticMatrixPassword123!"), name: "Security Matrix Admin" },
  });
  const sessions = await import("@/lib/sessions");
  const session = await sessions.createSession(admin.id);
  sessionToken = session.token;
  csrfToken = csrfTokenFor(session.info.tokenHash);
  const customer = await prisma.customer.upsert({
    where: { email: EMAIL }, update: {},
    create: { email: EMAIL, name: "Synthetic Private Guest", phone: "+1 555 0101", notes: "Synthetic private note" },
  });
  customerId = customer.id;
  const booking = await prisma.booking.upsert({
    where: { ref: "SECURITY-MATRIX-REQUEST" }, update: { status: "PENDING" },
    create: { ref: "SECURITY-MATRIX-REQUEST", customerId, serviceId: salon.serviceId, staffId: salon.staffId, status: "PENDING", startUtc: new Date("2099-01-01T15:00:00Z"), endUtc: new Date("2099-01-01T16:00:00Z"), priceTotal: 10000 },
  });
  bookingId = booking.id;
  await prisma.storeSetting.upsert({ where: { id: "default" }, update: { enabled: true }, create: { id: "default", enabled: true } });
  for (const definition of [...adminRoutes, ...publicBodyRoutes]) {
    const path = definition.path.startsWith("/") ? definition.path : `/api/admin/${definition.path}`;
    handlers.set(path, await definition.load() as RouteModule);
  }
  baseline = await databaseState();
}, 30_000);

beforeEach(() => {
  resetRateLimiter();
  vi.clearAllMocks();
});
afterEach(() => {
  for (const send of Object.values(deliveries)) expect(send).not.toHaveBeenCalled();
});
afterAll(async () => {
  const routePrisma = (globalThis as unknown as { prisma?: PrismaClient }).prisma;
  await routePrisma?.$disconnect();
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = undefined;
  await closeTestDb();
  vi.unstubAllEnvs();
});

describe("admin authorization at the handler boundary", () => {
  it.each(protectedCases)("rejects anonymous $method $path without disclosing customer data", async ({ path, method }) => {
    const response = await call(path, method, request(path, method));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
    expect(JSON.stringify(body)).not.toContain(EMAIL);
    expect(JSON.stringify(body)).not.toContain(customerId);
  });

  it.each(mutationCases.flatMap(route => [
    { ...route, csrfKind: "missing", csrf: undefined },
    { ...route, csrfKind: "wrong", csrf: "invalid-csrf-token" },
  ]))("rejects $csrfKind CSRF on authenticated $method $path", async ({ path, method, csrf }) => {
    const response = await call(path, method, request(path, method, { authenticated: true, csrf }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "FORBIDDEN" });
  });

  it("allows authenticated customer reads without a mutation CSRF token", async () => {
    for (const path of ["/api/admin/customers", "/api/admin/customers/[id]"]) {
      const response = await call(path, "GET", request(path, "GET", { authenticated: true }));
      expect(response.status).toBe(200);
      expect(JSON.stringify(await response.json())).toContain(EMAIL);
    }
  });

  it("returns a CSRF token and minimal admin identity without returning the session bearer", async () => {
    const path = "/api/admin/session";
    const response = await call(path, "GET", request(path, "GET", { authenticated: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.csrfToken).toBe(csrfToken);
    expect(Object.keys(body.admin).sort()).toEqual(["email", "name", "role"]);
    expect(body).not.toHaveProperty("tokenHash");
    expect(JSON.stringify(body)).not.toContain(sessionToken);
  });
});

describe("bounded JSON decoding in route handlers", () => {
  it.each(bodyCases.flatMap(route => [
    { ...route, transport: "declared oversized length" },
    { ...route, transport: "oversized body without Content-Length" },
  ]))("rejects $transport before schema processing at $method $path", async ({ path, method, transport }) => {
    const declared = transport === "declared oversized length";
    const req = request(path, method, {
      authenticated: path.startsWith("/api/admin/") && path !== "/api/admin/login",
      csrf: csrfToken,
      raw: declared ? "{}" : JSON.stringify({ padding: "x".repeat(70 * 1024) }),
      declaredLength: declared ? String(70 * 1024) : undefined,
    });
    const response = await call(path, method, req);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "BAD_REQUEST" });
  });
});

it("rejected requests preserve customer, request, content, order and session data", async () => {
  expect(await databaseState()).toEqual(baseline);
});
