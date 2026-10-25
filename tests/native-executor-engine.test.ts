import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Workflow } from "@/types/automation";
import {
  executeWorkflowNative,
  interpolateVariables,
  resolveGoogleSheetsRowValues,
} from "../src/lib/automation/native-executor";
import {
  generateWebhookSecret,
  hashWebhookSecret,
  verifyWebhookSecret,
  checkTenantRateLimit,
  resetTenantRateLimit,
  MAX_WEBHOOK_PAYLOAD_BYTES,
} from "../src/lib/automation/webhook-security";
import {
  activateWorkflow,
  executeDryRunTest,
} from "../src/lib/automation/n8n-client";
import { saveWorkflow, getWorkflowById } from "../src/lib/automation/workflow-service";
import { saveIntegrationRecord } from "../src/lib/automation/storage/integration-store";
import { POST as intakePost } from "../src/app/api/v1/intake/[workspaceId]/[webhookSecret]/route";

test("=== DIGILO NATIVE WORKFLOW EXECUTION & WEBHOOK SECURITY SUITE ===", async () => {
  const workspaceIdA = `ws_nat_tenant_a_${Date.now()}`;
  const workspaceIdB = `ws_nat_tenant_b_${Date.now()}`;

  // Common sample workflow definition
  const baseWorkflow: Workflow = {
    id: `wf_native_${Date.now()}`,
    name: "Enterprise Native Lead Routing",
    description: "Inbound webhook to AI qualification, Sheets log, and Slack alert",
    status: "approved",
    trigger: {
      type: "webhook",
      source: "Inbound Lead Form",
      event: "lead.submitted",
      config: {
        webhookSecret: "whsec_test_secret_1234567890abcdef",
      },
    },
    webhookSecret: "whsec_test_secret_1234567890abcdef",
    steps: [
      {
        id: "step_1",
        name: "AI Lead Intelligence",
        type: "action",
        action: "ai.analyze",
        description: "Analyze lead urgency, priority, and sentiment",
        config: {
          mockAiOutput: {
            urgencyScore: 92,
            priority: "High",
            service: "Enterprise Cloud Migration",
            nextAction: "Schedule high-priority discovery call within 2 hours",
            summary: "Enterprise client requesting multi-region cloud migration with immediate budget.",
            sentiment: "Positive",
          },
        },
      },
      {
        id: "step_2",
        name: "Log to Google Sheets",
        type: "action",
        action: "google_sheets.add_row",
        description: "Log qualified lead into sales spreadsheet",
        config: {
          spreadsheet: "Enterprise Sales Pipeline",
          sheetName: "Leads",
          columns: ["Submission Date", "Name", "Email", "Company", "Priority", "Summary"],
        },
      },
      {
        id: "step_3",
        name: "Dispatch Slack Lead Alert",
        type: "action",
        action: "slack.send_message",
        description: "Notify sales channel on Slack",
        config: {
          channel: "#sales-leads",
        },
      },
    ],
    required_integrations: ["google_sheets", "slack"],
    version: "1.0",
  };

  // Connect mock integrations for Tenant A
  await saveIntegrationRecord({
    workspaceId: workspaceIdA,
    provider: "google_sheets",
    status: "connected",
    account: {
      email: "ops@tenanta.com",
      selectedSpreadsheet: "Enterprise Sales Pipeline",
      selectedSheet: "Leads",
    },
    encryptedTokens: { accessTokenCipher: "mock_sheets_token" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await saveIntegrationRecord({
    workspaceId: workspaceIdA,
    provider: "slack",
    status: "connected",
    account: {
      name: "Slack Workspace: Tenant A Workspace",
      workspaceName: "Tenant A Workspace",
      selectedChannel: "#sales-leads",
    },
    metadata: {
      botUserId: "U_TENANT_A",
    },
    encryptedTokens: { accessTokenCipher: "mock_slack_token" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Save workflow in Workspace A
  await saveWorkflow(workspaceIdA, baseWorkflow);

  // -------------------------------------------------------------------------
  // 1. PHASE 1: NATIVE EXECUTOR TESTS
  // -------------------------------------------------------------------------
  await test("1.1 Successfully executes full sequential pipeline natively with real step traces", async () => {
    const payload = {
      name: "Marcus Aurelius",
      email: "marcus@rome.org",
      company: "Roman Empire Tech",
      leadMessage: "Need high-scale automation for inbound citizen inquiries.",
      budget: "$50,000",
      timeline: "Immediate",
    };

    const report = await executeWorkflowNative(baseWorkflow, workspaceIdA, payload);

    assert.equal(report.status, "success", "Workflow execution should succeed");
    assert.equal(report.stepResults.length, 4, "Should execute 1 trigger step and 3 action steps");
    assert.equal(report.stepResults[0].status, "success", "Trigger step succeeded");
    assert.equal(report.stepResults[1].action, "ai.analyze", "Step 1 is AI analysis");
    assert.equal(report.stepResults[1].status, "success", "Step 1 succeeded");
    assert.equal(report.stepResults[2].action, "google_sheets.add_row", "Step 2 is Google Sheets");
    assert.equal(report.stepResults[2].status, "success", "Step 2 succeeded");
    assert.equal(report.stepResults[3].action, "slack.send_message", "Step 3 is Slack message");
    assert.equal(report.stepResults[3].status, "success", "Step 3 succeeded");

    assert.equal(report.metricsEffect.leadsIngested, 1);
    assert.equal(report.metricsEffect.sheetsRowsWritten, 1);
    assert.equal(report.metricsEffect.notificationsDelivered, 1);
    assert.ok(report.durationMs > 0, "Execution duration must be non-zero");
  });

  await test("1.2 Structured AI Analysis output satisfies schema and handles invalid outputs truthfully", async () => {
    const invalidAiWorkflow: Workflow = {
      ...baseWorkflow,
      id: `wf_ai_fail_${Date.now()}`,
      steps: [
        {
          id: "step_1",
          name: "Faulty AI",
          type: "action",
          action: "ai.analyze",
          description: "Analyze lead",
          config: {
            mockAiOutput: {
              urgencyScore: "invalid_not_number",
              priority: "Critical_Unknown", // Invalid priority enum
            },
          },
        },
        {
          id: "step_2",
          name: "Sheets Log",
          type: "action",
          action: "google_sheets.add_row",
          description: "Log",
        },
      ],
    };

    const report = await executeWorkflowNative(invalidAiWorkflow, workspaceIdA, { name: "Test" });
    assert.equal(report.status, "failed", "Invalid AI output must cause workflow to fail");
    assert.equal(report.stepResults[1].status, "failed", "AI step marked failed");
    assert.equal(report.stepResults[2].status, "skipped", "Subsequent steps must be skipped");
    assert.ok(report.stepResults[1].errorMessage?.includes("validation failed"), "Must report validation failure");
  });

  await test("1.3 Halts pipeline truthfully when Google Sheets is disconnected or unverified", async () => {
    const brokenSheetsWorkflow: Workflow = {
      ...baseWorkflow,
      id: `wf_sheets_fail_${Date.now()}`,
      steps: [
        {
          id: "step_1",
          name: "Sheets Write",
          type: "action",
          action: "google_sheets.add_row",
          description: "Write to non-existent sheet",
          config: {
            spreadsheet: "NonExistentSpreadsheet12345",
            sheetName: "NonExistentTab",
          },
        },
        {
          id: "step_2",
          name: "Slack Alert",
          type: "action",
          action: "slack.send_message",
          description: "Alert",
          config: { channel: "#sales-leads" },
        },
      ],
    };

    const report = await executeWorkflowNative(brokenSheetsWorkflow, workspaceIdA);
    assert.equal(report.status, "failed");
    assert.equal(report.stepResults[1].status, "failed");
    assert.equal(report.stepResults[2].status, "skipped");
    assert.ok(report.stepResults[1].errorMessage?.includes("Google Sheets destination verification failed"));
  });

  await test("1.4 Dynamic Google Sheets column mapping supports custom arrays, comma strings, and dictionaries", async () => {
    const context = {
      trigger: {
        name: "Ada Lovelace",
        email: "ada@computing.org",
        company: "Babbage Engines",
        budget: "$100,000",
      },
      ai: {
        priority: "High",
        urgencyScore: 99,
        summary: "Inquiry regarding mechanical computation engine.",
      },
    };

    // 1. Array of column names
    const arrayResult = resolveGoogleSheetsRowValues(
      { columns: ["Name", "Email", "Company", "Priority", "Urgency"] },
      context
    );
    assert.deepEqual(arrayResult.columns, ["Name", "Email", "Company", "Priority", "Urgency"]);
    assert.equal(arrayResult.rowValues[0], "Ada Lovelace");
    assert.equal(arrayResult.rowValues[1], "ada@computing.org");
    assert.equal(arrayResult.rowValues[2], "Babbage Engines");
    assert.equal(arrayResult.rowValues[3], "High");
    assert.equal(arrayResult.rowValues[4], 99);

    // 2. Comma-separated columns string
    const stringResult = resolveGoogleSheetsRowValues(
      { columns: "Email, Name, Priority" },
      context
    );
    assert.deepEqual(stringResult.columns, ["Email", "Name", "Priority"]);
    assert.equal(stringResult.rowValues[0], "ada@computing.org");
    assert.equal(stringResult.rowValues[1], "Ada Lovelace");
    assert.equal(stringResult.rowValues[2], "High");

    // 3. Explicit dictionary mappings: { "Header": "{{trigger.field}}" }
    const dictResult = resolveGoogleSheetsRowValues(
      {
        mappings: {
          "Client Contact": "{{trigger.name}} <{{trigger.email}}>",
          "Organization": "{{trigger.company}}",
          "AI Assessment": "[{{ai.priority}}] {{ai.summary}}",
        },
      },
      context
    );
    assert.equal(dictResult.rowValues[0], "Ada Lovelace <ada@computing.org>");
    assert.equal(dictResult.rowValues[1], "Babbage Engines");
    assert.equal(dictResult.rowValues[2], "[High] Inquiry regarding mechanical computation engine.");
  });

  await test("1.5 Safe variable interpolation handles nested paths, aliases, and reports unresolved variables", async () => {
    const context = {
      trigger: {
        name: "Alan Turing",
        email: "alan@bletchley.gov",
        company: "Bletchley Park",
      },
      ai: {
        priority: "High",
        summary: "Enigma intelligence request.",
      },
      step_1: {
        score: 95,
      },
    };

    const template = "Alert: {{trigger.name}} ({{trigger.company}}) - Priority: {{priority}} - Score: {{step_1.score}}";
    const res = interpolateVariables(template, context);
    assert.equal(res.text, "Alert: Alan Turing (Bletchley Park) - Priority: High - Score: 95");
    assert.equal(res.unresolvedVariables.length, 0);

    // Unresolved required variable detection
    const missingTemplate = "User: {{trigger.name}}, Missing: {{trigger.nonexistentField}}";
    const missingRes = interpolateVariables(missingTemplate, context, ["trigger.nonexistentField"]);
    assert.equal(missingRes.unresolvedVariables.length, 1);
    assert.equal(missingRes.unresolvedVariables[0], "trigger.nonexistentField");
  });

  await test("1.6 Rejects unknown or unsupported actions", async () => {
    const unknownActionWorkflow: Workflow = {
      ...baseWorkflow,
      id: `wf_unknown_${Date.now()}`,
      steps: [
        {
          id: "step_1",
          name: "Invalid Step",
          type: "action",
          action: "crypto.mine_bitcoin",
          description: "Unsupported action",
        },
      ],
    };

    const report = await executeWorkflowNative(unknownActionWorkflow, workspaceIdA);
    assert.equal(report.status, "failed");
    assert.equal(report.stepResults[1].status, "failed");
    assert.ok(report.stepResults[1].errorMessage?.includes("Unsupported action 'crypto.mine_bitcoin'"));
  });

  // -------------------------------------------------------------------------
  // 2. PHASE 2: WEBHOOK SECURITY & INTAKE GATEWAY TESTS
  // -------------------------------------------------------------------------
  await test("2.1 Timing-safe secret verification verifies valid secret and rejects invalid secrets", async () => {
    const secret = generateWebhookSecret();
    assert.ok(secret.startsWith("whsec_"));

    // Exact match
    assert.equal(verifyWebhookSecret(secret, secret), true);

    // Hash match
    const hashed = hashWebhookSecret(secret);
    assert.equal(verifyWebhookSecret(secret, hashed), true);

    // Rejects invalid secret
    assert.equal(verifyWebhookSecret("whsec_wrong_secret", secret), false);
    assert.equal(verifyWebhookSecret("", secret), false);
    assert.equal(verifyWebhookSecret("   ", secret), false);
  });

  await test("2.2 Intake endpoint rejects requests exceeding 1 MB limit (413 Payload Too Large)", async () => {
    // Generate an oversized payload > 1MB
    const largeString = "X".repeat(MAX_WEBHOOK_PAYLOAD_BYTES + 2048);
    const mockReq = new Request("http://localhost:3000/api/v1/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(largeString, "utf-8")),
      },
      body: JSON.stringify({ name: "Overflow", message: largeString }),
    });

    const response = await intakePost(mockReq, {
      params: Promise.resolve({
        workspaceId: workspaceIdA,
        webhookSecret: "whsec_test_secret_1234567890abcdef",
      }),
    });

    assert.equal(response.status, 413, "Should return HTTP 413 for payload > 1MB");
    const json = await response.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes("Payload too large"));
  });

  await test("2.3 Intake endpoint enforces workspace rate limiting (429 Too Many Requests)", async () => {
    const rateLimitWorkspace = `ws_ratelimit_${Date.now()}`;
    resetTenantRateLimit(rateLimitWorkspace);

    // Max 5 requests in a short test
    for (let i = 0; i < 5; i++) {
      const rl = checkTenantRateLimit(rateLimitWorkspace, 5, 60000);
      assert.equal(rl.allowed, true, `Request ${i + 1} should be allowed`);
    }

    // 6th request must exceed limit
    const exceeded = checkTenantRateLimit(rateLimitWorkspace, 5, 60000);
    assert.equal(exceeded.allowed, false, "Request 6 should be blocked by rate limit");
    assert.equal(exceeded.remaining, 0);
    assert.ok(exceeded.resetMs > 0);

    // Another workspace should not be affected (tenant isolation)
    const independentWorkspace = `ws_other_${Date.now()}`;
    const otherRl = checkTenantRateLimit(independentWorkspace, 5, 60000);
    assert.equal(otherRl.allowed, true, "Independent workspace must not be throttled");

    // Clean up
    resetTenantRateLimit(rateLimitWorkspace);
    resetTenantRateLimit(independentWorkspace);
  });

  await test("2.4 Intake endpoint returns 401 Unauthorized for incorrect webhook secret without leaking secrets", async () => {
    const activeWf: Workflow = {
      ...baseWorkflow,
      id: `wf_active_sec_${Date.now()}`,
      status: "active",
      webhookSecret: "whsec_test_secret_1234567890abcdef",
    };
    await saveWorkflow(workspaceIdA, activeWf);

    const mockReq = new Request("http://localhost:3000/api/v1/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Attacker",
        email: "attacker@bad.org",
      }),
    });

    const response = await intakePost(mockReq, {
      params: Promise.resolve({
        workspaceId: workspaceIdA,
        webhookSecret: "whsec_attacker_fake_secret",
      }),
    });

    assert.equal(response.status, 401, "Should reject with 401 Unauthorized");
    const json = await response.json();
    assert.equal(json.success, false);
    assert.equal(json.error, "Unauthorized: Invalid webhook secret for this workspace.");
    assert.equal(json.webhookSecret, undefined, "Must NEVER expose real secret");
  });

  await test("2.5 Intake endpoint safely ignores duplicate submissions with same idempotency key", async () => {
    // Activate workflow for workspaceIdA first
    const activeWorkflow: Workflow = {
      ...baseWorkflow,
      id: `wf_active_idemp_${Date.now()}`,
      status: "active",
    };
    await saveWorkflow(workspaceIdA, activeWorkflow);

    // Initial submission
    const idempotencyKey = `idemp_${Date.now()}_abc`;
    const payload = {
      name: "Galileo Galilei",
      email: "galileo@telescope.org",
      company: "Pisa Physics",
      leadMessage: "Inquiry on gravitational acceleration.",
    };

    const firstReq = new Request("http://localhost:3000/api/v1/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const firstRes = await intakePost(firstReq, {
      params: Promise.resolve({
        workspaceId: workspaceIdA,
        webhookSecret: activeWorkflow.webhookSecret as string,
      }),
    });

    assert.equal(firstRes.status, 200);
    const firstJson = await firstRes.json();
    assert.equal(firstJson.success, true);
    assert.equal(firstJson.executionStatus, "success");

    // Second submission with exact same idempotency key
    const secondReq = new Request("http://localhost:3000/api/v1/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const secondRes = await intakePost(secondReq, {
      params: Promise.resolve({
        workspaceId: workspaceIdA,
        webhookSecret: activeWorkflow.webhookSecret as string,
      }),
    });

    assert.equal(secondRes.status, 200);
    const secondJson = await secondRes.json();
    assert.equal(secondJson.success, true);
    assert.equal(secondJson.isDuplicate, true, "Must flag as duplicate without re-executing steps");
    assert.equal(secondJson.executionId, firstJson.executionId, "Must return original execution ID");
  });

  // -------------------------------------------------------------------------
  // 3. PHASE 3: WORKFLOW ACTIVATION & TENANT ISOLATION
  // -------------------------------------------------------------------------
  await test("3.1 Cross-tenant access is strictly blocked across workflows and endpoints", async () => {
    // Attempting to read Workspace A's workflow from Workspace B returns null
    const crossAccess = await getWorkflowById(workspaceIdB, baseWorkflow.id as string);
    assert.equal(crossAccess, null, "Workspace B must not access Workspace A's workflow");

    // Intake submission to Workspace B using Workspace A's webhook secret fails with SETUP_REQUIRED
    const mockReq = new Request("http://localhost:3000/api/v1/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Cross Test", email: "cross@test.com" }),
    });

    const res = await intakePost(mockReq, {
      params: Promise.resolve({
        workspaceId: workspaceIdB,
        webhookSecret: baseWorkflow.webhookSecret as string,
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.status, "setup_required", "Workspace B has no active workflow");
  });

  await test("3.2 Workflow activation validates integrations, requires test run, and generates webhook secret", async () => {
    const unactivatedWf: Workflow = {
      ...baseWorkflow,
      id: `wf_to_activate_${Date.now()}`,
      status: "approved",
      webhookSecret: undefined,
      trigger: {
        type: "webhook",
        source: "Inbound Lead Form",
        event: "lead.submitted",
      },
    };
    await saveWorkflow(workspaceIdA, unactivatedWf);

    // 1. Activation fails if no successful test run has been performed
    await assert.rejects(
      async () => {
        await activateWorkflow(workspaceIdA, unactivatedWf.id as string);
      },
      /successful test run is required before live activation/
    );

    // 2. Perform test run via executeDryRunTest (which delegates to executeWorkflowNative)
    const testResult = await executeDryRunTest(unactivatedWf, workspaceIdA);
    assert.equal(testResult.status, "success", "Test execution must succeed");

    // 3. Now activate the workflow
    const activation = await activateWorkflow(workspaceIdA, unactivatedWf.id as string);
    assert.equal(activation.success, true);
    assert.equal(activation.workflow.status, "active");
    assert.ok(activation.workflow.webhookSecret, "Must generate and persist webhookSecret");
    assert.ok(activation.workflow.webhookSecret?.startsWith("whsec_"));
    assert.ok(activation.message.includes("Digilo Native Engine"), "Must indicate native activation without requiring remote n8n");
  });
});
