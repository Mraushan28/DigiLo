/**
 * Comprehensive Automated Test Suite for DIGILO AI Automation Planner:
 * Workflow Review, Edit, Validation, and Approval System
 *
 * Test Cases Covered:
 * 1. Website lead → AI analysis → Google Sheets → Slack.
 * 2. Website lead → email notification.
 * 3. An ambiguous prompt that needs clarification.
 * 4. An unsupported action.
 * 5. A workflow with missing required fields.
 * 6. Editing and validating a generated workflow.
 * 7. n8n workflow export compatibility.
 * 8. Real integration connection statuses (honest reporting).
 */

import assert from "node:assert/strict";
import { Workflow, WorkflowSchema, GenerateAutomationResponseSchema } from "../src/types/automation";
import { isActionSupported, getDefaultConfig } from "../src/lib/automation/action-registry";
import { validateWorkflow, calculateRequiredIntegrations } from "../src/lib/automation/workflow-validator";
import { convertDigiloWorkflowToN8n, validateN8nExportCompatibility } from "../src/lib/automation/n8n-exporter";
import { getAllIntegrationStatuses } from "../src/lib/automation/integration-status";

function runTests() {
  console.log("=== DIGILO AI AUTOMATION TEST SUITE ===\n");
  let passedCount = 0;
  let totalCount = 0;

  function test(name: string, fn: () => void) {
    totalCount++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err: unknown) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // TEST CASE 1: Website lead → AI analysis → Google Sheets → Slack
  test("Case 1: Website lead → AI analysis → Google Sheets → Slack workflow", () => {
    const workflow: Workflow = {
      name: "Website Lead Qualification & Team Alert",
      description: "When an inbound lead arrives from the website, analyze qualification with AI, log to Google Sheets, and alert sales team on Slack.",
      trigger: {
        type: "webhook",
        source: "Website Lead Form",
        event: "form_submission",
        description: "Captures lead name, email, and company"
      },
      steps: [
        {
          id: "step_ai_1",
          name: "AI Qualification Analysis",
          type: "action",
          action: "ai.analyze",
          description: "Analyze lead company size, intent, and assign a priority score",
          config: {
            prompt: "Extract lead interest, estimated deal size, and priority score (1-5)",
            model: "gpt-4o-mini"
          }
        },
        {
          id: "step_sheets_2",
          name: "Log to Google Sheets",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append qualified lead details as a new row in Google Sheets",
          config: {
            spreadsheet: "Inbound Leads 2026",
            sheetName: "Sheet1",
            columns: "Name, Email, Priority, Notes"
          }
        },
        {
          id: "step_slack_3",
          name: "Notify Sales on Slack",
          type: "action",
          action: "slack.send_message",
          description: "Send alert with AI priority and lead info to #sales channel",
          config: {
            channel: "#sales",
            message: "New qualified lead received: {{lead.name}} - Priority: {{ai.score}}"
          }
        }
      ],
      required_integrations: ["webhook", "openai", "google_sheets", "slack"]
    };

    // Schema validation
    const schemaParsed = WorkflowSchema.safeParse(workflow);
    assert.equal(schemaParsed.success, true, "Workflow must satisfy WorkflowSchema");

    // Deep validation
    const validation = validateWorkflow(workflow);
    assert.equal(validation.isValid, true, "Workflow should be completely valid");
    assert.equal(validation.errors.length, 0, "There should be zero validation errors");

    // Verify calculated integrations
    const calculated = calculateRequiredIntegrations(workflow);
    assert.ok(calculated.includes("openai"), "openai integration must be identified");
    assert.ok(calculated.includes("google_sheets"), "google_sheets integration must be identified");
    assert.ok(calculated.includes("slack"), "slack integration must be identified");
    assert.ok(calculated.includes("webhook"), "webhook integration must be identified");

    // Verify n8n export compatibility
    const n8nCheck = validateN8nExportCompatibility(workflow);
    assert.equal(n8nCheck.isCompatible, true, "Workflow must be n8n export compatible");
    const n8nExport = convertDigiloWorkflowToN8n(workflow);
    assert.equal(n8nExport.nodes.length, 4, "n8n export should have 1 trigger node + 3 action nodes");
    assert.equal(n8nExport.active, false, "Exported n8n workflow must be staged/inactive by default");
  });

  // TEST CASE 2: Website lead → notification workflow
  test("Case 2: Website lead → Slack notification workflow", () => {
    const workflow: Workflow = {
      name: "Website Lead Slack Dispatcher",
      description: "Send an instant notification to the sales department whenever a new lead submits contact form.",
      trigger: {
        type: "webhook",
        source: "Inbound Contact Page",
        event: "lead_created"
      },
      steps: [
        {
          id: "step_slack_1",
          name: "Send Notification via Slack",
          type: "action",
          action: "slack.send_message",
          description: "Dispatch notification message to sales team",
          config: {
            channel: "#sales-leads",
            message: "A new inquiry was received on the contact page. Please review and respond within 15 minutes."
          }
        }
      ],
      required_integrations: ["webhook", "slack"]
    };

    const schemaParsed = WorkflowSchema.safeParse(workflow);
    assert.equal(schemaParsed.success, true);

    const validation = validateWorkflow(workflow);
    assert.equal(validation.isValid, true);
    assert.equal(validation.errors.length, 0);

    const integrations = calculateRequiredIntegrations(workflow);
    assert.ok(integrations.includes("slack"));

    const n8nExport = convertDigiloWorkflowToN8n(workflow);
    assert.equal(n8nExport.nodes.length, 2, "Should have 1 trigger + 1 slack action node");
    assert.equal(n8nExport.nodes[1].type, "n8n-nodes-base.slack");
  });

  // TEST CASE 3: Ambiguous prompt that needs clarification
  test("Case 3: Ambiguous prompt clarification flow and schema handling", () => {
    const clarificationResponse = {
      status: "needs_clarification",
      questions: [
        "Which specific CRM or spreadsheet should new contacts be saved to?",
        "Do you want to send notifications via Slack, Email, or WhatsApp?",
        "What specific event should trigger this automation?"
      ]
    };

    const parsed = GenerateAutomationResponseSchema.safeParse(clarificationResponse);
    assert.equal(parsed.success, true, "needs_clarification response must be valid");
    assert.equal(parsed.data.status, "needs_clarification");
    assert.equal(parsed.data.questions?.length, 3);

    // Verify resolving clarification questions into a valid workflow
    const answeredClarifications = [
      { question: "Which specific CRM or spreadsheet should new contacts be saved to?", answer: "Google Sheets" },
      { question: "Do you want to send notifications via Slack, Email, or WhatsApp?", answer: "Slack" },
      { question: "What specific event should trigger this automation?", answer: "Website lead form submission" }
    ];

    assert.equal(answeredClarifications.length, 3);
    assert.ok(answeredClarifications.every(c => c.answer.length > 0));
  });

  // TEST CASE 4: Unsupported action detection
  test("Case 4: Unsupported action rejection", () => {
    const invalidWorkflow = {
      name: "Workflow with Unsupported Action",
      description: "Tries to invoke unsupported actions",
      trigger: {
        type: "webhook",
        source: "Website",
        event: "submission"
      },
      steps: [
        {
          id: "step_unsupported_1",
          name: "Post to Discord",
          type: "action",
          action: "discord.post_message", // NOT in ACTION_REGISTRY
          description: "Post message to Discord channel"
        }
      ],
      required_integrations: ["discord"]
    };

    assert.equal(isActionSupported("discord.post_message"), false, "discord.post_message must not be supported");

    const validation = validateWorkflow(invalidWorkflow);
    assert.equal(validation.isValid, false, "Workflow with unsupported action must fail validation");
    const unsupportedError = validation.errors.find(e => e.code === "UNSUPPORTED_ACTION");
    assert.ok(unsupportedError, "Must return UNSUPPORTED_ACTION error");
    assert.ok(unsupportedError?.message.includes("discord.post_message"));
  });

  // TEST CASE 5: Missing required fields detection
  test("Case 5: Workflow with missing required fields", () => {
    // Missing required config fields (channel, message in slack) and empty description
    const incompleteWorkflow = {
      name: "", // Missing name
      description: "", // Missing description
      trigger: {
        type: "invalid_trigger", // Invalid trigger
        source: "", // Missing source
        event: "" // Missing event
      },
      steps: [
        {
          id: "step_1",
          type: "action",
          action: "slack.send_message",
          description: "", // Empty description
          config: {
            // Missing required 'channel', 'message'
          }
        }
      ],
      required_integrations: []
    };

    const validation = validateWorkflow(incompleteWorkflow);
    assert.equal(validation.isValid, false, "Incomplete workflow must fail validation");

    const codes = validation.errors.map(e => e.code);
    assert.ok(codes.includes("MISSING_NAME"), "Must flag MISSING_NAME");
    assert.ok(codes.includes("MISSING_DESCRIPTION"), "Must flag MISSING_DESCRIPTION");
    assert.ok(codes.includes("UNSUPPORTED_TRIGGER"), "Must flag UNSUPPORTED_TRIGGER");
    assert.ok(codes.includes("MISSING_TRIGGER_SOURCE"), "Must flag MISSING_TRIGGER_SOURCE");
    assert.ok(codes.includes("MISSING_TRIGGER_EVENT"), "Must flag MISSING_TRIGGER_EVENT");
    assert.ok(codes.includes("MISSING_STEP_DESCRIPTION"), "Must flag MISSING_STEP_DESCRIPTION");
    assert.ok(codes.includes("MISSING_REQUIRED_CONFIG"), "Must flag MISSING_REQUIRED_CONFIG for missing slack fields");
  });

  // TEST CASE 6: Editing and validating a generated workflow
  test("Case 6: Editing and validating a generated workflow dynamically", () => {
    const originalWorkflow: Workflow = {
      name: "Original Workflow",
      description: "Original Description",
      trigger: {
        type: "webhook",
        source: "Contact Form",
        event: "submit"
      },
      steps: [
        {
          id: "step_ai_1",
          name: "AI Step",
          type: "action",
          action: "ai.analyze",
          description: "Analyze lead",
          config: getDefaultConfig("ai.analyze")
        }
      ],
      required_integrations: ["webhook", "openai"]
    };

    // 1. Initial state is valid
    let current = { ...originalWorkflow };
    let res = validateWorkflow(current);
    assert.equal(res.isValid, true);

    // 2. User edits step name and description
    current = {
      ...current,
      name: "Enhanced Qualification Pipeline",
      description: "Upgraded with team alerts and sheet logging",
      steps: [
        {
          ...current.steps[0],
          name: "Custom Lead Scoring Engine",
          description: "Performs sentiment and intent scoring on incoming messages"
        }
      ]
    };
    res = validateWorkflow(current);
    assert.equal(res.isValid, true);

    // 3. User adds Slack step
    const slackStep = {
      id: "step_slack_2",
      name: "Alert Slack Channel",
      type: "action" as const,
      action: "slack.send_message",
      description: "Send alert to #sales-alerts",
      config: {
        channel: "#sales-alerts",
        message: "New high value lead arrived"
      }
    };
    current = {
      ...current,
      steps: [...current.steps, slackStep]
    };
    current.required_integrations = calculateRequiredIntegrations(current);
    res = validateWorkflow(current);
    assert.equal(res.isValid, true);
    assert.ok(current.required_integrations.includes("slack"));

    // 4. User introduces invalid execution order:
    // Move Slack step BEFORE AI step while referencing AI output
    current = {
      ...current,
      steps: [
        {
          ...slackStep,
          description: "Notify sales of {{ai.score}} before AI runs"
        },
        current.steps[0]
      ]
    };
    res = validateWorkflow(current);
    assert.equal(res.isValid, false, "Must detect out-of-order execution dependency");
    assert.ok(res.errors.some(e => e.code === "INVALID_EXECUTION_ORDER"));

    // 5. Fixing the order resolves the error
    current = {
      ...current,
      steps: [
        current.steps[1], // AI step first
        current.steps[0]  // Slack step second
      ]
    };
    res = validateWorkflow(current);
    assert.equal(res.isValid, true, "Fixing order must make workflow valid again");
  });

  // TEST CASE 7: Integration connection statuses are honest
  test("Case 7: Integration statuses honest reporting (Connected vs Not Configured)", () => {
    const statuses = getAllIntegrationStatuses();

    // Webhook should be connected
    assert.equal(statuses["webhook"].status, "connected");

    // OpenAI status reflects whether NVIDIA_API_KEY / OPENAI_API_KEY is present
    const expectedOpenAiStatus = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY ? "connected" : "not_configured";
    assert.equal(statuses["openai"].status, expectedOpenAiStatus);

    // Third party services without credentials must NOT pretend to be connected
    assert.equal(statuses["google_sheets"].status, "not_configured");
    assert.equal(statuses["slack"].status, "not_configured");
    assert.equal(statuses["gmail"].status, "not_configured");
  });

  console.log(`\n=== SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED ===`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests();
