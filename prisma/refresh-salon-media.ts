/** One-time, idempotent content upgrade. Never overwrites CMS edits or activation flags. */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@/lib/env";
import { refreshSalonMedia } from "../scripts/content-upgrade";

const db = new PrismaClient({ adapter: new PrismaLibSql({ url: env.databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }) });
async function main() {
try {
  const updated = await refreshSalonMedia(db);
  console.log(`Salon gallery upgrade: ${updated} records updated; CMS edits and visibility preserved.`);
} finally { await db.$disconnect(); }

}
main().catch(() => { console.error("Gallery upgrade failed; no credentials logged."); process.exitCode = 1; });
