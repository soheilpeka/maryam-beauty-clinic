/**
 * Signed manage-link tokens: cancel/reschedule security rests on verifyBookingToken
 * rejecting anything that is not a genuine, unexpired token issued by us. These cover
 * the failure modes authorizeByRef relies on - expired, tampered payload/signature,
 * wrong secret, wrong issuer, malformed. "Wrong booking" and "already cancelled" are
 * exercised at the route layer in reschedule-route.test.ts.
 */
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { signBookingToken, verifyBookingToken } from "@/lib/tokens";
import { env } from "@/lib/env";

const ISSUER = "maryam-beauty-clinic";
const secret = () => new TextEncoder().encode(env.bookingLinkSecret);
const SUB = "bk-abc";
const CUST = "cust-xyz";

/** Flip one base64url character: still structurally a JWT, but no longer signed by us. */
async function tamper(token: string, part: "payload" | "signature"): Promise<string> {
  const segments = token.split(".");
  const chars = segments[part === "payload" ? 1 : 2].split("");
  chars[0] = chars[0] === "A" ? "B" : "A";
  segments[part === "payload" ? 1 : 2] = chars.join("");
  return segments.join(".");
}

describe("verifyBookingToken", () => {
  it("accepts a freshly signed token", async () => {
    const token = await signBookingToken({ sub: SUB, cust: CUST });
    await expect(verifyBookingToken(token)).resolves.toEqual({ sub: SUB, cust: CUST });
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ cust: CUST })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(SUB)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(new Date(Date.now() - 60_000))
      .sign(secret());
    await expect(verifyBookingToken(expired)).resolves.toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await signBookingToken({ sub: SUB, cust: CUST });
    await expect(verifyBookingToken(await tamper(token, "payload"))).resolves.toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const token = await signBookingToken({ sub: SUB, cust: CUST });
    await expect(verifyBookingToken(await tamper(token, "signature"))).resolves.toBeNull();
  });

  it("rejects a structurally valid token signed with another secret", async () => {
    const forged = await new SignJWT({ cust: CUST })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(SUB)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode("not-the-real-secret"));
    await expect(verifyBookingToken(forged)).resolves.toBeNull();
  });

  it("rejects a token issued by someone else", async () => {
    const forged = await new SignJWT({ cust: CUST })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(SUB)
      .setIssuer("someone-else")
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret());
    await expect(verifyBookingToken(forged)).resolves.toBeNull();
  });

  it("rejects malformed and non-JWT input", async () => {
    for (const bad of ["", "not-a-token", "a.b", "a.b.c.d", "!!!", JSON.stringify({ sub: SUB, cust: CUST })]) {
      await expect(verifyBookingToken(bad)).resolves.toBeNull();
    }
  });
});