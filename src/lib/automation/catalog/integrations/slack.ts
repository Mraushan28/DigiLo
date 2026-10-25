import { IntegrationDefinition } from "../types";
import { z } from "zod";
import { renderSlackMessageWithConditions } from "../../slack-formatter";

export const slackIntegration: IntegrationDefinition = {
  id: "slack",
  name: "Slack",
  category: "Team Messaging",
  description: "Posts instant team alerts, qualified lead alerts, and operational updates to designated Slack channels.",
  auth: {
    type: "oauth2",
    providerId: "slack",
    scopes: [
      "chat:write",
      "chat:write.public",
      "channels:read",
      "groups:read",
      "team:read"
    ],
    tokenType: "bot",
    envKeys: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    redirectUriPath: "/api/automation/integrations/slack/callback"
  },
  isImplemented: true,
  docsUrl: "https://api.slack.com",
  setupGuide: {
    overview: "Connect client Slack workspace via Digilo OAuth v2. Bot tokens are encrypted using AES-256-GCM.",
    steps: [
      "Create a Slack App in https://api.slack.com/apps.",
      "Add Bot Token Scopes: chat:write, chat:write.public, channels:read, groups:read, team:read.",
      "Add Redirect URL: http://localhost:3000/api/automation/integrations/slack/callback.",
      "Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in .env.local."
    ],
    registeredRedirectUri: "http://localhost:3000/api/automation/integrations/slack/callback",
    portalUrl: "https://api.slack.com/apps"
  },
  resourceConfig: {
    supported: true,
    type: "channel",
    label: "Notification Slack Channel"
  },
  triggers: [],
  actions: [
    {
      id: "slack.send_message",
      name: "Send Slack Notification",
      description: "Post a message or formatted lead notification to a chosen Slack channel.",
      requiredIntegration: "slack",
      inputSchema: z.object({
        channel: z.string().min(1, "Slack channel is required"),
        message: z.string().min(1, "Message content is required")
      }),
      configFields: [
        {
          key: "channel",
          label: "Slack Channel",
          type: "text",
          required: true,
          placeholder: "e.g. #leads or #sales",
          defaultValue: "#leads"
        },
        {
          key: "message",
          label: "Message Content",
          type: "textarea",
          required: true,
          placeholder: "e.g. Inbound lead received: {{lead.name}} ({{lead.company}})",
          defaultValue: "New inbound lead received from website. Check Google Sheets for details."
        }
      ],
      executionAdapter: {
        engine: "n8n",
        n8nNodeType: "n8n-nodes-base.slack",
        n8nNodeVersion: 2,
        credentialType: "slackOAuth2Api",
        credentialIdPrefix: "digilo_ws",
        mapParameters: (stepConfig, accountInfo) => {
          const targetChannel = accountInfo?.selectedChannel || (stepConfig.channel as string) || "#leads";
          const rawMessage = (stepConfig.message as string) || "New notification from Digilo AI Automation";
          const rendered = renderSlackMessageWithConditions(rawMessage, {
            ...stepConfig,
            priority: (stepConfig.priority as string) || "High",
          });

          return {
            resource: "message",
            operation: "post",
            channel: {
              __rl: true,
              value: targetChannel,
              mode: "name"
            },
            text: rendered.text
          };
        },
        validateConfiguration: (stepConfig) => {
          const errors: string[] = [];
          if (!stepConfig.channel || typeof stepConfig.channel !== "string" || !stepConfig.channel.trim()) {
            errors.push("Slack action requires a channel destination (e.g. #leads).");
          } else if (stepConfig.channel === "YOUR_CHANNEL_ID") {
            errors.push("Slack channel is set to unresolved placeholder 'YOUR_CHANNEL_ID'. Integration setup is required to configure a valid channel.");
          }
          if (!stepConfig.message || typeof stepConfig.message !== "string" || !stepConfig.message.trim()) {
            errors.push("Slack action requires message text.");
          }
          return { isValid: errors.length === 0, errors };
        }
      }
    }
  ]
};
