import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { generateWorkflowAnalysisAndSuggestions } from "@/lib/automation/telemetry-service";
import { updateWorkflowSettings, getWorkflowById } from "@/lib/automation/workflow-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();

    const result = await generateWorkflowAnalysisAndSuggestions(workspaceId, id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze workflow.";
    return NextResponse.json(
      { success: false, error: { code: "ANALYSIS_FAILED", message } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();
    const body = await req.json().catch(() => ({}));

    const { suggestionId, patch } = body;

    if (!patch || typeof patch !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PATCH", message: "Suggestion patch is required." } },
        { status: 400 }
      );
    }

    const workflow = await getWorkflowById(workspaceId, id);
    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Workflow not found." } },
        { status: 404 }
      );
    }

    // PRD Section 4.6: Applying a suggestion creates a proposed draft version (v1.1) without mutating active production
    const updated = await updateWorkflowSettings(workspaceId, id, patch);

    return NextResponse.json({
      success: true,
      message: `Suggestion '${suggestionId || "optimization"}' applied as proposed draft version ${updated.proposedVersion || "v1.1.0"}.`,
      workflow: updated.workflow,
      isDraftVersion: updated.isDraftVersion,
      proposedVersion: updated.proposedVersion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply suggestion.";
    return NextResponse.json(
      { success: false, error: { code: "APPLY_FAILED", message } },
      { status: 400 }
    );
  }
}
