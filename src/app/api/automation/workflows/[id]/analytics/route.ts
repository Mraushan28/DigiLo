import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { getWorkflowAnalytics } from "@/lib/automation/telemetry-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();

    const { searchParams } = new URL(req.url);
    const tf = (searchParams.get("timeframe") || "7d") as "24h" | "7d" | "30d";
    const timeframe = ["24h", "7d", "30d"].includes(tf) ? tf : "7d";

    const analytics = await getWorkflowAnalytics(workspaceId, id, timeframe);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Get analytics API error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch analytics." } },
      { status: 500 }
    );
  }
}
