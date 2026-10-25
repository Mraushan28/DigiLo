import { IntegrationStatusInfo, IntegrationConnectionStatus } from "@/types/automation";

export const INTEGRATION_METADATA: Record<string, {
  name: string;
  category: string;
  description: string;
  envKeys: string[];
  oauthSupported: boolean;
}> = {
  openai: {
    name: "OpenAI / AI Inference",
    category: "AI & Intelligence",
    description: "Powers natural language analysis, lead qualification, and automated classification.",
    envKeys: ["NVIDIA_API_KEY", "OPENAI_API_KEY"],
    oauthSupported: false
  },
  google_sheets: {
    name: "Google Sheets",
    category: "Databases & Spreadsheets",
    description: "Appends rows, logs lead records, and synchronizes business tracking sheets.",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    oauthSupported: true
  },
  gmail: {
    name: "Gmail",
    category: "Email & Communication",
    description: "Sends automated client notifications, transactional emails, and lead updates.",
    envKeys: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"],
    oauthSupported: true
  },
  slack: {
    name: "Slack",
    category: "Team Messaging",
    description: "Posts instant alerts, lead notifications, and operational events to Slack channels.",
    envKeys: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    oauthSupported: true
  },
  webhook: {
    name: "Digilo Webhook",
    category: "Trigger & Ingestion",
    description: "Direct HTTP endpoint capturing inbound webhook events from web forms and apps.",
    envKeys: [],
    oauthSupported: false
  }
};

/**
 * Pure, client-safe synchronous resolution of integration metadata.
 * Has zero Node fs or crypto dependencies, making it 100% browser-bundle safe.
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
  } else if (integrationId === "google_sheets" || integrationId === "slack" || integrationId === "gmail") {
    // Client-side initial fallback until /api/automation/integrations responds
    status = "not_connected";
    statusLabel = "Ready to Connect";
  } else {
    status = "not_configured";
    statusLabel = "Not Configured";
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
    isConfiguredInEnv: false
  };
}
