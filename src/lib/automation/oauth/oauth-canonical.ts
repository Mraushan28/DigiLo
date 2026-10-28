import { NextRequest } from "next/server";

export type RequestLike = {
  headers?: {
    get(name: string): string | null;
  } | Headers;
  nextUrl?: {
    origin: string;
    protocol?: string;
    host?: string;
  } | URL;
  url?: string;
} | null | undefined;

/**
 * Checks whether a given host or URL points to a local/loopback environment.
 */
export function isLocalhost(hostOrUrl?: string | null): boolean {
  if (!hostOrUrl) return false;
  const clean = hostOrUrl.toLowerCase().trim();
  return (
    clean.includes("localhost") ||
    clean.includes("127.0.0.1") ||
    clean.includes("0.0.0.0") ||
    clean.includes("[::1]")
  );
}

/**
 * Resolves the canonical origin for any request safely across local development,
 * preview deployments, and production Netlify edge environments.
 *
 * Priority order:
 * 1. Incoming request headers (x-forwarded-host, host) - if public, ALWAYS use https://${host}.
 *    This ensures that even if NEXT_PUBLIC_APP_URL is misconfigured to localhost on production,
 *    live production requests NEVER inherit localhost redirect URIs.
 * 2. Explicit origin parameter if it is a public URL.
 * 3. NEXT_PUBLIC_APP_URL / APP_URL environment variable if set to a public URL.
 * 4. Localhost request headers if developer is testing locally.
 * 5. Default local fallback: "http://localhost:3000".
 */
export function getCanonicalOrigin(req?: RequestLike, explicitOrigin?: string): string {
  // 1. If incoming request has host headers, check if it's arriving at a public domain
  let forwardedProto: string | null = null;
  let forwardedHost: string | null = null;

  if (req?.headers) {
    forwardedProto = req.headers.get("x-forwarded-proto");
    forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  }

  if (forwardedHost) {
    const cleanHost = forwardedHost.split(",")[0].trim().replace(/\/+$/, "");
    if (!isLocalhost(cleanHost)) {
      // In production on any public domain, always enforce HTTPS
      return `https://${cleanHost}`;
    }
  }

  // 2. If explicit origin was provided and is a public domain
  if (explicitOrigin && explicitOrigin.trim()) {
    let clean = explicitOrigin.trim().replace(/\/+$/, "");
    if (!isLocalhost(clean)) {
      if (clean.startsWith("http://")) {
        clean = clean.replace("http://", "https://");
      }
      return clean;
    }
  }

  // 3. If NEXT_PUBLIC_APP_URL / APP_URL is configured as a public domain
  const configuredAppUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)?.trim();
  if (configuredAppUrl && configuredAppUrl.startsWith("http")) {
    let clean = configuredAppUrl.replace(/\/+$/, "");
    if (!isLocalhost(clean)) {
      if (clean.startsWith("http://")) {
        clean = clean.replace("http://", "https://");
      }
      return clean;
    }
  }

  // 4. If request arrived at localhost / loopback
  if (forwardedHost) {
    const cleanHost = forwardedHost.split(",")[0].trim().replace(/\/+$/, "");
    const proto = forwardedProto || "http";
    return `${proto}://${cleanHost}`;
  }

  // 5. If req.nextUrl exists
  if (req?.nextUrl?.origin) {
    const origin = req.nextUrl.origin.trim().replace(/\/+$/, "");
    if (!isLocalhost(origin) && origin.startsWith("http://")) {
      return origin.replace("http://", "https://");
    }
    return origin;
  }

  // 6. Explicit origin if localhost
  if (explicitOrigin && explicitOrigin.trim()) {
    return explicitOrigin.trim().replace(/\/+$/, "");
  }

  // 7. Configured app URL if localhost
  if (configuredAppUrl && configuredAppUrl.startsWith("http")) {
    return configuredAppUrl.replace(/\/+$/, "");
  }

  // 8. Default local development origin
  return "http://localhost:3000";
}

/**
 * Resolves the exact redirect_uri for Google Login / User Authentication.
 * Callback route: /api/auth/google/callback
 */
export function getGoogleAuthRedirectUri(req?: RequestLike, explicitOrigin?: string): string {
  const isReqPublic = req?.headers && !isLocalhost(req.headers.get("x-forwarded-host") || req.headers.get("host"));

  // Explicit environment variable override
  const override = (process.env.GOOGLE_AUTH_REDIRECT_URI || process.env.GOOGLE_LOGIN_REDIRECT_URI)?.trim();
  if (override && override.startsWith("http")) {
    // Prevent localhost override from breaking public production requests
    if (isReqPublic && isLocalhost(override)) {
      console.warn("[OAuth:GoogleLogin] GOOGLE_AUTH_REDIRECT_URI points to localhost but request is public; ignoring override.");
    } else {
      return override.replace(/\/+$/, "");
    }
  }

  const baseOrigin = getCanonicalOrigin(req, explicitOrigin);
  return `${baseOrigin}/api/auth/google/callback`;
}

/**
 * Resolves the exact redirect_uri for Google Sheets / Drive Integration.
 * Callback route: /api/automation/integrations/google/callback
 */
export function getGoogleSheetsRedirectUri(req?: RequestLike, explicitOrigin?: string): string {
  const isReqPublic = req?.headers && !isLocalhost(req.headers.get("x-forwarded-host") || req.headers.get("host"));

  // Explicit environment variable override (GOOGLE_SHEETS_REDIRECT_URI or legacy GOOGLE_REDIRECT_URI)
  const override = (process.env.GOOGLE_SHEETS_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI)?.trim();
  if (override && override.startsWith("http")) {
    // Prevent localhost override from breaking public production requests
    if (isReqPublic && isLocalhost(override)) {
      console.warn("[OAuth:GoogleSheets] GOOGLE_REDIRECT_URI points to localhost but request is public; ignoring override.");
    } else {
      return override.replace(/\/+$/, "");
    }
  }

  const baseOrigin = getCanonicalOrigin(req, explicitOrigin);
  return `${baseOrigin}/api/automation/integrations/google/callback`;
}

/**
 * Resolves the exact redirect_uri for Gmail Integration.
 * Callback route: /api/automation/integrations/gmail/callback
 */
export function getGmailRedirectUri(req?: RequestLike, explicitOrigin?: string): string {
  const isReqPublic = req?.headers && !isLocalhost(req.headers.get("x-forwarded-host") || req.headers.get("host"));

  const override = process.env.GMAIL_REDIRECT_URI?.trim();
  if (override && override.startsWith("http")) {
    if (isReqPublic && isLocalhost(override)) {
      console.warn("[OAuth:Gmail] GMAIL_REDIRECT_URI points to localhost but request is public; ignoring override.");
    } else {
      return override.replace(/\/+$/, "");
    }
  }

  const baseOrigin = getCanonicalOrigin(req, explicitOrigin);
  return `${baseOrigin}/api/automation/integrations/gmail/callback`;
}

/**
 * Resolves the exact redirect_uri for Slack Integration.
 * Callback route: /api/automation/integrations/slack/callback
 */
export function getSlackRedirectUri(req?: RequestLike, explicitOrigin?: string): string {
  const isReqPublic = req?.headers && !isLocalhost(req.headers.get("x-forwarded-host") || req.headers.get("host"));

  const override = process.env.SLACK_REDIRECT_URI?.trim();
  if (override && override.startsWith("http")) {
    if (isReqPublic && isLocalhost(override)) {
      console.warn("[OAuth:Slack] SLACK_REDIRECT_URI points to localhost but request is public; ignoring override.");
    } else {
      return override.replace(/\/+$/, "");
    }
  }

  const baseOrigin = getCanonicalOrigin(req, explicitOrigin);
  return `${baseOrigin}/api/automation/integrations/slack/callback`;
}

/**
 * Safe diagnostic logger that outputs flow name and callback redirect_uri only.
 * NEVER logs client secrets, tokens, cookies, or sensitive credentials.
 */
export function logOAuthDiagnostic(flowName: string, action: string, redirectUri: string): void {
  console.info(`[OAuth:${flowName}] ${action} with redirect_uri: ${redirectUri}`);
}
