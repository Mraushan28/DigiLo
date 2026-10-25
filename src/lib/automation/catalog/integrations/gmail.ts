import { IntegrationDefinition } from "../types";
import { z } from "zod";

export const gmailIntegration: IntegrationDefinition = {
  id: "gmail",
  name: "Gmail",
  category: "Email & Communication",
  description: "Dispatches automated emails, instant confirmation replies, and team lead notifications via Google Workspace / Gmail OAuth 2.0.",
  auth: {
    type: "oauth2",
    providerId: "gmail",
    scopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    tokenType: "bearer",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    redirectUriPath: "/api/automation/integrations/gmail/callback",
  },
  isImplemented: true,
  docsUrl: "https://developers.google.com/gmail/api",
  setupGuide: {
    overview: "Connect client Gmail or Google Workspace accounts directly via Digilo OAuth 2.0 with send-only scope.",
    steps: [
      "Enable Gmail API in Google Cloud Console.",
      "Register redirect URI: https://<your-domain>/api/automation/integrations/gmail/callback (or http://localhost:3000 for local dev).",
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.",
    ],
    registeredRedirectUri: "/api/automation/integrations/gmail/callback",
    portalUrl: "https://console.cloud.google.com/apis/credentials",
  },
  resourceConfig: {
    supported: false,
    type: "none",
    label: "Sender Email Account",
  },
  triggers: [],
  actions: [
    {
      id: "gmail.send_email",
      name: "Send Automated Email via Gmail",
      description: "Sends an email notification, welcome auto-responder, or client lead summary via connected Gmail.",
      requiredIntegration: "gmail",
      inputSchema: z.object({
        to: z.string().min(1, "Recipient email address or variable is required"),
        subject: z.string().min(1, "Email subject is required"),
        body: z.string().min(1, "Email body content is required"),
      }),
      configFields: [
        {
          key: "to",
          label: "Recipient Email Address",
          type: "text",
          required: true,
          placeholder: "e.g. sales@company.com or {{lead.email}}",
          defaultValue: "team@company.com",
        },
        {
          key: "subject",
          label: "Email Subject",
          type: "text",
          required: true,
          placeholder: "e.g. New High-Priority Lead Ingested",
          defaultValue: "New Lead Notification",
        },
        {
          key: "body",
          label: "Email Message Body",
          type: "textarea",
          required: true,
          placeholder: "Write message template or include {{lead.summary}}",
          defaultValue: "A new lead has been received and analyzed by DIGILO AI.",
        },
      ],
      executionAdapter: {
        engine: "n8n",
        n8nNodeType: "n8n-nodes-base.gmail",
        n8nNodeVersion: 2,
        credentialType: "gmailOAuth2",
        credentialIdPrefix: "digilo_ws",
        mapParameters: (stepConfig, accountInfo) => {
          return {
            resource: "message",
            operation: "send",
            toList: [stepConfig.to || accountInfo?.email || "team@company.com"],
            subject: stepConfig.subject || "New Lead Notification",
            emailType: "text",
            message: stepConfig.body || "A new lead has arrived.",
          };
        },
      },
    },
  ],
};
