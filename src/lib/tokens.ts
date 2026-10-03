/**
 * Signed, stateless tokens for the secure manage/cancel/reschedule links.
 * Tokens are HMAC-signed (jose) and short-lived, so no guessable IDs are exposed.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";
import "server-only";

const ALG = "HS256";
const ISSUER = "maryam-beauty-clinic";
const MAX_TOKEN_LENGTH = 4096;

async function verifiedPayload(token: unknown, purpose: "booking" | "order"): Promise<JWTPayload | null> {
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      algorithms: [ALG],
      requiredClaims: ["exp", "iat", "sub", "iss"],
    });
    if (typeof payload.sub !== "string" || !payload.sub.trim()) return null;
    if (typeof payload.iat !== "number" || !Number.isSafeInteger(payload.iat) || payload.iat < 0) return null;
    // Older links have no purpose claim. Keep those valid while rejecting mismatched
    // purposes on new links and ambiguous recipient claims on either generation.
    if (payload.purpose !== undefined && payload.purpose !== purpose) return null;
    if (purpose === "booking" ? payload.email !== undefined : payload.cust !== undefined) return null;
    return payload;
  } catch {
    return null;
  }
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env.bookingLinkSecret);
}

export interface BookingTokenPayload {
  /** Booking id */
  sub: string;
  /** Customer id, bound to the link recipient */
  cust: string;
}

export async function signBookingToken(payload: BookingTokenPayload, expiresIn = "30d"): Promise<string> {
  return new SignJWT({ cust: payload.cust, purpose: "booking" })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyBookingToken(token: unknown): Promise<BookingTokenPayload | null> {
  const payload = await verifiedPayload(token, "booking");
  if (!payload || typeof payload.cust !== "string" || !payload.cust.trim()) return null;
  return { sub: payload.sub!, cust: payload.cust };
}

export interface OrderTokenPayload {
  /** Order id */
  sub: string;
  /** Customer email, bound to the link recipient */
  email: string;
}

/**
 * Signed link for an order's status page, mirroring the booking manage link. Stateless and
 * short-lived, so no guessable id is exposed and the customer does not need an account to
 * review an order they just placed.
 */
export async function signOrderToken(payload: OrderTokenPayload, expiresIn = "30d"): Promise<string> {
  return new SignJWT({ email: payload.email, purpose: "order" })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyOrderToken(token: unknown): Promise<OrderTokenPayload | null> {
  const payload = await verifiedPayload(token, "order");
  if (!payload || typeof payload.email !== "string" || !payload.email.trim()) return null;
  return { sub: payload.sub!, email: payload.email };
}
