import { NextResponse } from "next/server";
import { getWorkspaceId, setWorkspaceCookie } from "@/lib/automation/workspace-session";
import { listWorkflows, saveWorkflow } from "@/lib/automation/workflow-service";
import { WorkflowSchema } from "@/types/automation";

export async function GET() {
  try {
    const { workspaceId, isNew } = await getWorkspaceId();
    const workflows = await listWorkflows(workspaceId);

    const response = NextResponse.json({
      success: true,
      workspaceId,
      workflows,
      total: workflows.length,
    });

    if (isNew) {
      setWorkspaceCookie(response, workspaceId);
    }

    return response;
  } catch (error) {
    console.error("List workflows API error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to list workflows." } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { workspaceId, isNew } = await getWorkspaceId();
    const body = await req.json().catch(() => ({}));
    const rawWorkflow = body.workflow || body;

    const parseResult = WorkflowSchema.safeParse(rawWorkflow);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.issues[0].message,
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const saved = await saveWorkflow(workspaceId, parseResult.data);

    const response = NextResponse.json({
      success: true,
      message: "Workflow created successfully.",
      workflow: saved,
    });

    if (isNew) {
      setWorkspaceCookie(response, workspaceId);
    }

    return response;
  } catch (error) {
    console.error("Create workflow API error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to save workflow." } },
      { status: 500 }
    );
  }
}
