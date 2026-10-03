import { test as base, expect } from "@playwright/test";

/** Keep browser regression traffic on the isolated local server. */
export const test = base.extend({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, runFixture, testInfo) => {
    // Model separate clients on the local trusted proxy, keeping real login budgets.
    const key = `${testInfo.project.name}:${testInfo.testId}:${testInfo.retry}`;
    let hash = 2166136261;
    for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    await runFixture({ ...extraHTTPHeaders, "x-forwarded-for": `198.18.${(hash >>> 8) % 256}.${hash % 256}` });
  },
  context: async ({ context, baseURL }, runFixture) => {
    const origin = new URL(baseURL!).origin;
    if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      throw new Error("E2E checks require a local isolated server");
    }
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      const source = url.pathname === "/_next/image" ? url.searchParams.get("url") : null;
      if (source && new URL(source, origin).origin !== origin) return route.abort("blockedbyclient");
      return url.origin === origin || ["data:", "blob:"].includes(url.protocol)
        ? route.continue() : route.abort("blockedbyclient");
    });
    await runFixture(context);
  },
});
export { expect };
export type { Page, TestInfo } from "@playwright/test";
