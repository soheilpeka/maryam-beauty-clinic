import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyComparisonSchema } from "../../scripts/content-schema";
import { publishSkinPrograms, importComparisons, refreshSalonMedia } from "../../scripts/content-upgrade";
import { GALLERY } from "@/lib/content/gallery";

function fixtureUrl() {
  const directory = join(process.cwd(), "artifacts", "content-upgrade-tests");
  mkdirSync(directory, { recursive: true });
  return `file:${join(directory, `${randomBytes(8).toString("hex")}.db`)}`;
}

describe("backup-gated content upgrade operations, with isolated local fixtures", () => {
  it("adds missing content while preserving CMS edits, visibility and customer records on repeats", async () => {
    const url = fixtureUrl();
    const client = createClient({ url });
    const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
    try {
      await client.executeMultiple(readFileSync("prisma/initial.sql", "utf8"));
      await applyComparisonSchema(client);
      await applyComparisonSchema(client);
      await db.customer.create({ data: { id: "synthetic-customer", name: "Synthetic guest", email: "synthetic@example.test", phone: "+15555550100" } });
      const customer = await db.customer.findUnique({ where: { id: "synthetic-customer" } });
      await db.package.create({ data: { slug: "discovery", name: "Owner edit", nameFr: "Modification", price: 12345, active: false } });
      await db.galleryItem.create({ data: { id: `gallery-${GALLERY[0].slug}`, imageUrl: "/owner-edited.webp", altEn: "Owner photo", active: false } });
      expect(await publishSkinPrograms(db)).toBe(4);
      expect(await importComparisons(db)).toBe(18);
      expect(await refreshSalonMedia(db)).toBe(GALLERY.length - 1);
      const comparison = await db.comparisonItem.findFirstOrThrow();
      await db.comparisonItem.update({ where: { id: comparison.id }, data: { name: "Owner comparison", active: false, order: 99 } });
      expect(await publishSkinPrograms(db)).toBe(0);
      expect(await importComparisons(db)).toBe(0);
      expect(await refreshSalonMedia(db)).toBe(0);
      expect(await db.package.findUnique({ where: { slug: "discovery" } })).toMatchObject({ name: "Owner edit", price: 12345, active: false });
      expect(await db.galleryItem.findUnique({ where: { id: `gallery-${GALLERY[0].slug}` } })).toMatchObject({ imageUrl: "/owner-edited.webp", active: false });
      expect(await db.comparisonItem.findUnique({ where: { id: comparison.id } })).toMatchObject({ name: "Owner comparison", active: false, order: 99 });
      expect(await db.customer.findUnique({ where: { id: "synthetic-customer" } })).toEqual(customer);
      expect(await db.auditLog.count({ where: { action: "comparison.import" } })).toBe(18);
    } finally { await db.$disconnect(); client.close(); }
  });

  it("rejects incompatible tables or colliding index names before changing existing data", async () => {
    for (const incompatible of [
      'CREATE TABLE "ComparisonItem" (id TEXT PRIMARY KEY, name TEXT)',
      'CREATE TABLE "Other" (active BOOLEAN, "order" INTEGER); CREATE INDEX "ComparisonItem_active_order_idx" ON "Other"(active, "order")',
    ]) {
      const client = createClient({ url: fixtureUrl() });
      try {
        await client.executeMultiple(incompatible);
        const before = (await client.execute("SELECT sql FROM sqlite_master ORDER BY name")).rows;
        await expect(applyComparisonSchema(client)).rejects.toThrow(/Unexpected comparison/);
        expect((await client.execute("SELECT sql FROM sqlite_master ORDER BY name")).rows).toEqual(before);
      } finally { client.close(); }
    }
  });
});
