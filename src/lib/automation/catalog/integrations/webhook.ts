import { IntegrationDefinition } from "../types";

export const webhookIntegration: IntegrationDefinition = {
  id: "webhook",
  name: "Digilo Webhook",
  category: "Trigger & Ingestion",
  description: "Direct HTTP endpoint capturing inbound webhook events from web forms, landing pages, and external apps.",
  auth: { type: "none" },
  isImplemented: true,
  setupGuide: {
    overview: "Built-in ingestion endpoint. No external API keys or OAuth setup required.",
    steps: [
      "Configure your frontend form or external system to send a POST request to your Digilo webhook URL.",
      "The webhook payload will be automatically ingested as structured JSON data into the workflow."
    ]
  },
  triggers: [
    {
      id: "webhook",
      name: "Webhook Event",
      description: "Triggers automatically when an external event payload arrives (e.g. form submission, lead capture).",
      requiredIntegration: "webhook",
      defaultSource: "Website Contact Form",
      defaultEvent: "lead_submitted",
      executionAdapter: {
        n8nNodeType: "n8n-nodes-base.webhook",
        n8nNodeVersion: 2,
        mapParameters: (triggerConfig) => ({
          path: (triggerConfig.path as string) || "digilo-webhook",
          httpMethod: "POST",
          responseMode: "onReceived",
          responseData: "allEntries"
        })
      }
    },
    {
      id: "manual",
      name: "Manual Trigger",
      description: "Triggers on demand when initiated by a user or automated batch test schedule.",
      requiredIntegration: "webhook",
      defaultSource: "User Dashboard",
      defaultEvent: "manual_run",
      executionAdapter: {
        n8nNodeType: "n8n-nodes-base.manualTrigger",
        n8nNodeVersion: 1,
        mapParameters: () => ({})
      }
    }
  ],
  actions: []
};
