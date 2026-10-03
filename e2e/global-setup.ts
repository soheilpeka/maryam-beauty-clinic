/**
 * Playwright global setup: provisions a unique DEDICATED e2e run database.
 *
 * Why a separate file: e2e tests mutate data (submit booking requests, confirm/decline
 * them in the admin UI). Running them against prisma/dev.db would corrupt the demo data
 * the developer browses, and running them against prisma/test.db would fight the vitest
 * suite's own isolation. The server uses a unique E2E_DATABASE_URL from the config:
 *
 *   1. create a new isolated database file exclusively, without deleting existing files,
 *   2. `prisma db push` the schema into it,
 *   3. seed the demo catalog (services / staff / hours / gallery / reviews),
 *   4. bootstrap the demo admins the admin/store tests sign in with - one per Playwright
 *      project and suite,
 *      because the desktop and mobile projects run in parallel and the session store keeps
 *      only one live session per account (see e2e/admin-credentials.ts),
 *   5. warm the dev server route compilation (see warmRoutes).
 *
 * Playwright starts the web server BEFORE globalSetup, but that is fine: the readiness
 * probe is /api/health, which never opens a Prisma client. Every test runs
 * only after this setup has completed.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { adminForProject, storeAdminForProject } from "./admin-credentials";

const E2E_DB = process.env.E2E_DATABASE_URL?.replace(/^file:/, "") ?? path.join(process.cwd(), "prisma", `e2e-${Date.now()}.db`);
const E2E_URL = `file:${E2E_DB}`;
const PORT = process.env.E2E_PORT || "3020";
const BASE_URL = `http://localhost:${PORT}`;

function run(cmd: string, extraEnv: Record<string, string> = {}): void {
  execSync(cmd, {
    cwd: process.cwd(),
    stdio: ["ignore", "ignore", "inherit"],
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
    ...["en", "fr"].flatMap(locale => ["", "/about", "/gallery", "/contact", "/book-online", "/service-page/rf-microneedling", "/booking", "/store", "/store/cart", "/store/checkout", "/pricing-plans/packages"].map(suffix => `/${locale}${suffix}`)),
    "/en",
    "/en/booking",
    "/en/contact",
    "/en/admin/login",
    "/en/admin",
    "/en/admin/requests",
    "/en/admin/products",
    "/en/admin/orders",
    "/en/store",
    "/en/store/cart",
    "/en/store/checkout",
    "/api/store/products",
    "/api/store/cart/quote",
    "/api/bookings",
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
  // Prisma's SQLite schema engine expects an existing database file on this Windows
  // workspace; an empty file is still a clean database and lets db push create the schema.
  fs.writeFileSync(E2E_DB, Buffer.alloc(0), { flag: "wx" });

  // 2. Schema. Prisma 7 dropped --skip-generate, so the client is regenerated too.
  run("npx prisma db push");
  run("npm run prisma:import-comparisons");

  // 3. Demo catalog. The seed script is idempotent (upserts) and reads DATABASE_URL from
  //    the environment we pass here, never the developer's dev.db.
  run("npm run prisma:seed");

  // 4. Demo admins for the admin-dashboard tests. Credentials come from .env via
  //    admin-credentials.ts; only the bcrypt hash is stored. Each Playwright project signs
  //    in as its own account so the parallel desktop+mobile run cannot evict each other's
  //    sessions (the session store keeps one live session per admin).
  const desktopAdmin = adminForProject("desktop");
  run("npm run prisma:bootstrap-admin", {
    ADMIN_INITIAL_EMAIL: desktopAdmin.email,
    ADMIN_INITIAL_PASSWORD: desktopAdmin.password,
  });
  const mobileAdmin = adminForProject("mobile");
  run("npm run prisma:bootstrap-admin", {
    ADMIN_INITIAL_EMAIL: mobileAdmin.email,
    ADMIN_INITIAL_PASSWORD: mobileAdmin.password,
  });
  const storeAdmin = storeAdminForProject("desktop");
  run("npm run prisma:bootstrap-admin", {
    ADMIN_INITIAL_EMAIL: storeAdmin.email,
    ADMIN_INITIAL_PASSWORD: storeAdmin.password,
  });
  const mobileStoreAdmin = storeAdminForProject("mobile");
  run("npm run prisma:bootstrap-admin", {
    ADMIN_INITIAL_EMAIL: mobileStoreAdmin.email,
    ADMIN_INITIAL_PASSWORD: mobileStoreAdmin.password,
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
    `[e2e] provisioned ${E2E_URL} (${count} services, isolated admin accounts bootstrapped, routes warmed) in ${Date.now() - started}ms`,
  );
}
