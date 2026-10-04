/** Read-only by default. Applies only to an explicitly selected local database. */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@/lib/env";
import { correctSkinProgramPrices } from "../scripts/content-upgrade";

async function main() {
  if (!env.databaseUrl.startsWith("file:")) throw new Error("This command is local-only.");
  const db = new PrismaClient({ adapter: new PrismaLibSql({ url: env.databaseUrl }) });
  try {
    const slugs = ["glow-renewal", "essential", "platinum", "diamond"];
    console.table(await db.package.findMany({ where: { slug: { in: slugs } }, select: { slug: true, price: true, sessions: true, active: true }, orderBy: { order: "asc" } }));
    if (process.argv.includes("--apply-local")) {
      console.log(`Corrected ${await correctSkinProgramPrices(db)} packages. Previous prices and counts retained in audit logs.`);
      console.table(await db.package.findMany({ where: { slug: { in: slugs } }, select: { slug: true, price: true, sessions: true }, orderBy: { order: "asc" } }));
    }
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Package correction failed."); process.exitCode = 1; });
