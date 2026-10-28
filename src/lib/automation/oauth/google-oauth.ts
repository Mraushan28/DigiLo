import { encryptToken, decryptToken } from "../crypto";
import { 
  saveIntegrationRecord, 
  getIntegrationRecord, 
  deleteIntegrationRecord, 
  StoredIntegrationRecord 
} from "../storage/integration-store";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.readonly"
].join(" ");

import { 
  getGoogleSheetsRedirectUri, 
  logOAuthDiagnostic 
} from "./oauth-canonical";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleRedirectUri(origin?: string): string {
  return getGoogleSheetsRedirectUri(undefined, origin);
}

/**
 * Builds Google OAuth 2.0 authorization URL.
 */
export function buildGoogleAuthUrl(state: string, origin?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured in server environment.");
  }

  const redirectUri = getGoogleRedirectUri(origin);
  logOAuthDiagnostic("GoogleSheets", "Initiating authorization", redirectUri);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: state
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleProfileResponse {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Exchanges authorization code for access and refresh tokens.
 */
export async function exchangeGoogleCode(
  code: string,
  origin?: string
): Promise<{ tokens: GoogleTokenResponse; profile: GoogleProfileResponse }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured.");
  }

  const redirectUri = getGoogleRedirectUri(origin);
  logOAuthDiagnostic("GoogleSheets", "Exchanging authorization code", redirectUri);

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${errorText}`);
  }

  const tokens: GoogleTokenResponse = await tokenRes.json();

  // Fetch user profile
  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });

  let profile: GoogleProfileResponse = { id: "unknown", email: "user@google.com" };
  if (profileRes.ok) {
    profile = await profileRes.json();
  }

  return { tokens, profile };
}

/**
 * Stores Google OAuth connection securely with AES-256-GCM encryption.
 */
export async function storeGoogleConnection(
  workspaceId: string,
  tokens: GoogleTokenResponse,
  profile: GoogleProfileResponse
): Promise<void> {
  const accessTokenCipher = encryptToken(tokens.access_token);
  const refreshTokenCipher = tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined;
  const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

  // Preserve existing refresh token if Google didn't return a new one on re-auth
  let finalRefreshTokenCipher = refreshTokenCipher;
  if (!finalRefreshTokenCipher) {
    const existing = await getIntegrationRecord(workspaceId, "google_sheets");
    if (existing?.encryptedTokens.refreshTokenCipher) {
      finalRefreshTokenCipher = existing.encryptedTokens.refreshTokenCipher;
    }
  }

  const record: StoredIntegrationRecord = {
    workspaceId,
    provider: "google_sheets",
    status: "connected",
    account: {
      accountId: profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      connectedAt: new Date().toISOString(),
      scopes: tokens.scope?.split(" ") || []
    },
    encryptedTokens: {
      accessTokenCipher,
      refreshTokenCipher: finalRefreshTokenCipher,
      expiresAt
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveIntegrationRecord(record);
}

/**
 * Gets a verified valid access token for Google, automatically refreshing if expired.
 */
export async function getValidGoogleAccessToken(workspaceId: string): Promise<string | null> {
  const record = await getIntegrationRecord(workspaceId, "google_sheets");
  if (!record) return null;

  const { encryptedTokens } = record;
  const now = Date.now();

  // If token is still valid (or expiresAt not specified) with 60-second buffer, decrypt and return
  if (!encryptedTokens.expiresAt || encryptedTokens.expiresAt - now > 60000) {
    try {
      return decryptToken(encryptedTokens.accessTokenCipher);
    } catch {
      return null;
    }
  }

  // Token is expired, try refresh
  if (!encryptedTokens.refreshTokenCipher) {
    // Cannot refresh without refresh token
    return null;
  }

  const refreshToken = decryptToken(encryptedTokens.refreshTokenCipher);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!refreshRes.ok) {
      return null;
    }

    const newTokens: GoogleTokenResponse = await refreshRes.json();
    const newExpiresAt = Date.now() + (newTokens.expires_in || 3600) * 1000;

    record.encryptedTokens.accessTokenCipher = encryptToken(newTokens.access_token);
    record.encryptedTokens.expiresAt = newExpiresAt;
    record.updatedAt = new Date().toISOString();
    await saveIntegrationRecord(record);

    return newTokens.access_token;
  } catch (err) {
    console.error("[Google OAuth] Token refresh error:", err);
    return null;
  }
}

/**
 * Revokes Google access and removes connection record.
 */
export async function disconnectGoogleIntegration(workspaceId: string): Promise<boolean> {
  const record = await getIntegrationRecord(workspaceId, "google_sheets");
  if (!record) return true;

  try {
    const token = decryptToken(record.encryptedTokens.accessTokenCipher);
    if (token) {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
        method: "POST"
      }).catch(() => {});
    }
  } catch {
    // Ignore revoke errors if token is already expired
  }

  return deleteIntegrationRecord(workspaceId, "google_sheets");
}

/**
 * Lists spreadsheets accessible by the connected account.
 */
export async function listGoogleSpreadsheets(
  workspaceId: string
): Promise<{ id: string; name: string }[]> {
  const token = await getValidGoogleAccessToken(workspaceId);
  if (!token) {
    throw new Error("Google Sheets is not connected or authorization expired.");
  }

  const driveUrl = "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime)&pageSize=25&orderBy=modifiedTime%20desc";
  const res = await fetch(driveUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list spreadsheets (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: { id: string; name: string }) => ({
    id: f.id,
    name: f.name
  }));
}

/**
 * Lists sheet tabs (worksheets) within a given Google spreadsheet.
 */
export async function listGoogleWorksheets(
  workspaceId: string,
  spreadsheetId: string
): Promise<string[]> {
  const token = await getValidGoogleAccessToken(workspaceId);
  if (!token) {
    throw new Error("Google Sheets is not connected or authorization expired.");
  }

  const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`;
  const res = await fetch(sheetsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch worksheet tabs (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const sheets = data.sheets || [];
  return sheets.map((s: { properties?: { title?: string } }) => s.properties?.title || "Sheet1");
}
