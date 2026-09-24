/**
 * Playwright global setup: provisions the DEDICATED e2e database (prisma/e2e.db).
 *
 * Why a separate file: e2e tests mutate data (submit booking requests, confirm/decline
 * them in the admin UI). Running them against prisma/dev.db would corrupt the demo data
 * the developer browses, and running them against prisma/test.db would fight the vitest
 * suite's own isolation. So the running server is pointed at e2e.db via DATABASE_URL
 * (see playwright.config.ts) and this setup rebuilds it from scratch before every run:
 *
 *   1. delete any stale e2e.db (safe: with reuseExistingServer:false we own the only
 *      server, and the homepage health check touches no table, so nothing holds the file),
 *   2. `prisma db push` the schema into it,
 *   3. seed the demo catalog (services / staff / hours / gallery / reviews),
 *   4. bootstrap the demo admin the later admin tests will sign in with.
 *
 * Playwright starts the web server BEFORE globalSetup, but that is fine: the readiness
 * probe is the homepage, which renders from the static content modules and never opens a
 * Prisma client. No query runs until a test loads a data-backed page, and every test runs
 * only after this setup has completed.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const E2E_DB = path.join(process.cwd(), "prisma", "e2e.db");
const E2E_URL = `file:${E2E_DB}`;

function run(cmd: string): void {
  execSync(cmd, {
    cwd: process.cwd(),
    stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, DATABASE_URL: E2E_URL },
  });
}

export default async function globalSetup(): Promise<void> {
  const started = Date.now();

  // 1. Fresh file every run -> deterministic state, no leftover bookings from a previous
  //    e2e pass.
  fs.rmSync(E2E_DB, { force: true });
  fs.rmSync(`${E2E_DB}-journal`, { force: true });

  // 2. Schema. Prisma 7 dropped --skip-generate, so the client is regenerated too.
  run("npx prisma db push");

  // 3. Demo catalog. The seed script is idempotent (upserts) and reads DATABASE_URL from
  //    the environment we pass here, never the developer's dev.db.
  run("npm run prisma:seed");

  // 4. Demo admin for the admin-dashboard tests (next step). Credentials come from .env
  //    via ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD; only the bcrypt hash is stored.
  run("npm run prisma:bootstrap-admin");

  // Sanity-check the provision: the seed must have written the service catalog. (The
  // libsql client API is .execute(); the earlier .query() attempt threw at runtime.)
  const probe = createClient({ url: E2E_URL });
  const rows = await probe.execute('SELECT COUNT(*) AS n FROM "Service"');
  const count = String(rows.rows[0].n);
  probe.close();

  console.info(
    `[e2e] provisioned ${E2E_URL} (${count} services, admin bootstrapped) in ${Date.now() - started}ms`,
  );
}
