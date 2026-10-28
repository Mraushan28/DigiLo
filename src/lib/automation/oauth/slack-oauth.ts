import { encryptToken, decryptToken } from "../crypto";
import { 
  saveIntegrationRecord, 
  getIntegrationRecord, 
  deleteIntegrationRecord, 
  StoredIntegrationRecord 
} from "../storage/integration-store";

const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_ACCESS_URL = "https://slack.com/api/oauth.v2.access";
const SLACK_REVOKE_URL = "https://slack.com/api/auth.revoke";
const SLACK_CONVERSATIONS_URL = "https://slack.com/api/conversations.list";

const SLACK_BOT_SCOPES = [
  "chat:write",
  "chat:write.public",
  "channels:read",
  "groups:read",
  "team:read"
].join(",");

import { 
  getSlackRedirectUri as resolveCanonicalSlackRedirectUri,
  logOAuthDiagnostic 
} from "./oauth-canonical";

export function isSlackOAuthConfigured(): boolean {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
}

export function getSlackRedirectUri(origin?: string): string {
  return resolveCanonicalSlackRedirectUri(undefined, origin);
}

/**
 * Builds Slack OAuth v2 authorization URL.
 */
export function buildSlackAuthUrl(state: string, origin?: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new Error("SLACK_CLIENT_ID is not configured in server environment.");
  }

  const redirectUri = getSlackRedirectUri(origin);
  logOAuthDiagnostic("Slack", "Initiating authorization", redirectUri);

  const params = new URLSearchParams({
    client_id: clientId,
    scope: SLACK_BOT_SCOPES,
    redirect_uri: redirectUri,
    state: state
  });

  return `${SLACK_AUTH_URL}?${params.toString()}`;
}

export interface SlackOAuthAccessResponse {
  ok: boolean;
  error?: string;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: {
    name: string;
    id: string;
  };
  authed_user: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
}

/**
 * Exchanges authorization code with Slack OAuth API.
 */
export async function exchangeSlackCode(
  code: string,
  origin?: string
): Promise<SlackOAuthAccessResponse> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Slack OAuth credentials not configured.");
  }

  const redirectUri = getSlackRedirectUri(origin);
  logOAuthDiagnostic("Slack", "Exchanging authorization code", redirectUri);

  const res = await fetch(SLACK_ACCESS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Slack token exchange failed with status ${res.status}: ${errText}`);
  }

  const data: SlackOAuthAccessResponse = await res.json();
  if (!data.ok) {
    throw new Error(`Slack authorization failed: ${data.error || "Unknown Slack error"}`);
  }

  return data;
}

/**
 * Stores Slack OAuth connection securely with encrypted tokens.
 */
export async function storeSlackConnection(
  workspaceId: string,
  response: SlackOAuthAccessResponse
): Promise<void> {
  const accessTokenCipher = encryptToken(response.access_token);

  const record: StoredIntegrationRecord = {
    workspaceId,
    provider: "slack",
    status: "connected",
    account: {
      accountId: response.team.id,
      name: `Slack Workspace: ${response.team.name}`,
      workspaceName: response.team.name,
      workspaceId: response.team.id,
      connectedAt: new Date().toISOString(),
      scopes: response.scope ? response.scope.split(",") : []
    },
    encryptedTokens: {
      accessTokenCipher
      // Slack bot tokens don't expire unless revoked
    },
    metadata: {
      botUserId: response.bot_user_id,
      authedUserId: response.authed_user.id
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveIntegrationRecord(record);
}

/**
 * Returns a valid decrypted Slack bot token for the workspace.
 */
export async function getValidSlackBotToken(workspaceId: string): Promise<string | null> {
  const record = await getIntegrationRecord(workspaceId, "slack");
  if (!record) return null;
  try {
    return decryptToken(record.encryptedTokens.accessTokenCipher);
  } catch {
    return null;
  }
}

/**
 * Revokes Slack token and removes connection record.
 */
export async function disconnectSlackIntegration(workspaceId: string): Promise<boolean> {
  const record = await getIntegrationRecord(workspaceId, "slack");
  if (!record) return true;

  try {
    const token = decryptToken(record.encryptedTokens.accessTokenCipher);
    if (token) {
      await fetch(SLACK_REVOKE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }).catch(() => {});
    }
  } catch {
    // Ignore revoke errors on expired tokens
  }

  return deleteIntegrationRecord(workspaceId, "slack");
}

export interface SlackChannelItem {
  id: string;
  name: string;
  is_private: boolean;
}

/**
 * Lists channels available in the connected Slack workspace.
 */
export async function listSlackChannels(workspaceId: string): Promise<SlackChannelItem[]> {
  const token = await getValidSlackBotToken(workspaceId);
  if (!token) {
    throw new Error("Slack is not connected for this workspace.");
  }

  const res = await fetch(`${SLACK_CONVERSATIONS_URL}?types=public_channel,private_channel&limit=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Slack API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || "Failed to list channels"}`);
  }

  const channels: Array<{ id: string; name: string; is_private?: boolean }> = data.channels || [];
  return channels.map((c) => ({
    id: c.id,
    name: `#${c.name}`,
    is_private: Boolean(c.is_private)
  }));
}
