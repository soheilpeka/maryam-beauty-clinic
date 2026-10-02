/** Add supplied pairs once. Never overwrite owner edits or reactivate hidden records. */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@/lib/env";
import { COMPARISONS } from "@/lib/content/comparisons";
const db = new PrismaClient({ adapter: new PrismaLibSql({ url: env.databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }) });
async function main() {
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
  console.log(`Comparison import: ${count} created; existing records preserved.`);
}
main().catch(() => { console.error("Comparison import failed; no credentials logged."); process.exitCode = 1; }).finally(() => db.$disconnect());
