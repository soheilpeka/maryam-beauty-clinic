import { test, expect } from "./local-test";
import { adminForProject } from "./admin-credentials";

for (const locale of ["en", "fr"]) {
  test(`${locale}: working hours reject incomplete input and preserve every break`, async ({ page }, info) => {
    const credentials = adminForProject(info.project.name);
    await page.goto(`/${locale}/admin/login`);
    await page.locator("#admin-email").fill(credentials.email);
    await page.locator("#admin-password").fill(credentials.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/admin$`));
    const session = await (await page.request.get("/api/admin/session")).json();
    const headers = { "x-admin-csrf": session.csrfToken };
    const name = `Schedule QA ${locale} ${info.project.name}`;
    const created = await page.request.post("/api/admin/staff", { headers, data: { name, role: "QA", active: false, serviceIds: [] } });
    expect(created.status()).toBe(201);
    const { staff } = await created.json();
    const original = { dayOfWeek: 1, startTime: 600, endTime: 1080, breaks: [{ startTime: 720, endTime: 750 }, { startTime: 840, endTime: 870 }] };
    const initialized = await page.request.put(`/api/admin/staff/${staff.id}/schedule`, { headers, data: { windows: [original] } });
    expect(initialized.ok()).toBe(true);
    await page.goto(`/${locale}/admin/staff`);
    // Other suite fixtures can move this specialist beyond the first list page.
    await page.getByRole("searchbox", { name: locale === "fr" ? "Rechercher" : "Search", exact: true }).fill(name);
    const row = page.locator("#main li").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await row.getByRole("button", { name: locale === "fr" ? "Heures de travail" : "Working hours", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const breakStart = locale === "fr" ? "Début de la pause" : "Break start";
    const breakEnd = locale === "fr" ? "Fin de la pause" : "Break end";
    await expect(dialog.getByLabel(`${breakEnd} 2`, { exact: true })).toHaveValue("14:30");
    let writes = 0;
    page.on("request", request => { if (request.method() === "PUT" && request.url().endsWith("/schedule")) writes++; });
    const end = dialog.locator('input[id$="-end"]');
    await end.fill("");
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(writes).toBe(0);
    await end.fill("18:00");
    await dialog.getByLabel(`${breakEnd} 1`, { exact: true }).fill("");
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(writes).toBe(0);
    await dialog.getByLabel(`${breakEnd} 1`, { exact: true }).fill("12:30");
    await dialog.getByRole("button", { name: locale === "fr" ? "Ajouter une pause" : "Add a break", exact: true }).click();
    await dialog.getByLabel(`${breakStart} 3`, { exact: true }).fill("16:00");
    await dialog.getByLabel(`${breakEnd} 3`, { exact: true }).fill("16:15");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await page.screenshot({ path: info.outputPath(`${locale}-multiple-breaks.png`) });
    let releaseSave: (() => void) | undefined;
    let intercepted: (() => void) | undefined;
    const saving = new Promise<void>(resolve => { intercepted = resolve; });
    const scheduleUrl = `**/api/admin/staff/${staff.id}/schedule`;
    await page.route(scheduleUrl, async route => {
      await new Promise<void>(resolve => { releaseSave = resolve; intercepted?.(); });
      await route.continue();
    });
    await dialog.locator('button[type="submit"]').click();
    await saving;
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    releaseSave?.();
    await expect(dialog).toHaveCount(0);
    await page.unroute(scheduleUrl);
    const saved = await (await page.request.get("/api/admin/staff")).json();
    const member = saved.staff.find((item: { id: string }) => item.id === staff.id);
    expect(member.schedule[0].breaks.map(({ startTime, endTime }: { startTime: number; endTime: number }) => ({ startTime, endTime }))).toEqual([...original.breaks, { startTime: 960, endTime: 975 }]);
    await row.getByRole("button", { name: locale === "fr" ? "Heures de travail" : "Working hours", exact: true }).click();
    await dialog.getByRole("button", { name: `${locale === "fr" ? "Retirer la pause" : "Remove break"} 3`, exact: true }).click();
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toHaveCount(0);
    const updated = await (await page.request.get("/api/admin/staff")).json();
    expect(updated.staff.find((item: { id: string }) => item.id === staff.id).schedule[0].breaks).toHaveLength(2);

    // A failed removal needs a visible, recoverable error, not a silently unchanged chip.
    const date = new Date(); date.setUTCDate(date.getUTCDate() + 14);
    const dayOff = await page.request.post("/api/admin/days-off", { headers, data: { staffId: staff.id, dayKey: date.toISOString().slice(0, 10), note: "Synthetic QA day off" } });
    expect(dayOff.status()).toBe(201);
    await page.reload();
    await page.getByRole("searchbox", { name: locale === "fr" ? "Rechercher" : "Search", exact: true }).fill(name);
    await page.route("**/api/admin/days-off/*", route => route.request().method() === "DELETE" ? route.fulfill({ status: 500, json: {} }) : route.continue());
    const remove = row.getByRole("button", { name: locale === "fr" ? "Retirer ce congé" : "Remove this day off", exact: true });
    await remove.click();
    await expect(page.locator("#main [role=alert]")).toBeVisible();
    await page.getByRole("button", { name: locale === "fr" ? "Réessayer" : "Try again", exact: true }).click();
    await expect(remove).toBeVisible();
    await page.unroute("**/api/admin/days-off/*");
  });
}
