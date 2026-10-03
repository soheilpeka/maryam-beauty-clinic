import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";

afterEach(() => vi.unstubAllEnvs());

describe("production signing secret", () => {
  it.each([
    undefined, "", "   ", "x".repeat(31),
    "dev-only-change-me-in-production",
    "change-me-before-production".padEnd(64, "-"),
    "your-secret-key-for-production".padEnd(64, "-"),
    "example-secret-for-production".padEnd(64, "-"),
    "placeholder".padEnd(64, "-"),
  ])("rejects an absent, weak or placeholder key (%#)", value => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BOOKING_LINK_SECRET", value);
    expect(() => env.bookingLinkSecret).toThrow("unique random production secret");
  });

  it("accepts a configured key without changing the existing signing bytes", () => {
    const key = "a7d482c916f3e5b809d14f7365b2c08e";
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BOOKING_LINK_SECRET", key);
    expect(env.bookingLinkSecret).toBe(key);
  });

  it("keeps the local development fallback", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BOOKING_LINK_SECRET", undefined);
    expect(env.bookingLinkSecret).toBe("dev-only-change-me-in-production");
  });
});
