import { test, expect } from "./local-test";

for (const locale of ["en", "fr"]) {
  test(`admin ${locale} sign-in distinguishes connection failures from invalid credentials`, async ({ page }) => {
    await page.goto(`/${locale}/admin/login`);
    await page.locator("#admin-email").fill("synthetic@example.test");
    await page.locator("#admin-password").fill("SyntheticPassword123!");
    const submit = page.getByRole("button", { name: locale === "fr" ? "Se connecter" : "Sign in", exact: true });
    const alert = page.locator("form").getByRole("alert");
    const unavailable = locale === "fr" ? /temporairement indisponible/ : /temporarily unavailable/;
    await page.route("**/api/admin/login", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"UNAVAILABLE"}' }));
    await submit.click();
    await expect(alert).toHaveText(unavailable);
    await page.unroute("**/api/admin/login");
    await page.route("**/api/admin/login", route => route.fulfill({ status: 403, contentType: "application/json", body: '{"error":"FORBIDDEN"}' }));
    await submit.click();
    await expect(alert).toHaveText(unavailable);
    await page.unroute("**/api/admin/login");
    await page.route("**/api/admin/login", route => route.abort("connectionfailed"));
    await submit.click();
    await expect(alert).toHaveText(unavailable);
    await page.unroute("**/api/admin/login");
    await page.route("**/api/admin/login", route => route.fulfill({ status: 401, contentType: "application/json", body: '{"error":"INVALID_CREDENTIALS"}' }));
    await submit.click();
    await expect(alert).toHaveText(locale === "fr" ? "Courriel ou mot de passe invalide." : "Invalid email or password.");
  });
}
