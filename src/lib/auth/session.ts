import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "digilo_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
  role: "owner" | "admin" | "member" | "viewer";
  exp: number; // Unix timestamp in ms
}

function getSecretKey(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.TOKEN_ENCRYPTION_KEY ||
    "digilo_dev_session_secret_key_8801d01bf280590c9b68c5b597621c179"
  );
}

/**
 * Creates a tamper-proof signed session token: `base64url(payload).hmacSignature`
 */
export function createSessionToken(data: Omit<SessionPayload, "exp">): string {
  const payload: SessionPayload = {
    ...data,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payloadStr)
    .digest("base64url");

  return `${payloadStr}.${signature}`;
}

/**
 * Verifies the signature and expiration of a session token.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payloadStr, signature] = token.split(".");
  if (!payloadStr || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payloadStr)
    .digest("base64url");

  try {
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    if (!isSignatureValid) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadStr, "base64url").toString("utf-8")
    );

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Attaches the signed session token as an HTTP-only secure cookie.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

/**
 * Clears the session cookie.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads and verifies the current session from incoming request cookies (Server Component / Route Handler).
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }
    return verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}
