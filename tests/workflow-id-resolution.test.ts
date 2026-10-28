import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Workflow } from "../src/types/automation";
import {
  saveWorkflow,
  getWorkflowById,
  listWorkflows,
  deleteWorkflow,
  updateWorkflowSettings,
} from "../src/lib/automation/workflow-service";
import { WorkflowModel } from "../src/lib/mongodb/models/Workflow";
import { connectToDatabase, isMongoConnected } from "../src/lib/mongodb/client";

async function runWorkflowIdResolutionRegressionSuite() {
  console.log("==================================================================");
  console.log("   DIGILO WORKFLOW ID RESOLUTION & TENANT ISOLATION REGRESSION   ");
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

  const workspaceA = `ws_tenant_a_${Date.now()}`;
  const workspaceB = `ws_tenant_b_${Date.now()}`;
  const userIdA = `usr_a_${Date.now()}`;

  const baseWorkflow: Workflow = {
    name: "Customer Onboarding Webhook to Slack",
    description: "Intake customer form, qualify with AI, and alert Slack",
    trigger: {
      type: "webhook",
      source: "Registration Form",
      event: "customer_registered",
    },
    steps: [
      {
        id: "step_ai_1",
        name: "Analyze Customer Profile",
        type: "action",
        action: "ai.analyze",
        description: "Extract company size and urgency",
        config: { model: "openai/gpt-oss-20b" },
      },
      {
        id: "step_slack_1",
        name: "Alert Onboarding Team",
        type: "action",
        action: "slack.send_message",
        description: "Post to Slack channel",
        config: { channel: "#onboarding" },
      },
    ],
    required_integrations: ["webhook", "openai", "slack"],
    status: "draft",
    version: "1.0.0",
  };

  let createdWorkflowA: Workflow;
  const specificWfId = `wf_${Date.now().toString(16)}1234abcd`;

  // -------------------------------------------------------------
  // TEST 1: Workflow creation generates a matching wf_ prefixed ID
  // -------------------------------------------------------------
  await test("1. Workflow creation automatically generates a consistent 'wf_' prefixed ID", async () => {
    createdWorkflowA = await saveWorkflow(workspaceA, baseWorkflow, userIdA);

    assert.ok(createdWorkflowA.id, "Workflow must receive an ID");
    assert.ok(createdWorkflowA.id.startsWith("wf_"), `Expected 'wf_' prefix, got: ${createdWorkflowA.id}`);
    assert.equal(createdWorkflowA.name, baseWorkflow.name);
  });

  // -------------------------------------------------------------
  // TEST 2: Preserves explicitly supplied workflow ID (matching client & DB)
  // -------------------------------------------------------------
  await test("2. Application stores and preserves explicitly provided workflow ID in the database", async () => {
    const workflowWithSpecificId: Workflow = {
      ...baseWorkflow,
      id: specificWfId,
      name: "Workflow With Explicit ID",
    };

    const saved = await saveWorkflow(workspaceA, workflowWithSpecificId, userIdA);
    assert.equal(saved.id, specificWfId, "Saved workflow ID must match explicit ID");

    // If MongoDB is connected, verify document field directly in DB
    if (isMongoConnected()) {
      const dbDoc = await WorkflowModel.findOne({ id: specificWfId, workspaceId: workspaceA }).lean();
      assert.ok(dbDoc, "MongoDB document must exist with matching 'id' field");
      assert.equal(dbDoc.id, specificWfId, "Database stored 'id' field must equal the workflow ID");
    }
  });

  // -------------------------------------------------------------
  // TEST 3: listWorkflows returns exact IDs used for detail page routing
  // -------------------------------------------------------------
  await test("3. listWorkflows returns workflows with matching IDs suitable for /dashboard/workflows/[id] URLs", async () => {
    const listed = await listWorkflows(workspaceA);
    assert.ok(listed.length >= 2, "Workspace A should list at least 2 workflows");

    const foundA = listed.find((w) => w.id === createdWorkflowA.id);
    const foundSpecific = listed.find((w) => w.id === specificWfId);

    assert.ok(foundA, `listWorkflows must include created workflow '${createdWorkflowA.id}'`);
    assert.ok(foundSpecific, `listWorkflows must include explicit workflow '${specificWfId}'`);

    assert.equal(foundA?.id, createdWorkflowA.id);
    assert.equal(foundSpecific?.id, specificWfId);
  });

  // -------------------------------------------------------------
  // TEST 4: getWorkflowById opens workflow accurately by generated ID
  // -------------------------------------------------------------
  await test("4. getWorkflowById retrieves workflow by ID within the tenant workspace", async () => {
    const resolved = await getWorkflowById(workspaceA, createdWorkflowA.id!);

    assert.ok(resolved, `Workflow '${createdWorkflowA.id}' must be resolved`);
    assert.equal(resolved?.id, createdWorkflowA.id);
    assert.equal(resolved?.name, baseWorkflow.name);
    assert.equal(resolved?.steps.length, 2);
  });

  // -------------------------------------------------------------
  // TEST 5: Tenant isolation prevents cross-tenant access to workflows
  // -------------------------------------------------------------
  await test("5. Strict tenant isolation: Workspace B cannot retrieve Workspace A's workflow", async () => {
    const crossTenantFetch = await getWorkflowById(workspaceB, createdWorkflowA.id!);
    assert.equal(crossTenantFetch, null, "Cross-tenant access must return null (never leak other workspace workflows)");

    const listedB = await listWorkflows(workspaceB);
    const leaked = listedB.find((w) => w.id === createdWorkflowA.id || w.id === specificWfId);
    assert.equal(leaked, undefined, "Workspace B listing must not contain Workspace A workflows");
  });

  // -------------------------------------------------------------
  // TEST 6: Genuinely missing workflows return null without fabricating data
  // -------------------------------------------------------------
  await test("6. Genuinely non-existent workflow ID returns null and does not substitute any fake workflow", async () => {
    const nonExistentId = "wf_b2876f409c21488c_non_existent";
    const missingResult = await getWorkflowById(workspaceA, nonExistentId);

    assert.equal(missingResult, null, "Non-existent workflow must resolve to null");
  });

  // -------------------------------------------------------------
  // TEST 7: Updating workflow preserves the same ID
  // -------------------------------------------------------------
  await test("7. Updating workflow settings preserves the workflow ID and updates timestamp", async () => {
    const updateResult = await updateWorkflowSettings(workspaceA, createdWorkflowA.id!, {
      description: "Updated description for regression test",
    });

    assert.equal(updateResult.workflow.id, createdWorkflowA.id);
    assert.equal(updateResult.workflow.description, "Updated description for regression test");

    const reFetched = await getWorkflowById(workspaceA, createdWorkflowA.id!);
    assert.equal(reFetched?.id, createdWorkflowA.id);
    assert.equal(reFetched?.description, "Updated description for regression test");
  });

  // -------------------------------------------------------------
  // TEST 8: Cross-tenant deletion is rejected and tenant deletion is clean
  // -------------------------------------------------------------
  await test("8. Cross-tenant deletion fails; tenant owner deletion succeeds and cleans up", async () => {
    // Workspace B cannot delete Workspace A workflow
    const crossDelete = await deleteWorkflow(workspaceB, createdWorkflowA.id!);
    assert.equal(crossDelete, false, "Unauthorized workspace cannot delete another workspace workflow");

    // Workspace A can delete its own workflow
    const ownDelete = await deleteWorkflow(workspaceA, createdWorkflowA.id!);
    assert.equal(ownDelete, true, "Workspace A successfully deletes its own workflow");

    // Subsequent retrieval returns null
    const afterDelete = await getWorkflowById(workspaceA, createdWorkflowA.id!);
    assert.equal(afterDelete, null, "Deleted workflow must return null");
  });

  console.log(`\n==================================================================`);
  console.log(`   REGRESSION SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkflowIdResolutionRegressionSuite().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
