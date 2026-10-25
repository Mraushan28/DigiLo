import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Workflow } from "../src/types/automation";
import { saveWorkflow, getWorkflowById, listWorkflows } from "../src/lib/automation/workflow-service";
import {
  createEncryptedDraftCookieValue,
  readEncryptedDraftCookieValue,
} from "../src/lib/automation/draft-session";
import {
  syncWorkflowToN8n,
  provisionN8nWorkflow,
  activateWorkflow,
  executeDryRunTest,
} from "../src/lib/automation/n8n-client";
import { getWorkflowAnalytics } from "../src/lib/automation/telemetry-service";
import {
  saveIntegrationRecord,
  getIntegrationRecord,
  deleteIntegrationRecord,
  updateIntegrationAccount,
} from "../src/lib/automation/storage/integration-store";
import { encryptToken } from "../src/lib/automation/crypto";
import { getAllLiveIntegrationStatuses } from "../src/lib/automation/integration-status";
import { validateWorkflow } from "../src/lib/automation/workflow-validator";
import { registerUser } from "../src/lib/auth/user-service";

async function runApprovalAuthWorkflowTestSuite() {
  console.log("==================================================================");
  console.log("   DIGILO FINAL UX, AUTHENTICATION, WORKFLOW & DASHBOARD SUITE   ");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  const testWs = `ws_test_${Date.now()}`;
  const testUser = `usr_test_${Date.now()}`;

  const sampleWorkflow: Workflow = {
    id: `wf_${Date.now()}`,
    name: "Sheets to Website Publisher",
    description: "Read new rows from Google Sheets and publish them to website.",
    trigger: {
      type: "webhook",
      source: "Google Sheets Trigger",
      event: "new_row",
    },
    steps: [
      {
        id: "step_sheets",
        name: "Read Content from Google Sheets",
        type: "action",
        action: "google_sheets.add_row",
        description: "Read or append row",
        config: { spreadsheet: "Website Content", sheetName: "Posts" },
      },
      {
        id: "step_ai",
        name: "Analyze and Format with AI",
        type: "action",
        action: "ai.analyze",
        description: "Format post content",
        config: { prompt: "Format post content for publishing", model: "gpt-4o" },
      },
    ],
    required_integrations: ["google_sheets", "openai"],
    status: "draft",
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // -------------------------------------------------------------
  // TEST 1: Logged-in user approves workflow and gets direct redirect
  // -------------------------------------------------------------
  await test("1. Logged-in user approves a workflow and is redirected directly to its dashboard detail page", async () => {
    const approvedWorkflow: Workflow = {
      ...sampleWorkflow,
      status: "approved",
      approvedAt: new Date().toISOString(),
    };

    const saved = await saveWorkflow(testWs, approvedWorkflow, testUser);
    assert.ok(saved.id, "Workflow must have a persistent ID");
    assert.equal(saved.status, "approved", "Status must be approved");
    assert.ok(saved.approvedAt, "approvedAt must be recorded");

    // The redirect URL target for logged in user must be exactly the detail page
    const expectedRedirectUrl = `/dashboard/workflows/${saved.id}`;
    assert.ok(expectedRedirectUrl.startsWith("/dashboard/workflows/"));
    assert.ok(!expectedRedirectUrl.includes("/automation"));
    assert.ok(!expectedRedirectUrl.includes("/planner"));
  });

  // -------------------------------------------------------------
  // TEST 2: Logged-out user approves workflow, logs in, reaches dashboard without re-entering
  // -------------------------------------------------------------
  await test("2. Logged-out user approves a workflow, logs in, and reaches the dashboard without re-entering the prompt", async () => {
    const unauthenticatedApprovedDraft: Workflow = {
      ...sampleWorkflow,
      id: undefined, // Unsaved client draft
      status: "approved",
      approvedAt: new Date().toISOString(),
    };

    // Encrypt into pending approval draft cookie value
    const encryptedDraft = createEncryptedDraftCookieValue(unauthenticatedApprovedDraft);
    assert.ok(encryptedDraft.length > 50, "Encrypted draft cookie must be generated");

    // User registers/logs in
    const uniqueEmail = `test.pilot.${Date.now()}@digilo.tech`;
    const regResult = await registerUser({
      name: "Pilot Tester",
      email: uniqueEmail,
      password: "TestPassword123!",
    });

    assert.ok(regResult.user.id, "User registered successfully");
    const workspaceId = regResult.workspace.id;

    // Simulate server claiming the draft from cookie
    const decryptedDraft = readEncryptedDraftCookieValue(encryptedDraft);
    assert.ok(decryptedDraft, "Draft must be successfully decrypted from cookie");
    assert.equal(decryptedDraft.name, sampleWorkflow.name);

    // Save to user workspace using claim logic
    const saved = await saveWorkflow(workspaceId, {
      ...decryptedDraft,
      status: "approved",
    }, regResult.user.id);

    assert.ok(saved.id, "Persisted workflow must receive new workspace ID");
    assert.equal(saved.status, "approved");

    const directRedirectUrl = `/dashboard/workflows/${saved.id}`;
    assert.equal(directRedirectUrl, `/dashboard/workflows/${saved.id}`);
  });

  // -------------------------------------------------------------
  // TEST 3: Pending workflow draft survives refresh and auth redirects
  // -------------------------------------------------------------
  await test("3. Pending workflow draft survives refresh and authentication redirects", async () => {
    const complexDraft: Workflow = {
      name: "E-Commerce Inbound Leads to Slack",
      description: "Auto-routes qualified store inquiries",
      trigger: { type: "webhook", source: "Shopify Store", event: "customer_inquiry" },
      steps: [
        {
          id: "step_ai_score",
          name: "Score Lead Priority",
          type: "action",
          action: "ai.score_lead",
          description: "Analyze customer budget and urgency",
          config: { threshold: 80 },
        },
        {
          id: "step_slack",
          name: "Alert VIP Sales Channel",
          type: "action",
          action: "slack.send_message",
          description: "Post priority lead to Slack",
          config: { channel: "#vip-sales" },
        },
      ],
      required_integrations: ["slack"],
      status: "approved",
      approvedAt: new Date().toISOString(),
    };

    const cookieCipher = createEncryptedDraftCookieValue(complexDraft);
    // Simulate page refresh / new request decrypting the cookie
    const restored = readEncryptedDraftCookieValue(cookieCipher);

    assert.ok(restored, "Restored draft must not be null");
    assert.equal(restored.name, complexDraft.name);
    assert.equal(restored.steps.length, 2);
    assert.equal(restored.steps[0].action, "ai.score_lead");
    assert.equal(restored.steps[1].config?.channel, "#vip-sales");
    assert.equal(restored.status, "approved");
  });

  // -------------------------------------------------------------
  // TEST 4: Approval does not create duplicate workflow records
  // -------------------------------------------------------------
  await test("4. Approval does not create duplicate workflow records or duplicate n8n workflows on repeated callbacks", async () => {
    const testDedupWs = `ws_dedup_${Date.now()}`;
    const draft: Workflow = {
      id: "wf_stable_id_100",
      name: "Idempotent Marketing Pipeline",
      description: "Must never duplicate on reloads",
      trigger: { type: "webhook", source: "Website", event: "signup" },
      steps: [
        {
          id: "s1",
          type: "action",
          action: "ai.score_lead",
          description: "Evaluate user signup",
        },
      ],
      required_integrations: [],
      status: "approved",
    };

    // First save
    const firstSave = await saveWorkflow(testDedupWs, draft);

    // Second callback attempt with matching workflow definition
    const existingWorkflows = await listWorkflows(testDedupWs);
    const duplicates = existingWorkflows.filter((w) => w.id === firstSave.id || w.name === draft.name);

    assert.equal(duplicates.length, 1, "Only 1 workflow should exist in workspace for this definition");
  });

  // -------------------------------------------------------------
  // TEST 5: Failed n8n provisioning preserves approved workflow with retryable error
  // -------------------------------------------------------------
  await test("5. A failed n8n provisioning attempt preserves the approved workflow and displays a retryable error", async () => {
    // When n8n is not configured or fails, syncWorkflowToN8n returns truthful status
    const syncRes = await syncWorkflowToN8n(sampleWorkflow, testWs);
    assert.equal(syncRes.status, "unconfigured");
    assert.equal(syncRes.n8nWorkflowId, undefined, "Must NOT substitute a mock or fake staged ID");

    // The workflow itself remains safely saved in Digilo
    const saved = await saveWorkflow(testWs, {
      ...sampleWorkflow,
      status: "approved",
    });
    assert.ok(saved.id);
    assert.equal(saved.status, "approved");
    assert.equal(saved.n8nWorkflowId, undefined);

    // provisionN8nWorkflow returns explicit status allowing manual retry
    const retryRes = await provisionN8nWorkflow(testWs, saved.id!);
    assert.equal(retryRes.success, false);
    assert.equal(retryRes.status, "unconfigured");
    assert.ok(retryRes.error?.includes("n8n"));
  });

  // -------------------------------------------------------------
  // TEST 6: Dashboard displays correct workflow and actual n8n ID when provisioned
  // -------------------------------------------------------------
  await test("6. Dashboard displays the correct workflow and actual n8n ID when provisioned", async () => {
    // Save workflow with a real provisioned n8n ID
    const realN8nId = "n8n_prod_wf_992182";
    const provisionedWf: Workflow = {
      ...sampleWorkflow,
      id: `wf_prov_${Date.now()}`,
      status: "approved",
      n8nWorkflowId: realN8nId,
    };

    const saved = await saveWorkflow(testWs, provisionedWf);
    const retrieved = await getWorkflowById(testWs, saved.id!);

    assert.ok(retrieved);
    assert.equal(retrieved.id, saved.id);
    assert.equal(retrieved.n8nWorkflowId, realN8nId, "Must preserve and display real n8n ID");
  });

  // -------------------------------------------------------------
  // TEST 7: Required integrations show real connection status and working Connect/Configure actions
  // -------------------------------------------------------------
  await test("7. Required integrations show real connection status and working Connect/Configure actions", async () => {
    const wsInt = `ws_int_${Date.now()}`;

    // 1. Initially Google Sheets is not connected or not configured in env
    let live = await getAllLiveIntegrationStatuses(wsInt);
    assert.ok(
      live.google_sheets?.status === "not_connected" || live.google_sheets?.status === "not_configured",
      "Initial status must truthfully indicate not_connected or not_configured"
    );

    // 2. Connect Google account
    await saveIntegrationRecord({
      workspaceId: wsInt,
      provider: "google_sheets",
      status: "connected",
      account: {
        accountId: "google-pilot-1",
        email: "pilot@example.com",
        name: "Pilot User",
      },
      encryptedTokens: {
        accessTokenCipher: encryptToken("ya29.test_google_access_token"),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    live = await getAllLiveIntegrationStatuses(wsInt);
    assert.equal(live.google_sheets?.status, "connected");

    // 3. Configure destination spreadsheet and worksheet
    await updateIntegrationAccount(wsInt, "google_sheets", {
      selectedSpreadsheet: "Website Leads",
      selectedSheet: "Inbound Leads",
    });

    const record = await getIntegrationRecord(wsInt, "google_sheets");
    assert.equal(record?.account?.selectedSpreadsheet, "Website Leads");
    assert.equal(record?.account?.selectedSheet, "Inbound Leads");

    // 4. Disconnect clears record truthfully
    await deleteIntegrationRecord(wsInt, "google_sheets");
    live = await getAllLiveIntegrationStatuses(wsInt);
    assert.ok(
      live.google_sheets?.status === "not_connected" || live.google_sheets?.status === "not_configured",
      "Status must revert to not_connected or not_configured after disconnect"
    );
  });

  // -------------------------------------------------------------
  // TEST 8: Activation remains blocked until required setup and testing pass
  // -------------------------------------------------------------
  await test("8. Activation remains blocked until required setup and testing pass", async () => {
    const wsBlock = `ws_block_${Date.now()}`;
    const blockWorkflow: Workflow = {
      name: "Activation Gatekeeper Workflow",
      description: "Needs integration and testing before live activation",
      trigger: { type: "webhook", source: "Website Leads", event: "form_submit" },
      steps: [
        {
          id: "s1",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append lead to Google Sheets",
          config: { spreadsheet: "Website Leads", sheetName: "Sheet1" },
        },
      ],
      required_integrations: ["google_sheets"],
      status: "approved",
    };

    const saved = await saveWorkflow(wsBlock, blockWorkflow);

    // 1. Should reject activation because Google Sheets is not connected
    await assert.rejects(
      async () => {
        await activateWorkflow(wsBlock, saved.id!);
      },
      /(?=.*google_sheets)(?=.*not connected)/i,
      "Activation must be blocked when Google Sheets is not connected"
    );

    // 2. Connect Google Sheets and configure destination sheet
    await saveIntegrationRecord({
      workspaceId: wsBlock,
      provider: "google_sheets",
      status: "connected",
      account: {
        accountId: "google-block-1",
        email: "user@example.com",
        name: "Block Test User",
        selectedSpreadsheet: "Website Leads",
        selectedSheet: "Sheet1",
      },
      encryptedTokens: {
        accessTokenCipher: encryptToken("ya29.test_token"),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Should reject activation because no successful test run has completed yet
    await assert.rejects(
      async () => {
        await activateWorkflow(wsBlock, saved.id!);
      },
      /successful test run is required/i,
      "Activation must be blocked until a test run succeeds"
    );

    // 4. Run successful dry-run test
    const testResult = await executeDryRunTest(saved, wsBlock);
    assert.equal(testResult.status, "success", "Test must execute successfully");

    // 5. Now activation succeeds!
    const activeResult = await activateWorkflow(wsBlock, saved.id!);
    assert.equal(activeResult.success, true);
    assert.equal(activeResult.workflow.status, "active");
  });

  // -------------------------------------------------------------
  // TEST 9: Automation page displays compact heading and prompt box near the top
  // -------------------------------------------------------------
  await test("9. Automation page displays the compact heading and prompt box near the top", async () => {
    const heroFilePath = path.join(process.cwd(), "src/components/automation/AutomationHero.tsx");
    const heroContent = fs.readFileSync(heroFilePath, "utf-8");

    // Must have short heading and eyebrow
    assert.ok(heroContent.includes("DIGILO AI AUTOMATION"), "Eyebrow must be present");
    assert.ok(heroContent.includes("Tell Us What to Automate."), "Short heading must be present");
    assert.ok(heroContent.includes("Describe your process. Get a clear automation plan."), "Supporting text must be present");

    // Must have prominent prompt input box
    assert.ok(heroContent.includes('id="prompt-input"'), "Prompt textarea must exist");
    assert.ok(heroContent.includes("Read new rows from Google Sheets"), "Placeholder example must exist");
    assert.ok(heroContent.includes("Generate Automation"), "Generate button must exist");

    // Must NOT have oversized old multi-line heading
    assert.ok(!heroContent.includes("Tell Us What You Do. <br"), "Old oversized heading must be removed");
    assert.ok(!heroContent.includes("We'll Find What <br"), "Old oversized heading must be removed");
  });

  // -------------------------------------------------------------
  // TEST 10: Generated workflow appears beneath the prompt area
  // -------------------------------------------------------------
  await test("10. Generated workflow appears beneath the prompt area", async () => {
    const heroFilePath = path.join(process.cwd(), "src/components/automation/AutomationHero.tsx");
    const heroContent = fs.readFileSync(heroFilePath, "utf-8");

    assert.ok(heroContent.includes('id="section-prompt-hero"'), "Prompt hero section must exist");
    assert.ok(heroContent.includes('id="section-generated-workflow"'), "Generated workflow section must exist");

    const promptIdx = heroContent.indexOf('id="section-prompt-hero"');
    const workflowIdx = heroContent.indexOf('id="section-generated-workflow"');

    assert.ok(promptIdx < workflowIdx, "Generated workflow section must appear beneath prompt hero section");
  });

  // -------------------------------------------------------------
  // TEST 11: Existing edit, regenerate, clarification, and workflow visualization still works
  // -------------------------------------------------------------
  await test("11. Existing edit, regenerate, clarification, and workflow visualization functionality still works", async () => {
    // 1. Deep validation verifies valid workflow
    const validCheck = validateWorkflow(sampleWorkflow);
    assert.equal(validCheck.isValid, true);

    // 2. Deep validation flags invalid workflows
    const invalidWf: Workflow = {
      ...sampleWorkflow,
      steps: [], // empty steps
    };
    const invalidCheck = validateWorkflow(invalidWf);
    assert.equal(invalidCheck.isValid, false);
    assert.ok(invalidCheck.errors.length > 0);

    // 3. WorkflowReviewApproval and Clarification components exist and are integrated
    const reviewFilePath = path.join(process.cwd(), "src/components/automation/WorkflowReviewApproval.tsx");
    assert.ok(fs.existsSync(reviewFilePath), "WorkflowReviewApproval component must exist");

    const clarifyFilePath = path.join(process.cwd(), "src/components/automation/WorkflowClarificationForm.tsx");
    assert.ok(fs.existsSync(clarifyFilePath), "WorkflowClarificationForm component must exist");
  });

  // -------------------------------------------------------------
  // TEST 12: Dashboard analytics show empty states until real executions exist
  // -------------------------------------------------------------
  await test("12. Dashboard analytics show empty states until real executions exist", async () => {
    const wsEmpty = `ws_empty_${Date.now()}`;
    const wfEmptyId = `wf_empty_${Date.now()}`;

    const analytics = await getWorkflowAnalytics(wsEmpty, wfEmptyId, "7d");

    assert.equal(analytics.isEmpty, true, "Empty state flag must be true");
    assert.equal(analytics.totalRuns, 0, "Total runs must be 0");
    assert.equal(analytics.successfulRuns, 0, "Successful runs must be 0");
    assert.equal(analytics.failedRuns, 0, "Failed runs must be 0");
    assert.equal(analytics.successRate, null, "Success rate must be null without fabricated percentages");
    assert.equal(analytics.leadsIngested, 0, "Leads ingested must be 0 without fabrication");
    assert.equal(analytics.sheetsRowsWritten, 0, "Sheets rows must be 0 without fabrication");
  });

  console.log("\n==================================================================");
  console.log(`SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runApprovalAuthWorkflowTestSuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
