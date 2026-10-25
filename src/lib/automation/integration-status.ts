import { IntegrationStatusInfo, IntegrationConnectionStatus } from "@/types/automation";
import { getIntegrationRecord } from "./storage/integration-store";
import { isGoogleOAuthConfigured } from "./oauth/google-oauth";
import { isSlackOAuthConfigured } from "./oauth/slack-oauth";
import { isGmailOAuthConfigured } from "./oauth/gmail-oauth";

import { INTEGRATION_METADATA } from "./integration-metadata";
export { INTEGRATION_METADATA };

/**
 * Synchronous static status check based purely on server environment.
 */
export function resolveIntegrationStatus(integrationId: string): IntegrationStatusInfo {
  const meta = INTEGRATION_METADATA[integrationId] || {
    name: integrationId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    category: "External Service",
    description: `Third-party integration for ${integrationId}`,
    envKeys: [],
    oauthSupported: false
  };

  let status: IntegrationConnectionStatus = "not_configured";
  let statusLabel = "Not Configured";
  const isEnvConfigured = meta.envKeys.length === 0 || meta.envKeys.every((k) => Boolean(process.env[k]));

  if (integrationId === "webhook") {
    status = "connected";
    statusLabel = "Connected (Ready)";
  } else if (integrationId === "openai") {
    const hasKey = typeof process !== "undefined" && Boolean(
      process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY
    );
    if (hasKey) {
      status = "connected";
      statusLabel = "Connected (AI Engine Active)";
    } else {
      status = "not_configured";
      statusLabel = "Not Configured (Missing API Key)";
    }
  } else if (integrationId === "google_sheets") {
    if (isGoogleOAuthConfigured()) {
      status = "not_connected";
      statusLabel = "Ready to Connect";
    } else {
      status = "not_configured";
      statusLabel = "OAuth Not Configured in .env";
    }
  } else if (integrationId === "slack") {
    if (isSlackOAuthConfigured()) {
      status = "not_connected";
      statusLabel = "Ready to Connect";
    } else {
      status = "not_configured";
      statusLabel = "OAuth Not Configured in .env";
    }
  } else if (integrationId === "gmail") {
    if (isGmailOAuthConfigured()) {
      status = "not_connected";
      statusLabel = "Ready to Connect";
    } else {
      status = "not_configured";
      statusLabel = "OAuth Not Configured in .env";
    }
  } else {
    status = isEnvConfigured ? "not_connected" : "not_configured";
    statusLabel = isEnvConfigured ? "Ready to Connect" : "Not Configured";
  }

  return {
    id: integrationId,
    name: meta.name,
    category: meta.category,
    status,
    statusLabel,
    description: meta.description,
    configuredEnvKeys: meta.envKeys,
    oauthSupported: meta.oauthSupported,
    isConfiguredInEnv: isEnvConfigured
  };
}

/**
 * Asynchronously resolves live integration connection status for a specific client workspace.
 */
export async function getLiveIntegrationStatusForWorkspace(
  integrationId: string,
  workspaceId?: string
): Promise<IntegrationStatusInfo> {
  const baseInfo = resolveIntegrationStatus(integrationId);

  if (!workspaceId) {
    return baseInfo;
  }

  if (integrationId === "google_sheets") {
    const record = await getIntegrationRecord(workspaceId, "google_sheets");
    if (record) {
      const isTokenExpired = Boolean(
        record.encryptedTokens.expiresAt &&
        record.encryptedTokens.expiresAt < Date.now() &&
        !record.encryptedTokens.refreshTokenCipher
      );

      if (record.status === "expired" || isTokenExpired) {
        return {
          ...baseInfo,
          status: "expired",
          statusLabel: "Authorization Expired",
          isExpired: true,
          account: record.account
        };
      }

      if (record.status === "connected") {
        return {
          ...baseInfo,
          status: "connected",
          statusLabel: "Connected",
          account: record.account
        };
      }
    }
  } else if (integrationId === "slack") {
    const record = await getIntegrationRecord(workspaceId, "slack");
    if (record) {
      if (record.status === "expired") {
        return {
          ...baseInfo,
          status: "expired",
          statusLabel: "Authorization Expired",
          isExpired: true,
          account: record.account
        };
      }

      if (record.status === "connected") {
        return {
          ...baseInfo,
          status: "connected",
          statusLabel: "Connected",
          account: record.account
        };
      }
    }
  } else if (integrationId === "gmail") {
    const record = await getIntegrationRecord(workspaceId, "gmail");
    if (record) {
      if (record.status === "expired") {
        return {
          ...baseInfo,
          status: "expired",
          statusLabel: "Authorization Expired",
          isExpired: true,
          account: record.account
        };
      }

      if (record.status === "connected") {
        return {
          ...baseInfo,
          status: "connected",
          statusLabel: "Connected",
          account: record.account
        };
      }
    }
  }

  return baseInfo;
}

export async function getAllLiveIntegrationStatuses(
  workspaceId?: string
): Promise<Record<string, IntegrationStatusInfo>> {
  const result: Record<string, IntegrationStatusInfo> = {};
  for (const id of Object.keys(INTEGRATION_METADATA)) {
    result[id] = await getLiveIntegrationStatusForWorkspace(id, workspaceId);
  }
  return result;
}

export function getAllIntegrationStatuses(): Record<string, IntegrationStatusInfo> {
  const result: Record<string, IntegrationStatusInfo> = {};
  for (const id of Object.keys(INTEGRATION_METADATA)) {
    result[id] = resolveIntegrationStatus(id);
  }
  return result;
}

