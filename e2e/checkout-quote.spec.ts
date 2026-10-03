import { test, expect } from "./local-test";
import { CART_STORAGE_KEY } from "../src/lib/cart";

for (const locale of ["en", "fr"]) {
  test(`${locale}: checkout refreshes cached prices, shipping and availability and can retry`, async ({ page }, info) => {
    await page.addInitScript(key => localStorage.setItem(key, JSON.stringify([{ slug: "quote-fixture", name: "Stale cached name", priceCents: 1, quantity: 2, imageUrl: null }])), CART_STORAGE_KEY);
    let mode: "error" | "available" | "sold-out" = "error";
    await page.route("**/api/store/cart/quote", route => mode === "error"
      ? route.fulfill({ status: 500, json: {} })
      : route.fulfill({ json: { enabled: true, lines: [{ slug: "quote-fixture", name: "Current name", quantity: 2, available: mode === "available", stock: mode === "available" ? 5 : 0, priceCents: 1250, lineTotalCents: 2500 }], subtotalCents: 2500, shippingCents: 1500, totalCents: 4000, freeShippingThresholdCents: 0 } }));
    await page.goto(`/${locale}/store/checkout`);
    const submit = page.locator('#main button[type="submit"]');
    await expect(submit).toBeDisabled();
    await expect(page.locator("#main [role=alert]")).toBeVisible();
    mode = "available";
    await page.getByRole("button", { name: locale === "fr" ? "Réessayer" : "Try again", exact: true }).click();
    await expect(submit).toBeEnabled();
    await expect(page.locator("#main aside")).toContainText("Current name");
    await expect(page.locator("#main aside dl dd").last()).toContainText(/40[.,]00/);
    await expect(page.locator("#main aside")).not.toContainText("Stale cached name");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await page.screenshot({ path: info.outputPath(`${locale}-checkout-fresh-quote.png`), fullPage: true });
    mode = "sold-out";
    await page.reload();
    await expect(submit).toBeDisabled();
    await expect(page.locator("#main [role=alert]")).toBeVisible();
    await expect(page.getByRole("link", { name: locale === "fr" ? "Retour au panier" : "Return to cart" }).first()).toBeVisible();
  });
}

test("decreasing the only remaining cart unit removes the line", async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify([{ slug: "last-unit", name: "Last unit", priceCents: 1000, quantity: 1, imageUrl: "/preview/studio.jpeg" }])), CART_STORAGE_KEY);
  await page.route("**/api/store/cart/quote", route => route.fulfill({ json: { enabled: true, lines: [{ slug: "last-unit", quantity: 1, available: true, imageUrl: null }], subtotalCents: 1000, shippingCents: 0, totalCents: 1000, freeShippingThresholdCents: 0 } }));
  await page.goto("/en/store/cart");
  await expect(page.locator(".cart-lines img")).toHaveCount(0);
  await page.getByRole("button", { name: "Decrease quantity" }).click();
  await expect(page.locator(".editorial-empty")).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), CART_STORAGE_KEY)).toEqual([]);
});
