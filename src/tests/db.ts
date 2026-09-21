/**
 * Test database helpers.
 *
 * Tests run against a throwaway SQLite file (prisma/test.db) whose schema is created
 * from the Prisma schema, so the production dev.db is never touched. Each test file
 * that needs the DB calls useTestDb() once; seedTestSalon() installs a minimal,
 * deterministic salon (1 service, 1 staff, Tue-Sat schedule with a lunch break) that
 * the booking tests build on.
 *
 * Schema creation is deliberately non-destructive: the DB file is never deleted while a
 * connection may still hold it open (deleting an open SQLite file on Windows leaves the
 * table data alive for that handle, which makes a subsequent "prisma db push" fail with
 * "table already exists" - and can crash the native libsql binding). Instead the tables
 * are probed and the schema is only pushed when it is missing or out of date.
 */
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(process.cwd(), "prisma", "test.db");
const SCHEMA_HASH_PATH = path.join(process.cwd(), "prisma", "test.schema-hash");
const SCHEMA_PATH = path.join(process.cwd(), "prisma", "schema.prisma");

let client: PrismaClient | null = null;

/** Hash of prisma/schema.prisma, so a schema change invalidates a cached test DB. */
function schemaHash(): string {
  return createHash("sha1").update(fs.readFileSync(SCHEMA_PATH, "utf8")).digest("hex");
}

/**
 * True once the test DB has our tables. @libsql/client is already a dependency (it backs
 * the Prisma driver adapter) and it creates an empty file if none exists, so this doubles
 * as "the database exists".
 */
async function schemaApplied(): Promise<boolean> {
  const probe = createClient({ url: `file:${TEST_DB_PATH}` });
  try {
    await probe.execute('SELECT 1 FROM "Booking" LIMIT 1');
    return true;
  } catch {
    return false;
  } finally {
    probe.close();
  }
}

/**
 * Apply the schema to the test DB if needed. Runs `prisma db push` with DATABASE_URL
 * pointed at the throwaway file; the Prisma CLI needs no network access for this.
 * (Prisma 7 removed the --skip-generate flag, so the client generator runs too.)
 */
async function ensureSchema(): Promise<void> {
  const hash = schemaHash();
  const current =
    fs.existsSync(SCHEMA_HASH_PATH) && fs.readFileSync(SCHEMA_HASH_PATH, "utf8").trim() === hash;
  if (current && (await schemaApplied())) {
    return;
  }

  try {
    execSync("npx prisma db push", {
      cwd: process.cwd(),
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...process.env,
        DATABASE_URL: `file:${TEST_DB_PATH}`,
      },
    });
  } catch (e) {
    // A test file in another process may have pushed the schema at the same time. If the
    // tables are present now, that is exactly the state we wanted.
    if (!(await schemaApplied())) throw e;
  }

  fs.writeFileSync(SCHEMA_HASH_PATH, hash);
}

/**
 * Returns a PrismaClient bound to the isolated test database, creating the schema on
 * first use. The same client is reused within a process so transactions behave like
 * they do against the production connection.
 */
export async function useTestDb(): Promise<PrismaClient> {
  if (!client) {
    await ensureSchema();
    client = new PrismaClient({
      adapter: new PrismaLibSql({ url: `file:${TEST_DB_PATH}`, timeout: 10_000 }),
    });
  }
  return client;
}

/** The file: URL of the test database, for modules that build their own client. */
export function testDbUrl(): string {
  return `file:${TEST_DB_PATH}`;
}

/** A date far enough in the past that every generated slot passes the "must be future" rule. */
export const FAR_FUTURE_NOW = new Date("2026-01-01T00:00:00.000Z");

export interface TestSalon {
  serviceId: string;
  staffId: string;
  customerEmail: string;
}

/**
 * Minimal deterministic salon for booking tests: one 60-min service (no buffer so
 * back-to-back math is exact) and one staff member working Tue-Sat 09:00-17:00 with a
 * 12:00-12:30 lunch break.
 */
export async function seedTestSalon(prisma: PrismaClient): Promise<TestSalon> {
  await prisma.businessSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Test Clinic",
      timezone: "America/Toronto",
      currency: "CAD",
      leadTimeMin: 0,
      bookingWindowDays: 365,
      slotIntervalMin: 30,
    },
  });

  const service = await prisma.service.upsert({
    where: { slug: "test-facial" },
    update: {},
    create: {
      slug: "test-facial",
      name: "Test Facial",
      category: "Facials",
      price: 10000,
      duration: 60,
      bufferMin: 0,
      order: 1,
    },
  });

  const staff = await prisma.staff.upsert({
    where: { slug: "test-staff" },
    update: {},
    create: { slug: "test-staff", name: "Test Staff", role: "Specialist" },
  });

  await prisma.staffService.upsert({
    where: { staffId_serviceId: { staffId: staff.id, serviceId: service.id } },
    update: {},
    create: { staffId: staff.id, serviceId: service.id },
  });

  // Tue=2 .. Sat=6, 09:00-17:00 with a 12:00-12:30 break.
  for (const dayOfWeek of [2, 3, 4, 5, 6]) {
    const schedule = await prisma.staffSchedule.upsert({
      where: { staffId_dayOfWeek_startTime: { staffId: staff.id, dayOfWeek, startTime: 540 } },
      update: {},
      create: { staffId: staff.id, dayOfWeek, startTime: 540, endTime: 1020 },
    });
    await prisma.break.upsert({
      where: { id: `brk-test-${dayOfWeek}` },
      update: {},
      create: { id: `brk-test-${dayOfWeek}`, scheduleId: schedule.id, startTime: 720, endTime: 750 },
    });
  }

  return { serviceId: service.id, staffId: staff.id, customerEmail: "test@example.com" };
}

/** Remove all bookings, customers and days off so tests start from a clean slate. */
export async function resetBookings(prisma: PrismaClient): Promise<void> {
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.dayOff.deleteMany();
}

/** Disconnect the shared test client (call in afterAll). */
export async function closeTestDb(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
}