import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  verifyGoogleSheetsDestination,
  LAUNCHNEST_WORKFLOW_DEFINITION,
} from "../src/lib/automation/lead-processing";
import {
  isN8nConfigured,
  verifyN8nConnection,
  syncWorkflowToN8n,
  activateWorkflow,
  executeDryRunTest,
} from "../src/lib/automation/n8n-client";
import { saveIntegrationRecord, deleteIntegrationRecord } from "../src/lib/automation/storage/integration-store";
import { encryptToken } from "../src/lib/automation/crypto";
import { saveWorkflow } from "../src/lib/automation/workflow-service";
import { Workflow } from "@/types/automation";

test("=== WORKFLOW ACTIVATION BLOCKERS & EXECUTION SUITE ===", async () => {
  const workspaceId = `ws_blocker_test_${Date.now()}`;

  // -------------------------------------------------------------------------
  // 1. WORKSHEET TAB WHITESPACE NORMALIZATION & EXACT TITLE RESOLUTION
  // -------------------------------------------------------------------------
  await test("1.1 Normalizes trailing whitespace in worksheet tab ('Tickets ' vs 'Tickets')", async () => {
    // Connect Google Sheets in storage
    await saveIntegrationRecord({
      workspaceId,
      provider: "google_sheets",
      status: "connected",
      account: {
        email: "support@trendora.com",
        selectedSpreadsheet: "Trendora Support Log",
        selectedSheet: "Tickets",
      },
      encryptedTokens: { accessTokenCipher: "test_cipher" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Provide accessible sheet list with exact title 'Tickets'
    // User requested tab with trailing space 'Tickets '
    const check = await verifyGoogleSheetsDestination(
      workspaceId,
      "Trendora Support Log",
      "Tickets ", // Trailing whitespace
      ["Tickets", "Support Archive", "Notes"]
    );

    assert.equal(check.verified, true);
    assert.equal(check.details?.sheetName, "Tickets", "Must normalize and resolve to exact sheet title without whitespace");
  });

  await test("1.2 Normalizes leading whitespace in worksheet tab (' Tickets' vs 'Tickets')", async () => {
    const check = await verifyGoogleSheetsDestination(
      workspaceId,
      "Trendora Support Log",
      "  Tickets",
      ["Tickets", "Support Archive"]
    );

    assert.equal(check.verified, true);
    assert.equal(check.details?.sheetName, "Tickets");
  });

  await test("1.3 Preserves actual sheet title if the sheet itself in Google contains trailing whitespace", async () => {
    // If the sheet in Google Drive literally has a trailing space in its title: 'Tickets '
    const check = await verifyGoogleSheetsDestination(
      workspaceId,
      "Trendora Support Log",
      "Tickets",
      ["Tickets ", "Support Archive"] // The real tab in Google has trailing space
    );

    assert.equal(check.verified, true);
    assert.equal(check.details?.sheetName, "Tickets ", "Must resolve to actual sheet title from spreadsheet metadata");
  });

  await test("1.4 Does NOT silently select the wrong sheet when requested sheet is missing", async () => {
    const check = await verifyGoogleSheetsDestination(
      workspaceId,
      "Trendora Support Log",
      "Billing Inquiries", // Not in spreadsheet
      ["Tickets", "Support Archive", "Customers"]
    );

    assert.equal(check.verified, false);
    assert.equal(check.errorCode, "SETUP_REQUIRED");
    assert.ok(check.message.includes("Billing Inquiries"));
    assert.ok(check.message.includes("does not exist"));
    assert.notEqual(check.details?.sheetName, "Customers", "Must never substitute an unrelated sheet");
  });

  // -------------------------------------------------------------------------
  // 2. MISSING N8N CONFIGURATION & NATIVE EXECUTION PATH
  // -------------------------------------------------------------------------
  await test("2.1 isN8nConfigured returns false when N8N_API_URL or N8N_API_KEY is missing", () => {
    const originalUrl = process.env.N8N_API_URL;
    const originalKey = process.env.N8N_API_KEY;
    try {
      delete process.env.N8N_API_URL;
      delete process.env.N8N_API_KEY;

      assert.equal(isN8nConfigured(), false);
    } finally {
      process.env.N8N_API_URL = originalUrl;
      process.env.N8N_API_KEY = originalKey;
    }
  });

  await test("2.2 verifyN8nConnection returns unconfigured with actionable error when env missing", async () => {
    const originalUrl = process.env.N8N_API_URL;
    const originalKey = process.env.N8N_API_KEY;
    try {
      delete process.env.N8N_API_URL;
      delete process.env.N8N_API_KEY;

      const verification = await verifyN8nConnection();
      assert.equal(verification.isConfigured, false);
      assert.equal(verification.isValid, false);
      assert.ok(verification.error?.includes("missing from server environment"));
    } finally {
      process.env.N8N_API_URL = originalUrl;
      process.env.N8N_API_KEY = originalKey;
    }
  });

  await test("2.3 syncWorkflowToN8n returns unconfigured without failing or creating fake IDs", async () => {
    const originalUrl = process.env.N8N_API_URL;
    const originalKey = process.env.N8N_API_KEY;
    try {
      delete process.env.N8N_API_URL;
      delete process.env.N8N_API_KEY;

      const dummyWorkflow: Workflow = {
        id: "wf_test_n8n_unconfigured",
        name: "Test Lead Pipeline",
        description: "Test",
        status: "draft",
        version: "v1.0",
        required_integrations: ["webhook", "google_sheets"],
        trigger: { type: "webhook", source: "Website", event: "lead.submitted" },
        steps: [],
      };

      const result = await syncWorkflowToN8n(dummyWorkflow, workspaceId);
      assert.equal(result.isConfigured, false);
      assert.equal(result.status, "unconfigured");
      assert.equal(result.n8nWorkflowId, undefined, "Must never invent a fake n8n ID");
      assert.ok(result.error?.includes("Digilo Native Engine"));
    } finally {
      process.env.N8N_API_URL = originalUrl;
      process.env.N8N_API_KEY = originalKey;
    }
  });

  // -------------------------------------------------------------------------
  // 3. INACCESSIBLE SPREADSHEETS & DESTINATION GUARDS
  // -------------------------------------------------------------------------
  await test("3.1 verifyGoogleSheetsDestination flags placeholder YOUR_SPREADSHEET_ID", async () => {
    const check = await verifyGoogleSheetsDestination(workspaceId, "YOUR_SPREADSHEET_ID", "Sheet1");
    assert.equal(check.verified, false);
    assert.equal(check.errorCode, "SETUP_REQUIRED");
    assert.ok(check.message.includes("YOUR_SPREADSHEET_ID"));
  });

  await test("3.2 verifyGoogleSheetsDestination flags disconnected Google account", async () => {
    const disconnectedWorkspace = `ws_disconnected_${Date.now()}`;
    const check = await verifyGoogleSheetsDestination(disconnectedWorkspace, "Trendora Support Log", "Tickets");
    assert.equal(check.verified, false);
    assert.equal(check.errorCode, "AUTH_REQUIRED");
    assert.ok(check.message.includes("Google Sheets is not connected"));
  });

  await test("3.3 Activation is blocked if Google Sheets destination is not verified", async () => {
    const wfId = `wf_unverified_${Date.now()}`;
    const workflow: Workflow = {
      id: wfId,
      name: "Unverified Destination Workflow",
      description: "Test",
      status: "draft",
      version: "v1.0",
      required_integrations: ["google_sheets", "slack"],
      trigger: {
        type: "webhook",
        source: "Website",
        event: "lead.submitted",
        description: "Inbound lead trigger",
      },
      steps: [
        {
          id: "step_sheets",
          name: "Add to Sheet",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append lead to sheets",
          config: { spreadsheet: "Nonexistent Spreadsheet 999", sheetName: "MissingTab" },
        },
      ],
    };
    await saveWorkflow(workspaceId, workflow);

    // Connect Slack for test
    await saveIntegrationRecord({
      workspaceId,
      provider: "slack",
      status: "connected",
      account: { selectedChannel: "#leads" },
      encryptedTokens: { accessTokenCipher: "test_slack_cipher" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await assert.rejects(
      async () => {
        await activateWorkflow(workspaceId, wfId);
      },
      (err: Error) => {
        assert.ok(err.message.includes("is not verified"));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 4. TEST WORKFLOW FLOW & FAILURE REPORTING (NO FAKE SUCCESSES)
  // -------------------------------------------------------------------------
  await test("4.1 executeDryRunTest reports step failure when Google Sheets is unverified", async () => {
    const wfId = `wf_failing_sheets_${Date.now()}`;
    const workflow: Workflow = {
      id: wfId,
      name: "Failing Sheets Workflow",
      description: "Test",
      status: "draft",
      version: "v1.0",
      required_integrations: ["webhook", "google_sheets"],
      trigger: {
        type: "webhook",
        source: "Website",
        event: "lead.submitted",
        description: "Trigger",
      },
      steps: [
        {
          id: "step_ai",
          name: "AI Lead Intelligence",
          type: "action",
          action: "ai.analyze",
          description: "Analyze lead",
          config: {},
        },
        {
          id: "step_sheets",
          name: "Append to Google Sheets",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append row",
          config: { spreadsheet: "YOUR_SPREADSHEET_ID", sheetName: "Sheet1" }, // Unconfigured placeholder!
        },
      ],
    };

    const result = await executeDryRunTest(workflow, workspaceId);
    assert.equal(result.status, "failed", "Execution overall status must be failed");
    
    const aiStep = result.stepResults.find((s) => s.action === "ai.analyze");
    assert.equal(aiStep?.status, "success", "AI step must succeed");

    const sheetsStep = result.stepResults.find((s) => s.action === "google_sheets.add_row");
    assert.equal(sheetsStep?.status, "failed", "Sheets step must report failed status");
    assert.ok(sheetsStep?.errorMessage?.includes("YOUR_SPREADSHEET_ID") || sheetsStep?.errorMessage?.includes("failed"));
  });

  await test("4.2 executeDryRunTest reports step failure when Slack channel is placeholder", async () => {
    const wfId = `wf_failing_slack_${Date.now()}`;
    // Ensure Slack is connected so it checks channel validity
    await saveIntegrationRecord({
      workspaceId,
      provider: "slack",
      status: "connected",
      account: { name: "Test Slack Workspace" },
      encryptedTokens: { accessTokenCipher: "test_slack_cipher" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const workflow: Workflow = {
      id: wfId,
      name: "Failing Slack Workflow",
      description: "Test",
      status: "draft",
      version: "v1.0",
      required_integrations: ["webhook", "slack"],
      trigger: {
        type: "webhook",
        source: "Website",
        event: "lead.submitted",
        description: "Trigger",
      },
      steps: [
        {
          id: "step_ai",
          name: "AI Lead Intelligence",
          type: "action",
          action: "ai.analyze",
          description: "Analyze lead",
          config: {},
        },
        {
          id: "step_slack",
          name: "Send Slack Alert",
          type: "action",
          action: "slack.send_message",
          description: "Send alert",
          config: { channel: "YOUR_CHANNEL_ID" }, // Placeholder channel!
        },
      ],
    };

    const result = await executeDryRunTest(workflow, workspaceId);
    assert.equal(result.status, "failed");

    const slackStep = result.stepResults.find((s) => s.action === "slack.send_message");
    assert.equal(slackStep?.status, "failed");
    assert.ok(slackStep?.errorMessage?.includes("YOUR_CHANNEL_ID") || slackStep?.errorMessage?.includes("placeholder"));
  });

  await test("4.3 Successful dry run allows Native Engine activation when n8n is unconfigured", async () => {
    const originalUrl = process.env.N8N_API_URL;
    const originalKey = process.env.N8N_API_KEY;
    try {
      delete process.env.N8N_API_URL;
      delete process.env.N8N_API_KEY;

      const wfId = `wf_native_live_${Date.now()}`;
      const workflow: Workflow = {
        id: wfId,
        name: "Native Live Workflow",
        description: "Test",
        status: "draft",
        version: "v1.0",
        required_integrations: ["webhook", "google_sheets", "slack"],
        trigger: {
          type: "webhook",
          source: "Website Leads",
          event: "lead.submitted",
          description: "Trigger",
        },
        steps: [
          {
            id: "step_ai",
            name: "AI Analysis",
            type: "action",
            action: "ai.analyze",
            description: "Analyze lead",
            config: {},
          },
          {
            id: "step_sheets",
            name: "Append to Google Sheets",
            type: "action",
            action: "google_sheets.add_row",
            description: "Append row",
            config: { spreadsheet: "Trendora Support Log", sheetName: "Tickets" },
          },
          {
            id: "step_slack",
            name: "Send Slack Alert",
            type: "action",
            action: "slack.send_message",
            description: "Send alert",
            config: { channel: "#leads" },
          },
        ],
      };
      await saveWorkflow(workspaceId, workflow);

      // Execute successful dry-run test
      const testResult = await executeDryRunTest(workflow, workspaceId);
      assert.equal(testResult.status, "success", "Test must succeed with verified outputs");

      // Verify activation succeeds via Digilo Native Engine without requiring n8n
      const activation = await activateWorkflow(workspaceId, wfId);
      assert.equal(activation.success, true);
      assert.equal(activation.workflow.status, "active");
      assert.ok(activation.message.includes("Digilo Native Engine"), "Should confirm live native execution");
    } finally {
      process.env.N8N_API_URL = originalUrl;
      process.env.N8N_API_KEY = originalKey;
    }
  });

  // -------------------------------------------------------------------------
  // 5. LIVE API WRITE FAILURES & SLACK ERROR HANDLING
  // -------------------------------------------------------------------------
  await test("5.1 Failed Google Sheets write halts pipeline and records truthful failure", async () => {
    const originalFetch = globalThis.fetch;
    const wfId = `wf_sheets_fail_${Date.now()}`;
    const workflow: Workflow = {
      id: wfId,
      name: "Write Failure Test",
      description: "Test",
      status: "draft",
      version: "v1.0",
      required_integrations: ["google_sheets", "slack"],
      trigger: {
        type: "webhook",
        source: "Website",
        event: "lead.submitted",
        description: "Trigger",
      },
      steps: [
        {
          id: "step_sheets",
          name: "Append to Google Sheets",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append row",
          config: { spreadsheet: "Trendora Support Log", sheetName: "Tickets" },
        },
        {
          id: "step_slack",
          name: "Send Slack Alert",
          type: "action",
          action: "slack.send_message",
          description: "Send alert",
          config: { channel: "#leads" },
        },
      ],
    };
    await saveWorkflow(workspaceId, workflow);

    // Save connected record with validly encrypted token and spreadsheet ID
    await saveIntegrationRecord({
      workspaceId,
      provider: "google_sheets",
      status: "connected",
      account: {
        email: "support@trendora.com",
        selectedSpreadsheet: "Trendora Support Log",
        selectedSpreadsheetId: "1abcTrendoraSpreadsheetId",
        selectedSheet: "Tickets",
      },
      encryptedTokens: { accessTokenCipher: encryptToken("ya29.live-simulated-token") },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mock fetch: Spreadsheet metadata check succeeds, but :append fails with 403 Forbidden
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes(":append")) {
        return new Response(JSON.stringify({ error: { message: "The caller does not have permission to write." } }), {
          status: 403,
          statusText: "Forbidden",
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("sheets.googleapis.com")) {
        return new Response(JSON.stringify({
          sheets: [{ properties: { title: "Tickets" } }]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input, init);
    };

    try {
      const result = await executeDryRunTest(workflow, workspaceId);
      assert.equal(result.status, "failed", "Overall execution status must be failed");

      const sheetsStep = result.stepResults.find((s) => s.action === "google_sheets.add_row");
      assert.equal(sheetsStep?.status, "failed", "Sheets step must fail");
      assert.ok(sheetsStep?.errorMessage?.includes("Google Sheets API write failed (403)"));

      const slackStep = result.stepResults.find((s) => s.action === "slack.send_message");
      assert.equal(slackStep?.status, "skipped", "Subsequent steps must be skipped on earlier failure");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await test("5.2 Failed Slack message delivery reports step failure with exact provider error", async () => {
    const originalFetch = globalThis.fetch;
    const wfId = `wf_slack_fail_${Date.now()}`;
    const workflow: Workflow = {
      id: wfId,
      name: "Slack Failure Test",
      description: "Test",
      status: "draft",
      version: "v1.0",
      required_integrations: ["google_sheets", "slack"],
      trigger: {
        type: "webhook",
        source: "Website",
        event: "lead.submitted",
        description: "Trigger",
      },
      steps: [
        {
          id: "step_sheets",
          name: "Append to Google Sheets",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append row",
          config: { spreadsheet: "Trendora Support Log", sheetName: "Tickets" },
        },
        {
          id: "step_slack",
          name: "Send Slack Alert",
          type: "action",
          action: "slack.send_message",
          description: "Send alert",
          config: { channel: "#leads" },
        },
      ],
    };
    await saveWorkflow(workspaceId, workflow);

    // Save connected record for Slack with validly encrypted token
    await saveIntegrationRecord({
      workspaceId,
      provider: "slack",
      status: "connected",
      account: {
        name: "Trendora Slack",
        selectedChannel: "#leads",
      },
      encryptedTokens: { accessTokenCipher: encryptToken("xoxb-live-simulated-token") },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mock fetch: Google Sheets metadata & write succeed, but Slack API returns 'channel_not_found'
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes(":append")) {
        return new Response(JSON.stringify({ updates: { updatedRows: 1, updatedRange: "Tickets!A1:F1" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("sheets.googleapis.com")) {
        return new Response(JSON.stringify({
          sheets: [{ properties: { title: "Tickets" } }]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("slack.com/api/chat.postMessage")) {
        return new Response(JSON.stringify({ ok: false, error: "channel_not_found" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input, init);
    };

    try {
      const result = await executeDryRunTest(workflow, workspaceId);
      assert.equal(result.status, "failed", "Execution must report failed");

      const slackStep = result.stepResults.find((s) => s.action === "slack.send_message");
      assert.equal(slackStep?.status, "failed", "Slack step must report failed");
      assert.ok(slackStep?.errorMessage?.includes("channel_not_found"));
      assert.ok(slackStep?.errorRemediation?.includes("#leads"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Cleanup
  await deleteIntegrationRecord(workspaceId, "google_sheets");
  await deleteIntegrationRecord(workspaceId, "slack");
});
