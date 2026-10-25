import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { listSlackChannels } from "@/lib/automation/oauth/slack-oauth";

export async function GET() {
  try {
    const { workspaceId } = await getWorkspaceId();
    const channels = await listSlackChannels(workspaceId);

    return NextResponse.json({
      success: true,
      channels
    });
  } catch (error) {
    console.error("[Slack Channels] Error listing channels:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load Slack channels."
      },
      { status: 400 }
    );
  }
}
