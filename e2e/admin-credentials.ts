/**
 * Admin credentials for the e2e suite, split per Playwright project.
 *
 * WHY TWO ACCOUNTS: src/lib/sessions.ts createSession() deletes every other session for the
 * same admin before inserting it - one live session per account is a deliberate security
 * property. The desktop and mobile projects run admin.spec.ts in PARALLEL. When both signed
 * in as the SAME account, the second sign-in evicted the first session, so the very next
 * mutation from the first project then 401-ed with "Your session has expired", and the two
 * deleteMany+create writes racing on one adminId could even make a login POST fail outright
 * (which is exactly why the decline test was left sitting on the login page). Handing each
 * project its own account removes the collision without weakening the real single-session
 * rule the app enforces in production.
 *
 * The credentials come from .env - the same file e2e/global-setup.ts bootstraps both admin
 * rows against. The mobile account is a plus-addressed alias of the demo admin, so both stay
 * obviously demo accounts and share the demo password.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface AdminCredentials {
  email: string;
  password: string;
}

function envFromFile(): Record<string, string> {
  const values: Record<string, string> = {};
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) {
      values[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }
  return values;
}

const ENV = envFromFile();

/**
 * The sign-in credentials for one project. Throws when .env has no demo admin, so the test
 * fails loudly instead of looping on "invalid credentials".
 */
export function adminForProject(projectName: string | undefined): AdminCredentials {
  const email = ENV.ADMIN_INITIAL_EMAIL ?? process.env.ADMIN_INITIAL_EMAIL;
  const password = ENV.ADMIN_INITIAL_PASSWORD ?? process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD must be set in .env for the admin e2e tests.",
    );
  }
  if (projectName === "mobile") {
    return { email: email.replace("@", "+mobile@"), password };
  }
  return { email, password };
}