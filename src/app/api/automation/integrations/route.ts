import { NextResponse } from "next/server";
import { getAllLiveIntegrationStatuses } from "@/lib/automation/integration-status";
import { getWorkspaceId, setWorkspaceCookie } from "@/lib/automation/workspace-session";

export async function GET() {
  try {
    const { workspaceId, isNew } = await getWorkspaceId();
    const statuses = await getAllLiveIntegrationStatuses(workspaceId);

    const response = NextResponse.json({
      success: true,
      workspaceId,
      integrations: statuses
    });

    if (isNew) {
      setWorkspaceCookie(response, workspaceId);
    }

    return response;
  } catch (error) {
    console.error("Integrations API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch live integrations." }
      },
      { status: 500 }
    );
  }
}
