/** Explicitly gated remote backup and additive security DDL; never deploys or seeds. */
import "@/lib/env-preload";
import { createClient, type Client } from "@libsql/client";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, readdirSync, lstatSync, unlinkSync, rmdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applySecuritySchema, decryptBackup, encryptBackup, protectPath } from "./security-maintenance";
import { applyMediaSchema } from "./media-schema";
import { applyComparisonSchema } from "./content-schema";
import { publishSkinPrograms, importComparisons, refreshSalonMedia, correctSkinProgramPrices } from "./content-upgrade";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

let stage = "target verification";
const CONTACT_COLUMNS = ["customerNameSnapshot", "customerEmailSnapshot", "customerPhoneSnapshot"];

export function verifyRemoteTarget(url: string | undefined, token: string | undefined, fingerprint: string | undefined): string {
  if (!url || !token?.trim() || !fingerprint || !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error("Verified target and credentials required.");
  const parsed = new URL(url);
  if (parsed.protocol !== "libsql:" || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("TLS libSQL target required.");
  if (createHash("sha256").update(url.trim()).digest("hex") !== fingerprint) throw new Error("Target mismatch.");
  return url.trim();
}

/** Reject unexpected existing schema before adding anything. No customer rows are read. */
export async function verifySecuritySchema(client: Client): Promise<void> {
  const booking = await client.execute('PRAGMA table_info("Booking")');
  if (!booking.rows.length) throw new Error("Booking table required.");
  for (const column of booking.rows.filter(row => CONTACT_COLUMNS.includes(String(row.name)))) {
    if (String(column.type).toUpperCase() !== "TEXT" || Number(column.notnull) !== 0 || Number(column.pk) !== 0) throw new Error("Unexpected contact schema.");
  }
  const bucket = await client.execute('PRAGMA table_info("RateLimitBucket")');
  if (bucket.rows.length) {
    const expected = new Map([["key", "TEXT"], ["hitsJson", "TEXT"], ["expiresAt", "BIGINT"]]);
    if (bucket.rows.length !== expected.size || bucket.rows.some(row => {
      const name = String(row.name); const type = String(row.type).toUpperCase();
      return !expected.has(name) || (type !== expected.get(name) && !(name === "expiresAt" && type === "INTEGER")) ||
        Number(row.notnull) !== 1 || Number(row.pk) !== (name === "key" ? 1 : 0);
    })) throw new Error("Unexpected request budget schema.");
  }
  const existingIndex = await client.execute("SELECT tbl_name FROM sqlite_master WHERE type = 'index' AND name = 'RateLimitBucket_expiresAt_idx'");
  if (existingIndex.rows.length) {
    const columns = await client.execute('PRAGMA index_info("RateLimitBucket_expiresAt_idx")');
    const indexes = await client.execute('PRAGMA index_list("RateLimitBucket")');
    const index = indexes.rows.find(row => row.name === "RateLimitBucket_expiresAt_idx");
    if (!index || Number(index.unique) !== 0 || Number(index.partial) !== 0 || existingIndex.rows[0].tbl_name !== "RateLimitBucket" || columns.rows.length !== 1 || columns.rows[0].name !== "expiresAt") throw new Error("Unexpected budget index.");
  }
}

export function consistentSnapshot(source: string, target: string): void {
  if (existsSync(target)) throw new Error("Snapshot destination must be new.");
  execFileSync("python", ["-c", [
    "import sqlite3, pathlib, sys",
    "source=sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri()+'?mode=ro', uri=True)",
    "target=sqlite3.connect(sys.argv[2])",
    "try:",
    " source.backup(target)",
    " if target.execute('PRAGMA integrity_check').fetchone()[0]!='ok': raise RuntimeError('Invalid backup')",
    " if target.execute(\"SELECT count(*) FROM sqlite_master WHERE type='table' AND name='Booking'\").fetchone()[0]!=1: raise RuntimeError('Booking table required')",
    "finally:", " target.close()", " source.close()",
  ].join("\n"), source, target], { stdio: "pipe", timeout: 180_000 });
}

async function main(): Promise<void> {
  if (!process.argv.includes("--allow-remote")) throw new Error("Explicit remote operation required.");
  const position = process.argv.indexOf("--expected-target-sha256");
  const url = verifyRemoteTarget(process.env.DATABASE_URL, process.env.DATABASE_AUTH_TOKEN, position < 0 ? undefined : process.argv[position + 1]);
  const root = realpathSync(process.cwd());
  const privateRoot = join(root, ".private");
  mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
  if (relative(root, realpathSync(privateRoot)) !== ".private") throw new Error("Unexpected private directory.");
  protectPath(privateRoot, true);
  const backups = join(privateRoot, "backups"); const keys = join(privateRoot, "keys");
  for (const path of [backups, keys]) {
    mkdirSync(path, { recursive: true, mode: 0o700 });
    if (realpathSync(path) !== path) throw new Error("Private directories must not be links.");
    protectPath(path, true);
  }
  const keyPath = join(keys, "security-backup.key");
  if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { flag: "wx", mode: 0o600 });
  if (lstatSync(keyPath).isSymbolicLink()) throw new Error("Backup key must not be a link.");
  protectPath(keyPath, false);
  const key = readFileSync(keyPath); if (key.length !== 32) throw new Error("Invalid backup key.");
  const work = join(privateRoot, `remote-work-${Date.now()}-${randomBytes(8).toString("hex")}`);
  mkdirSync(work, { mode: 0o700 }); protectPath(work, true);
  const replica = join(work, "replica.db"); const snapshot = join(work, "snapshot.db");
  const restore = join(work, "restore.db");
  let client: Client | undefined;
  try {
    stage = "remote snapshot sync";
    // This child only syncs a fresh local replica. It performs no local/remote writes
    // through execute(); process exit releases native Windows file handles.
    execFileSync(process.execPath, ["--input-type=module", "-e", [
      'import {createClient} from "@libsql/client";',
      'const replica=createClient({url:process.argv[1],syncUrl:process.env.DATABASE_URL,authToken:process.env.DATABASE_AUTH_TOKEN,offline:false,intMode:"bigint"});',
      'try {await replica.sync();} finally {replica.close();}',
    // libSQL's native Windows parser retains the leading slash in file:///C:/.
    // Match the native absolute-path form used by the local maintenance client.
    ].join("\n"), `file:${replica}`], { env: process.env, stdio: "pipe", timeout: 180_000 });
    stage = "consistent backup";
    consistentSnapshot(replica, snapshot);
    const plain = readFileSync(snapshot);
    const output = join(backups, `remote-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}.enc`);
    writeFileSync(output, encryptBackup(plain, key), { flag: "wx", mode: 0o600 }); protectPath(output, false);
    const decrypted = decryptBackup(readFileSync(output), key);
    if (!decrypted.equals(plain)) throw new Error("Backup authentication failed.");
    writeFileSync(restore, decrypted, { flag: "wx", mode: 0o600 }); protectPath(restore, false);
    stage = "restore integrity";
    // Reopen the decrypted restore copy in SQLite; no customer records are printed.
    execFileSync("python", ["-c", 'import sqlite3,sys,pathlib\ndb=sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri()+"?mode=ro",uri=True)\ntry:\n if db.execute("PRAGMA integrity_check").fetchone()[0]!="ok": raise RuntimeError("Invalid restore")\nfinally: db.close()', restore], { stdio: "pipe" });
    console.info("Encrypted remote snapshot saved; authenticated decryption and isolated restore integrity verified.");
    if (process.argv.includes("--apply-store-release")) {
      stage = "additive store release schema";
      client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN, intMode: "bigint" });
      const additions = [
        ["Order", "taxCents", "INTEGER NOT NULL DEFAULT 0"],
        ["Order", "shippingCarrier", "TEXT"],
        ["Order", "trackingNumber", "TEXT"],
        ["Order", "trackingUrl", "TEXT"],
        ["PaymentAttempt", "paymentIntentId", "TEXT"],
      ] as const;
      for (const [table, column, definition] of additions) {
        const columns = await client.execute(`PRAGMA table_info("${table}")`);
        if (!columns.rows.length) throw new Error("Required store table missing.");
        const existing = columns.rows.find(row => row.name === column);
        if (existing && String(existing.type).toUpperCase() !== definition.split(" ")[0]) throw new Error("Unexpected store column type.");
        if (!existing) await client.execute(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
        const verified = await client.execute(`PRAGMA table_info("${table}")`);
        if (!verified.rows.some(row => row.name === column)) throw new Error("Store column verification failed.");
      }
      stage = "approved brochure price correction";
      const db = new PrismaClient({ adapter: new PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN }) });
      try {
        console.info(`Store columns verified; ${await correctSkinProgramPrices(db)} approved package prices corrected with audit history.`);
      } finally { await db.$disconnect(); }
      client.close(); client = undefined;
    }
    if (process.argv.includes("--apply-content-upgrade")) {
      stage = "additive content schema";
      client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN, intMode: "bigint" });
      await applyComparisonSchema(client);
      const db = new PrismaClient({ adapter: new PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN }) });
      try {
        stage = "approved content import";
        const packages = await publishSkinPrograms(db);
        const comparisons = await importComparisons(db);
        const gallery = await refreshSalonMedia(db);
        console.info(`Approved content upgrade: ${packages} packages, ${comparisons} comparisons added; ${gallery} untouched gallery entries upgraded. Existing CMS edits and visibility preserved.`);
      } finally { await db.$disconnect(); }
      client.close(); client = undefined;
    }
    if (process.argv.includes("--apply-media-schema")) {
      stage = "additive upload schema";
      client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN, intMode: "bigint" });
      await applyMediaSchema(client);
      console.info("Upload table ready after verified encrypted backup. Existing records preserved.");
    }
    if (process.argv.includes("--apply-security-schema")) {
      stage = "remote schema preflight";
      client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN, intMode: "bigint" });
      await verifySecuritySchema(client);
      stage = "additive security schema";
      const added = await applySecuritySchema(client);
      await verifySecuritySchema(client);
      console.info(`Additive security schema verified: ${added} nullable contact columns added; shared budget table ready. Existing records preserved.`);
    }
  } finally {
    client?.close();
    // Only this run's freshly-created work directory is eligible; never recursively delete.
    if (realpathSync(work) === work && relative(privateRoot, work).startsWith("remote-work-")) {
      for (const name of readdirSync(work)) {
        const path = join(work, name); if (!lstatSync(path).isFile()) throw new Error("Unexpected backup work entry.");
        unlinkSync(path);
      }
      rmdirSync(work);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error(`Remote security maintenance stopped at ${stage}. No credentials or customer data logged. No schema change is attempted before a verified backup.`); process.exitCode = 1; });
}
