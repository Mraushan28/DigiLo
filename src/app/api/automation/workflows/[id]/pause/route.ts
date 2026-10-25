import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { pauseWorkflow } from "@/lib/automation/n8n-client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();

    const result = await pauseWorkflow(workspaceId, id);

    return NextResponse.json({
      success: true,
      message: result.message,
      workflow: result.workflow,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pause workflow.";
    return NextResponse.json(
      { success: false, error: { code: "PAUSE_FAILED", message } },
      { status: 400 }
    );
  }
}
