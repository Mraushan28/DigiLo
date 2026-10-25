import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { retryExecution } from "@/lib/automation/telemetry-service";

export async function POST(
  req: Request,
  _context: { params: Promise<{ id: string }> }
) {
  try {
    const { workspaceId } = await getWorkspaceId();
    const body = await req.json().catch(() => ({}));
    const executionId = body.executionId;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_ID", message: "executionId is required." } },
        { status: 400 }
      );
    }

    const result = await retryExecution(workspaceId, executionId);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      result: result.result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry failed.";
    return NextResponse.json(
      { success: false, error: { code: "RETRY_FAILED", message } },
      { status: 400 }
    );
  }
}
