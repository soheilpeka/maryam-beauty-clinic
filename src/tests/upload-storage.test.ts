import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { applyMediaSchema } from "../../scripts/media-schema";
const target = vi.hoisted(() => ({ db: null as unknown as PrismaClient }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get(_, name) { const property = target.db[name as keyof PrismaClient]; return typeof property === "function" ? property.bind(target.db) : property; } }) }));
import { storeImage } from "@/lib/upload-storage";
import { MEDIA_STORAGE_BYTES } from "@/lib/image-upload";
beforeAll(async () => {
  // This dedicated synthetic DB is Git-ignored. Windows native handles can outlive
  // disconnect until worker exit, so recreate its table instead of unlinking in-process.
  const url = `file:${resolve("prisma/uploads-test.db")}`;
  const client = createClient({ url });
  await client.execute('DROP TABLE IF EXISTS "MediaUpload"');
  await applyMediaSchema(client); await applyMediaSchema(client); client.close();
  target.db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
});
afterAll(async () => { await target.db?.$disconnect(); });
it("stores and reloads binary bytes and unique URLs durably", async () => {
  const data = Buffer.from([0, 255, 0, 120]);
  const result = await storeImage({ data, sizeBytes: data.length, width: 8, height: 8 });
  const stored = await target.db.mediaUpload.findUniqueOrThrow({ where: { id: result.id } });
  expect(Buffer.from(stored.data)).toEqual(data);
  expect(result.url).toMatch(/^\/media\/uploads\/[a-f0-9]{32}\.webp$/);
});
it("enforces a shared byte quota atomically across competing inserts", async () => {
  await target.db.mediaUpload.deleteMany();
  // Synthetic metadata occupies all but one slot without allocating 200 MiB.
  await target.db.mediaUpload.create({ data: { id: "quota-fixture", data: new Uint8Array([1]), sizeBytes: MEDIA_STORAGE_BYTES - 4, width: 1, height: 1 } });
  const image = { data: Buffer.from([1, 2, 3, 4]), sizeBytes: 4, width: 1, height: 1 };
  const results = await Promise.allSettled([storeImage(image), storeImage(image)]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
  expect(rejected.reason.code).toBe("STORAGE_FULL");
  expect(await target.db.mediaUpload.count()).toBe(2);
});
