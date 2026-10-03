import "server-only";
import { createHmac } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const MAX_BUCKETS = 10_000;

/** One atomic UPSERT consumes a slot across every client sharing this database. */
export async function durableRateLimit(
  database: PrismaClient, key: string, options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { limit, windowMs } = options;
  if (!key || key.length > 256 || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000 ||
      !Number.isSafeInteger(windowMs) || windowMs < 1 || windowMs > 86_400_000) {
    throw new Error("Invalid request budget configuration.");
  }
  const digest = createHmac("sha256", env.bookingLinkSecret)
    .update(`${limit}:${windowMs}:${key}`).digest("hex");

  // Use the database clock so app-server clock skew cannot reset shared budgets.
  // Autocommit statements avoid holding a database write lock across JS awaits.
  await database.$executeRaw`DELETE FROM "RateLimitBucket"
      WHERE "expiresAt" <= CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`;
  const consumed = await database.$queryRaw<Array<{ hitsJson: string }>>`
    WITH "clock" AS (SELECT CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) AS "now")
    INSERT INTO "RateLimitBucket" ("key", "hitsJson", "expiresAt")
    SELECT ${digest}, json_array("now"), "now" + ${windowMs} FROM "clock"
    WHERE EXISTS (SELECT 1 FROM "RateLimitBucket" WHERE "key" = ${digest})
      OR (SELECT COUNT(*) FROM "RateLimitBucket") < ${MAX_BUCKETS}
    ON CONFLICT ("key") DO UPDATE SET
      "hitsJson" = (SELECT json_group_array("hit") FROM (
        SELECT CAST("value" AS INTEGER) AS "hit" FROM json_each("RateLimitBucket"."hitsJson")
        WHERE CAST("value" AS INTEGER) > (SELECT "now" FROM "clock") - ${windowMs}
        UNION ALL SELECT "now" FROM "clock"
      )),
      "expiresAt" = (SELECT "now" FROM "clock") + ${windowMs}
    WHERE (SELECT COUNT(*) FROM json_each("RateLimitBucket"."hitsJson")
      WHERE CAST("value" AS INTEGER) > (SELECT "now" FROM "clock") - ${windowMs}) < ${limit}
    RETURNING "hitsJson"`;
  if (consumed.length) {
    const hits = JSON.parse(consumed[0].hitsJson) as number[];
    return { ok: true, remaining: Math.max(0, limit - hits.length), retryAfterMs: 0 };
  }
  const retry = await database.$queryRaw<Array<{ retryAfter: number | bigint | null }>>`
    SELECT MIN(CAST("value" AS INTEGER)) + ${windowMs}
      - CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) AS "retryAfter"
    FROM "RateLimitBucket", json_each("RateLimitBucket"."hitsJson")
    WHERE "RateLimitBucket"."key" = ${digest}`;
  return { ok: false, remaining: 0, retryAfterMs: Math.max(1, Number(retry[0]?.retryAfter ?? windowMs)) };
}
