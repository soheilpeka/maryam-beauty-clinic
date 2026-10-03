import { test, expect } from "./local-test";
import { adminForProject } from "./admin-credentials";

for (const locale of ["en", "fr"]) {
  test(`${locale}: customer and historical booking pages remain accessible on small screens`, async ({ page }, info) => {
    const credentials = adminForProject(info.project.name);
    await page.goto(`/${locale}/admin/login`);
    await page.locator("#admin-email").fill(credentials.email);
    await page.locator("#admin-password").fill(credentials.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/admin$`));

    const rows = Array.from({ length: 53 }, (_, id) => ({
      id: `fixture-${id}`, name: `Customer ${id}`, email: `fixture-${id}@example.com`,
      phone: "+1 555 0199", notes: null, createdAt: "2026-01-01T12:00:00Z",
      bookingCount: 51, lastVisit: null,
    }));
    let release: (() => void) | undefined;
    let delay = false;
    await page.route("**/api/admin/customers**", async route => {
      const url = new URL(route.request().url());
      const offset = Number(url.searchParams.get("offset") ?? 0);
      if (url.pathname.endsWith("/customers")) {
        return route.fulfill({ json: { ok: true, customers: rows.slice(offset, offset + 50), total: 53, offset, hasMore: offset === 0 } });
      }
      if (delay) await new Promise<void>(resolve => { release = resolve; });
      const bookings = Array.from({ length: offset ? 1 : 50 }, (_, index) => ({
        id: `booking-${offset + index}`, ref: `HIST-${offset + index}`, status: "COMPLETED",
        startUtc: "2026-01-01T12:00:00Z", endUtc: "2026-01-01T13:00:00Z",
        priceTotal: 0, note: null, service: { name: "Original service", nameFr: "Service d’origine", duration: 60 },
        staff: { name: "Synthetic team member" },
      }));
      return route.fulfill({ json: { ok: true, customer: { ...rows[50], bookings, historyOffset: offset, hasMoreBookings: offset === 0 } } });
    });
    await page.goto(`/${locale}/admin/customers`);
    const next = locale === "fr" ? "Suivant" : "Next";
    const previous = locale === "fr" ? "Précédent" : "Previous";
    const pagination = page.getByRole("navigation", { name: locale === "fr" ? "Pagination des clients" : "Customer pagination" });
    await pagination.getByRole("button", { name: next }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".admin-content h3")).toHaveCount(3);
    await expect(page.locator(".admin-content")).toContainText("Customer 52");
    await expect(pagination.getByRole("button", { name: next })).toBeDisabled();
    await page.getByRole("button", { name: locale === "fr" ? "Historique" : "History", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("li")).toHaveCount(50);
    await expect(dialog).toContainText(locale === "fr" ? "Service d’origine" : "Original service");
    await dialog.getByRole("button", { name: next }).click();
    await expect(dialog.locator("li")).toHaveCount(1);
    await expect(dialog).toContainText("HIST-50");
    await expect(dialog.getByRole("button", { name: next })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await page.screenshot({ path: info.outputPath(`${locale}-customer-pagination.png`) });

    // A response that arrives after Escape must not reopen the dismissed dialog.
    delay = true;
    const requested = page.waitForRequest(request => request.url().includes("/customers/fixture-50?offset=0"));
    await dialog.getByRole("button", { name: previous }).click();
    await requested;
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    const response = page.waitForResponse(response => response.url().includes("/customers/fixture-50?offset=0"));
    release?.();
    await response;
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(dialog).toHaveCount(0);
    await pagination.getByRole("button", { name: previous }).click();
    await expect(page.locator(".admin-content h3")).toHaveCount(50);
  });
}
