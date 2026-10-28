import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { catalogRegistry } from "../src/lib/automation/catalog";
import { Workflow } from "../src/types/automation";
import { 
  saveWorkflow, 
  getWorkflowById, 
  updateWorkflowSettings, 
  deleteWorkflow 
} from "../src/lib/automation/workflow-service";
import { 
  executeDryRunTest, 
  activateWorkflow, 
  pauseWorkflow, 
  maskPII 
} from "../src/lib/automation/n8n-client";
import { 
  getWorkflowAnalytics, 
  getWorkflowExecutions, 
  generateWorkflowAnalysisAndSuggestions 
} from "../src/lib/automation/telemetry-service";
import { saveIntegrationRecord } from "../src/lib/automation/storage/integration-store";
import { encryptToken } from "../src/lib/automation/crypto";

async function runFullApplicationTestSuite() {
  console.log("=========================================================");
  console.log("   DIGILO FULL PLATFORM CAPABILITIES TEST SUITE          ");
  console.log("=========================================================\n");

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

  const testWsA = `ws_test_tenant_a_${Date.now()}`;
  const testWsB = `ws_test_tenant_b_${Date.now()}`;

  // ---------------------------------------------------------
  // SECTION 1: GMAIL INTEGRATION & CATALOG EXPANSION
  // ---------------------------------------------------------
  await test("1.1 Gmail integration and gmail.send_email registered in catalog", () => {
    const gmailDef = catalogRegistry.getIntegration("gmail");
    assert.ok(gmailDef, "Gmail integration must exist in catalog");
    assert.equal(gmailDef?.category, "Email & Communication");

    const action = catalogRegistry.getAction("gmail.send_email");
    assert.ok(action, "gmail.send_email action must exist");
    assert.equal(action?.executionAdapter.n8nNodeType, "n8n-nodes-base.gmail");

    // Validate action input schema
    const validConfig = action?.inputSchema?.safeParse({
      to: "client@example.com",
      subject: "Lead Summary",
      body: "High priority lead scored 92.",
    });
    assert.equal(validConfig?.success, true);
  });

  // ---------------------------------------------------------
  // SECTION 2: MULTI-TENANT WORKFLOW PERSISTENCE & SAFE MUTATION
  // ---------------------------------------------------------
  let createdWfId = "";

  await test("2.1 Creates and retrieves workflow scoped strictly to tenant workspace", async () => {
    const sampleWf: Workflow = {
      name: "Enterprise Inbound Pipeline",
      description: "Webhook intake -> AI Lead Intelligence -> Slack Notification",
      status: "draft",
      version: "1.0.0",
      trigger: {
        type: "webhook",
        source: "Website Contact Form",
        event: "lead_submitted",
      },
      steps: [
        {
          id: "step_ai_1",
          name: "AI Lead Intelligence",
          type: "action",
          action: "ai.analyze",
          description: "Computes urgency and summary",
          config: { 
            model: "openai/gpt-oss-20b",
            mockAiOutput: {
              urgencyScore: 90,
              priority: "High",
              service: "Enterprise Inbound",
              nextAction: "Notify sales team",
              summary: "Enterprise inquiry",
              sentiment: "Positive",
            },
          },
        },
        {
          id: "step_slack_1",
          name: "Sales Alert",
          type: "action",
          action: "slack.send_message",
          description: "Posts to sales channel",
          config: { channel: "#sales-leads" },
        },
      ],
      required_integrations: ["webhook", "openai", "slack"],
    };

    const saved = await saveWorkflow(testWsA, sampleWf);
    assert.ok(saved.id, "Saved workflow must have an ID");
    createdWfId = saved.id!;

    // Verify Tenant A can fetch it
    const fetchedA = await getWorkflowById(testWsA, createdWfId);
    assert.ok(fetchedA, "Tenant A must retrieve workflow");
    assert.equal(fetchedA?.name, "Enterprise Inbound Pipeline");

    // Verify Tenant B CANNOT fetch it (Tenant Isolation)
    const fetchedB = await getWorkflowById(testWsB, createdWfId);
    assert.equal(fetchedB, null, "Tenant B must NOT access Tenant A workflow");
  });

  await test("2.2 Saving settings on active workflow creates proposed draft version (v1.1) to protect production", async () => {
    // Manually mark active
    const existing = await getWorkflowById(testWsA, createdWfId);
    assert.ok(existing);
    await saveWorkflow(testWsA, { ...existing!, status: "active", version: "1.0.0" });

    // Client updates settings in canvas drawer
    const updateResult = await updateWorkflowSettings(testWsA, createdWfId, {
      description: "Updated settings with adjusted qualification threshold",
    });

    assert.equal(updateResult.isDraftVersion, true, "Must flag as draft version");
    assert.equal(updateResult.proposedVersion, "1.1.0", "Proposed version must be v1.1.0");
    assert.equal(updateResult.workflow.status, "draft", "Draft version must stay in draft until reviewed & approved");
  });

  // ---------------------------------------------------------
  // SECTION 3: DRY-RUN SANDBOX TESTING & PII REDACTION
  // ---------------------------------------------------------
  await test("3.1 PII redaction masks emails and phone numbers in telemetry", () => {
    const rawEmail = "contact: alex.smith@enterprise.com from Dallas";
    const masked = maskPII(rawEmail);
    assert.equal(masked, "contact: a***@enterprise.com from Dallas");

    const objectPayload = {
      userEmail: "ceo@megacorp.io",
      apiSecret: "super-secret-key",
      normalField: "Public lead message",
    };
    const maskedObj = maskPII(objectPayload) as typeof objectPayload;
    assert.equal(maskedObj.userEmail, "c***@megacorp.io");
    assert.equal(maskedObj.apiSecret, "[SECRET_MASKED]");
    assert.equal(maskedObj.normalField, "Public lead message");
  });

  await test("3.2 Dry-run test executes sandbox trace, reports durations, and logs telemetry", async () => {
    const wf = await getWorkflowById(testWsA, createdWfId);
    assert.ok(wf);

    // Provide mock connection for Slack so test passes all steps
    await saveIntegrationRecord({
      workspaceId: testWsA,
      provider: "slack",
      status: "connected",
      account: { name: "Test Slack Team", selectedChannel: "#sales-leads" },
      encryptedTokens: { accessTokenCipher: encryptToken("xoxb-mock-token") },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const testResult = await executeDryRunTest(wf!, testWsA);

    assert.equal(testResult.status, "success", "Dry-run test should succeed");
    assert.ok(testResult.durationMs > 0, "Total duration must be calculated");
    assert.equal(testResult.stepResults.length, 3, "Trigger + 2 action steps");
    assert.equal(testResult.stepResults[0].action, "webhook");
    assert.equal(testResult.stepResults[1].action, "ai.analyze");
    assert.equal(testResult.stepResults[2].action, "slack.send_message");
    assert.equal(testResult.metricsEffect.leadsIngested, 1);
    assert.equal(testResult.metricsEffect.notificationsDelivered, 1);
  });

  // ---------------------------------------------------------
  // SECTION 4: ACTIVATION GOVERNANCE & PRE-FLIGHT
  // ---------------------------------------------------------
  await test("4.1 Rejects activation if required integrations are missing", async () => {
    const unconfiguredWf: Workflow = {
      name: "Unconfigured Pipeline",
      description: "Needs Google Sheets which is not connected",
      trigger: { type: "webhook", source: "Site", event: "lead" },
      steps: [
        {
          id: "step_sheets",
          name: "Add Row",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append to sheet",
          config: { spreadsheet: "Leads" },
        },
      ],
      required_integrations: ["google_sheets"],
      status: "draft",
    };

    const savedUnconf = await saveWorkflow(testWsA, unconfiguredWf);

    await assert.rejects(
      async () => {
        await activateWorkflow(testWsA, savedUnconf.id!);
      },
      /(?=.*google_sheets)(?=.*not connected)/i,
      "Activation must be blocked when Google Sheets is not connected"
    );
  });

  await test("4.2 Activates workflow when all required integrations are connected", async () => {
    const result = await activateWorkflow(testWsA, createdWfId);
    assert.equal(result.success, true);
    assert.equal(result.workflow.status, "active");
    assert.ok(result.workflow.activatedAt);

    // Pause workflow
    const pauseResult = await pauseWorkflow(testWsA, createdWfId);
    assert.equal(pauseResult.success, true);
    assert.equal(pauseResult.workflow.status, "paused");
  });

  // ---------------------------------------------------------
  // SECTION 5: STRICT SOURCES OF TRUTH IN ANALYTICS
  // ---------------------------------------------------------
  await test("5.1 Workflow with zero runs reports empty state without fabricated numbers", async () => {
    const freshWf: Workflow = {
      name: "Untested Fresh Workflow",
      description: "No executions yet",
      trigger: { type: "webhook", source: "Form", event: "submit" },
      steps: [
        {
          id: "step_ai",
          name: "Score",
          type: "action",
          action: "ai.analyze",
          description: "Score lead",
          config: {},
        },
      ],
      required_integrations: ["webhook", "openai"],
      status: "draft",
    };

    const savedFresh = await saveWorkflow(testWsA, freshWf);
    const analytics = await getWorkflowAnalytics(testWsA, savedFresh.id!, "7d");

    assert.equal(analytics.isEmpty, true, "Empty state flag must be true");
    assert.equal(analytics.totalRuns, 0, "Total runs must be strictly 0");
    assert.equal(analytics.successRate, null, "Success rate must be null (N/A)");
    assert.equal(analytics.leadsIngested, 0);
    assert.equal(analytics.sheetsRowsWritten, 0);
  });

  await test("5.2 Workflow with test runs reports verified counts & paginated execution traces", async () => {
    const analytics = await getWorkflowAnalytics(testWsA, createdWfId, "7d");
    assert.equal(analytics.isEmpty, false);
    assert.ok(analytics.totalRuns >= 1, "Must have recorded test run");
    assert.ok(analytics.avgDurationMs > 0);

    const execLogs = await getWorkflowExecutions(testWsA, createdWfId, 1, 10);
    assert.ok(execLogs.executions.length >= 1);
    assert.equal(execLogs.executions[0].stepResults.length, 3);
  });

  // ---------------------------------------------------------
  // SECTION 6: AI WORKFLOW ANALYSIS & OPTIMIZATION SUGGESTIONS
  // ---------------------------------------------------------
  await test("6.1 Formulates plain-language narrative and evidence-based AI suggestions", async () => {
    const analysis = await generateWorkflowAnalysisAndSuggestions(testWsA, createdWfId);

    assert.ok(analysis.narrativeAnalysis.intakeSummary.includes("Webhook"));
    assert.ok(analysis.narrativeAnalysis.transformationSummary.includes("AI"));
    assert.ok(analysis.narrativeAnalysis.distributionSummary.includes("destination"));
    assert.ok(analysis.narrativeAnalysis.operationalHealth.length > 0);

    assert.ok(analysis.suggestions.length >= 2, "Must generate actionable optimization suggestions");
    const sugPrompt = analysis.suggestions.find((s) => s.id === "sug_prompt_opt");
    assert.ok(sugPrompt, "Must generate prompt token optimization suggestion");
    assert.ok(sugPrompt?.proposedWorkflowPatch?.steps, "Must include patch for proposed draft version");
  });

  // ---------------------------------------------------------
  // SECTION 7: CLEANUP & TEARDOWN
  // ---------------------------------------------------------
  await test("7.1 Deletes workflow safely", async () => {
    const deleted = await deleteWorkflow(testWsA, createdWfId);
    assert.equal(deleted, true);

    const check = await getWorkflowById(testWsA, createdWfId);
    assert.equal(check, null);
  });

  console.log("\n=========================================================");
  console.log(`   FULL PLATFORM SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFullApplicationTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
