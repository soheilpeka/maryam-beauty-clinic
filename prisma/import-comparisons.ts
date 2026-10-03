/** Add supplied pairs once. Never overwrite owner edits or reactivate hidden records. */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { env } from "@/lib/env";
import { importComparisons } from "../scripts/content-upgrade";
const db = new PrismaClient({ adapter: new PrismaLibSql({ url: env.databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }) });
async function main() {
  const count = await importComparisons(db);
  console.log(`Comparison import: ${count} created; existing records preserved.`);
}
main().catch(() => { console.error("Comparison import failed; no credentials logged."); process.exitCode = 1; }).finally(() => db.$disconnect());
