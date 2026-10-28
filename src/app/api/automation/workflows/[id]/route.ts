import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { getWorkflowById, updateWorkflowSettings, deleteWorkflow } from "@/lib/automation/workflow-service";
import { getAllLiveIntegrationStatuses } from "@/lib/automation/integration-status";
import { validateN8nExportCompatibility, convertDigiloWorkflowToN8n } from "@/lib/automation/n8n-exporter";
import { isN8nConfigured } from "@/lib/automation/n8n-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();

    const workflow = await getWorkflowById(workspaceId, id);
    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Workflow '${id}' not found.` } },
        { status: 404 }
      );
    }

    const liveIntegrations = await getAllLiveIntegrationStatuses(workspaceId);
    const n8nExport = convertDigiloWorkflowToN8n(workflow, {
      workspaceId,
      workspaceIntegrations: liveIntegrations,
    });
    const n8nCompatibility = validateN8nExportCompatibility(workflow);

    return NextResponse.json({
      success: true,
      workspaceId,
      workflow,
      liveIntegrations: Object.values(liveIntegrations),
      isExecutable: n8nExport.meta.isExecutable,
      missingCredentials: n8nExport.meta.validationStatus?.missingCredentials || [],
      n8nExport,
      n8nCompatibility,
      isN8nConfigured: isN8nConfigured(),
      n8nStatus: workflow.n8nWorkflowId
        ? "provisioned"
        : isN8nConfigured()
        ? "setup_required"
        : "unconfigured",
    });
  } catch (error) {
    console.error("Get workflow API error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve workflow." } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();
    const body = await req.json().catch(() => ({}));

    const result = await updateWorkflowSettings(workspaceId, id, body);

    return NextResponse.json({
      success: true,
      message: result.isDraftVersion
        ? `Workflow updated as proposed version (${result.proposedVersion}) to protect active production version.`
        : "Workflow updated successfully.",
      workflow: result.workflow,
      isDraftVersion: result.isDraftVersion,
      proposedVersion: result.proposedVersion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update workflow.";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_FAILED", message } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();

    const deleted = await deleteWorkflow(workspaceId, id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Workflow not found or already deleted." } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Workflow deleted successfully.",
    });
  } catch (error) {
    console.error("Delete workflow API error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete workflow." } },
      { status: 500 }
    );
  }
}
