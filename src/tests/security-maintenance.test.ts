import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { applySecuritySchema, decryptBackup, encryptBackup, replaceWeakSigningKey } from "../../scripts/security-maintenance";

describe("local security maintenance", () => {
  it("encrypts authenticated backups and rejects a wrong key or tampering", () => {
    const plain = Buffer.from("synthetic database backup");
    const key = randomBytes(32);
    const encrypted = encryptBackup(plain, key);
    expect(encrypted.includes(plain)).toBe(false);
    expect(decryptBackup(encrypted, key)).toEqual(plain);
    expect(() => decryptBackup(encrypted, randomBytes(32))).toThrow();
    const tampered = Buffer.from(encrypted); tampered[tampered.length - 1] ^= 1;
    expect(() => decryptBackup(tampered, key)).toThrow();
  });
  it("replaces only weak/missing signing keys and preserves other settings", () => {
    const original = "DATABASE_URL=file:./synthetic.db\nBOOKING_LINK_SECRET=dev-only-change-me-in-production\nUNRELATED=kept\n";
    const replacement = replaceWeakSigningKey(original);
    expect(replacement.changed).toBe(true);
    expect(replacement.contents).toContain("UNRELATED=kept");
    expect(replacement.contents).toContain("DATABASE_URL=file:./synthetic.db");
    expect(replacement.contents).toMatch(/^BOOKING_LINK_SECRET=[a-f0-9]{64}$/m);
    expect(replaceWeakSigningKey(replacement.contents)).toEqual({ contents: replacement.contents, changed: false });
    expect(replaceWeakSigningKey("UNRELATED=kept\n").contents).toMatch(/^BOOKING_LINK_SECRET=[a-f0-9]{64}$/m);
  });
  it("adds only security schema and is repeatable without rewriting records", async () => {
    const directory = join(process.cwd(), "artifacts", "security-verification");
    mkdirSync(directory, { recursive: true });
    const client = createClient({ url: `file:${join(directory, `maintenance-unit-${randomBytes(8).toString("hex")}.db`)}` });
    try {
      await client.execute('CREATE TABLE "Booking" ("id" TEXT PRIMARY KEY, "note" TEXT)');
      await client.execute({ sql: 'INSERT INTO "Booking" VALUES (?, ?)', args: ["synthetic", "preserve existing note"] });
      expect(await applySecuritySchema(client)).toBe(3);
      expect(await applySecuritySchema(client)).toBe(0);
      const rows = await client.execute('SELECT * FROM "Booking"');
      expect(rows.rows[0]).toMatchObject({ id: "synthetic", note: "preserve existing note",
        customerNameSnapshot: null, customerEmailSnapshot: null, customerPhoneSnapshot: null });
      expect((await client.execute('PRAGMA table_info("RateLimitBucket")')).rows).toHaveLength(3);
    } finally { client.close(); }
  });
});
