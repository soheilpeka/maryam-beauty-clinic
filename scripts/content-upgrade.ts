import type { PrismaClient } from "@prisma/client";
import { SKIN_PROGRAMS } from "@/lib/content/skin-programs";
import { packageCopy } from "@/lib/content/skin-programs-fr";
import { COMPARISONS } from "@/lib/content/comparisons";
import { GALLERY } from "@/lib/content/gallery";

/** October 3 brochure correction, explicitly approved by the owner. Discovery is unchanged. */
export async function correctSkinProgramPrices(db: PrismaClient): Promise<number> {
  return db.$transaction(async tx => {
    let count = 0;
    for (const p of SKIN_PROGRAMS.filter(p => p.slug !== "discovery")) {
      const existing = await tx.package.findUnique({ where: { slug: p.slug } });
      if (!existing) throw new Error(`Missing package: ${p.slug}; import packages first.`);
      const price = Number(p.price.replace(/[^\d]/g, "")) * 100;
      const sessions = Number(p.stats[0].match(/\d+/)?.[0]);
      if (existing.price === price && existing.sessions === sessions) continue;
      await tx.package.update({ where: { id: existing.id }, data: { price, sessions } });
      await tx.auditLog.create({ data: {
        action: "package.brochure-correction", targetType: "Package", targetId: existing.id,
        detail: JSON.stringify({ source: "owner-brochures-2026-10-03", slug: p.slug, before: { price: existing.price, sessions: existing.sessions }, after: { price, sessions } }),
      } });
      count++;
    }
    return count;
  }, { maxWait: 10_000, timeout: 60_000 });
}

/** Owner-approved manifests only. Existing CMS changes and inactive records take precedence. */
export async function publishSkinPrograms(db: PrismaClient): Promise<number> {
  const services = await db.service.findMany({ where: { slug: { in: ["ai-skin-analysis", "hydrafacial", "rf-microneedling", "rf-skin-treatment"] } }, select: { id: true, slug: true } });
  return db.$transaction(async tx => {
    let count = 0;
    for (const [order, p] of SKIN_PROGRAMS.entries()) {
      if (await tx.package.findUnique({ where: { slug: p.slug } })) continue;
      const relevant = services.filter(s => p.slug === "glow-renewal" ? ["ai-skin-analysis", "hydrafacial"].includes(s.slug) : p.slug === "essential" || p.slug === "discovery" ? s.slug !== "rf-skin-treatment" : true);
      await tx.package.create({ data: {
        slug: p.slug, name: p.name, nameFr: `Forfait ${p.name.replace(" Package", "")}`,
        description: p.description, descriptionFr: packageCopy(p.description, "fr"),
        price: Number(p.price.replace(/[^\d]/g, "")) * 100,
        sessions: p.slug === "discovery" ? 1 : Number(p.stats[0].match(/\d+/)?.[0]),
        active: true, order: order + 1,
        services: { create: relevant.map(s => ({ serviceId: s.id })) },
      } });
      count++;
    }
    return count;
  }, { maxWait: 10_000, timeout: 60_000 });
}

export async function importComparisons(db: PrismaClient): Promise<number> {
  let count = 0;
  for (const [index, item] of COMPARISONS.entries()) {
    if (await db.comparisonItem.findUnique({ where: { id: item.id } })) continue;
    await db.$transaction(async tx => {
      await tx.mediaAsset.upsert({ where: { url: item.image }, create: { url: item.image }, update: {} });
      await tx.comparisonItem.create({ data: { id: item.id, name: item.title, nameFr: item.titleFr, imageUrl: item.image, afterImageUrl: item.image, beforeCrop: item.before, afterCrop: item.after, category: item.family, aspectRatio: item.before.width / item.before.height * item.boardRatio, order: index + 1 } });
      await tx.auditLog.create({ data: { action: "comparison.import", targetType: "ComparisonItem", targetId: item.id } });
    });
    count++;
  }
  return count;
}

export async function refreshSalonMedia(db: PrismaClient): Promise<number> {
  const legacy = ["/example-pics/hair-look-1.png", "/example-pics/hair-look-2.jpeg", "/example-pics/hair-look-3.jpeg", "/example-pics/micromachin.jpeg"];
  let updated = 0;
  for (const [index, item] of GALLERY.entries()) {
    const id = `gallery-${item.slug}`;
    const existing = await db.galleryItem.findUnique({ where: { id } });
    const data = { imageUrl: item.image, altEn: item.caption, altFr: item.captionFr, captionEn: item.title, captionFr: item.titleFr, category: item.tag };
    if (!existing) {
      await db.galleryItem.create({ data: { id, ...data, order: index + 1 } });
      updated++;
    } else if (index < 4 && existing.imageUrl === legacy[index] && existing.altEn?.startsWith("Temporary") && existing.altFr === existing.altEn && existing.captionFr === existing.captionEn && existing.order === index + 1 && existing.category === item.tag && existing.captionEn === ["Layered hair inspiration", "Modern bob inspiration", "Seasonal hair inspiration", "RF treatment technology"][index]) {
      await db.galleryItem.update({ where: { id }, data });
      updated++;
    }
  }
  return updated;
}
