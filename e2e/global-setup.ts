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
 *   4. bootstrap the demo admins the admin tests sign in with - one per Playwright project,
 *      because the desktop and mobile projects run in parallel and the session store keeps
 *      only one live session per account (see e2e/admin-credentials.ts),
 *   5. warm the dev server route compilation (see warmRoutes).
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
import { adminForProject } from "./admin-credentials";

const E2E_DB = path.join(process.cwd(), "prisma", "e2e.db");
const E2E_URL = `file:${E2E_DB}`;
const PORT = process.env.E2E_PORT || "3020";
const BASE_URL = `http://localhost:${PORT}`;

function run(cmd: string, extraEnv: Record<string, string> = {}): void {
  execSync(cmd, {
    cwd: process.cwd(),
    stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, DATABASE_URL: E2E_URL, ...extraEnv },
  });
}

/**
 * `next dev` compiles a route lazily, on its first request. That very first compile can
 * transiently serve a truncated dev-only payload, which the browser parses as flight/RSC
 * data and surfaces as a "Runtime SyntaxError: Unexpected end of JSON input" overlay -
 * failing whichever test happened to be first through the door. Requesting every route the
 * suite uses here, before any test runs, keeps those first-compile hiccups out of the test
 * window. The response status does not matter: a route that answers 401/404/405 has still
 * been imported and compiled, which is all we need.
 */
async function warmRoutes(): Promise<void> {
  const paths = [
    "/en",
    "/en/booking",
    "/en/contact",
    "/en/admin/login",
    "/en/admin",
    "/en/admin/requests",
    "/api/admin/session",
    "/api/admin/requests",
  ];
  for (const p of paths) {
    try {
      await fetch(`${BASE_URL}${p}`);
    } catch {
      // A transient blip is not fatal: the route still compiled.
    }
  }
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

  // 4. Demo admins for the admin-dashboard tests. Credentials come from .env via
  //    admin-credentials.ts; only the bcrypt hash is stored. Each Playwright project signs
  //    in as its own account so the parallel desktop+mobile run cannot evict each other's
  //    sessions (the session store keeps one live session per admin).
  run("npm run prisma:bootstrap-admin");
  const mobileAdmin = adminForProject("mobile");
  run("npm run prisma:bootstrap-admin", {
    ADMIN_INITIAL_EMAIL: mobileAdmin.email,
    ADMIN_INITIAL_PASSWORD: mobileAdmin.password,
  });

  // Sanity-check the provision: the seed must have written the service catalog. (The
  // libsql client API is .execute(); the earlier .query() attempt threw at runtime.)
  const probe = createClient({ url: E2E_URL });
  const rows = await probe.execute('SELECT COUNT(*) AS n FROM "Service"');
  const count = String(rows.rows[0].n);
  probe.close();

  // 5. Compile the routes now so a cold compile never lands inside a test.
  await warmRoutes();

  console.info(
    `[e2e] provisioned ${E2E_URL} (${count} services, 2 admins bootstrapped, routes warmed) in ${Date.now() - started}ms`,
  );
}