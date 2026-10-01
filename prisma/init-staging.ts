/** Initialize a NEW, empty remote libSQL staging database. Never run on an existing database. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();
  if (!url?.startsWith("libsql://") || !authToken) {
    throw new Error("Set a remote libsql:// DATABASE_URL and DATABASE_AUTH_TOKEN in .env.staging.");
  }

  const client = createClient({ url, authToken });
  try {
    const existing = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    if (existing.rows.length !== 0) {
      throw new Error("This database already has tables. Initialization stopped without changes.");
    }
    const schema = readFileSync(resolve(process.cwd(), "prisma/initial.sql"), "utf8");
    if (!schema.trim()) throw new Error("prisma/initial.sql is empty.");
    await client.executeMultiple(`BEGIN IMMEDIATE;\n${schema}\nCOMMIT;`);
    console.info("Initialized the empty staging database. Seed the catalog and bootstrap the administrator next.");
  } finally {
    client.close();
  }
}

main().catch(() => {
  // Avoid dumping connection details or SDK errors that could contain credentials.
  console.error("Staging initialization failed. Check the URL/token and ensure the database is empty.");
  process.exitCode = 1;
});
