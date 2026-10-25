import { NextRequest, NextResponse } from "next/server";
import { isSlackOAuthConfigured, buildSlackAuthUrl } from "@/lib/automation/oauth/slack-oauth";
import { generateOAuthState, setOAuthStateCookie } from "@/lib/automation/oauth/oauth-state";
import { getWorkspaceId, setWorkspaceCookie } from "@/lib/automation/workspace-session";

export async function GET(req: NextRequest) {
  try {
    if (!isSlackOAuthConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Slack OAuth credentials (SLACK_CLIENT_ID / SLACK_CLIENT_SECRET) are not configured in server environment."
        },
        { status: 400 }
      );
    }

    const { workspaceId, isNew } = await getWorkspaceId();
    const returnUrl = req.nextUrl.searchParams.get("returnUrl") || 
      (req.nextUrl.searchParams.get("workflowId") ? `/dashboard/workflows/${req.nextUrl.searchParams.get("workflowId")}` : undefined);
    const state = generateOAuthState("slack", workspaceId, returnUrl);
    const authUrl = buildSlackAuthUrl(state, req.nextUrl.origin);

    const shouldRedirect = req.nextUrl.searchParams.get("redirect") === "true";

    const response = shouldRedirect
      ? NextResponse.redirect(authUrl)
      : NextResponse.json({ success: true, authUrl });

    setOAuthStateCookie(response, "slack", state);
    if (isNew) {
      setWorkspaceCookie(response, workspaceId);
    }

    return response;
  } catch (error) {
    console.error("[Slack Connect] Error starting OAuth flow:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate Slack OAuth flow."
      },
      { status: 500 }
    );
  }
}
