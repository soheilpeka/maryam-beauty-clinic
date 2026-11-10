/** Explicit local-only correction of owner-supplied service and comparison photographs. */
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { SERVICE_PHOTOS } from "../src/lib/content/service-photos";
import { COMPARISONS } from "../src/lib/content/comparisons";

const url = `file:${resolve("prisma/dev.db").replaceAll("\\", "/")}`;
const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
async function main() {
  const services = await db.service.findMany({ where: { slug: { in: Object.keys(SERVICE_PHOTOS) }, active: true }, include: { images: true } });
  if (services.length !== Object.keys(SERVICE_PHOTOS).length) throw new Error("A target service is missing; no changes applied.");
  console.log(`Local plan: ${services.length} services; original ear board; two pigmentation pairs.`);
  if (!process.argv.includes("--apply-local")) return;
  await mkdir(resolve(".private/backups"), { recursive: true });
  const backup = resolve(".private/backups", `before-owner-media-${Date.now()}.db`);
  const sqlite = createClient({ url });
  try { await sqlite.execute({ sql: "VACUUM INTO ?", args: [backup] }); } finally { sqlite.close(); }
  console.log(`Local backup: ${backup}`);
  await db.$transaction(async tx => {
    for (const service of services) {
      const photos = SERVICE_PHOTOS[service.slug];
      const updated = await tx.service.updateMany({ where: { id: service.id, imageUrl: service.imageUrl }, data: { imageUrl: photos[0].url } });
      if (updated.count !== 1) throw new Error("Service media changed concurrently; correction rolled back.");
      for (const [order, photo] of photos.entries()) {
        const data = { serviceId: service.id, url: photo.url, altEn: photo.altEn, altFr: photo.altFr, order };
        await tx.serviceImage.upsert({ where: { id: photo.id }, create: { id: photo.id, ...data }, update: data });
      }
      await tx.serviceImage.deleteMany({ where: { serviceId: service.id, id: { startsWith: `owner-photo-${service.slug}-`, notIn: photos.map(photo => photo.id) } } });
      await tx.auditLog.create({ data: { action: "service.owner-media-correction", targetType: "Service", targetId: service.id,
        detail: JSON.stringify({ source: "pics/service pics", before: { imageUrl: service.imageUrl, images: service.images }, after: { imageUrl: photos[0].url, images: photos } }) } });
    }
    for (const item of COMPARISONS.filter(item => ["comparison-04", "comparison-19", "comparison-20"].includes(item.id))) {
      const existing = await tx.comparisonItem.findUnique({ where: { id: item.id } });
      const data = { name: item.title, nameFr: item.titleFr, imageUrl: item.image, afterImageUrl: item.image,
        beforeCrop: item.before, afterCrop: item.after, aspectRatio: item.before.width / item.before.height * item.boardRatio };
      if (existing && item.id !== "comparison-04") continue;
      if (existing) await tx.comparisonItem.update({ where: { id: item.id }, data });
      else await tx.comparisonItem.create({ data: { id: item.id, ...data, category: item.family, order: Number(item.id.split("-")[1]) } });
      await tx.auditLog.create({ data: { action: "comparison.owner-media-correction", targetType: "ComparisonItem", targetId: item.id,
        detail: JSON.stringify({ before: existing, after: data }) } });
    }
  }, { timeout: 30_000 });
  console.log("Owner media corrected in the local CMS.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
