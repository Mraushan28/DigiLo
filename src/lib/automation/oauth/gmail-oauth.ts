import { encryptToken } from "../crypto";
import { 
  saveIntegrationRecord, 
  getIntegrationRecord, 
  deleteIntegrationRecord, 
  StoredIntegrationRecord 
} from "../storage/integration-store";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

import { 
  getGmailRedirectUri as resolveCanonicalGmailRedirectUri,
  logOAuthDiagnostic 
} from "./oauth-canonical";

export function isGmailOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGmailRedirectUri(origin?: string): string {
  return resolveCanonicalGmailRedirectUri(undefined, origin);
}

export function buildGmailAuthUrl(state: string, origin?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured in server environment.");
  }

  const redirectUri = getGmailRedirectUri(origin);
  logOAuthDiagnostic("Gmail", "Initiating authorization", redirectUri);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function exchangeGmailCodeForTokens(
  code: string,
  origin?: string
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials missing in server environment.");
  }

  const redirectUri = getGmailRedirectUri(origin);
  logOAuthDiagnostic("Gmail", "Exchanging authorization code", redirectUri);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gmail token exchange failed (${res.status}): ${errorBody}`);
  }

  return res.json();
}

export async function fetchGmailUserProfile(
  accessToken: string
): Promise<{ email: string; name?: string; picture?: string; id?: string }> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Google profile: ${res.statusText}`);
  }

  return res.json();
}

export async function saveGmailConnection(
  workspaceId: string,
  tokens: GoogleTokenResponse,
  profile: { email: string; name?: string }
): Promise<StoredIntegrationRecord> {
  const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;
  const accessTokenCipher = encryptToken(tokens.access_token);
  const refreshTokenCipher = tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined;

  const now = new Date().toISOString();

  const record: StoredIntegrationRecord = {
    workspaceId,
    provider: "gmail",
    status: "connected",
    account: {
      email: profile.email,
      name: profile.name || profile.email,
      connectedAt: now,
      scopes: tokens.scope?.split(" ") || ["gmail.send"],
    },
    encryptedTokens: {
      accessTokenCipher,
      refreshTokenCipher,
      expiresAt,
    },
    createdAt: now,
    updatedAt: now,
  };

  await saveIntegrationRecord(record);
  return record;
}

export async function disconnectGmail(workspaceId: string): Promise<boolean> {
  return deleteIntegrationRecord(workspaceId, "gmail");
}
