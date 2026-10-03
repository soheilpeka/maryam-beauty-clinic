/** Owner-approved package import. Creates only missing slugs; never overwrites CMS edits. */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@/lib/env";
import { publishSkinPrograms } from "../scripts/content-upgrade";

const db = new PrismaClient({ adapter: new PrismaLibSql({ url: env.databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }) });
async function main() {
  try {
    const created = await publishSkinPrograms(db);
    console.log(`Approved skin programs: ${created} created. Existing CMS records preserved.`);
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Package publication failed; no credentials logged."); process.exitCode = 1; });
