import type { Client } from "@libsql/client";

/** Add only the missing comparison table/index; reject incompatible existing definitions. */
export async function applyComparisonSchema(client: Client): Promise<void> {
  const types: Record<string, string> = {
    id: "TEXT", name: "TEXT", nameFr: "TEXT", description: "TEXT", descriptionFr: "TEXT",
    imageUrl: "TEXT", afterImageUrl: "TEXT", beforeCrop: "JSONB", afterCrop: "JSONB",
    aspectRatio: "REAL", category: "TEXT", active: "BOOLEAN", order: "INTEGER",
    createdAt: "DATETIME", updatedAt: "DATETIME",
  };
  const existing = await client.execute('PRAGMA table_info("ComparisonItem")');
  if (existing.rows.length && (existing.rows.length !== Object.keys(types).length || existing.rows.some(row =>
    types[String(row.name)] !== String(row.type).toUpperCase() || Number(row.notnull) !== 1 ||
    Number(row.pk) !== (row.name === "id" ? 1 : 0)))) {
    throw new Error("Unexpected comparison table schema.");
  }
  const index = await client.execute("SELECT tbl_name FROM sqlite_master WHERE type = 'index' AND name = 'ComparisonItem_active_order_idx'");
  if (index.rows.length) {
    const columns = await client.execute('PRAGMA index_info("ComparisonItem_active_order_idx")');
    const definition = (await client.execute('PRAGMA index_list("ComparisonItem")')).rows.find(row => row.name === "ComparisonItem_active_order_idx");
    if (index.rows[0].tbl_name !== "ComparisonItem" || !definition || Number(definition.unique) !== 0 ||
      Number(definition.partial) !== 0 || columns.rows.length !== 2 || columns.rows[0].name !== "active" || columns.rows[1].name !== "order") {
      throw new Error("Unexpected comparison index.");
    }
  }
  await client.batch([
    `CREATE TABLE IF NOT EXISTS "ComparisonItem" (
      "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "nameFr" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '', "descriptionFr" TEXT NOT NULL DEFAULT '',
      "imageUrl" TEXT NOT NULL, "afterImageUrl" TEXT NOT NULL,
      "beforeCrop" JSONB NOT NULL, "afterCrop" JSONB NOT NULL,
      "aspectRatio" REAL NOT NULL DEFAULT 1.3333333333,
      "category" TEXT NOT NULL DEFAULT 'laser', "active" BOOLEAN NOT NULL DEFAULT true,
      "order" INTEGER NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS "ComparisonItem_active_order_idx" ON "ComparisonItem"("active", "order")',
  ], "write");
}
