/**
 * Signed, stateless tokens for the secure manage/cancel/reschedule links.
 * Tokens are HMAC-signed (jose) and short-lived, so no guessable IDs are exposed.
 */
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const ALG = "HS256";
const ISSUER = "maryam-beauty-clinic";

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
  return new SignJWT({ cust: payload.cust })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyBookingToken(token: string): Promise<BookingTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER });
    if (typeof payload.sub !== "string" || typeof payload.cust !== "string") return null;
    return { sub: payload.sub, cust: payload.cust };
  } catch {
    return null;
  }
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
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyOrderToken(token: string): Promise<OrderTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
