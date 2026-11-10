/** Apply the owner-supplied photo set to the local CMS without replacing custom covers or deleting photos. */
import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { SERVICE_PHOTOS } from "@/lib/content/service-photos";

const slugs = [
  "ai-skin-analysis", "hair-botox-hydration", "hair-colour-balayage", "laser-hair-removal",
  "lash-brow-lamination", "lip-blush-dark-lip-neutralization", "microblading-eyebrow-shaping",
  "microneedling", "pigmented-lesions-laser-treatment", "rf-microneedling", "rf-skin-treatment",
];
const url = `file:${resolve("prisma/dev.db").replaceAll("\\", "/")}`;
const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

async function main() {
  if (!process.argv.includes("--apply-local")) throw new Error("Pass --apply-local to update the local database.");
  await access(resolve("prisma/dev.db"));
  await Promise.all(slugs.flatMap(slug => SERVICE_PHOTOS[slug].map(photo => access(resolve(`public${photo.url}`)))));
  const backupDir = resolve(".private/backups");
  await mkdir(backupDir, { recursive: true });
  const sqlite = createClient({ url });
  try {
    await sqlite.execute({ sql: "VACUUM INTO ?", args: [resolve(backupDir, `before-service-photo-set-${Date.now()}.db`)] });
  } finally { sqlite.close(); }

  const count = await db.$transaction(async tx => {
    let added = 0;
    for (const slug of slugs) {
      const service = await tx.service.findUnique({ where: { slug }, include: { images: true } });
      if (!service?.active) throw new Error(`Expected active local service: ${slug}`);
      const photos = SERVICE_PHOTOS[slug];
      const isLegacyMicroneedlingCover = slug === "microneedling" && service.imageUrl === "/example-pics/ghazalmicro.jpg";
      if (isLegacyMicroneedlingCover || (!service.imageUrl && !service.images.length)) {
        await tx.service.update({ where: { id: service.id }, data: { imageUrl: photos[0].url } });
      }
      for (const [order, photo] of photos.entries()) {
        const existing = service.images.find(image => image.url === photo.url);
        if (existing) {
          if (existing.id === photo.id) {
            await tx.serviceImage.update({ where: { id: existing.id }, data: { altEn: photo.altEn, altFr: photo.altFr, order } });
          }
          continue;
        }
        await tx.serviceImage.create({ data: { ...photo, serviceId: service.id, order } });
        added++;
      }
    }
    return added;
  });
  console.log(`Applied owner photos to ${slugs.length} local services; ${count} photo records added.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
