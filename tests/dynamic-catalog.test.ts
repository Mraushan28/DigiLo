/**
 * Automated Test Suite for DIGILO Dynamic Integration Platform:
 * Catalog Extensibility, Integration Detection, Connection-Aware Builder, and n8n Execution Compatibility
 *
 * Scenarios Covered:
 * 1. Centralized dynamic catalog registration and extensibility.
 * 2. Prompts requiring single vs multiple integrations.
 * 3. Deterministic rejection & clarification for unsupported integrations (e.g. Shopify, Discord, Airtable).
 * 4. Connection-aware execution validation (already-connected vs missing vs expired integrations).
 * 5. Multi-tenant / cross-user credential isolation during workflow export.
 * 6. n8n node parameter mapping and zero secret leakage.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { 
  catalog, 
  getAllIntegrations, 
  getInstalledIntegrations, 
  getAction, 
  isActionSupported, 
  isTriggerSupported,
  getRequiredIntegrationsForWorkflow,
  validateStepConfiguration,
  IntegrationDefinition
} from "../src/lib/automation/catalog";
import { validateWorkflow } from "../src/lib/automation/workflow-validator";
import { 
  convertDigiloWorkflowToN8n, 
  validateN8nWorkflowExecutability 
} from "../src/lib/automation/n8n-exporter";
import { saveIntegrationRecord, deleteIntegrationRecord } from "../src/lib/automation/storage/integration-store";
import { getLiveIntegrationStatusForWorkspace } from "../src/lib/automation/integration-status";
import { encryptToken } from "../src/lib/automation/crypto";
import { Workflow } from "../src/types/automation";

async function runDynamicCatalogTests() {
  console.log("=== DIGILO DYNAMIC INTEGRATION PLATFORM TEST SUITE ===\n");
  let passedCount = 0;
  let totalCount = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    totalCount++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err: unknown) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // 1. Dynamic Catalog Registration & Built-in Services
  await test("1. Dynamic catalog lists supported integrations and initial implementations", () => {
    const all = getAllIntegrations();
    const installed = getInstalledIntegrations();

    assert.ok(all.length >= 4, "Must contain at least 4 registered integrations");
    assert.ok(installed.some((i) => i.id === "webhook"), "Webhook must be installed");
    assert.ok(installed.some((i) => i.id === "openai"), "OpenAI must be installed");
    assert.ok(installed.some((i) => i.id === "google_sheets"), "Google Sheets must be installed");
    assert.ok(installed.some((i) => i.id === "slack"), "Slack must be installed");

    assert.ok(isActionSupported("ai.analyze"));
    assert.ok(isActionSupported("google_sheets.add_row"));
    assert.ok(isActionSupported("slack.send_message"));
    assert.ok(isTriggerSupported("webhook"));
    assert.ok(isTriggerSupported("manual"));
  });

  // 2. Extensibility: Pluggable Integration Registration
  await test("2. Extensibility: registering a new custom integration without engine changes", () => {
    const mockIntegration: IntegrationDefinition = {
      id: "mock_crm",
      name: "Mock Enterprise CRM",
      category: "CRM & Sales",
      description: "Creates and updates enterprise leads in custom CRM",
      auth: { type: "api_key", envKeys: ["MOCK_CRM_KEY"] },
      isImplemented: true,
      setupGuide: {
        overview: "Test integration setup guide",
        steps: ["Add MOCK_CRM_KEY to .env"]
      },
      triggers: [],
      actions: [
        {
          id: "mock_crm.create_lead",
          name: "Create CRM Lead",
          description: "Creates new lead record in CRM",
          requiredIntegration: "mock_crm",
          configFields: [
            { key: "leadStage", label: "Lead Stage", type: "text", required: true, defaultValue: "New" }
          ],
          executionAdapter: {
            engine: "n8n",
            n8nNodeType: "n8n-nodes-base.httpRequest",
            n8nNodeVersion: 1,
            mapParameters: (cfg) => ({
              url: "https://api.mockcrm.com/leads",
              body: { stage: cfg.leadStage || "New" }
            })
          }
        }
      ]
    };

    catalog.register(mockIntegration);

    assert.ok(isActionSupported("mock_crm.create_lead"), "New action must be dynamically supported");
    const retrieved = getAction("mock_crm.create_lead");
    assert.equal(retrieved?.name, "Create CRM Lead");
    assert.equal(retrieved?.requiredIntegration, "mock_crm");

    // Dynamic integration detection for workflow using this action
    const req = getRequiredIntegrationsForWorkflow({
      trigger: { type: "webhook", source: "API", event: "ping" },
      steps: [
        { id: "s1", type: "action", action: "mock_crm.create_lead", description: "Create CRM lead" }
      ]
    });
    assert.ok(req.includes("mock_crm"));
    assert.ok(req.includes("webhook"));
  });

  // 3. Workflow Requiring Exactly One Integration (Google Sheets Only)
  await test("3. Single-integration detection: prompt requiring only Google Sheets", () => {
    const singleIntegrationWorkflow: Workflow = {
      name: "Simple Form to Google Sheets",
      description: "Directly logs incoming form responses to a Google Sheet without AI or messaging.",
      trigger: {
        type: "webhook",
        source: "Contact Form",
        event: "submission"
      },
      steps: [
        {
          id: "step_gs_only",
          name: "Append Response",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append form fields to Google Sheet",
          config: {
            spreadsheet: "Feedback Submissions",
            sheetName: "Sheet1"
          }
        }
      ],
      required_integrations: ["webhook", "google_sheets"]
    };

    const detected = getRequiredIntegrationsForWorkflow(singleIntegrationWorkflow);
    assert.deepEqual(detected.sort(), ["google_sheets", "webhook"].sort());

    const validation = validateWorkflow(singleIntegrationWorkflow);
    assert.equal(validation.isValid, true, "Single integration workflow should be completely valid");
  });

  // 4. Workflow Requiring Multiple Integrations (Webhook + AI + Sheets + Slack)
  await test("4. Multi-integration detection: Webhook → AI → Google Sheets → Slack", () => {
    const multiWorkflow: Workflow = {
      name: "Lead Scoring and Team Notification Pipeline",
      description: "Ingests website lead, scores urgency with AI, appends row, and alerts Slack.",
      trigger: {
        type: "webhook",
        source: "Pricing Page Form",
        event: "form_submit"
      },
      steps: [
        {
          id: "step_ai",
          name: "AI Lead Scoring",
          type: "action",
          action: "ai.analyze",
          description: "Evaluate intent score",
          config: { prompt: "Analyze customer size" }
        },
        {
          id: "step_sheet",
          name: "Log to Sheet",
          type: "action",
          action: "google_sheets.add_row",
          description: "Save scored lead",
          config: { spreadsheet: "Sales Pipeline 2026", sheetName: "Sheet1" }
        },
        {
          id: "step_slack",
          name: "Slack Alert",
          type: "action",
          action: "slack.send_message",
          description: "Notify sales on Slack",
          config: { channel: "#sales-alerts", message: "New lead arrived" }
        }
      ],
      required_integrations: ["webhook", "openai", "google_sheets", "slack"]
    };

    const detected = getRequiredIntegrationsForWorkflow(multiWorkflow);
    assert.equal(detected.length, 4);
    assert.ok(detected.includes("webhook"));
    assert.ok(detected.includes("openai"));
    assert.ok(detected.includes("google_sheets"));
    assert.ok(detected.includes("slack"));

    const validation = validateWorkflow(multiWorkflow);
    assert.equal(validation.isValid, true);
  });

  // 5. Rejection of Unsupported Integrations (No Hallucinations)
  await test("5. Rejection of unsupported integrations (Shopify, Discord, Airtable)", () => {
    assert.equal(isActionSupported("shopify.create_order"), false);
    assert.equal(isActionSupported("discord.send_message"), false);
    assert.equal(isActionSupported("airtable.create_record"), false);

    const hallucinatedWorkflow: Partial<Workflow> = {
      name: "Unsupported Integration Test",
      description: "Attempts to use an unsupported service",
      trigger: { type: "webhook", source: "Shopify Store", event: "order_created" },
      steps: [
        {
          id: "bad_step_1",
          type: "action",
          action: "shopify.create_order",
          description: "Process order"
        }
      ]
    };

    const validation = validateWorkflow(hallucinatedWorkflow);
    assert.equal(validation.isValid, false, "Workflow with unsupported action must fail validation");
    const unsupportedError = validation.errors.find((e) => e.code === "UNSUPPORTED_ACTION");
    assert.ok(unsupportedError, "Should produce UNSUPPORTED_ACTION error code");
  });

  // 6. Action Step Configuration Validation
  await test("6. Action step configuration field validation", () => {
    // Missing required 'prompt' in AI Analyze
    const aiCheck = validateStepConfiguration("ai.analyze", { model: "gpt-4o" });
    assert.equal(aiCheck.isValid, false);
    assert.ok(aiCheck.errors.some((e) => e.includes("Analysis Instructions")));

    // Valid AI Analyze
    const aiValid = validateStepConfiguration("ai.analyze", { prompt: "Analyze lead sentiment" });
    assert.equal(aiValid.isValid, true);

    // Missing spreadsheet in Google Sheets
    const gsCheck = validateStepConfiguration("google_sheets.add_row", { sheetName: "Sheet1" });
    assert.equal(gsCheck.isValid, false);

    // Missing channel in Slack
    const slackCheck = validateStepConfiguration("slack.send_message", { message: "Hello team" });
    assert.equal(slackCheck.isValid, false);
  });

  // 7. Connection-Aware Execution Readiness: Already-Connected vs Missing vs Expired
  await test("7. Connection-aware execution readiness (connected vs missing vs expired)", async () => {
    const testWorkspace = crypto.randomUUID();

    const testWorkflow: Workflow = {
      name: "Qualified Lead Dispatcher",
      description: "Appends to Google Sheets and notifies Slack",
      trigger: { type: "webhook", source: "Website", event: "lead_inbound" },
      steps: [
        {
          id: "step_gs",
          name: "Add to Sheet",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append row",
          config: { spreadsheet: "Leads", sheetName: "Sheet1" }
        },
        {
          id: "step_sl",
          name: "Post to Slack",
          type: "action",
          action: "slack.send_message",
          description: "Send alert",
          config: { channel: "#leads", message: "New Lead" }
        }
      ],
      required_integrations: ["google_sheets", "slack"]
    };

    // Scenario A: Neither integration connected
    const unconnExec = validateN8nWorkflowExecutability(testWorkflow, {
      workspaceId: testWorkspace,
      workspaceIntegrations: {
        google_sheets: { id: "google_sheets", name: "Google Sheets", category: "DB", status: "not_connected", statusLabel: "Not Connected", description: "" },
        slack: { id: "slack", name: "Slack", category: "Messaging", status: "not_connected", statusLabel: "Not Connected", description: "" }
      }
    });
    assert.equal(unconnExec.isExecutable, false);
    assert.ok(unconnExec.missingCredentials.includes("google_sheets"));
    assert.ok(unconnExec.missingCredentials.includes("slack"));

    // Scenario B: Google Sheets connected, Slack missing
    const partialExec = validateN8nWorkflowExecutability(testWorkflow, {
      workspaceId: testWorkspace,
      workspaceIntegrations: {
        google_sheets: { id: "google_sheets", name: "Google Sheets", category: "DB", status: "connected", statusLabel: "Connected", description: "" },
        slack: { id: "slack", name: "Slack", category: "Messaging", status: "not_connected", statusLabel: "Not Connected", description: "" }
      }
    });
    assert.equal(partialExec.isExecutable, false);
    assert.equal(partialExec.missingCredentials.length, 1);
    assert.equal(partialExec.missingCredentials[0], "slack");

    // Scenario C: Both connected
    const fullExec = validateN8nWorkflowExecutability(testWorkflow, {
      workspaceId: testWorkspace,
      workspaceIntegrations: {
        google_sheets: { id: "google_sheets", name: "Google Sheets", category: "DB", status: "connected", statusLabel: "Connected", description: "" },
        slack: { id: "slack", name: "Slack", category: "Messaging", status: "connected", statusLabel: "Connected", description: "" }
      }
    });
    assert.equal(fullExec.isExecutable, true);
    assert.equal(fullExec.missingCredentials.length, 0);

    // Scenario D: Google Sheets token is expired
    const expiredExec = validateN8nWorkflowExecutability(testWorkflow, {
      workspaceId: testWorkspace,
      workspaceIntegrations: {
        google_sheets: { id: "google_sheets", name: "Google Sheets", category: "DB", status: "expired", statusLabel: "Authorization Expired", isExpired: true, description: "" },
        slack: { id: "slack", name: "Slack", category: "Messaging", status: "connected", statusLabel: "Connected", description: "" }
      }
    });
    assert.equal(expiredExec.isExecutable, false);
    assert.ok(expiredExec.missingCredentials.includes("google_sheets"));
  });

  // 8. Cross-Tenant Credential Isolation in n8n Export
  await test("8. Cross-tenant credential isolation in n8n export generation", () => {
    const workspaceUserA = crypto.randomUUID();
    const workspaceUserB = crypto.randomUUID();

    const integrationsUserA = {
      google_sheets: {
        id: "google_sheets",
        name: "Google Sheets",
        category: "DB",
        status: "connected" as const,
        statusLabel: "Connected",
        description: "",
        account: { email: "user_a@enterprise.com", selectedSpreadsheet: "User A Sheet", selectedSheet: "Sheet1" }
      }
    };

    const integrationsUserB = {
      google_sheets: {
        id: "google_sheets",
        name: "Google Sheets",
        category: "DB",
        status: "connected" as const,
        statusLabel: "Connected",
        description: "",
        account: { email: "user_b@startup.io", selectedSpreadsheet: "User B Sheet", selectedSheet: "Sheet1" }
      }
    };

    const workflow: Workflow = {
      name: "Form Intake Flow",
      description: "Logs incoming form to sheet",
      trigger: { type: "webhook", source: "Form", event: "submit" },
      steps: [
        {
          id: "step_sheet",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append row",
          config: { spreadsheet: "Default Sheet", sheetName: "Sheet1" }
        }
      ],
      required_integrations: ["google_sheets"]
    };

    const exportUserA = convertDigiloWorkflowToN8n(workflow, {
      workspaceId: workspaceUserA,
      workspaceIntegrations: integrationsUserA
    });

    const exportUserB = convertDigiloWorkflowToN8n(workflow, {
      workspaceId: workspaceUserB,
      workspaceIntegrations: integrationsUserB
    });

    const nodeA = exportUserA.nodes.find((n) => n.type === "n8n-nodes-base.googleSheets");
    const nodeB = exportUserB.nodes.find((n) => n.type === "n8n-nodes-base.googleSheets");

    assert.equal(nodeA?.credentials?.googleSheetsOAuth2.id, `digilo_ws_${workspaceUserA}_google_sheets`);
    assert.equal(nodeA?.credentials?.googleSheetsOAuth2.name, "Digilo Client (user_a@enterprise.com)");
    assert.equal((nodeA?.parameters.documentId as { value: string }).value, "User A Sheet");

    assert.equal(nodeB?.credentials?.googleSheetsOAuth2.id, `digilo_ws_${workspaceUserB}_google_sheets`);
    assert.equal(nodeB?.credentials?.googleSheetsOAuth2.name, "Digilo Client (user_b@startup.io)");
    assert.equal((nodeB?.parameters.documentId as { value: string }).value, "User B Sheet");

    // Mutual exclusivity
    assert.notEqual(nodeA?.credentials?.googleSheetsOAuth2.id, nodeB?.credentials?.googleSheetsOAuth2.id);
  });

  // 9. Expired Token Detection in Storage Layer
  await test("9. Expired token detection in integration status resolution", async () => {
    const testWs = crypto.randomUUID();

    // Store record with expired timestamp and no refresh token
    await saveIntegrationRecord({
      workspaceId: testWs,
      provider: "google_sheets",
      status: "connected",
      account: { email: "expired@test.com" },
      encryptedTokens: {
        accessTokenCipher: encryptToken("old_access_token"),
        expiresAt: Date.now() - 10000 // Expired 10 seconds ago
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const liveStatus = await getLiveIntegrationStatusForWorkspace("google_sheets", testWs);
    assert.equal(liveStatus.status, "expired");
    assert.equal(liveStatus.isExpired, true);
    assert.equal(liveStatus.statusLabel, "Authorization Expired");

    await deleteIntegrationRecord(testWs, "google_sheets");
  });

  console.log(`\n========================================`);
  console.log(`DYNAMIC CATALOG TEST SUMMARY: ${passedCount}/${totalCount} tests passed.`);
  console.log(`========================================\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runDynamicCatalogTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
