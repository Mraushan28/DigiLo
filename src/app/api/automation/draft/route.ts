import { NextResponse } from "next/server";
import { WorkflowSchema, Workflow } from "@/types/automation";
import { saveDraftToResponse, getDraftFromCookies, clearDraftFromResponse } from "@/lib/automation/draft-session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawWorkflow = body?.workflow;

    const parseResult = WorkflowSchema.safeParse(rawWorkflow);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_WORKFLOW",
            message: "Invalid workflow format.",
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const workflow: Workflow = parseResult.data;
    const response = NextResponse.json({
      success: true,
      message: "Workflow draft saved securely in session cookie.",
      workflow,
    });

    saveDraftToResponse(response, workflow);
    return response;
  } catch (error) {
    console.error("[DraftAPI] Error saving draft workflow:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to save draft." } },
      { status: 500 }
    );
  }
}

export async function GET() {
  const draft = await getDraftFromCookies();
  return NextResponse.json({
    success: true,
    hasDraft: Boolean(draft),
    draft: draft || null,
  });
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Draft cleared.",
  });
  clearDraftFromResponse(response);
  return response;
}
