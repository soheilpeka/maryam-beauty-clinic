/** Local-only security maintenance. No remote database, provider or host is contacted. */
import "@/lib/env-preload";
import { createClient, type Client } from "@libsql/client";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync, chmodSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONTACT_COLUMNS = ["customerNameSnapshot", "customerEmailSnapshot", "customerPhoneSnapshot"] as const;
const MAGIC = Buffer.from("MBCBACKUP1");
let maintenanceStage = "initialization";

export function encryptBackup(data: Buffer, key: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), encrypted]);
}

export function decryptBackup(data: Buffer, key: Buffer): Buffer {
  if (!data.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Invalid backup format.");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(MAGIC.length, MAGIC.length + 12));
  decipher.setAuthTag(data.subarray(MAGIC.length + 12, MAGIC.length + 28));
  return Buffer.concat([decipher.update(data.subarray(MAGIC.length + 28)), decipher.final()]);
}

export function protectPath(path: string, directory: boolean): void {
  if (process.platform === "win32") {
    const identity = execFileSync("whoami", ["/user", "/fo", "csv", "/nh"], { encoding: "utf8" });
    const sid = identity.match(/S-1-5-[\d-]+/)?.[0];
    if (!sid) throw new Error("Could not determine backup owner.");
    // Replace the entire DACL: grant:r alone leaves other explicit grants intact.
    execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", [
      "$ErrorActionPreference='Stop'",
      "$path=$env:SECURITY_PROTECT_PATH",
      "$owner=New-Object System.Security.Principal.SecurityIdentifier($env:SECURITY_PROTECT_SID)",
      "$system=New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')",
      "$item=New-Object System.IO.FileInfo($path)",
      "if($env:SECURITY_PROTECT_DIRECTORY -eq '1') { $item=New-Object System.IO.DirectoryInfo($path) }",
      "$acl=$item.GetAccessControl()",
      "$acl.SetAccessRuleProtection($true,$false)",
      "foreach($rule in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($rule) }",
      "$acl.SetOwner($owner)",
      "$inheritance=[System.Security.AccessControl.InheritanceFlags]::None",
      "if($env:SECURITY_PROTECT_DIRECTORY -eq '1') { $inheritance=[System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit' }",
      "foreach($identity in @($owner,$system)) { $rule=New-Object System.Security.AccessControl.FileSystemAccessRule($identity,'FullControl',$inheritance,'None','Allow'); $acl.AddAccessRule($rule) }",
      "$item.SetAccessControl($acl)",
      "$verified=$item.GetAccessControl()",
      "if(-not $verified.AreAccessRulesProtected) { throw 'Private ACL required' }",
      "$rules=@($verified.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]))",
      "if($rules.Count -ne 2) { throw 'Unexpected private ACL' }",
      "foreach($rule in $rules) { if($rule.IdentityReference.Value -notin @($owner.Value,$system.Value) -or $rule.AccessControlType -ne 'Allow' -or $rule.FileSystemRights -ne 'FullControl') { throw 'Unexpected private ACL' } }",
    ].join('; ')], { stdio: "pipe", env: { ...process.env, SECURITY_PROTECT_PATH: path, SECURITY_PROTECT_SID: sid, SECURITY_PROTECT_DIRECTORY: directory ? "1" : "0" } });
  } else chmodSync(path, directory ? 0o700 : 0o600);
}

export function replaceWeakSigningKey(contents: string): { contents: string; changed: boolean } {
  const match = /^BOOKING_LINK_SECRET=(.*)$/m.exec(contents);
  const key = match?.[1].trim().replace(/^(["'])(.*)\1$/, "$2") ?? "";
  const weak = key.length < 32 || /^(?:dev[-_ ]?only|change[-_ ]?me|replace[-_ ]?me|your[-_ ]|example[-_ ]|placeholder|test[-_ ]secret)/i.test(key);
  if (!weak) return { contents, changed: false };
  const replacement = `BOOKING_LINK_SECRET=${randomBytes(32).toString("hex")}`;
  return { contents: match ? contents.replace(/^BOOKING_LINK_SECRET=.*$/m, replacement) : `${contents.trimEnd()}\n${replacement}\n`, changed: true };
}

/** Add only these security columns/table, retaining all existing records/content. */
export async function applySecuritySchema(client: Client): Promise<number> {
  const tx = await client.transaction("write");
  try {
    const columns = await tx.execute('PRAGMA table_info("Booking")');
    if (!columns.rows.length) throw new Error("Existing Booking table is required.");
    let added = 0;
    for (const name of CONTACT_COLUMNS) {
      if (!columns.rows.some(column => column.name === name)) {
        await tx.execute(`ALTER TABLE "Booking" ADD COLUMN "${name}" TEXT`);
        added++;
      }
    }
    await tx.execute('CREATE TABLE IF NOT EXISTS "RateLimitBucket" ("key" TEXT NOT NULL PRIMARY KEY, "hitsJson" TEXT NOT NULL, "expiresAt" BIGINT NOT NULL)');
    await tx.execute('CREATE INDEX IF NOT EXISTS "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket" ("expiresAt")');
    await tx.commit();
    return added;
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.close(); }
}

async function main(): Promise<void> {
  if (!process.argv.includes("--apply-local")) throw new Error("Use --apply-local for local maintenance.");
  const root = realpathSync(process.cwd());
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:") || /[?#]/.test(url)) throw new Error("Only an existing local file database is supported.");
  const dbPath = realpathSync(resolve(url.slice(5)));
  const dbRelative = relative(join(root, "prisma"), dbPath);
  if (dbRelative.startsWith("..") || resolve(join(root, "prisma"), dbRelative) !== dbPath) throw new Error("Database must be inside this project's prisma directory.");

  const privateRoot = join(root, ".private");
  mkdirSync(privateRoot, { recursive: true, mode: 0o700 }); protectPath(privateRoot, true);
  const keys = join(privateRoot, "keys");
  const backups = join(privateRoot, "backups");
  for (const directory of [keys, backups]) { mkdirSync(directory, { recursive: true, mode: 0o700 }); protectPath(directory, true); }
  const keyPath = join(keys, "security-backup.key");
  if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: "wx" });
  protectPath(keyPath, false);
  const key = readFileSync(keyPath);
  if (key.length !== 32) throw new Error("Invalid backup key.");
  // Remove only this script's interrupted plaintext copies after proving that the
  // matching authenticated encrypted backup contains exactly the same bytes.
  for (const name of readdirSync(backups)) {
    if (!/^\d{4}-\d{2}-\d{2}T[\dZ-]+-snapshot\.db$/.test(name)) continue;
    const plainPath = join(backups, name);
    const encryptedPath = join(backups, name.replace(/snapshot\.db$/, "database.enc"));
    if (existsSync(encryptedPath) && decryptBackup(readFileSync(encryptedPath), key).equals(readFileSync(plainPath))) {
      unlinkSync(plainPath);
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const saveBackup = (name: string, plain: Buffer) => {
    const output = join(backups, `${stamp}-${name}.enc`);
    writeFileSync(output, encryptBackup(plain, key), { flag: "wx", mode: 0o600 });
    protectPath(output, false);
    if (!decryptBackup(readFileSync(output), key).equals(plain)) throw new Error("Backup verification failed.");
  };

  const snapshot = join(backups, `${stamp}-snapshot.db`);
  maintenanceStage = "database backup";
  const client = createClient({ url: `file:${dbPath}` });
  try {
    // SQLite's online backup API includes committed WAL pages. A separate process
    // closes every backup file handle before cleanup (important on Windows).
    execFileSync("python", ["-c", [
      "import sqlite3, sys, pathlib",
      "source = sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri() + '?mode=ro', uri=True)",
      "target = sqlite3.connect(sys.argv[2])",
      "try:",
      " source.backup(target)",
      " if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok': raise RuntimeError('Invalid backup')",
      "finally:",
      " target.close()",
      " source.close()",
    ].join("\n"), dbPath, snapshot], { stdio: "pipe" });
    protectPath(snapshot, false);
    saveBackup("database", readFileSync(snapshot));
    console.info("Encrypted local database backup created; decryption and integrity verified.");
    maintenanceStage = "additive database schema";
    const added = await applySecuritySchema(client);
    console.info(`Local security schema applied: ${added} contact columns added; shared budget table ready. Existing records preserved.`);
  } finally {
    client.close();
    if (existsSync(snapshot)) unlinkSync(snapshot);
  }

  for (const name of [".env", ".env.staging"]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    const original = readFileSync(path, "utf8");
    const update = replaceWeakSigningKey(original);
    if (update.changed) {
      maintenanceStage = "encrypted environment backup";
      saveBackup(`${name.slice(1)}-before-key-update`, Buffer.from(original));
      maintenanceStage = "environment key update";
      writeFileSync(path, update.contents, { mode: 0o600 });
    }
    maintenanceStage = "environment file permissions";
    protectPath(path, false);
    console.info(`${name}: ${update.changed ? "unique random signing key configured" : "existing signing key retained"}; private file permissions applied.`);
  }
  const duplicateEnv = join(root, ".env.staging.txt");
  if (existsSync(duplicateEnv)) protectPath(duplicateEnv, false);
  protectPath(dbPath, false);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const code = error && typeof error === "object" && "code" in error &&
      typeof error.code === "string" && /^[A-Z_]{2,40}$/.test(error.code) ? error.code : "INTERNAL";
    console.error(`Local security maintenance failed at ${maintenanceStage} (${code}). No credentials or customer data logged; verify the protected backup before retrying.`);
    process.exitCode = 1;
  });
}
