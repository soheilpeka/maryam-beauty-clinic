import { test, expect, type Page, type TestInfo } from "./local-test";
import { storeAdminForProject } from "./admin-credentials";

test.describe("store customer and admin flows", () => {
  test.describe.configure({ mode: "serial" });

  async function signIn(page: Page, testInfo: TestInfo) {
    const credentials = storeAdminForProject(testInfo.project.name);
    await page.goto("/en/admin/login");
    await page.locator("#admin-email").fill(credentials.email);
    await page.locator("#admin-password").fill(credentials.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  }

  test("customer sees a clear store state before or after the owner publishes products", async ({ page }) => {
    await page.goto("/en/store");
    await expect(page.getByRole("heading", { name: "Bring the studio home." })).toBeVisible();
    const emptyState = page.getByText("The collection is being prepared. Check back soon.");
    const publishedProduct = page.getByRole("heading", { name: "The Maryam C edit" }).last();
    await expect(emptyState.or(publishedProduct)).toBeVisible();
  });

  test("admin can publish a product and a customer can complete the guarded demo flow", async ({ page }, testInfo) => {
    await signIn(page, testInfo);
    await page.goto("/en/admin/products");
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Add product" }).click();
    await page.screenshot({ path: testInfo.outputPath("admin-product-form.png") });
    const sku = `E2E-${Date.now()}`;
    await page.locator("#product-sku").fill(sku);
    await page.locator("#product-category").fill("Skincare");
    await page.locator("#product-name").fill("E2E Test Product");
    await page.locator("#product-nameFr").fill("Produit test E2E");
    await page.locator("#product-price").fill("12.50");
    await page.locator("#product-stock").fill("4");
    await page.getByRole("dialog").getByLabel("Primary image", { exact: true }).fill("/example-pics/hair-look-1.png");
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("E2E Test Product", { exact: true }).first()).toBeVisible();
    const row = page.locator("li").filter({ hasText: sku });
    await row.getByRole("button", { name: "Edit" }).click();
    await page.locator("#product-stock").fill("7");
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(row).toContainText("7");

    await page.goto("/en/store");
    const firstCard = page.locator("article.product-editorial-card").filter({ hasText: "E2E Test Product" }).first();
    await expect(firstCard).toBeVisible();
    await firstCard.getByRole("button", { name: "Add to cart" }).click();
    await expect(firstCard.getByRole("button", { name: "Added", exact: true })).toBeVisible();
    await firstCard.getByRole("link").first().click();
    await expect(page.locator("#main h1")).toHaveText("E2E Test Product");
    await page.screenshot({ path: testInfo.outputPath("product-detail.png"), fullPage: true });
    await page.goto("/en/store/cart");
    await expect(page).toHaveURL(/\/store\/cart$/);
    await expect(page.getByRole("heading", { name: "Your cart", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to checkout" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("cart-populated.png"), fullPage: true });
    await page.goto("/fr/store/cart");
    await expect(page.getByRole("heading", { name: "Votre panier", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("fr-cart-populated.png"), fullPage: true });
    await page.goto("/fr/store/checkout");
    await expect(page.locator("#checkout-name")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("fr-checkout-populated.png"), fullPage: true });
    await page.route("**/api/store/cart/quote", route => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    await page.goto("/en/store/cart");
    await expect(page.locator("#main [role=alert]")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("cart-quote-error.png"), fullPage: true });
    await page.unrouteAll();
    await page.reload();
    await expect(page.getByRole("link", { name: "Continue to checkout" })).toBeVisible();
    await page.getByRole("link", { name: "Continue to checkout" }).click();
    await expect(page).toHaveURL(/\/store\/checkout$/);
    await page.screenshot({ path: testInfo.outputPath("checkout-populated.png"), fullPage: true });
    await page.getByRole("button", { name: "Place demo order" }).click();
    await expect(page.locator("#checkout-name:invalid")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("checkout-validation.png") });
    await page.locator("#checkout-name").fill("Store E2E Customer");
    await page.locator("#checkout-email").fill(`store-${Date.now()}@e2e.example.com`);
    await page.locator("#checkout-phone").fill("+1 514 555 0123");
    await page.locator("#checkout-address").fill("123 Store Street");
    await page.locator("#checkout-city").fill("Montreal");
    await page.locator("#checkout-postalCode").fill("H2X 1Y4");
    const checkoutResponse = page.waitForResponse(response => response.url().endsWith("/api/store/orders") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Place demo order" }).click();
    if (process.env.E2E_USE_PRODUCTION === "1") {
      // Production must refuse mock payments instead of reporting a fake paid order.
      expect((await checkoutResponse).status()).toBe(503);
      await expect(page.locator("#main [role=alert]")).toBeVisible();
      await expect(page).toHaveURL(/\/store\/checkout$/);
      return;
    }
    await checkoutResponse;
    await expect(page).toHaveURL(/\/store\/order\/[^?]+\?t=/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Thank you, Store E2E Customer/ })).toBeVisible();
    await expect(page.getByText("Paid", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("order-confirmation.png"), fullPage: true });

    await page.goto("/en/admin/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    await expect(page.locator("li").filter({ hasText: /MBC-/ }).getByText("Paid", { exact: true }).first()).toBeVisible();
  });
});
