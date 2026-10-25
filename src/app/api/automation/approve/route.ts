import { NextResponse } from "next/server";
import { WorkflowSchema, Workflow } from "@/types/automation";
import { validateWorkflow, calculateRequiredIntegrations } from "@/lib/automation/workflow-validator";
import { convertDigiloWorkflowToN8n, validateN8nExportCompatibility } from "@/lib/automation/n8n-exporter";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { getCurrentSession } from "@/lib/auth/session";
import { getAllLiveIntegrationStatuses } from "@/lib/automation/integration-status";
import { saveWorkflow } from "@/lib/automation/workflow-service";
import { saveDraftToResponse, clearDraftFromResponse } from "@/lib/automation/draft-session";
import { syncWorkflowToN8n, isN8nConfigured } from "@/lib/automation/n8n-client";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawWorkflow = body?.workflow;

    if (!rawWorkflow) {
      return NextResponse.json({
        success: false,
        error: { code: "MISSING_WORKFLOW", message: "Workflow payload is required for approval." }
      }, { status: 400 });
    }

    // Step 1: Validate against WorkflowSchema
    const schemaResult = WorkflowSchema.safeParse(rawWorkflow);
    if (!schemaResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "SCHEMA_VALIDATION_FAILED",
          message: `Workflow schema invalid: ${schemaResult.error.issues[0]?.message}`,
          details: schemaResult.error.issues
        }
      }, { status: 400 });
    }

    const workflow: Workflow = schemaResult.data;

    // Step 2: Full deep validation
    const validation = validateWorkflow(workflow);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: {
          code: "WORKFLOW_VALIDATION_FAILED",
          message: "Workflow failed validation rules.",
          validationErrors: validation.errors
        }
      }, { status: 400 });
    }

    // Step 3: Reconcile required integrations & mark approved
    const requiredIntegrations = calculateRequiredIntegrations(workflow);
    const approvedWorkflow: Workflow = {
      ...workflow,
      required_integrations: requiredIntegrations,
      status: "approved",
      approvedAt: new Date().toISOString()
    };

    // Step 4: Check authentication session
    const { workspaceId, isAuthenticated } = await getWorkspaceId();
    const session = await getCurrentSession();

    // Scenario B: User is not authenticated
    if (!isAuthenticated || !session?.userId) {
      const response = NextResponse.json({
        success: true,
        requiresAuth: true,
        message: "Workflow approved and saved as pending draft. Please sign in or create an account to finalize.",
        workflow: approvedWorkflow,
      });

      // Securely preserve the complete approved workflow as pending approval draft
      saveDraftToResponse(response, approvedWorkflow);
      return response;
    }

    // Scenario A: User is already logged in
    const userId = session.userId;
    let savedWorkflow = await saveWorkflow(workspaceId, approvedWorkflow, userId);

    // Step 5: Provision or prepare n8n workflow if configured
    let n8nSyncResult: {
      status: "unconfigured" | "provisioned" | "failed";
      n8nWorkflowId?: string;
      error?: string;
    } = {
      status: "unconfigured",
      n8nWorkflowId: undefined,
      error: undefined,
    };

    if (isN8nConfigured()) {
      try {
        const syncRes = await syncWorkflowToN8n(savedWorkflow, workspaceId);
        n8nSyncResult = {
          status: syncRes.status,
          n8nWorkflowId: syncRes.n8nWorkflowId,
          error: syncRes.error,
        };

        if (syncRes.status === "provisioned" && syncRes.n8nWorkflowId) {
          savedWorkflow = await saveWorkflow(workspaceId, {
            ...savedWorkflow,
            n8nWorkflowId: syncRes.n8nWorkflowId,
          }, userId);
        }
      } catch (n8nErr) {
        console.warn("[Approve] Live n8n provisioning attempt failed, preserving saved workflow:", n8nErr);
        n8nSyncResult = {
          status: "failed",
          n8nWorkflowId: undefined,
          error: n8nErr instanceof Error ? n8nErr.message : "n8n provisioning error",
        };
      }
    }

    const liveIntegrations = await getAllLiveIntegrationStatuses(workspaceId);
    const n8nExport = convertDigiloWorkflowToN8n(savedWorkflow, {
      workspaceId,
      workspaceIntegrations: liveIntegrations
    });
    const n8nCheck = validateN8nExportCompatibility(savedWorkflow);

    const response = NextResponse.json({
      success: true,
      message: "Workflow approved successfully. Staged for execution.",
      workflowId: savedWorkflow.id,
      redirectUrl: `/dashboard/workflows/${savedWorkflow.id}`,
      approvedWorkflow: savedWorkflow,
      n8nExport,
      n8nCompatible: n8nCheck.isCompatible,
      isExecutable: n8nExport.meta.isExecutable,
      validationStatus: n8nExport.meta.validationStatus,
      n8nProvisioning: n8nSyncResult,
      executionStatus: "staged_not_executed"
    });

    // Clear any pending draft cookie on successful workspace save
    clearDraftFromResponse(response);

    return response;

  } catch (error) {
    console.error("Workflow approval API error:", error);
    return NextResponse.json({
      success: false,
      error: { code: "SERVER_ERROR", message: "An unexpected error occurred during workflow approval." }
    }, { status: 500 });
  }
}
