import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Workflow, WorkflowSchema } from "@/types/automation";
import { encryptToken, decryptToken } from "./crypto";
import crypto from "node:crypto";
import { saveWorkflow, getWorkflowById, listWorkflows } from "./workflow-service";
import { calculateRequiredIntegrations, validateWorkflow } from "./workflow-validator";
import { syncWorkflowToN8n, isN8nConfigured } from "./n8n-client";

export const DRAFT_WORKFLOW_COOKIE = "digilo_draft_workflow";
const DRAFT_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Encrypts a workflow into AES-256-GCM cipher string for session cookie storage.
 */
export function createEncryptedDraftCookieValue(workflow: Workflow): string {
  const jsonStr = JSON.stringify(workflow);
  return encryptToken(jsonStr);
}

/**
 * Decrypts and validates a workflow from an encrypted cookie string.
 */
export function readEncryptedDraftCookieValue(cookieValue: string): Workflow | null {
  try {
    const decryptedStr = decryptToken(cookieValue);
    const parsed = JSON.parse(decryptedStr);
    const validation = WorkflowSchema.safeParse(parsed);
    if (validation.success) {
      return validation.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Encrypts and saves an unauthenticated workflow draft into a secure HTTP-only cookie.
 */
export function saveDraftToResponse(response: NextResponse, workflow: Workflow): void {
  try {
    const encryptedCipher = createEncryptedDraftCookieValue(workflow);

    response.cookies.set(DRAFT_WORKFLOW_COOKIE, encryptedCipher, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DRAFT_COOKIE_MAX_AGE,
    });
  } catch (err) {
    console.warn("[DraftSession] Failed to encrypt draft workflow cookie:", err);
  }
}

/**
 * Reads and decrypts a pending workflow draft from incoming request cookies.
 */
export async function getDraftFromCookies(): Promise<Workflow | null> {
  try {
    const cookieStore = await cookies();
    const draftCookie = cookieStore.get(DRAFT_WORKFLOW_COOKIE);
    if (!draftCookie?.value) {
      return null;
    }

    return readEncryptedDraftCookieValue(draftCookie.value);
  } catch {
    return null;
  }
}

/**
 * Clears the draft cookie upon successful claim or dismissal.
 */
export function clearDraftFromResponse(response: NextResponse): void {
  response.cookies.delete(DRAFT_WORKFLOW_COOKIE);
}

/**
 * Claims a pending draft workflow for a newly authenticated tenant workspace.
 * Validates ownership and workflow data before saving.
 * Prevents duplicate creation on repeated callbacks.
 * Prepares n8n provisioning if configured.
 */
export async function claimDraftWorkflow(
  workspaceId: string,
  userId?: string
): Promise<{ claimed: boolean; workflow?: Workflow; workflowId?: string; wasApproved?: boolean }> {
  const draft = await getDraftFromCookies();
  if (!draft) {
    return { claimed: false };
  }

  // Deep validation check
  const validation = validateWorkflow(draft);
  if (!validation.isValid) {
    console.warn("[DraftSession] Invalid draft workflow found in cookie during claim:", validation.errors);
    return { claimed: false };
  }

  const isApproved = draft.status === "approved";
  const requiredIntegrations = calculateRequiredIntegrations(draft);

  // Check for duplicate workflow in this workspace
  if (draft.id) {
    const existing = await getWorkflowById(workspaceId, draft.id);
    if (existing) {
      return {
        claimed: true,
        workflow: existing,
        workflowId: existing.id,
        wasApproved: existing.status === "approved" || isApproved,
      };
    }
  }

  // Check recent workflows in workspace to avoid duplicates if callback was repeated
  const recentWorkflows = await listWorkflows(workspaceId).catch(() => []);
  const matchingRecent = recentWorkflows.find(
    (w) =>
      w.name === draft.name &&
      w.trigger?.source === draft.trigger?.source &&
      w.steps?.length === draft.steps?.length
  );

  if (matchingRecent) {
    return {
      claimed: true,
      workflow: matchingRecent,
      workflowId: matchingRecent.id,
      wasApproved: matchingRecent.status === "approved" || isApproved,
    };
  }

  const workflowId = draft.id || `wf_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const now = new Date().toISOString();

  const persistentWorkflow: Workflow = {
    ...draft,
    id: workflowId,
    required_integrations: requiredIntegrations,
    status: isApproved ? "approved" : "draft",
    approvedAt: isApproved ? draft.approvedAt || now : undefined,
    createdAt: draft.createdAt || now,
    updatedAt: now,
  };

  // Attempt n8n provisioning if configured on the server
  if (isN8nConfigured()) {
    try {
      const n8nSync = await syncWorkflowToN8n(persistentWorkflow, workspaceId);
      if (n8nSync.status === "provisioned" && n8nSync.n8nWorkflowId) {
        persistentWorkflow.n8nWorkflowId = n8nSync.n8nWorkflowId;
      }
    } catch (n8nErr) {
      console.warn("[DraftSession] n8n provisioning error during draft claim (preserving workflow):", n8nErr);
    }
  }

  const saved = await saveWorkflow(workspaceId, persistentWorkflow, userId);

  return {
    claimed: true,
    workflow: saved,
    workflowId: saved.id,
    wasApproved: isApproved,
  };
}
