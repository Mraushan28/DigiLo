import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const STATE_COOKIE_PREFIX = "digilo_oauth_state_";

function getHmacSecret(): string {
  return process.env.TOKEN_ENCRYPTION_KEY || "digilo_dev_oauth_hmac_secret_key_default";
}

/**
 * Generates a signed OAuth state token to protect against CSRF attacks.
 */
export function generateOAuthState(provider: string, workspaceId: string, returnUrl?: string): string {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const encodedReturnUrl = returnUrl ? encodeURIComponent(returnUrl) : "";
  const payload = `${provider}:${workspaceId}:${randomBytes}:${Date.now()}:${encodedReturnUrl}`;
  const hmac = crypto.createHmac("sha256", getHmacSecret()).update(payload).digest("hex");
  // Pack payload + hmac
  const state = Buffer.from(JSON.stringify({ payload, hmac })).toString("base64url");
  return state;
}

/**
 * Sets the signed state cookie on a response.
 */
export function setOAuthStateCookie(
  response: NextResponse,
  provider: string,
  state: string
): void {
  response.cookies.set({
    name: `${STATE_COOKIE_PREFIX}${provider}`,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10 // 10 minutes expiry
  });
}

/**
 * Validates the OAuth state against the stored cookie and HMAC signature.
 * Returns the verified workspaceId and returnUrl, or null if invalid.
 */
export async function validateOAuthState(
  provider: string,
  incomingState: string | null
): Promise<{ isValid: boolean; workspaceId?: string; returnUrl?: string; error?: string }> {
  if (!incomingState) {
    return { isValid: false, error: "Missing OAuth state parameter." };
  }

  const cookieStore = await cookies();
  const cookieState = cookieStore.get(`${STATE_COOKIE_PREFIX}${provider}`)?.value;

  if (!cookieState) {
    return { isValid: false, error: "OAuth session state expired or not found. Please restart connection." };
  }

  if (cookieState !== incomingState) {
    return { isValid: false, error: "OAuth state mismatch (potential CSRF attempt)." };
  }

  try {
    const parsed = JSON.parse(Buffer.from(incomingState, "base64url").toString("utf-8"));
    const { payload, hmac } = parsed;

    // Verify HMAC
    const expectedHmac = crypto.createHmac("sha256", getHmacSecret()).update(payload).digest("hex");
    if (hmac !== expectedHmac) {
      return { isValid: false, error: "Invalid OAuth state signature." };
    }

    const [stateProvider, workspaceId, , timestampStr, encodedReturnUrl] = payload.split(":");
    if (stateProvider !== provider) {
      return { isValid: false, error: "OAuth provider mismatch in state." };
    }

    // Check expiration (10 minutes)
    const timestamp = parseInt(timestampStr, 10);
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      return { isValid: false, error: "OAuth state token expired." };
    }

    const returnUrl = encodedReturnUrl ? decodeURIComponent(encodedReturnUrl) : undefined;

    return { isValid: true, workspaceId, returnUrl };
  } catch {
    return { isValid: false, error: "Malformed OAuth state token." };
  }
}

/**
 * Clears the state cookie on a response after callback verification.
 */
export function clearOAuthStateCookie(response: NextResponse, provider: string): void {
  response.cookies.set({
    name: `${STATE_COOKIE_PREFIX}${provider}`,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
