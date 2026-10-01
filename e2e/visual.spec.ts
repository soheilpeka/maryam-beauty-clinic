import { test, expect } from "@playwright/test";
import { adminForProject } from "./admin-credentials";

test("editorial route families, admin forms and customer failure states", async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  async function shot(name: string) {
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.scrollWidth), name).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(await page.locator("#main").innerText(), name).not.toMatch(/(?:Manage|Booking|Store|Admin)\.[a-zA-Z]/);
    await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
  }
  await page.goto("/en/about");
  const mobileMenu = page.getByRole("button", { name: "Open menu" });
  if (await mobileMenu.isVisible()) {
    await mobileMenu.focus(); await expect(mobileMenu).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    await shot("mobile-navigation-open");
    await page.keyboard.press("Escape");
  } else {
    await page.getByRole("button", { name: "Treatments", exact: true }).hover();
    await shot("desktop-treatments-open");
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Switch language" }).click();
  await shot("language-menu-open");
  await page.keyboard.press("Escape");
  for (const locale of ["en", "fr"]) {
    for (const [name, path] of [["home", ""], ["about", "/about"], ["services", "/book-online"], ["service", "/service-page/rf-microneedling"], ["gallery", "/gallery"], ["contact", "/contact"], ["booking", "/booking"], ["store", "/store"], ["cart-empty", "/store/cart"], ["checkout-empty", "/store/checkout"], ["packages", "/pricing-plans/packages"], ["journal-unavailable", "/blog"], ["gift-unavailable", "/gift-card"], ["not-found", "/post/obsolete"], ["category-not-found", "/blog/categories/obsolete"], ["booking-invalid", "/booking/invalid"], ["order-invalid", "/store/order/invalid"], ["admin-login", "/admin/login"]]) {
      await page.goto(`/${locale}${path}`);
      await shot(`${locale}-${name}`);
    }
    await page.goto(`/${locale}/contact`);
    await page.locator('#main form button[type="submit"]').click();
    await expect(page.locator("#main [role=alert]").first()).toBeVisible();
    await shot(`${locale}-contact-validation`);
  }
  const credentials = adminForProject(info.project.name);
  await page.goto("/en/admin/login");
  await page.locator("#admin-email").fill(credentials.email);
  await page.locator("#admin-password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const locale of ["en", "fr"]) {
    for (const suffix of ["", "/requests", "/services", "/staff", "/products", "/packages", "/gallery", "/orders", "/customers"]) {
      await page.goto(`/${locale}/admin${suffix}`);
      await expect(page.locator(".admin-shell h1")).toBeVisible();
      await shot(`${locale}-admin${suffix.replace("/", "-") || "-dashboard"}`);
      if (["/services", "/products", "/packages", "/gallery"].includes(suffix)) {
        await page.locator('.admin-content button').filter({ hasText: locale === "fr" ? /^Ajouter/ : /^Add / }).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await shot(`${locale}-admin${suffix.replace("/", "-")}-form`);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
      if (suffix === "/staff") {
        await page.getByRole("button", { name: locale === "fr" ? "Heures de travail" : "Working hours", exact: true }).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await shot(`${locale}-admin-schedule`);
        await page.keyboard.press("Escape");
      }
      if (suffix === "/customers") {
        await page.getByRole("button", { name: locale === "fr" ? "Historique" : "History", exact: true }).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await shot(`${locale}-admin-customer-history`);
        await page.keyboard.press("Escape");
      }
      if (suffix === "/orders") {
        await page.locator("summary").first().click();
        await shot(`${locale}-admin-order-details`);
      }
    }
  }
  // Simulate an API fault without changing a database row.
  await page.route("**/api/admin/requests**", route => route.fulfill({ status: 500, contentType: "application/json", body: '{}' }));
  await page.goto("/fr/admin/requests");
  await expect(page.locator("#main [role=alert]").first()).toBeVisible();
  await shot("fr-admin-server-error");
  await page.unrouteAll();
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const path of ["/en/booking", "/en/store/cart", "/fr/admin/services"]) {
    await page.goto(path); await shot(`tablet-${path.replaceAll("/", "-")}`);
  }
  expect(errors).toEqual([]);
});
