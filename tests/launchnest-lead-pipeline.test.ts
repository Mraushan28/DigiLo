import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import {
  LAUNCHNEST_WORKFLOW_DEFINITION,
  formatSlackPriorityHeading,
  buildSlackLeadNotificationMessage,
  renderSlackMessageWithConditions,
  verifyGoogleSheetsDestination,
  resolveIdempotencyKey,
  executeWithRetry,
  isTransientError,
  RetryExhaustedError,
  processLaunchNestLeadPipeline,
  validateAiLeadOutput,
  memoryIdempotencyStore,
} from "../src/lib/automation/lead-processing";
import { activateWorkflow } from "../src/lib/automation/n8n-client";
import { saveIntegrationRecord, deleteIntegrationRecord } from "../src/lib/automation/storage/integration-store";
import { saveWorkflow } from "../src/lib/automation/workflow-service";
import { validateWorkflow } from "../src/lib/automation/workflow-validator";
import { slackIntegration } from "../src/lib/automation/catalog/integrations/slack";
import { googleSheetsIntegration } from "../src/lib/automation/catalog/integrations/google-sheets";
import { validateN8nExportCompatibility } from "../src/lib/automation/n8n-exporter";

test("=== LAUNCHNEST LEAD INTAKE & PROCESSING VERIFICATION SUITE ===", async () => {
  const workspaceId = `ws_launchnest_test_${Date.now()}`;

  // -------------------------------------------------------------------------
  // 1. DYNAMIC SLACK PRIORITY HEADINGS & ENUM VALIDATION
  // -------------------------------------------------------------------------
  await test("1.1 High priority lead generates 🚨 HIGH PRIORITY LEAD heading", () => {
    const res = formatSlackPriorityHeading("High");
    assert.equal(res.isValid, true);
    assert.equal(res.priority, "High");
    assert.equal(res.heading, "🚨 HIGH PRIORITY LEAD");
  });

  await test("1.2 Medium priority lead generates 🟡 MEDIUM PRIORITY LEAD heading", () => {
    const res = formatSlackPriorityHeading("Medium");
    assert.equal(res.isValid, true);
    assert.equal(res.priority, "Medium");
    assert.equal(res.heading, "🟡 MEDIUM PRIORITY LEAD");
  });

  await test("1.3 Low priority lead generates 🟢 LOW PRIORITY LEAD heading", () => {
    const res = formatSlackPriorityHeading("Low");
    assert.equal(res.isValid, true);
    assert.equal(res.priority, "Low");
    assert.equal(res.heading, "🟢 LOW PRIORITY LEAD");
  });

  await test("1.4 Case-insensitive normalization handles 'high', 'medium', 'low'", () => {
    assert.equal(formatSlackPriorityHeading("high").heading, "🚨 HIGH PRIORITY LEAD");
    assert.equal(formatSlackPriorityHeading("medium").heading, "🟡 MEDIUM PRIORITY LEAD");
    assert.equal(formatSlackPriorityHeading("low").heading, "🟢 LOW PRIORITY LEAD");
  });

  await test("1.5 Invalid priority enum values are rejected and never default to High", () => {
    const invalidValues = ["Urgent", "Critical", "Unknown", "invalid_enum", "", null, undefined];
    for (const val of invalidValues) {
      const res = formatSlackPriorityHeading(val);
      assert.equal(res.isValid, false, `Priority '${val}' must not be marked valid`);
      assert.notEqual(res.heading, "🚨 HIGH PRIORITY LEAD", `Invalid '${val}' must NEVER label as High priority`);
    }
  });

  await test("1.6 buildSlackLeadNotificationMessage includes conditional heading and lead fields", () => {
    const lead = {
      name: "Marcus Vance",
      email: "marcus@enterprise.com",
      company: "Vance Technologies",
      budget: "$15,000",
      timeline: "Next month",
      notes: "Seeking automated CRM intake",
    };

    // Test Medium Priority message
    const mediumMsg = buildSlackLeadNotificationMessage(lead, {
      urgencyScore: 65,
      priority: "Medium",
      summary: "Mid-market lead with moderate budget.",
    });
    assert.ok(mediumMsg.text.includes("🟡 MEDIUM PRIORITY LEAD"));
    assert.ok(mediumMsg.text.includes("Marcus Vance"));
    assert.ok(mediumMsg.text.includes("Vance Technologies"));
    assert.ok(mediumMsg.text.includes("65/100"));

    // Test Low Priority message
    const lowMsg = buildSlackLeadNotificationMessage(lead, {
      urgencyScore: 25,
      priority: "Low",
      summary: "Informational student inquiry.",
    });
    assert.ok(lowMsg.text.includes("🟢 LOW PRIORITY LEAD"));
    assert.ok(!lowMsg.text.includes("🚨 HIGH PRIORITY LEAD"));
  });

  // -------------------------------------------------------------------------
  // 2. GOOGLE SHEETS DESTINATION VERIFICATION ('LaunchNest Leads CRM' -> 'Leads')
  // -------------------------------------------------------------------------
  await test("2.1 Proposed LaunchNest plan targets 'Leads' worksheet (not 'Sheet1')", () => {
    const sheetsStep = LAUNCHNEST_WORKFLOW_DEFINITION.steps.find((s) => s.action === "google_sheets.add_row");
    assert.ok(sheetsStep, "Google Sheets step must exist");
    assert.equal(sheetsStep?.config?.spreadsheet, "LaunchNest Leads CRM");
    assert.equal(sheetsStep?.config?.sheetName, "Leads", "Target worksheet must be 'Leads'");
    assert.notEqual(sheetsStep?.config?.sheetName, "Sheet1", "Must not use 'Sheet1'");
  });

  await test("2.2 Returns auth_required when Google Sheets is not connected", async () => {
    const check = await verifyGoogleSheetsDestination(workspaceId, "LaunchNest Leads CRM", "Leads");
    assert.equal(check.verified, false);
    assert.equal(check.errorCode, "AUTH_REQUIRED");
  });

  await test("2.3 Returns setup_required when spreadsheet or worksheet tab does not exist", async () => {
    // Connect Google Sheets in test store
    await saveIntegrationRecord({
      workspaceId,
      provider: "google_sheets",
      status: "connected",
      account: { email: "admin@launchnest.com" },
      encryptedTokens: { accessTokenCipher: "test_cipher" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Provide accessible sheet list that only has "Sheet1" and "Archive", missing "Leads"
    const check = await verifyGoogleSheetsDestination(
      workspaceId,
      "LaunchNest Leads CRM",
      "Leads",
      ["Sheet1", "Archive"] // "Leads" is missing!
    );

    assert.equal(check.verified, false);
    assert.equal(check.errorCode, "SETUP_REQUIRED");
    assert.ok(check.message.includes("Worksheet tab 'Leads'"));
    assert.ok(check.message.includes("does not exist"));
  });

  await test("2.4 Succeeds when spreadsheet and worksheet tab 'Leads' are verified", async () => {
    const check = await verifyGoogleSheetsDestination(
      workspaceId,
      "LaunchNest Leads CRM",
      "Leads",
      ["Sheet1", "Leads", "Summary"] // "Leads" is confirmed!
    );

    assert.equal(check.verified, true);
    assert.ok(check.message.includes("Verified spreadsheet"));
  });

  // -------------------------------------------------------------------------
  // 3. DUPLICATE SUBMISSION PREVENTION (STABLE IDEMPOTENCY KEY)
  // -------------------------------------------------------------------------
  await test("3.1 Stable submission ID resolved from explicit submissionId or header", () => {
    const key1 = resolveIdempotencyKey({ submissionId: "sub_lead_9921", name: "Alice", email: "alice@test.com" });
    assert.equal(key1.submissionId, "sub_lead_9921");

    const key2 = resolveIdempotencyKey(
      { name: "Bob", email: "bob@test.com" },
      "header_idemp_771"
    );
    assert.equal(key2.submissionId, "header_idemp_771");

    // Deterministic payload hash when no explicit ID provided
    const key3 = resolveIdempotencyKey({ name: "Charlie", email: "charlie@test.com", company: "Acme" });
    const key4 = resolveIdempotencyKey({ name: "Charlie", email: "charlie@test.com", company: "Acme" });
    assert.equal(key3.submissionId, key4.submissionId, "Same body must yield deterministic submission ID");
  });

  await test("3.2 Repeated webhook submissions return duplicate status without repeating side effects", async () => {
    memoryIdempotencyStore.clear();

    const payload = {
      submissionId: "unique_sub_101",
      name: "Diana Prince",
      email: "diana@themyscira.com",
      company: "Amazonia Ltd",
      budget: "$25,000",
      timeline: "Immediate",
    };

    // First execution: initial submission
    const firstRun = await processLaunchNestLeadPipeline({
      workspaceId,
      payload,
      mockSheetsTabs: ["Leads"],
      mockAiOutput: { urgencyScore: 92, priority: "High", summary: "High-value enterprise lead" },
    });

    assert.equal(firstRun.success, true);
    assert.equal(firstRun.isDuplicate, false);
    assert.equal(firstRun.processingStatus, "success");
    assert.equal(firstRun.sheetsRowStatus, "appended");
    assert.equal(firstRun.slackNotificationStatus, "sent");

    // Second execution: duplicate submission with same submissionId
    const secondRun = await processLaunchNestLeadPipeline({
      workspaceId,
      payload,
      mockSheetsTabs: ["Leads"],
    });

    assert.equal(secondRun.success, true);
    assert.equal(secondRun.isDuplicate, true);
    assert.equal(secondRun.processingStatus, "duplicate");
    // Duplicate run does not create a new execution ID
    assert.equal(secondRun.executionId, firstRun.executionId);
  });

  // -------------------------------------------------------------------------
  // 4. RETRY ENGINE, BACKOFF & ERROR CLASSIFICATION
  // -------------------------------------------------------------------------
  await test("4.1 Error classification correctly identifies transient vs permanent failures", () => {
    assert.equal(isTransientError(new Error("HTTP 429 Too Many Requests: Rate limit")), true);
    assert.equal(isTransientError(new Error("HTTP 503 Service Unavailable: temporary gateway timeout")), true);
    assert.equal(isTransientError(new Error("socket hang up (ECONNRESET)")), true);

    // Permanent errors must NOT be transient
    assert.equal(isTransientError(new Error("Validation failure: invalid email address")), false);
    assert.equal(isTransientError(new Error("HTTP 401 Unauthorized: Invalid OAuth token")), false);
    assert.equal(isTransientError(new Error("SETUP_REQUIRED: Destination worksheet not found")), false);
  });

  await test("4.2 Retries transient error up to 3 times with exponential backoff and succeeds", async () => {
    let callCount = 0;
    const { result, retryCount, delaysUsed } = await executeWithRetry(
      "transient_operation",
      async (attempt) => {
        callCount += 1;
        if (attempt < 2) {
          throw new Error("HTTP 502 Bad Gateway: Temporary server error");
        }
        return "SUCCESS_ON_ATTEMPT_2";
      },
      { maxRetries: 3, fastTestMode: true, baseDelaysMs: [1000, 2000, 4000] }
    );

    assert.equal(result, "SUCCESS_ON_ATTEMPT_2");
    assert.equal(retryCount, 2);
    assert.equal(callCount, 3); // initial + 2 retries
    assert.equal(delaysUsed.length, 2);
    // Verified backoff timings: attempt 1 ~1000ms, attempt 2 ~2000ms (+/- jitter)
    assert.ok(delaysUsed[0] >= 800 && delaysUsed[0] <= 1200, `Delay 1 was ${delaysUsed[0]}ms`);
    assert.ok(delaysUsed[1] >= 1600 && delaysUsed[1] <= 2400, `Delay 2 was ${delaysUsed[1]}ms`);
  });

  await test("4.3 Rejects permanent validation errors immediately on initial attempt without retrying", async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await executeWithRetry(
          "permanent_operation",
          async () => {
            callCount += 1;
            throw new Error("Validation failure: Priority 'Urgent' is not allowed enum");
          },
          { maxRetries: 3, fastTestMode: true }
        );
      },
      /Validation failure/
    );

    assert.equal(callCount, 1, "Permanent error must not be retried");
  });

  await test("4.4 Throws RetryExhaustedError when transient error persists after 3 retries", async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await executeWithRetry(
          "failing_transient_operation",
          async () => {
            callCount += 1;
            throw new Error("HTTP 500 Internal Server Error: Remote API down");
          },
          { maxRetries: 3, fastTestMode: true }
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof RetryExhaustedError);
        assert.equal((err as RetryExhaustedError).attempts, 3);
        return true;
      }
    );

    assert.equal(callCount, 4, "Initial call + 3 retries = 4 attempts total");
  });

  await test("4.5 Preserves successful step results so retries do not repeat completed side effects", async () => {
    memoryIdempotencyStore.clear();

    const payload = {
      submissionId: "sub_partial_retry_202",
      name: "Clark Kent",
      email: "clark@dailyplanet.com",
      company: "Daily Planet",
    };

    // First attempt: Sheets succeeds, but Slack encounters transient failure
    const attempt1 = await processLaunchNestLeadPipeline({
      workspaceId,
      payload,
      mockSheetsTabs: ["Leads"],
      mockSlackFailures: 5, // Slack fails beyond max retries
      fastTestMode: true,
    });

    assert.equal(attempt1.success, false);
    assert.equal(attempt1.sheetsRowStatus, "appended", "Sheets row succeeded in attempt 1");
    assert.equal(attempt1.slackNotificationStatus, "failed", "Slack notification failed in attempt 1");

    // Second attempt: Slack issue resolved. Sheets step should NOT re-execute!
    const attempt2 = await processLaunchNestLeadPipeline({
      workspaceId,
      payload,
      mockSheetsTabs: ["Leads"],
      mockSlackFailures: 0, // Slack now succeeds
      fastTestMode: true,
    });

    assert.equal(attempt2.success, true);
    assert.equal(attempt2.sheetsRowStatus, "appended", "Sheets remains appended without duplicate row");
    assert.equal(attempt2.slackNotificationStatus, "sent", "Slack notification now sent");
    // Verify steps: exactly 1 Sheets step was recorded, preserved across runs
    const sheetsSteps = attempt2.stepResults.filter((s) => s.stepId === "step_sheets_save");
    assert.equal(sheetsSteps.length, 1);
  });

  // -------------------------------------------------------------------------
  // 5. PROCESSING STATUS PERSISTENCE & REPORTING
  // -------------------------------------------------------------------------
  await test("5.1 Persists and reports actual processing status, retry count, last error, and notification status", async () => {
    memoryIdempotencyStore.clear();

    const payload = {
      submissionId: "sub_status_check_303",
      name: "Bruce Wayne",
      email: "bruce@wayne.corp",
      company: "Wayne Enterprises",
    };

    const report = await processLaunchNestLeadPipeline({
      workspaceId,
      payload,
      mockSheetsTabs: ["Leads"],
      mockSlackFailures: 1, // 1 transient failure before succeeding
      fastTestMode: true,
    });

    assert.equal(report.success, true);
    assert.equal(report.submissionId, "sub_status_check_303");
    assert.equal(report.processingStatus, "success");
    assert.equal(report.retryCount, 1, "Recorded actual retry count of 1");
    assert.equal(report.slackNotificationStatus, "sent");
    assert.equal(report.sheetsRowStatus, "appended");

    // Check in-memory store reflection
    const stored = memoryIdempotencyStore.get(`${workspaceId}:sub_status_check_303`);
    assert.ok(stored);
    assert.equal(stored?.status, "completed");
    assert.equal(stored?.retryCount, 1);
    assert.equal(stored?.slackNotificationStatus, "sent");
  });

  // -------------------------------------------------------------------------
  // 6. WORKFLOW ACTIVATION SAFETY & PRE-FLIGHT BLOCK
  // -------------------------------------------------------------------------
  await test("6.1 Rejects live activation when Google Sheets worksheet is unverified", async () => {
    // Save LaunchNest workflow in workspace
    const saved = await saveWorkflow(workspaceId, {
      ...LAUNCHNEST_WORKFLOW_DEFINITION,
      id: "wf_launchnest_test_unverified",
      status: "setup_required",
    });

    // Make sure Slack is connected
    await saveIntegrationRecord({
      workspaceId,
      provider: "slack",
      status: "connected",
      account: { selectedChannel: "#sales-leads" },
      encryptedTokens: { accessTokenCipher: "slack_cipher" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Google Sheets is connected, but worksheet 'Leads' is unverified
    await assert.rejects(
      async () => {
        await activateWorkflow(workspaceId, saved.id!);
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes("is not verified") || err.message.includes("SETUP_REQUIRED"),
          `Expected unverified destination error, got: ${err.message}`
        );
        return true;
      }
    );
  });

  await test("6.2 Rejects live activation when Slack channel is placeholder 'YOUR_CHANNEL_ID'", async () => {
    // Save workflow with placeholder Slack channel
    const wfWithPlaceholder = {
      ...LAUNCHNEST_WORKFLOW_DEFINITION,
      id: "wf_launchnest_placeholder_slack",
      status: "approved" as const,
      steps: LAUNCHNEST_WORKFLOW_DEFINITION.steps.map((s) =>
        s.action === "slack.send_message" ? { ...s, config: { ...s.config, channel: "YOUR_CHANNEL_ID" } } : s
      ),
    };
    const saved = await saveWorkflow(workspaceId, wfWithPlaceholder);

    await assert.rejects(
      async () => {
        await activateWorkflow(workspaceId, saved.id!);
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes("YOUR_CHANNEL_ID") || err.message.includes("is not verified") || err.message.includes("not connected"),
          `Expected placeholder error, got: ${err.message}`
        );
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 7. UNSUPPORTED CONDITIONAL TEMPLATES HANDLING
  // -------------------------------------------------------------------------
  await test("7.1 Handlebars conditional template ({{#if...}}) triggers safe backend adapter fallback", () => {
    const rawTemplate = "{{#if priority == 'High'}}🚨 URGENT{{else}}NORMAL{{/if}} Lead: {{name}}";
    const res = renderSlackMessageWithConditions(rawTemplate, {
      priority: "High",
      name: "Arthur Pendragon",
      company: "Camelot Technologies",
      service: "Enterprise AI Automation",
      urgencyScore: 95,
      summary: "Urgent enterprise contract",
    });

    assert.equal(res.isTemplateSupported, false, "Handlebars {{#if}} must be flagged unsupported");
    assert.equal(res.heading, "🚨 HIGH PRIORITY LEAD");
    assert.equal(res.priority, "High");
    assert.ok(res.text.includes("🚨 HIGH PRIORITY LEAD"));
    assert.ok(res.text.includes("Arthur Pendragon"));
  });

  await test("7.2 Inline ternary expressions in template trigger backend adapter fallback", () => {
    const rawTemplate = "Lead received: {{ priority === 'High' ? '🚨 URGENT' : '🟢 NORMAL' }}";
    const res = renderSlackMessageWithConditions(rawTemplate, {
      priority: "Medium",
      name: "Guinevere",
      company: "Camelot",
      urgencyScore: 60,
    });

    assert.equal(res.isTemplateSupported, false, "Inline ternary must be flagged unsupported");
    assert.equal(res.heading, "🟡 MEDIUM PRIORITY LEAD");
    assert.equal(res.priority, "Medium");
    assert.ok(res.text.includes("🟡 MEDIUM PRIORITY LEAD"));
  });

  await test("7.3 Standard templates with safe variable replacement are supported", () => {
    const rawTemplate = "*Notification*\n• Name: {{name}}\n• Priority: {{priority}}\n• Heading: {{priority_heading}}";
    const res = renderSlackMessageWithConditions(rawTemplate, {
      priority: "Low",
      name: "Lancelot",
    });

    assert.equal(res.isTemplateSupported, true, "Standard replacements should be supported");
    assert.equal(res.priority, "Low");
    assert.ok(res.text.includes("🟢 LOW PRIORITY LEAD"));
    assert.ok(res.text.includes("Name: Lancelot"));
    assert.ok(res.text.includes("Priority: Low"));
  });

  // -------------------------------------------------------------------------
  // 8. PLACEHOLDER INTEGRATION IDS ENFORCEMENT
  // -------------------------------------------------------------------------
  await test("8.1 validateWorkflow flags YOUR_SPREADSHEET_ID as UNRESOLVED_PLACEHOLDER_SPREADSHEET", () => {
    const wfWithPlaceholder = {
      ...LAUNCHNEST_WORKFLOW_DEFINITION,
      steps: LAUNCHNEST_WORKFLOW_DEFINITION.steps.map((s) =>
        s.action === "google_sheets.add_row" ? { ...s, config: { ...s.config, spreadsheet: "YOUR_SPREADSHEET_ID" } } : s
      ),
    };
    const validation = validateWorkflow(wfWithPlaceholder);
    assert.equal(validation.isValid, false);
    const placeholderErr = validation.errors.find((e) => e.code === "UNRESOLVED_PLACEHOLDER_SPREADSHEET");
    assert.ok(placeholderErr, "Must flag UNRESOLVED_PLACEHOLDER_SPREADSHEET");
    assert.ok(placeholderErr.message.includes("YOUR_SPREADSHEET_ID"));
  });

  await test("8.2 validateWorkflow flags YOUR_CHANNEL_ID as UNRESOLVED_PLACEHOLDER_CHANNEL", () => {
    const wfWithPlaceholder = {
      ...LAUNCHNEST_WORKFLOW_DEFINITION,
      steps: LAUNCHNEST_WORKFLOW_DEFINITION.steps.map((s) =>
        s.action === "slack.send_message" ? { ...s, config: { ...s.config, channel: "YOUR_CHANNEL_ID" } } : s
      ),
    };
    const validation = validateWorkflow(wfWithPlaceholder);
    assert.equal(validation.isValid, false);
    const placeholderErr = validation.errors.find((e) => e.code === "UNRESOLVED_PLACEHOLDER_CHANNEL");
    assert.ok(placeholderErr, "Must flag UNRESOLVED_PLACEHOLDER_CHANNEL");
    assert.ok(placeholderErr.message.includes("YOUR_CHANNEL_ID"));
  });

  await test("8.3 verifyGoogleSheetsDestination returns SETUP_REQUIRED when spreadsheet is YOUR_SPREADSHEET_ID", async () => {
    const check = await verifyGoogleSheetsDestination(workspaceId, "YOUR_SPREADSHEET_ID", "Leads");
    assert.equal(check.verified, false);
    assert.equal(check.errorCode, "SETUP_REQUIRED");
    assert.ok(check.message.includes("YOUR_SPREADSHEET_ID"));
  });

  await test("8.4 Catalog adapters reject YOUR_SPREADSHEET_ID and YOUR_CHANNEL_ID in validateConfiguration", () => {
    const sheetsAdapter = googleSheetsIntegration.actions[0].executionAdapter;
    const sheetsCheck = sheetsAdapter.validateConfiguration!({ spreadsheet: "YOUR_SPREADSHEET_ID" });
    assert.equal(sheetsCheck.isValid, false);
    assert.ok(sheetsCheck.errors.some((e) => e.includes("YOUR_SPREADSHEET_ID")));

    const slackAdapter = slackIntegration.actions[0].executionAdapter;
    const slackCheck = slackAdapter.validateConfiguration!({ channel: "YOUR_CHANNEL_ID", message: "Test" });
    assert.equal(slackCheck.isValid, false);
    assert.ok(slackCheck.errors.some((e) => e.includes("YOUR_CHANNEL_ID")));
  });

  await test("8.5 validateN8nExportCompatibility detects unresolved placeholders", () => {
    const wfWithPlaceholders = {
      ...LAUNCHNEST_WORKFLOW_DEFINITION,
      steps: [
        {
          id: "step_sheets",
          name: "Sheets",
          type: "action" as const,
          action: "google_sheets.add_row",
          description: "Save",
          config: { spreadsheet: "YOUR_SPREADSHEET_ID" },
        },
        {
          id: "step_slack",
          name: "Slack",
          type: "action" as const,
          action: "slack.send_message",
          description: "Notify",
          config: { channel: "YOUR_CHANNEL_ID", message: "Hello" },
        },
      ],
    };

    const res = validateN8nExportCompatibility(wfWithPlaceholders);
    assert.equal(res.isCompatible, false);
    assert.ok(res.issues.some((i) => i.includes("YOUR_SPREADSHEET_ID")));
    assert.ok(res.issues.some((i) => i.includes("YOUR_CHANNEL_ID")));
  });

  // -------------------------------------------------------------------------
  // 9. STRICT AI OUTPUT SCHEMA VALIDATION & SAFE ERROR HANDLING
  // -------------------------------------------------------------------------
  await test("9.1 validateAiLeadOutput accepts valid High, Medium, and Low AI outputs", () => {
    for (const priority of ["High", "Medium", "Low"] as const) {
      const validAi = {
        urgencyScore: 80,
        priority,
        service: "Workflow Automation",
        nextAction: "Book introductory consultation",
        summary: `Qualified lead with ${priority} priority`,
      };
      const res = validateAiLeadOutput(validAi);
      assert.equal(res.success, true);
      assert.equal(res.data?.priority, priority);
    }
  });

  await test("9.2 validateAiLeadOutput rejects invalid priorities (e.g. 'Urgent', 'Critical')", () => {
    const invalidPriorities = ["Urgent", "Critical", "Normal", "high", "MEDIUM", "low", 123, null, undefined];
    for (const prio of invalidPriorities) {
      const res = validateAiLeadOutput({
        urgencyScore: 50,
        priority: prio as unknown as "High" | "Medium" | "Low",
        service: "Web Dev",
        nextAction: "Review",
        summary: "Inquiry summary",
      });
      assert.equal(res.success, false, `Priority '${prio}' must fail validation`);
      assert.ok(res.error?.includes("Priority must be exactly 'High', 'Medium', or 'Low'"));
    }
  });

  await test("9.3 validateAiLeadOutput rejects missing required string fields (service, nextAction, summary)", () => {
    // Missing service
    const res1 = validateAiLeadOutput({
      priority: "High",
      nextAction: "Review",
      summary: "Valid summary",
    });
    assert.equal(res1.success, false);
    assert.ok(res1.error?.includes("service"));

    // Missing nextAction
    const res2 = validateAiLeadOutput({
      priority: "Medium",
      service: "Web Dev",
      summary: "Valid summary",
    });
    assert.equal(res2.success, false);
    assert.ok(res2.error?.includes("nextAction"));

    // Missing summary
    const res3 = validateAiLeadOutput({
      priority: "Low",
      service: "Web Dev",
      nextAction: "Follow up",
    });
    assert.equal(res3.success, false);
    assert.ok(res3.error?.includes("summary"));
  });

  await test("9.4 validateAiLeadOutput safely handles malformed non-object inputs without crashing", () => {
    const malformed = ["not an object", 42, null, undefined, false, []];
    for (const input of malformed) {
      const res = validateAiLeadOutput(input);
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("malformed") || res.error?.includes("validation failed"));
    }
  });

  // Clean up test workspace credentials
  await deleteIntegrationRecord(workspaceId, "google_sheets");
  await deleteIntegrationRecord(workspaceId, "slack");
});
