import { defineConfig } from "@playwright/test";

// Dedicated e2e port so a developer's `next dev` on 3000/3010 never collides.
const PORT = process.env.E2E_PORT || "3020";
const baseURL = `http://localhost:${PORT}`;

// The running server is pointed at the throwaway e2e database (never dev.db, never the
// vitest test.db). Created + seeded before every run by e2e/global-setup.ts.
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? `file:${process.cwd()}/prisma/e2e-${Date.now()}.db`.replace(/\\/g, "/");
process.env.E2E_DATABASE_URL = E2E_DATABASE_URL;

// This environment cannot download Playwright's bundled browsers
// (cdn.playwright.dev returns 403 "service is not available in your location"), so both
// projects run against the system-installed Google Chrome via channel: "chrome". The
// mobile project keeps a phone-class viewport + touch + isMobile instead of
// devices["iPhone 15"], which would require the (undownloadable) WebKit build.
const CHROME = { channel: "chrome" as const };

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    ...CHROME,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...CHROME, viewport: { width: 1280, height: 720 } },
    },
    {
      name: "mobile",
      use: {
        ...CHROME,
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    // `next dev` (not `next start`) so a production build is not a prerequisite for e2e.
    // DATABASE_URL points at a unique e2e run database; process.env wins over .env, so the
    // dev.db path there is never used for e2e.
    command: `npx next dev -p ${PORT}`,
    // Public pages use CMS data; this readiness endpoint deliberately avoids the DB
    // until global setup has created the isolated test database.
    url: `${baseURL}/api/health`,
    timeout: 180_000,
    // Own this server so it uses this run's isolated database, never a stray dev server.
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      NEXT_PUBLIC_BASE_URL: baseURL,
      NOTIFICATION_PROVIDER: "mock",
      // The e2e checkout intentionally uses the isolated mock provider; production/default
      // runtime selection remains Stripe test mode and refuses checkout until configured.
      PAYMENT_PROVIDER: "mock",
      // The suite submits several booking requests from one localhost IP in parallel;
      // the production default of 5/min would throttle it.
      BOOKING_RATE_LIMIT_PER_MINUTE: "60",
    },
  },
});
