import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { provisionN8nWorkflow } from "@/lib/automation/n8n-client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();

    const result = await provisionN8nWorkflow(workspaceId, id);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      n8nWorkflowId: result.n8nWorkflowId || null,
      error: result.error,
      message: result.success
        ? `Successfully provisioned workflow in n8n (ID: ${result.n8nWorkflowId}).`
        : result.error || "n8n provisioning could not be completed.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "n8n provisioning failed.";
    return NextResponse.json(
      { success: false, error: { code: "PROVISION_FAILED", message } },
      { status: 500 }
    );
  }
}
