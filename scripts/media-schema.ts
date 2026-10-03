import type { Client } from "@libsql/client";

/** Add only the upload table; never reset or rewrite clinic records. */
export async function applyMediaSchema(client: Client) {
  const existing = await client.execute('PRAGMA table_info("MediaUpload")');
  if (existing.rows.length) {
    const types: Record<string, string> = { id: "TEXT", data: "BLOB", sizeBytes: "INTEGER", width: "INTEGER", height: "INTEGER", createdAt: "DATETIME" };
    if (existing.rows.length !== 6 || existing.rows.some(row => types[String(row.name)] !== String(row.type).toUpperCase())) throw new Error("Unexpected upload table schema");
    return;
  }
  await client.execute('CREATE TABLE "MediaUpload" ("id" TEXT NOT NULL PRIMARY KEY, "data" BLOB NOT NULL, "sizeBytes" INTEGER NOT NULL, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
}
