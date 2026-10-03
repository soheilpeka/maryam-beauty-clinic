import { test, expect } from "./local-test";
import { CART_STORAGE_KEY } from "../src/lib/cart";

// Client-only presentation fixtures: no owner catalog rows or payments are created.
test("sold-out, loading and quantity controls stay accessible in both locales", async ({ page }, info) => {
  for (const locale of ["en", "fr"]) {
    await page.addInitScript(({ key, name }) => localStorage.setItem(key, JSON.stringify([{ slug: "visual-fixture", name, priceCents: 0, quantity: 1, imageUrl: null }])), { key: CART_STORAGE_KEY, name: locale === "fr" ? "Exemple visuel uniquement" : "Visual example only" });
    await page.route("**/api/store/cart/quote", route => route.fulfill({ json: { enabled: true, lines: [{ slug: "visual-fixture", quantity: 1, available: false, stock: 0, priceCents: 0, lineTotalCents: 0 }], subtotalCents: 0, shippingCents: 0, totalCents: 0, freeShippingThresholdCents: 0 } }));
    await page.goto(`/${locale}/store/cart`);
    await expect(page.locator("#main [role=alert]")).toHaveText(locale === "fr" ? "Épuisé" : "Sold out");
    await expect(page.locator("#main aside button")).toBeDisabled();
    await page.screenshot({ path: info.outputPath(`${locale}-sold-out-cart.png`), fullPage: true });
    await page.locator("#main li button").last().focus();
    await expect(page.locator("#main li button").last()).toBeFocused();
    await page.keyboard.press("Enter");
    await page.screenshot({ path: info.outputPath(`${locale}-quantity-focus.png`) });
    await page.locator("#main li button").first().click();
    await expect(page.locator(".editorial-empty")).toBeVisible();
    await page.unrouteAll();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/store/orders/visual-loading**", async route => { await gate; await route.fulfill({ status: 404, json: {} }); });
    await page.goto(`/${locale}/store/order/visual-loading?t=visual-only`);
    await expect(page.locator("#main [aria-busy=true]")).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${locale}-order-loading.png`) });
    release();
    await expect(page.locator("#main [role=alert]")).toBeVisible();
    await page.unrouteAll();
  }
});

test("dark theme and reduced motion retain the editorial palette and responsive layout", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  for (const locale of ["en", "fr"]) {
    for (const path of ["/about", "/booking", "/store", "/store/cart", "/store/checkout", "/service-page/rf-microneedling", "/contact", "/admin/login"]) {
      await page.goto(`/${locale}${path}`);
      await expect(page.locator("html")).toHaveClass(/dark/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      await page.screenshot({ path: info.outputPath(`dark-${locale}${path.replaceAll("/", "-")}.png`) });
    }
  }
});
