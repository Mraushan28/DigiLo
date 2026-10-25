import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { generateAutomationPlan } from "../src/lib/ai/automation-planner";
import { calculateRequiredIntegrations, validateWorkflow } from "../src/lib/automation/workflow-validator";
import { Workflow } from "../src/types/automation";

async function runRegressionTests() {
  console.log("=== DIGILO INTENT SELECTION REGRESSION TEST SUITE ===\n");

  let passedCount = 0;
  let totalCount = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    totalCount++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // 1. Webhook + AI + score/summary: no Google Sheets or Slack
  await test("Case 1: Webhook + AI + score/summary: excludes Google Sheets and Slack", async () => {
    const prompt = "When a new lead arrives through my website webhook, analyze the lead using AI and return a lead score and summary.";
    const result = await generateAutomationPlan(prompt);

    assert.equal(result.status, "success", "Result status should be success");
    assert.ok(result.workflow, "Workflow must be generated");

    const wf = result.workflow!;
    assert.equal(wf.trigger.type, "webhook", "Trigger should be webhook");

    const actions = wf.steps.map(s => s.action);
    assert.ok(actions.includes("ai.analyze"), "Must include ai.analyze action");
    assert.equal(actions.includes("google_sheets.add_row"), false, "Must NOT include google_sheets.add_row");
    assert.equal(actions.includes("slack.send_message"), false, "Must NOT include slack.send_message");

    assert.deepEqual(wf.required_integrations.sort(), ["openai", "webhook"].sort(), "Integrations must only be webhook and openai");
    assert.equal(wf.required_integrations.includes("google_sheets"), false, "Must NOT require google_sheets");
    assert.equal(wf.required_integrations.includes("slack"), false, "Must NOT require slack");

    // Verify summary accuracy: must not mention Google Sheets or Slack
    assert.equal(/google\s*sheets?/i.test(wf.description), false, "Description must not mention Google Sheets");
    assert.equal(/slack/i.test(wf.description), false, "Description must not mention Slack");

    const validation = validateWorkflow(wf);
    assert.equal(validation.isValid, true, "Workflow must be structurally valid");
  });

  // 2. Webhook + AI + save to Google Sheets: includes Google Sheets, excludes Slack
  await test("Case 2: Webhook + AI + save to Google Sheets: includes Google Sheets", async () => {
    const prompt = "When a new lead arrives through my website webhook, analyze the lead using AI and save the record to Google Sheets.";
    const result = await generateAutomationPlan(prompt);

    assert.equal(result.status, "success");
    assert.ok(result.workflow);

    const wf = result.workflow!;
    const actions = wf.steps.map(s => s.action);
    assert.ok(actions.includes("ai.analyze"), "Must include ai.analyze");
    assert.ok(actions.includes("google_sheets.add_row"), "Must include google_sheets.add_row");
    assert.equal(actions.includes("slack.send_message"), false, "Must NOT include slack.send_message");

    assert.ok(wf.required_integrations.includes("google_sheets"), "Must require google_sheets");
    assert.equal(wf.required_integrations.includes("slack"), false, "Must NOT require slack");

    const validation = validateWorkflow(wf);
    assert.equal(validation.isValid, true);
  });

  // 3. Webhook + AI + notify Slack: includes Slack, excludes Google Sheets
  await test("Case 3: Webhook + AI + notify Slack: includes Slack", async () => {
    const prompt = "When a new lead arrives through my website webhook, analyze the lead using AI and notify my sales team on Slack.";
    const result = await generateAutomationPlan(prompt);

    assert.equal(result.status, "success");
    assert.ok(result.workflow);

    const wf = result.workflow!;
    const actions = wf.steps.map(s => s.action);
    assert.ok(actions.includes("ai.analyze"), "Must include ai.analyze");
    assert.ok(actions.includes("slack.send_message"), "Must include slack.send_message");
    assert.equal(actions.includes("google_sheets.add_row"), false, "Must NOT include google_sheets.add_row");

    assert.ok(wf.required_integrations.includes("slack"), "Must require slack");
    assert.equal(wf.required_integrations.includes("google_sheets"), false, "Must NOT require google_sheets");

    const validation = validateWorkflow(wf);
    assert.equal(validation.isValid, true);
  });

  // 4. Webhook + AI + Sheets + Slack: includes both
  await test("Case 4: Webhook + AI + Sheets + Slack: includes both destination integrations", async () => {
    const prompt = "When a new lead arrives through website webhook, analyze it with AI, save to Google Sheets, and alert the sales team on Slack.";
    const result = await generateAutomationPlan(prompt);

    assert.equal(result.status, "success");
    assert.ok(result.workflow);

    const wf = result.workflow!;
    const actions = wf.steps.map(s => s.action);
    assert.ok(actions.includes("ai.analyze"), "Must include ai.analyze");
    assert.ok(actions.includes("google_sheets.add_row"), "Must include google_sheets.add_row");
    assert.ok(actions.includes("slack.send_message"), "Must include slack.send_message");

    assert.ok(wf.required_integrations.includes("google_sheets"), "Must require google_sheets");
    assert.ok(wf.required_integrations.includes("slack"), "Must require slack");
    assert.ok(wf.required_integrations.includes("webhook"), "Must require webhook");
    assert.ok(wf.required_integrations.includes("openai"), "Must require openai");

    const validation = validateWorkflow(wf);
    assert.equal(validation.isValid, true);
  });

  // 5. Regenerate from a Sheets workflow to an AI-only workflow: completely replaces previous workflow
  await test("Case 5: Regenerate from a Sheets workflow to an AI-only workflow: removes Sheets action and integration", async () => {
    // Step A: Initial workflow with Sheets
    const initialSheetsWorkflow: Workflow = {
      name: "LEAD CAPTURE TO SHEETS",
      description: "Save leads to Google Sheets.",
      trigger: {
        type: "webhook",
        source: "Website",
        event: "submission"
      },
      steps: [
        {
          id: "step_1",
          name: "Add to Sheet",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append row to Google Sheets",
          config: { spreadsheet: "Leads", sheetName: "Sheet1" }
        }
      ],
      required_integrations: ["webhook", "google_sheets"],
      status: "draft"
    };

    assert.ok(initialSheetsWorkflow.required_integrations.includes("google_sheets"));

    // Step B: User regenerates with AI-only prompt
    const aiOnlyPrompt = "When a new lead arrives through my website webhook, analyze the lead using AI and return a lead score and summary.";
    const regeneratedResult = await generateAutomationPlan(aiOnlyPrompt);

    assert.equal(regeneratedResult.status, "success");
    assert.ok(regeneratedResult.workflow);

    const newWf = regeneratedResult.workflow!;
    
    // Step C: Verify new workflow completely replaces previous state
    assert.equal(newWf.steps.some(s => s.action === "google_sheets.add_row"), false, "Sheets step must be completely removed");
    assert.equal(newWf.required_integrations.includes("google_sheets"), false, "Google Sheets integration must be completely removed");
    assert.deepEqual(newWf.required_integrations.sort(), ["openai", "webhook"].sort(), "Only webhook and openai should be required");

    // Step D: Reconciled required integrations from workflow steps
    const derived = calculateRequiredIntegrations(newWf);
    assert.deepEqual(derived.sort(), ["openai", "webhook"].sort());
  });

  console.log(`\n========================================`);
  console.log(`REGRESSION TEST SUMMARY: ${passedCount}/${totalCount} tests passed.`);
  console.log(`========================================\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runRegressionTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
