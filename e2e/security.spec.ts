import { test, expect } from "./local-test";

test("private endpoints and pages enforce headers and anonymous access", async ({ request }) => {
  for (const path of ["/api/admin/customers", "/api/admin/customers/fixture", "/api/admin/session", "/api/store/orders/fixture"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    const headers = response.headers();
    expect(headers["cache-control"]).toMatch(/no-store/);
    expect(headers["cache-control"]).not.toMatch(/public|s-maxage/);
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  }
  for (const path of ["/en/admin/login", "/fr/booking/invalid?t=invalid", "/en/store/order/invalid?t=invalid"]) {
    const response = await request.get(path);
    expect(response.headers()["cache-control"]).toMatch(/no-store/);
    expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  }
});

test("local login rejects cross-origin requests before credential work", async ({ request }) => {
  const response = await request.post("/api/admin/login", {
    headers: { origin: "https://untrusted.example", "content-type": "application/json" },
    data: { email: "synthetic@example.com", password: "synthetic-invalid" },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["set-cookie"]).toBeUndefined();
});

test("external resources are blocked by the local browser fixture", async ({ page }) => {
  await page.goto("/en");
  const blocked = await page.evaluate(async () => {
    try { await fetch("https://untrusted.example/local-test-only"); return false; }
    catch { return true; }
  });
  expect(blocked).toBe(true);
});
