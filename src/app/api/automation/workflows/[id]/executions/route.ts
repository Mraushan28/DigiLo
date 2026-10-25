import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { getWorkflowExecutions } from "@/lib/automation/telemetry-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const result = await getWorkflowExecutions(workspaceId, id, page, limit);

    return NextResponse.json({
      success: true,
      executions: result.executions,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("Get executions API error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch executions." } },
      { status: 500 }
    );
  }
}
