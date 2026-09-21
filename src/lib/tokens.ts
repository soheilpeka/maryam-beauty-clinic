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