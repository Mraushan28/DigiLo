import { IntegrationDefinition } from "../types";
import { z } from "zod";

export const googleSheetsIntegration: IntegrationDefinition = {
  id: "google_sheets",
  name: "Google Sheets",
  category: "Databases & Spreadsheets",
  description: "Appends rows, logs lead records, and synchronizes business tracking sheets securely via Google OAuth 2.0.",
  auth: {
    type: "oauth2",
    providerId: "google_sheets",
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/drive.readonly"
    ],
    tokenType: "bearer",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    redirectUriPath: "/api/automation/integrations/google/callback"
  },
  isImplemented: true,
  docsUrl: "https://developers.google.com/sheets/api",
  setupGuide: {
    overview: "Connect client Google accounts directly via Digilo OAuth 2.0. Offline access tokens are encrypted using AES-256-GCM.",
    steps: [
      "Create OAuth 2.0 credentials in Google Cloud Console with 'Web Application' type.",
      "Register redirect URI: https://<your-domain>/api/automation/integrations/google/callback (or http://localhost:3000 for local dev).",
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables."
    ],
    registeredRedirectUri: "/api/automation/integrations/google/callback",
    portalUrl: "https://console.cloud.google.com/apis/credentials"
  },
  resourceConfig: {
    supported: true,
    type: "spreadsheet",
    label: "Target Spreadsheet & Worksheet Tab"
  },
  triggers: [],
  actions: [
    {
      id: "google_sheets.add_row",
      name: "Append Row to Google Sheet",
      description: "Save inbound data or analyzed lead information as a new row in a target Google spreadsheet.",
      requiredIntegration: "google_sheets",
      inputSchema: z.object({
        spreadsheet: z.string().min(1, "Spreadsheet name or ID is required"),
        sheetName: z.string().optional(),
        columns: z.string().optional()
      }),
      configFields: [
        {
          key: "spreadsheet",
          label: "Spreadsheet Name or ID",
          type: "text",
          required: true,
          placeholder: "e.g. Website Leads 2026",
          defaultValue: "Website Leads"
        },
        {
          key: "sheetName",
          label: "Worksheet Tab Name",
          type: "text",
          required: false,
          placeholder: "e.g. Leads or Sheet1",
          defaultValue: "Leads"
        },
        {
          key: "columns",
          label: "Columns to Save",
          type: "text",
          required: false,
          placeholder: "e.g. Name, Email, Company, Notes",
          defaultValue: "Name, Email, Company, Notes"
        }
      ],
      executionAdapter: {
        engine: "n8n",
        n8nNodeType: "n8n-nodes-base.googleSheets",
        n8nNodeVersion: 4,
        credentialType: "googleSheetsOAuth2",
        credentialIdPrefix: "digilo_ws",
        mapParameters: (stepConfig, accountInfo) => {
          const spreadsheet = accountInfo?.selectedSpreadsheet || (stepConfig.spreadsheet as string) || "Website Leads";
          const sheetName = accountInfo?.selectedSheet || (stepConfig.sheetName as string) || "Sheet1";

          return {
            operation: "append",
            documentId: {
              __rl: true,
              value: spreadsheet,
              mode: "name"
            },
            sheetName: {
              __rl: true,
              value: sheetName,
              mode: "name"
            },
            dataMode: "autoMapInputData",
            columns: stepConfig.columns
              ? { mappingMode: "autoMapInputData", value: stepConfig.columns }
              : undefined
          };
        },
        validateConfiguration: (stepConfig) => {
          const errors: string[] = [];
          if (!stepConfig.spreadsheet || typeof stepConfig.spreadsheet !== "string" || !stepConfig.spreadsheet.trim()) {
            errors.push("Google Sheets action requires a spreadsheet name or ID.");
          } else if (stepConfig.spreadsheet === "YOUR_SPREADSHEET_ID") {
            errors.push("Spreadsheet is set to unresolved placeholder 'YOUR_SPREADSHEET_ID'. Integration setup is required to configure a valid spreadsheet.");
          }
          return { isValid: errors.length === 0, errors };
        }
      }
    }
  ]
};
