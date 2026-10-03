import { describe, expect, it } from "vitest";
import { SignJWT, type JWTPayload } from "jose";
import { env } from "@/lib/env";
import { signBookingToken, signOrderToken, verifyBookingToken, verifyOrderToken } from "@/lib/tokens";

const booking = { sub: "booking-record", cust: "customer-record" };
const order = { sub: "order-record", email: "customer@example.test" };

async function signedClaims(recipient: Record<string, unknown>, overrides: JWTPayload = {}, omit: string[] = [], algorithm = "HS256") {
  const now = Math.floor(Date.now() / 1000);
  const claims: JWTPayload = { iss: "maryam-beauty-clinic", iat: now, exp: now + 3600, ...recipient, ...overrides };
  for (const claim of omit) delete claims[claim];
  return new SignJWT(claims).setProtectedHeader({ alg: algorithm }).sign(new TextEncoder().encode(env.bookingLinkSecret));
}

describe("signed link security", () => {
  it("accepts new purpose-scoped links", async () => {
    await expect(verifyBookingToken(await signBookingToken(booking))).resolves.toEqual(booking);
    await expect(verifyOrderToken(await signOrderToken(order))).resolves.toEqual(order);
  });

  it("accepts existing links without a purpose claim", async () => {
    await expect(verifyBookingToken(await signedClaims(booking))).resolves.toEqual(booking);
    await expect(verifyOrderToken(await signedClaims(order))).resolves.toEqual(order);
  });

  it("rejects links used for the other operation, including existing links", async () => {
    for (const token of [await signBookingToken(booking), await signedClaims(booking)]) {
      await expect(verifyOrderToken(token)).resolves.toBeNull();
    }
    for (const token of [await signOrderToken(order), await signedClaims(order)]) {
      await expect(verifyBookingToken(token)).resolves.toBeNull();
    }
  });

  it("rejects mismatched purposes and ambiguous recipient claims", async () => {
    await expect(verifyBookingToken(await signedClaims(booking, { purpose: "order" }))).resolves.toBeNull();
    await expect(verifyOrderToken(await signedClaims(order, { purpose: "booking" }))).resolves.toBeNull();
    const ambiguous = await signedClaims({ ...booking, email: order.email });
    await expect(verifyBookingToken(ambiguous)).resolves.toBeNull();
    await expect(verifyOrderToken(ambiguous)).resolves.toBeNull();
  });

  it.each(["exp", "iat", "iss", "sub"])("requires the %s claim", async claim => {
    await expect(verifyBookingToken(await signedClaims(booking, {}, [claim]))).resolves.toBeNull();
    await expect(verifyOrderToken(await signedClaims(order, {}, [claim]))).resolves.toBeNull();
  });

  it("rejects other HMAC algorithms even with the right secret", async () => {
    await expect(verifyBookingToken(await signedClaims(booking, {}, [], "HS384"))).resolves.toBeNull();
    await expect(verifyOrderToken(await signedClaims(order, {}, [], "HS384"))).resolves.toBeNull();
  });

  it("rejects expired orders and invalid issued-at claims", async () => {
    await expect(verifyOrderToken(await signedClaims(order, { exp: 1 }))).resolves.toBeNull();
    for (const iat of [-1, "now", 1.5]) {
      const overrides = { iat } as JWTPayload;
      await expect(verifyBookingToken(await signedClaims(booking, overrides))).resolves.toBeNull();
      await expect(verifyOrderToken(await signedClaims(order, overrides))).resolves.toBeNull();
    }
  });

  it("rejects blank recipient identifiers", async () => {
    await expect(verifyBookingToken(await signedClaims({ ...booking, cust: " " }))).resolves.toBeNull();
    await expect(verifyOrderToken(await signedClaims({ ...order, email: " " }))).resolves.toBeNull();
    await expect(verifyBookingToken(await signedClaims({ ...booking, sub: " " }))).resolves.toBeNull();
  });

  it.each([null, undefined, 123, {}, [], "", "x".repeat(4097)])("rejects invalid or oversized input (%#)", async token => {
    await expect(verifyBookingToken(token)).resolves.toBeNull();
    await expect(verifyOrderToken(token)).resolves.toBeNull();
  });
});
