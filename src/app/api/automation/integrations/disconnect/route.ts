import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { disconnectGoogleIntegration } from "@/lib/automation/oauth/google-oauth";
import { disconnectSlackIntegration } from "@/lib/automation/oauth/slack-oauth";

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await getWorkspaceId();
    const body = await req.json();
    const { provider } = body;

    if (provider !== "google_sheets" && provider !== "slack") {
      return NextResponse.json(
        { success: false, error: "Invalid provider specified for disconnection." },
        { status: 400 }
      );
    }

    let success = false;
    if (provider === "google_sheets") {
      success = await disconnectGoogleIntegration(workspaceId);
    } else if (provider === "slack") {
      success = await disconnectSlackIntegration(workspaceId);
    }

    return NextResponse.json({
      success: true,
      provider,
      disconnected: success
    });
  } catch (error) {
    console.error("[Disconnect API] Error disconnecting integration:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to disconnect integration."
      },
      { status: 500 }
    );
  }
}
