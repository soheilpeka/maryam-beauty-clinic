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
 * Playwright config generates synthetic credentials for the isolated test database.
 * No owner credentials or .env values are read. Mobile/store aliases remain separate.
 */

export interface AdminCredentials {
  email: string;
  password: string;
}

/**
 * Synthetic sign-in credentials for one project; fail if the config was not loaded.
 */
export function adminForProject(projectName: string | undefined): AdminCredentials {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Synthetic E2E credentials must be initialized by the Playwright config.",
    );
  }
  if (projectName === "mobile") {
    return { email: email.replace("@", "+mobile@"), password };
  }
  return { email, password };
}

export function storeAdminForProject(projectName: string | undefined): AdminCredentials {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Synthetic E2E credentials must be initialized by the Playwright config.");
  const alias = projectName === "mobile" ? "+store-mobile@" : "+store@";
  return { email: email.replace("@", alias), password };
}
