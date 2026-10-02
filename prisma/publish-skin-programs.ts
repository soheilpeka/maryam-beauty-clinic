/** Owner-approved package import. Creates only missing slugs; never overwrites CMS edits. */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@/lib/env";
import { SKIN_PROGRAMS } from "@/lib/content/skin-programs";
import { packageCopy } from "@/lib/content/skin-programs-fr";

const db = new PrismaClient({ adapter: new PrismaLibSql({ url: env.databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }) });
async function main() {
  try {
    const services = await db.service.findMany({ where: { slug: { in: ["ai-skin-analysis", "hydrafacial", "rf-microneedling", "rf-skin-treatment"] } }, select: { id: true, slug: true } });
    const created = await db.$transaction(async tx => {
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
    });
    console.log(`Approved skin programs: ${created} created. Existing CMS records preserved.`);
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Package publication failed; no credentials logged."); process.exitCode = 1; });
