import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { updateIntegrationAccount } from "@/lib/automation/storage/integration-store";

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await getWorkspaceId();
    const body = await req.json();
    const { channelName } = body;

    if (!channelName) {
      return NextResponse.json(
        { success: false, error: "Channel name is required." },
        { status: 400 }
      );
    }

    await updateIntegrationAccount(workspaceId, "slack", {
      selectedChannel: channelName
    });

    return NextResponse.json({
      success: true,
      selectedChannel: channelName
    });
  } catch (error) {
    console.error("[Slack Select Channel] Error updating channel:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save selected Slack channel."
      },
      { status: 500 }
    );
  }
}
