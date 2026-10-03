/** Add the contact snapshot columns without resetting or rewriting any records. */
import "@/lib/env-preload";
import { createClient, type Client } from "@libsql/client";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COLUMNS = ["customerNameSnapshot", "customerEmailSnapshot", "customerPhoneSnapshot"] as const;

export async function migrateBookingContacts(client: Client) {
  const tx = await client.transaction("write");
  try {
    const schema = await tx.execute('PRAGMA table_info("Booking")');
    if (!schema.rows.length) throw new Error("Booking table is missing; initialize the schema first.");
    const missing = COLUMNS.filter(column => !schema.rows.some(row => row.name === column));
    for (const column of missing) {
      // Identifiers are from the fixed internal allowlist, never command-line input.
      await tx.execute(`ALTER TABLE "Booking" ADD COLUMN "${column}" TEXT`);
    }
    await tx.commit();
    return missing.length;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally { tx.close(); }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  const local = url.startsWith("file:");
  if (!local && !process.argv.includes("--allow-remote")) {
    throw new Error("Remote migration requires a database backup and --allow-remote.");
  }
  const dbPath = local ? resolve(url.slice(5)) : null;
  if (dbPath && !existsSync(dbPath)) throw new Error("Local database does not exist.");
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  try {
    const schema = await client.execute('PRAGMA table_info("Booking")');
    if (!schema.rows.length) throw new Error("Booking table is missing; initialize the schema first.");
    const missing = COLUMNS.filter(column => !schema.rows.some(row => row.name === column));
    if (!missing.length) { console.log("Booking contact columns are already current; no changes."); return; }
    if (dbPath) {
      const backup = join(dirname(dbPath), `${basename(dbPath, ".db")}.contacts-backup-${Date.now()}.db`);
      await client.execute({ sql: "VACUUM INTO ?", args: [backup] });
      console.log(`Consistent local backup created: ${basename(backup)}`);
    }
    console.log(`Booking contact migration: ${await migrateBookingContacts(client)} nullable columns added; existing records preserved.`);
  } finally { client.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error("Booking contact migration failed. Check the database configuration and backup; no credentials logged."); process.exitCode = 1; });
}
