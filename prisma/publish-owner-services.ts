/** Publish the approved descriptions and new service to the local CMS only. */
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { LATEST_OWNER_SERVICE_COPY } from "@/lib/content/latest-owner-service-copy";
import { getServiceBySlug } from "@/lib/content/services";
import { isLegacyServiceDescription } from "@/lib/content/service-copy";
import { COMPARISONS } from "@/lib/content/comparisons";

const url = `file:${resolve("prisma/dev.db").replaceAll("\\", "/")}`;
const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
const newSlug = "pigmented-lesions-laser-treatment";

async function main() {
  if (!process.argv.includes("--apply-local")) {
    console.log("Use --apply-local to update the local development database.");
    return;
  }
  const newService = getServiceBySlug(newSlug);
  if (!newService) throw new Error("New service manifest is missing.");

  await mkdir(resolve(".private/backups"), { recursive: true });
  const backup = resolve(".private/backups", `before-owner-services-${Date.now()}.db`);
  const sqlite = createClient({ url });
  try { await sqlite.execute({ sql: "VACUUM INTO ?", args: [backup] }); } finally { sqlite.close(); }

  const result = await db.$transaction(async tx => {
    let updated = 0;
    let added = 0;
    const preserved: string[] = [];
    for (const [slug, copy] of Object.entries(LATEST_OWNER_SERVICE_COPY)) {
      const existing = await tx.service.findUnique({ where: { slug } });
      if (!existing) {
        if (slug !== newSlug) throw new Error(`Missing local service: ${slug}`);
        const staff = await tx.staff.findMany({
          where: {
            active: true,
            role: "Aesthetician",
            OR: [1, 2, 3].map(number => ({ slug: `specialist-${number}`, name: `Specialist ${number}` })),
          },
          select: { id: true },
        });
        await tx.service.create({ data: {
          slug, name: newService.name, nameFr: newService.nameFr, category: newService.category,
          price: newService.price, duration: newService.duration, order: newService.order,
          description: copy.en, descriptionFr: copy.fr,
          services: { create: staff.map(member => ({ staffId: member.id })) },
        } });
        added++;
        continue;
      }
      const data: { description?: string; descriptionFr?: string } = {};
      for (const [locale, field] of [["en", "description"], ["fr", "descriptionFr"]] as const) {
        const current = existing[field];
        if (current === copy[locale]) continue;
        if (!current?.trim() || isLegacyServiceDescription(slug, current, locale)) data[field] = copy[locale];
        else preserved.push(`${slug}/${locale}`);
      }
      if (Object.keys(data).length) {
        await tx.service.update({ where: { id: existing.id }, data });
        updated++;
      }
    }
    for (const [index, item] of COMPARISONS.entries()) {
      if (!["comparison-19", "comparison-20"].includes(item.id)) continue;
      if (await tx.comparisonItem.findUnique({ where: { id: item.id } })) continue;
      await tx.mediaAsset.upsert({ where: { url: item.image }, create: { url: item.image }, update: {} });
      await tx.comparisonItem.create({ data: {
        id: item.id, name: item.title, nameFr: item.titleFr, imageUrl: item.image, afterImageUrl: item.image,
        beforeCrop: item.before, afterCrop: item.after, category: item.family,
        aspectRatio: item.before.width / item.before.height * item.boardRatio, order: index + 1,
      } });
    }
    return { updated, added, preserved };
  });
  console.log(JSON.stringify(result));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
