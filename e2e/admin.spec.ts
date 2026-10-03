/**
 * Admin request triage (Phase 5, step 2).
 *
 * Signs in as the demo admin the e2e database is bootstrapped with, then exercises the two
 * salon-side decisions on a request the suite itself just submitted through the public flow:
 * CONFIRM (the request becomes a real, overlap-guarded appointment) and DECLINE (the request
 * is cancelled and flagged as salon-declined). It also checks the page gate: an unsigned-in
 * visitor must be bounced to sign-in before any booking data reaches the browser.
 *
 * RUNS SERIALLY, AND EACH PROJECT SIGNS IN AS ITS OWN ADMIN. src/lib/sessions.ts keeps one
 * live session per account, so two concurrent sign-ins as the same admin evict each other
 * (the loser next mutation then 401s as "session expired") and the deleteMany+create race on
 * one adminId can fail a login POST outright. Serial mode stops this file own tests from
 * overlapping, and the desktop/mobile projects use separate accounts
 * (e2e/admin-credentials.ts) so the projects themselves can stay parallel.
 *
 * Slot uniqueness: this file runs once per project (desktop + mobile) in parallel, and every
 * confirmed request lands on the specialist "any" resolves to. If two workers confirmed the
 * same specialist+day+time the second confirm would 409, so each test derives its wall-clock
 * time from its worker and project index - unique across the concurrent run.
 */
import { test, expect, type Page, type TestInfo } from "./local-test";
import { adminForProject, type AdminCredentials } from "./admin-credentials";

const SERVICE_NAME = "Hair Colouring, Highlights & Balayage";

/** A unique tag per test so its request is findable in the list and never collides. */
function uniqueCustomer(prefix: string): { name: string; email: string; phone: string } {
  const tag = Math.random().toString(36).slice(2, 8);
  return {
    name: `${prefix} ${tag}`,
    email: `${prefix}.${tag}@e2e.example.com`,
    phone: "+1 416 555 0199",
  };
}

/** Wall-clock time unique across the concurrent workers/projects, avoiding confirm conflicts. */
function slotTime(testInfo: TestInfo): string {
  const projectIndex = Math.max(0, ["desktop", "mobile"].indexOf(testInfo.project.name));
  const minutes = 600 + ((testInfo.workerIndex * 11 + projectIndex * 29) % 420);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Day key from the date input's own min + offset (same calendar basis the input enforces). */
async function dayKeyFromMin(page: Page, offsetDays: number): Promise<string> {
  const min = await page.locator("#preferred-date").getAttribute("min");
  expect(min, "the date input must expose a min attribute").toBeTruthy();
  const [y, m, d] = min!.split("-").map(Number);
  const shifted = new Date(y, m - 1, d + offsetDays);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

/** Submit a booking request through the public flow, ending on the confirmation screen. */
async function submitRequest(
  page: Page,
  customer: { name: string; email: string; phone: string },
  time: string,
): Promise<void> {
  await page.goto("/en/booking");
  await page.getByRole("button", { name: SERVICE_NAME }).click();
  await page.getByRole("button", { name: "Any specialist" }).click();
  await page.locator("#preferred-date").fill(await dayKeyFromMin(page, 1));
  await page.locator("#preferred-time").fill(time);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("#name").fill(customer.name);
  await page.locator("#email").fill(customer.email);
  await page.locator("#phone").fill(customer.phone);
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
}

/** Sign in as this project's admin; lands on the dashboard. */
async function signIn(page: Page, creds: AdminCredentials): Promise<void> {
  await page.goto("/en/admin/login");
  await page.locator("#admin-email").fill(creds.email);
  await page.locator("#admin-password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("admin request triage", () => {
  // The session store keeps one live session per admin account, so this file must not sign in
  // concurrently as the same account: serial mode runs its tests in order in one worker.
  test.describe.configure({ mode: "serial" });

  test("confirms a pending request", async ({ page }, testInfo) => {
    const creds = adminForProject(testInfo.project.name);
    const customer = uniqueCustomer("Confirm");
    const time = slotTime(testInfo);

    // A customer submits a request through the public site...
    await submitRequest(page, customer, time);
    const manageUrl = await page.getByRole("link", { name: "Manage your booking" }).getAttribute("href");
    // ...and the salon picks it up.
    await signIn(page, creds);
    await page.goto("/en/admin/requests");

    const card = page.locator("li").filter({ hasText: customer.email });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Pending");
    await expect(card).toContainText(customer.name);

    // Confirm with the prefilled (requested) time.
    await card.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#confirm-time")).toHaveValue(time);
    await page.screenshot({ path: testInfo.outputPath("admin-confirm-dialog.png") });
    await page.locator("#confirm-duration").fill("30");
    await page.getByRole("button", { name: "Confirm appointment" }).click();

    await expect(page.getByRole("status")).toHaveText(/Request confirmed/);
    await expect(card).toContainText("Confirmed");
    // A confirmed request can no longer be confirmed; its action is now cancel.
    await expect(card.getByRole("button", { name: "Confirm" })).toBeHidden();
    await expect(card.getByRole("button", { name: "Cancel booking" })).toBeVisible();

    // The Confirmed bucket shows it, the Pending bucket does not.
    await page.getByRole("group", { name: "Filter by status" }).getByRole("button", { name: "Confirmed" }).click();
    await expect(card).toBeVisible();
    await page.getByRole("group", { name: "Filter by status" }).getByRole("button", { name: "Pending" }).click();
    await expect(card).toBeHidden();
    await page.goto(manageUrl!);
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("customer-confirmed.png"), fullPage: true });
  });

  test("declines a pending request with a reason", async ({ page }, testInfo) => {
    const creds = adminForProject(testInfo.project.name);
    const customer = uniqueCustomer("Decline");

    await submitRequest(page, customer, "14:30");
    const manageUrl = await page.getByRole("link", { name: "Manage your booking" }).getAttribute("href");
    await signIn(page, creds);
    await page.goto("/en/admin/requests");

    const card = page.locator("li").filter({ hasText: customer.email });
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Decline" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.locator("#decline-reason").fill("Fully booked at that time");
    await page.screenshot({ path: testInfo.outputPath("admin-decline-dialog.png") });
    await page.getByRole("button", { name: "Decline request" }).click();

    await expect(page.getByRole("status")).toHaveText(/Request declined/);
    await expect(card).toContainText("Declined");
    await expect(card.getByRole("button", { name: "Confirm" })).toBeHidden();

    // The Declined bucket keeps salon-declined requests apart from customer cancellations.
    await page.getByRole("group", { name: "Filter by status" }).getByRole("button", { name: "Declined" }).click();
    await expect(card).toBeVisible();
    await page.goto(manageUrl!);
    await expect(page.getByRole("heading", { name: "Request declined", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("customer-declined.png"), fullPage: true });
  });

  test("bounces unsigned-in visitors to the sign-in page", async ({ page }) => {
    await page.goto("/en/admin/requests");
    await expect(page).toHaveURL(/\/admin\/login$/);

    // The dashboard is gated the same way, and the requests API answers 401, not data.
    await page.goto("/en/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    const res = await page.request.get("/api/admin/requests");
    expect(res.status()).toBe(401);
  });
});
