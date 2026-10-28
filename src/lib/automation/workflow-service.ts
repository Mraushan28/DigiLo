import { Workflow, WorkflowSchema, WorkflowTrigger, WorkflowStep } from "@/types/automation";
import { connectToDatabase, isMongoConnected } from "@/lib/mongodb/client";
import { WorkflowModel, IWorkflow } from "@/lib/mongodb/models/Workflow";
import { WorkflowVersionModel } from "@/lib/mongodb/models/WorkflowVersion";
import { ExecutionModel } from "@/lib/mongodb/models/Execution";
import { calculateRequiredIntegrations } from "@/lib/automation/workflow-validator";
import crypto from "node:crypto";

// Fallback in-memory store for offline/local dev & testing
const memoryWorkflows = new Map<string, Workflow & { workspaceId: string }>();

function workflowToDoc(doc: IWorkflow): Workflow {
  return {
    id: doc.id || (doc._id ? String(doc._id) : ""),
    name: doc.name,
    description: doc.description,
    version: doc.version || "1.0.0",
    status: doc.status,
    trigger: doc.trigger as unknown as WorkflowTrigger,
    steps: doc.steps as unknown as WorkflowStep[],
    required_integrations: doc.required_integrations,
    n8nWorkflowId: doc.n8nWorkflowId,
    approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : undefined,
    activatedAt: doc.activatedAt ? doc.activatedAt.toISOString() : undefined,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}

/**
 * Lists all workflows for a given workspace tenant.
 */
export async function listWorkflows(workspaceId: string): Promise<Array<Workflow & { executionCount: number; successRate: number | null; lastRunAt?: string }>> {
  await connectToDatabase();

  let workflows: Workflow[] = [];

  if (isMongoConnected()) {
    const docs = await WorkflowModel.find({ workspaceId }).sort({ updatedAt: -1 }).lean();
    workflows = docs.map((d) => ({
      id: d.id || d._id?.toString() || "",
      name: d.name,
      description: d.description,
      version: d.version || "1.0.0",
      status: d.status as Workflow["status"],
      trigger: d.trigger as unknown as WorkflowTrigger,
      steps: d.steps as unknown as WorkflowStep[],
      required_integrations: d.required_integrations,
      n8nWorkflowId: d.n8nWorkflowId,
      approvedAt: d.approvedAt ? new Date(d.approvedAt).toISOString() : undefined,
      activatedAt: d.activatedAt ? new Date(d.activatedAt).toISOString() : undefined,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : undefined,
    }));
  } else {
    workflows = Array.from(memoryWorkflows.values())
      .filter((w) => w.workspaceId === workspaceId)
      .map((item) => {
        const copy = { ...item };
        delete (copy as Partial<typeof item>).workspaceId;
        return copy;
      });
  }

  // Enrich each workflow with execution stats
  const enriched = await Promise.all(
    workflows.map(async (wf) => {
      let executionCount = 0;
      let successRate: number | null = null;
      let lastRunAt: string | undefined;

      if (isMongoConnected() && wf.id) {
        const total = await ExecutionModel.countDocuments({ workspaceId, workflowId: wf.id });
        const successful = await ExecutionModel.countDocuments({ workspaceId, workflowId: wf.id, status: "success" });
        const latest = await ExecutionModel.findOne({ workspaceId, workflowId: wf.id }).sort({ startedAt: -1 }).lean();

        executionCount = total;
        successRate = total > 0 ? Math.round((successful / total) * 100) : null;
        lastRunAt = latest?.startedAt ? new Date(latest.startedAt).toISOString() : undefined;
      }

      return {
        ...wf,
        executionCount,
        successRate,
        lastRunAt,
      };
    })
  );

  return enriched;
}

/**
 * Retrieves a single workflow by ID, enforcing tenant isolation.
 */
export async function getWorkflowById(workspaceId: string, workflowId: string): Promise<Workflow | null> {
  await connectToDatabase();

  if (isMongoConnected()) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(workflowId);
    const doc = await WorkflowModel.findOne({
      workspaceId,
      ...(isObjectId ? { $or: [{ id: workflowId }, { _id: workflowId }] } : { id: workflowId }),
    });

    if (doc) {
      return workflowToDoc(doc);
    }
  }

  // Memory fallback
  const mem = memoryWorkflows.get(workflowId);
  if (mem && mem.workspaceId === workspaceId) {
    const copy = { ...mem };
    delete (copy as Partial<typeof mem>).workspaceId;
    return copy;
  }

  // Search by id property in memory
  for (const item of memoryWorkflows.values()) {
    if (item.id === workflowId && item.workspaceId === workspaceId) {
      const copy = { ...item };
      delete (copy as Partial<typeof item>).workspaceId;
      return copy;
    }
  }

  return null;
}

/**
 * Saves or updates a workflow in the tenant workspace.
 */
export async function saveWorkflow(
  workspaceId: string,
  workflow: Workflow,
  userId?: string
): Promise<Workflow> {
  await connectToDatabase();

  const validated = WorkflowSchema.parse(workflow);
  const requiredIntegrations = calculateRequiredIntegrations(validated);

  const workflowId = validated.id || `wf_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const now = new Date();

  const workflowToPersist: Workflow = {
    ...validated,
    id: workflowId,
    required_integrations: requiredIntegrations,
    version: validated.version || "1.0.0",
    status: validated.status || "draft",
    updatedAt: now.toISOString(),
    createdAt: validated.createdAt || now.toISOString(),
  };

  if (isMongoConnected()) {
    const isObjectId = Boolean(validated.id && /^[0-9a-fA-F]{24}$/.test(validated.id));
    const filter = isObjectId
      ? { $or: [{ _id: validated.id }, { id: workflowId }], workspaceId }
      : { id: workflowId, workspaceId };

    const updateData = {
      id: workflowId,
      workspaceId,
      name: workflowToPersist.name,
      description: workflowToPersist.description,
      version: workflowToPersist.version,
      status: workflowToPersist.status,
      trigger: workflowToPersist.trigger,
      steps: workflowToPersist.steps,
      required_integrations: workflowToPersist.required_integrations,
      n8nWorkflowId: workflowToPersist.n8nWorkflowId,
      approvedAt: workflowToPersist.approvedAt ? new Date(workflowToPersist.approvedAt) : undefined,
      activatedAt: workflowToPersist.activatedAt ? new Date(workflowToPersist.activatedAt) : undefined,
      createdBy: userId,
      updatedAt: now,
    };

    const doc = await WorkflowModel.findOneAndUpdate(
      filter,
      { $set: updateData, $setOnInsert: { createdAt: now } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Save version history snapshot
    await WorkflowVersionModel.create({
      workspaceId,
      workflowId,
      version: workflowToPersist.version,
      name: workflowToPersist.name,
      description: workflowToPersist.description,
      trigger: workflowToPersist.trigger,
      steps: workflowToPersist.steps,
      required_integrations: workflowToPersist.required_integrations,
      changelog: `Workflow ${workflowToPersist.version} saved`,
      createdBy: userId,
      createdAt: now,
    }).catch((err) => console.warn("[WorkflowService] Version snapshot error:", err));

    return workflowToDoc(doc);
  }

  // Memory fallback
  memoryWorkflows.set(workflowId, {
    ...workflowToPersist,
    workspaceId,
  });

  return workflowToPersist;
}

/**
 * Updates an existing workflow settings safely.
 * If the workflow is active and settings are changed, creates a proposed draft version (v1.1)
 * without mutating active production workflow silently.
 */
export async function updateWorkflowSettings(
  workspaceId: string,
  workflowId: string,
  updates: Partial<Workflow>
): Promise<{ workflow: Workflow; isDraftVersion: boolean; proposedVersion?: string }> {
  const existing = await getWorkflowById(workspaceId, workflowId);
  if (!existing) {
    throw new Error(`Workflow '${workflowId}' not found in workspace.`);
  }

  // Check if mutating an active production workflow
  const isActive = existing.status === "active";

  if (isActive) {
    // PRD Section 4.1: Saving edits on an active workflow creates a proposed draft version (e.g. v1.1.0)
    const proposedVersion = "1.1.0";
    const proposedWorkflow: Workflow = {
      ...existing,
      ...updates,
      id: existing.id,
      version: proposedVersion,
      status: "draft", // Stays in draft until reviewed & activated
      updatedAt: new Date().toISOString(),
    };

    await saveWorkflow(workspaceId, proposedWorkflow);

    return {
      workflow: proposedWorkflow,
      isDraftVersion: true,
      proposedVersion,
    };
  }

  // Normal update for draft/paused/setup_required workflows
  const updatedWorkflow: Workflow = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  const saved = await saveWorkflow(workspaceId, updatedWorkflow);
  return {
    workflow: saved,
    isDraftVersion: false,
  };
}

/**
 * Deletes a workflow by ID from the tenant workspace.
 */
export async function deleteWorkflow(workspaceId: string, workflowId: string): Promise<boolean> {
  await connectToDatabase();

  if (isMongoConnected()) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(workflowId);
    const res = await WorkflowModel.deleteOne({
      workspaceId,
      ...(isObjectId ? { $or: [{ id: workflowId }, { _id: workflowId }] } : { id: workflowId }),
    });
    return res.deletedCount > 0;
  }

  if (memoryWorkflows.has(workflowId)) {
    const item = memoryWorkflows.get(workflowId);
    if (item?.workspaceId === workspaceId) {
      memoryWorkflows.delete(workflowId);
      return true;
    }
  }

  return false;
}
