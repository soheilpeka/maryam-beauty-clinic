import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { closeTestDb, testDbUrl, useTestDb } from "@/tests/db";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import { consumeRateLimit } from "@/lib/rate-limit";

let database: PrismaClient;
let second: PrismaClient;
const budget = { limit: 2, windowMs: 60_000 };

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", testDbUrl());
  vi.stubEnv("BOOKING_LINK_SECRET", "synthetic-shared-budget-key-with-32-characters");
  database = await useTestDb();
  second = new PrismaClient({ adapter: new PrismaLibSql({ url: testDbUrl(), timeout: 10_000 }) });
});
beforeEach(async () => { await database.$executeRaw`DELETE FROM "RateLimitBucket"`; });
afterAll(async () => {
  await second.$disconnect();
  const runtime = (globalThis as unknown as { prisma?: PrismaClient }).prisma;
  await runtime?.$disconnect();
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = undefined;
  await closeTestDb();
  vi.unstubAllEnvs();
});

describe("shared production request budgets", () => {
  it("shares the same sliding window between independent clients", async () => {
    expect(await durableRateLimit(database, "contact:192.0.2.1", budget)).toMatchObject({ ok: true, remaining: 1 });
    expect(await durableRateLimit(second, "contact:192.0.2.1", budget)).toMatchObject({ ok: true, remaining: 0 });
    expect(await durableRateLimit(database, "contact:192.0.2.1", budget)).toMatchObject({ ok: false, remaining: 0 });
    const rows = await database.$queryRaw<Array<{ key: string; hitsJson: string }>>`SELECT "key", "hitsJson" FROM "RateLimitBucket"`;
    expect(rows[0].key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows)).not.toContain("192.0.2.1");
    expect(JSON.parse(rows[0].hitsJson)).toHaveLength(2);
  });
  it("does not reset after disconnect/reconnect", async () => {
    await durableRateLimit(database, "login:restart", { ...budget, limit: 1 });
    const reconnected = new PrismaClient({ adapter: new PrismaLibSql({ url: testDbUrl() }) });
    try { expect((await durableRateLimit(reconnected, "login:restart", { ...budget, limit: 1 })).ok).toBe(false); }
    finally { await reconnected.$disconnect(); }
  });
  it("does not lose increments from concurrent independent consumers", async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      durableRateLimit(index % 2 ? database : second, "booking:race", budget)));
    expect(responses.filter(result => result.ok)).toHaveLength(2);
    expect(responses.filter(result => !result.ok)).toHaveLength(4);
  });
  it("uses the database clock despite a skewed application clock", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1);
    try {
      await durableRateLimit(database, "login:clock", { ...budget, limit: 1 });
      now.mockReturnValue(9_000_000_000_000);
      expect((await durableRateLimit(second, "login:clock", { ...budget, limit: 1 })).ok).toBe(false);
    } finally { now.mockRestore(); }
  });
  it("expires stored windows and isolates endpoint budgets", async () => {
    await durableRateLimit(database, "booking:expiry", { ...budget, limit: 1 });
    await database.$executeRaw`UPDATE "RateLimitBucket" SET "expiresAt" = 0`;
    expect((await durableRateLimit(second, "booking:expiry", { ...budget, limit: 1 })).ok).toBe(true);
    expect((await durableRateLimit(database, "contact:expiry", { ...budget, limit: 1 })).ok).toBe(true);
  });
  it("production dispatcher checks shared storage and refuses on storage errors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    (globalThis as unknown as { prisma?: PrismaClient }).prisma = database;
    try {
      expect((await consumeRateLimit("login:dispatch", { ...budget, limit: 1 })).ok).toBe(true);
      expect((await consumeRateLimit("login:dispatch", { ...budget, limit: 1 })).ok).toBe(false);
      const transaction = vi.spyOn(database, "$executeRaw").mockRejectedValue(new Error("synthetic sensitive message"));
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await consumeRateLimit("login:unavailable", budget)).toMatchObject({ ok: false, unavailable: true });
      expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive message");
      transaction.mockRestore(); log.mockRestore();
    } finally { vi.stubEnv("NODE_ENV", "test"); }
  });
  it("bounds shared key cardinality without evicting a live budget", async () => {
    await durableRateLimit(database, "login:bounded", { ...budget, limit: 1 });
    await database.$executeRaw`WITH RECURSIVE "numbers"("n") AS (
      SELECT 1 UNION ALL SELECT "n" + 1 FROM "numbers" WHERE "n" < 9999)
      INSERT INTO "RateLimitBucket" ("key", "hitsJson", "expiresAt")
      SELECT 'synthetic-cap-' || "n", '[]', 9000000000000 FROM "numbers"`;
    expect((await durableRateLimit(second, "contact:new-key", budget)).ok).toBe(false);
    expect((await durableRateLimit(database, "login:bounded", { ...budget, limit: 1 })).ok).toBe(false);
    await database.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "key" LIKE 'synthetic-cap-%'`;
    expect((await durableRateLimit(second, "contact:new-key", budget)).ok).toBe(true);
  });
  it("expires individual hits without resetting more recent hits", async () => {
    await durableRateLimit(database, "booking:sliding", budget);
    const clock = await database.$queryRaw<Array<{ now: number | bigint }>>`
      SELECT CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) AS "now"`;
    const now = Number(clock[0].now);
    const syntheticHits = JSON.stringify([now - 61_000, now - 20_000]);
    await database.$executeRaw`UPDATE "RateLimitBucket" SET "hitsJson" = ${syntheticHits}`;
    expect(await durableRateLimit(second, "booking:sliding", budget)).toMatchObject({ ok: true, remaining: 0 });
    const rows = await database.$queryRaw<Array<{ hitsJson: string }>>`SELECT "hitsJson" FROM "RateLimitBucket"`;
    expect(JSON.parse(rows[0].hitsJson)).toHaveLength(2);
    expect((await durableRateLimit(database, "booking:sliding", budget)).ok).toBe(false);
  });
});
