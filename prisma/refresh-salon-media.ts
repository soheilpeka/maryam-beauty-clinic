/** One-time, idempotent content upgrade. Never overwrites CMS edits or activation flags. */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@/lib/env";
import { GALLERY } from "@/lib/content/gallery";

const db = new PrismaClient({ adapter: new PrismaLibSql({ url: env.databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }) });
const legacy = ["/example-pics/hair-look-1.png", "/example-pics/hair-look-2.jpeg", "/example-pics/hair-look-3.jpeg", "/example-pics/micromachin.jpeg"];
async function main() {
try {
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
  console.log(`Salon gallery upgrade: ${updated} records updated; CMS edits and visibility preserved.`);
} finally { await db.$disconnect(); }

}
main().catch(() => { console.error("Gallery upgrade failed; no credentials logged."); process.exitCode = 1; });
