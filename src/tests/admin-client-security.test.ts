import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signOutAdmin } from "@/lib/admin-client";

const removeItem = vi.fn();
const fetchMock = vi.fn();
let location: { href: string };
beforeEach(() => {
  vi.clearAllMocks();
  location = { href: "/en/admin" };
  vi.stubGlobal("window", { location, sessionStorage: { getItem: () => "synthetic-csrf", removeItem } });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("admin sign-out failures", () => {
  it("fetches a current session token instead of reusing another tab's stale cache", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ csrfToken: "synthetic-current-csrf" }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await signOutAdmin("en");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/session");
    expect(fetchMock.mock.calls[1][1].headers["x-admin-csrf"] === "synthetic-current-csrf").toBe(true);
  });
  it.each([403, 500])("does not clear browser state or claim logout after HTTP %s", async status => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    await expect(signOutAdmin("en")).rejects.toThrow("Logout failed");
    expect(removeItem).not.toHaveBeenCalled();
    expect(location.href).toBe("/en/admin");
  });
  it("retains state when the logout server cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("synthetic network failure"));
    await expect(signOutAdmin("en")).rejects.toThrow();
    expect(removeItem).not.toHaveBeenCalled();
    expect(location.href).toBe("/en/admin");
  });
  it.each([200, 401])("clears local state after logout or an already-invalid session (%s)", async status => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    await signOutAdmin("fr");
    expect(removeItem).toHaveBeenCalledWith("admin-csrf");
    expect(location.href).toBe("/fr/admin/login");
  });
});
