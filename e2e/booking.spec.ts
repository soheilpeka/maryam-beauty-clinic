/**
 * Booking-request flow (Phase 5, step 2).
 *
 * Covers the public path the salon's revenue depends on: pick a service, pick a specialist
 * (or "any"), choose a PREFERRED date/time, give contact details, submit, and read the
 * confirmation. The server stores these as PENDING requests - there is no availability
 * check on the public side - so the suite also covers the two guards that do exist:
 * client-side form validation and the server-side "must be in the future" check.
 *
 * Date handling: the date input's own min/max are the source of truth. The value is derived
 * from the rendered `min` attribute (machine-local calendar days - the same basis the input
 * uses), so it is always inside the accepted window no matter what timezone the CI machine
 * is in, while still being unambiguously in the future (min + 1 day at 11:00) or in the past
 * (min - 1 day at 00:05) for the server, which interprets the day key in salon time.
 */
import { test, expect } from "@playwright/test";

/** First service in the provisional seeded catalog; pricing and duration await approval. */
const SERVICE_NAME = "Hair Colouring, Highlights & Balayage";
const SERVICE_PRICE = "Confirmed during consultation";
const SERVICE_DURATION = "Confirmed during consultation";
/**
 * "Any specialist" is resolved server-side to the first qualified specialist ordered by name
 * ascending, which in the seeded catalog is "Specialist 1".
 */
const RESOLVED_SPECIALIST = "Specialist 1";

const CUSTOMER = {
  name: "Jane Doe",
  email: "jane.doe.e2e@example.com",
  phone: "+1 416 555 0142",
};

/**
 * Day key derived from the date input's own `min` attribute + an offset in whole days, so the
 * value stays inside the [min, max] window the input accepts.
 */
async function dayKeyFromMin(page: import("@playwright/test").Page, offsetDays: number): Promise<string> {
  const min = await page.locator("#preferred-date").getAttribute("min");
  expect(min, "the date input must expose a min attribute").toBeTruthy();
  const [y, m, d] = min!.split("-").map(Number);
  const shifted = new Date(y, m - 1, d + offsetDays);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

/**
 * Walks service -> "Any specialist" -> preferred date/time and stops at the details step.
 * Returns the day key that was entered, for the confirmation assertions.
 */
async function walkToDetails(
  page: import("@playwright/test").Page,
  opts: { dayOffset?: number; time?: string } = {},
): Promise<string> {
  const { dayOffset = 1, time = "11:00" } = opts;

  await page.goto("/en/booking");
  await expect(page.getByRole("heading", { name: "Choose a service" })).toBeVisible();
  await page.getByRole("button", { name: SERVICE_NAME }).click();

  await expect(page.getByRole("heading", { name: "Choose a specialist" })).toBeVisible();
  await page.getByRole("button", { name: "Any specialist" }).click();

  await expect(page.getByRole("heading", { name: "Preferred date & time" })).toBeVisible();
  const day = await dayKeyFromMin(page, dayOffset);
  await page.locator("#preferred-date").fill(day);
  await page.locator("#preferred-time").fill(time);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  return day;
}

test.describe("booking request flow", () => {
  for (const legacy of [false, true]) {
    test(`manage link stays on the current site (${legacy ? "legacy response" : "relative path"})`, async ({ page }) => {
      await page.route("**/api/bookings", async route => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch();
        const data = await response.json();
        if (response.ok()) {
          const url = new URL(data.manageUrl);
          url.port = "1";
          data.manageUrl = url.toString();
          if (legacy) delete data.managePath;
        }
        await route.fulfill({ response, json: data });
      });
      await walkToDetails(page);
      await page.locator("#name").fill(CUSTOMER.name);
      await page.locator("#email").fill(CUSTOMER.email);
      await page.locator("#phone").fill(CUSTOMER.phone);
      await page.getByRole("button", { name: "Send request" }).click();
      const link = page.getByRole("link", { name: "Manage your booking", exact: true });
      await expect(link).toHaveAttribute("href", /^\/en\/booking\/[^?]+\?t=/);
      await link.click();
      await expect(page.getByText("Pending", { exact: true })).toBeVisible();
      await page.waitForLoadState("networkidle");
      const token = new URL(page.url()).searchParams.get("t");
      await page.getByRole("button", { name: "Switch language" }).click();
      await expect(page).toHaveURL(/\/fr\/booking\/[^?]+\?t=/, { timeout: 15_000 });
      expect(new URL(page.url()).searchParams.get("t")).toBe(token);
      await page.reload();
      await expect(page.locator("main h1")).toBeVisible();
    });
  }

  test("submits a request and shows a correct confirmation summary", async ({ page }, info) => {
    const day = await walkToDetails(page);

    // The details step already summarizes what was chosen. "Any specialist" is shown verbatim
    // here; the salon resolves it only on submission.
    const summary = page.locator("h3:has-text(\"Booking summary\")").locator("xpath=following-sibling::dl").first();
    await expect(summary).toContainText(SERVICE_NAME);
    await expect(summary).toContainText("Any specialist");
    await expect(summary).toContainText(SERVICE_PRICE);

    await page.locator("#name").fill(CUSTOMER.name);
    await page.locator("#email").fill(CUSTOMER.email);
    await page.locator("#phone").fill(CUSTOMER.phone);
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
    await expect(page.getByText(CUSTOMER.email)).toBeVisible();

    // The confirmation summary must reflect the BOOKING as the server stored it: the service,
    // the specialist "any" was resolved to, the chosen time, the duration and the total.
    const confirmation = page.locator("h1:has-text(\"Request received\")").locator("xpath=following-sibling::div//dl").first();
    await expect(confirmation).toContainText(SERVICE_NAME);
    await expect(confirmation).toContainText(RESOLVED_SPECIALIST);
    await expect(confirmation).toContainText("11:00");
    await expect(confirmation).toContainText(SERVICE_DURATION);
    await expect(confirmation).toContainText(SERVICE_PRICE);

    // The signed manage/cancel link is the customer's only way back to their booking.
    const manageLink = page.getByRole("link", { name: "Manage your booking" });
    await expect(manageLink).toBeVisible();
    await expect(manageLink).toHaveAttribute("href", /\/en\/booking\/[^/]+\?t=.+/);

    // And the customer can start over.
    await expect(page.getByRole("button", { name: "Book another appointment" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("booking-confirmation.png"), fullPage: true });
    await manageLink.click();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("booking-management.png"), fullPage: true });
    await page.getByRole("button", { name: "Cancel appointment", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: info.outputPath("booking-cancel-dialog.png") });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Cancel appointment", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel appointment", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Booking cancelled" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("booking-cancelled.png"), fullPage: true });
    expect(day).toBeTruthy();
  });

  test("validates the contact details before submitting", async ({ page }) => {
    await walkToDetails(page);

    // Nothing filled in -> the browser must not send a malformed request.
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.locator("#name-error")).toHaveText(/at least 2 characters/);
    await expect(page.locator("#email-error")).toHaveText(/valid email/);
    await expect(page.locator("#phone-error")).toHaveText(/valid phone/);

    // Fixing the fields clears their errors live.
    await page.locator("#name").fill(CUSTOMER.name);
    await page.locator("#email").fill("not-an-email");
    await page.locator("#phone").fill(CUSTOMER.phone);
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.locator("#name-error")).toBeHidden();
    await expect(page.locator("#email-error")).toHaveText(/valid email/);
    await expect(page.locator("#phone-error")).toBeHidden();
  });

  test("rejects a requested time in the past", async ({ page }) => {
    // min - 1 day at 00:05 is always in the past once the server reads it in salon time.
    await walkToDetails(page, { dayOffset: -1, time: "00:05" });

    await page.locator("#name").fill(CUSTOMER.name);
    await page.locator("#email").fill(CUSTOMER.email);
    await page.locator("#phone").fill(CUSTOMER.phone);
    await page.getByRole("button", { name: "Send request" }).click();

    // The server answers PAST_TIME; the flow returns to the date step with an inline alert.
    // Scoped to <main>: Next.js appends an empty role="alert" route announcer at body level,
    // so an unscoped getByRole("alert") matches it too and fails strict mode.
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(/date and time in the future/);
    await expect(page.getByRole("heading", { name: "Preferred date & time" })).toBeVisible();
  });

  test("prefills service and specialist from the query string", async ({ page }) => {
    // The service pages link here with the service (and optionally the specialist) preselected,
    // so the customer lands straight on date & time.
    await page.goto("/en/booking?service=hair-colour-balayage&staff=any");

    await expect(page.getByText("Step 3 of 4")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preferred date & time" })).toBeVisible();
    // Going back still shows the chosen service.
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Choose a specialist" })).toBeVisible();
  });
});
