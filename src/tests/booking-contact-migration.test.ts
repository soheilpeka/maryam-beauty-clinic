import { afterEach, expect, test } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { migrateBookingContacts } from "../../prisma/migrate-booking-contacts";

let client: Client | undefined;
let directory: string | undefined;
afterEach(() => { client?.close(); client = undefined; });

function isolatedClient() {
  // libSQL can retain native file handles briefly after close on Windows. Keep
  // synthetic fixtures in ignored artifacts instead of racing filesystem deletion.
  const root = join(process.cwd(), "artifacts", "migration-verification");
  mkdirSync(root, { recursive: true });
  directory = mkdtempSync(join(root, "contacts-"));
  return createClient({ url: `file:${join(directory, "isolated.db").replaceAll("\\", "/")}` });
}

test("additive migration preserves historical rows and is safe to repeat", async () => {
  client = isolatedClient();
  await client.execute('CREATE TABLE "Booking" (id TEXT PRIMARY KEY, note TEXT)');
  await client.execute({ sql: 'INSERT INTO "Booking" (id,note) VALUES (?,?)', args: ["history", "Original note"] });
  expect(await migrateBookingContacts(client)).toBe(3);
  const row = (await client.execute('SELECT * FROM "Booking"')).rows[0];
  expect(row).toMatchObject({ id: "history", note: "Original note", customerNameSnapshot: null, customerEmailSnapshot: null, customerPhoneSnapshot: null });
  await client.execute({ sql: 'UPDATE "Booking" SET customerNameSnapshot=?', args: ["Saved contact"] });
  expect(await migrateBookingContacts(client)).toBe(0);
  expect((await client.execute('SELECT customerNameSnapshot FROM "Booking"')).rows[0].customerNameSnapshot).toBe("Saved contact");
});

test("refuses an uninitialized database", async () => {
  client = isolatedClient();
  await expect(migrateBookingContacts(client)).rejects.toThrow("Booking table is missing");
});
