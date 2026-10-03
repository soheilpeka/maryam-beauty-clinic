import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { consistentSnapshot, verifyRemoteTarget, verifySecuritySchema } from "../../scripts/remote-security-maintenance";
import { applySecuritySchema, decryptBackup, encryptBackup, protectPath } from "../../scripts/security-maintenance";

const directory = mkdtempSync(join(process.env.SECURITY_TEST_OUTPUT ?? tmpdir(), "remote-security-unit-"));
const freshFile = () => join(directory, `${randomBytes(8).toString("hex")}.db`);

describe("remote maintenance safety gates, using synthetic local fixtures only", () => {
  it("requires an exact verified endpoint fingerprint and refuses unsafe targets", () => {
    const url = "libsql://synthetic.example";
    const digest = createHash("sha256").update(url).digest("hex");
    expect(verifyRemoteTarget(url, "synthetic-token", digest)).toBe(url);
    expect(() => verifyRemoteTarget(url, "synthetic-token", "0".repeat(64))).toThrow();
    expect(() => verifyRemoteTarget(url, "", digest)).toThrow();
    expect(() => verifyRemoteTarget(url, "synthetic-token", undefined)).toThrow();
    for (const unsafe of ["http://synthetic.example", "file:synthetic.db", "libsql://synthetic.example?tls=0", "libsql://user:secret@synthetic.example"]) {
      expect(() => verifyRemoteTarget(unsafe, "synthetic-token", createHash("sha256").update(unsafe).digest("hex"))).toThrow();
    }
  });
  it("backs up a WAL-mode database and faithfully restores integer, NUL text, BLOB and rowid", () => {
    const source = freshFile(); const snapshot = freshFile(); const restored = freshFile();
    execFileSync("python", ["-c", [
      "import sqlite3,sys",
      "db=sqlite3.connect(sys.argv[1]); db.execute('PRAGMA journal_mode=WAL')",
      "db.execute('CREATE TABLE Booking (id TEXT PRIMARY KEY, note TEXT, whole INTEGER, image BLOB)')",
      "db.execute('INSERT INTO Booking(rowid,id,note,whole,image) VALUES(?,?,?,?,?)',(42,'synthetic','hello'+chr(0)+'world',9007199254740993,bytes([0,1,255])))",
      "db.commit(); db.close()",
    ].join("\n"), source], { stdio: "pipe" });
    consistentSnapshot(source, snapshot);
    const key = randomBytes(32); const plain = readFileSync(snapshot);
    const encrypted = encryptBackup(plain, key);
    writeFileSync(restored, decryptBackup(encrypted, key), { flag: "wx" });
    execFileSync("python", ["-c", [
      "import sqlite3,sys,pathlib",
      "db=sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri()+'?mode=ro',uri=True)",
      "if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok': raise RuntimeError('Invalid integrity')",
      "if db.execute('SELECT rowid,id,note,whole,image FROM Booking').fetchone()!=(42,'synthetic','hello'+chr(0)+'world',9007199254740993,bytes([0,1,255])): raise RuntimeError('Data mismatch')",
      "db.close()",
    ].join("\n"), restored], { stdio: "pipe" });
    expect(() => consistentSnapshot(source, snapshot)).toThrow();
  });
  it("rejects a non-clinic snapshot", () => {
    const source = freshFile();
    execFileSync("python", ["-c", "import sqlite3,sys; db=sqlite3.connect(sys.argv[1]); db.execute('CREATE TABLE Other(id TEXT)'); db.close()", source], { stdio: "pipe" });
    expect(() => consistentSnapshot(source, freshFile())).toThrow();
    const original = process.env.PYTHONOPTIMIZE;
    try {
      process.env.PYTHONOPTIMIZE = "1";
      expect(() => consistentSnapshot(source, freshFile())).toThrow();
    } finally {
      if (original === undefined) delete process.env.PYTHONOPTIMIZE;
      else process.env.PYTHONOPTIMIZE = original;
    }
  });
  it("accepts repeated additive schema and preserves existing synthetic rows", async () => {
    const client = createClient({ url: `file:${freshFile()}` });
    try {
      await client.execute('CREATE TABLE Booking(id TEXT PRIMARY KEY, note TEXT)');
      await client.execute("INSERT INTO Booking VALUES ('synthetic','keep')");
      await verifySecuritySchema(client);
      expect(await applySecuritySchema(client)).toBe(3);
      await verifySecuritySchema(client);
      expect(await applySecuritySchema(client)).toBe(0);
      expect((await client.execute('SELECT note FROM Booking')).rows[0].note).toBe("keep");
    } finally { client.close(); }
  });
  it("refuses incompatible preexisting contact or budget definitions", async () => {
    const client = createClient({ url: `file:${freshFile()}` });
    try {
      await client.execute('CREATE TABLE Booking(id TEXT PRIMARY KEY, customerNameSnapshot INTEGER NOT NULL)');
      await expect(verifySecuritySchema(client)).rejects.toThrow();
      await client.execute('DROP TABLE Booking');
      await client.execute('CREATE TABLE Booking(id TEXT PRIMARY KEY)');
      await client.execute('CREATE TABLE RateLimitBucket(key TEXT PRIMARY KEY, unexpected TEXT)');
      await expect(verifySecuritySchema(client)).rejects.toThrow();
      expect((await client.execute('PRAGMA table_info(Booking)')).rows).toHaveLength(1);
    } finally { client.close(); }
  });
  it("refuses an index name reused for another table", async () => {
    const client = createClient({ url: `file:${freshFile()}` });
    try {
      await client.execute('CREATE TABLE Booking(id TEXT PRIMARY KEY)');
      await client.execute('CREATE INDEX RateLimitBucket_expiresAt_idx ON Booking(id)');
      await expect(verifySecuritySchema(client)).rejects.toThrow();
    } finally { client.close(); }
  });
  it("refuses unique or partial expiry indexes", async () => {
    for (const sql of [
      'CREATE UNIQUE INDEX RateLimitBucket_expiresAt_idx ON RateLimitBucket(expiresAt)',
      'CREATE INDEX RateLimitBucket_expiresAt_idx ON RateLimitBucket(expiresAt) WHERE expiresAt > 0',
    ]) {
      const client = createClient({ url: `file:${freshFile()}` });
      try {
        await client.execute('CREATE TABLE Booking(id TEXT PRIMARY KEY)');
        await applySecuritySchema(client);
        await client.execute('DROP INDEX RateLimitBucket_expiresAt_idx');
        await client.execute(sql);
        await expect(verifySecuritySchema(client)).rejects.toThrow();
      } finally { client.close(); }
    }
  });
  it.skipIf(process.platform !== "win32")("removes preexisting explicit public file and directory permissions", () => {
    const folder = mkdtempSync(join(directory, "acl-"));
    const file = join(folder, "synthetic.key");
    writeFileSync(file, "synthetic");
    for (const [path, isDirectory] of [[folder, true], [file, false]] as const) {
      execFileSync("icacls", [path, "/grant", "*S-1-1-0:F"], { stdio: "pipe" });
      protectPath(path, isDirectory);
      const identities = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", '$item=New-Object System.IO.FileInfo($env:SECURITY_TEST_ACL_PATH); if($env:SECURITY_TEST_ACL_DIRECTORY -eq "1") { $item=New-Object System.IO.DirectoryInfo($env:SECURITY_TEST_ACL_PATH) }; $item.GetAccessControl().GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]) | ForEach-Object { $_.IdentityReference.Value }'], { encoding: "utf8", env: { ...process.env, SECURITY_TEST_ACL_PATH: path, SECURITY_TEST_ACL_DIRECTORY: isDirectory ? "1" : "0" } });
      expect(identities).not.toContain("S-1-1-0");
      expect(identities.trim().split(/\r?\n/)).toHaveLength(2);
    }
  });
});
