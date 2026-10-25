import { NextRequest, NextResponse } from "next/server";
import { isGmailOAuthConfigured, buildGmailAuthUrl } from "@/lib/automation/oauth/gmail-oauth";
import { generateOAuthState, setOAuthStateCookie } from "@/lib/automation/oauth/oauth-state";
import { getWorkspaceId, setWorkspaceCookie } from "@/lib/automation/workspace-session";

export async function GET(req: NextRequest) {
  try {
    if (!isGmailOAuthConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured in server environment.",
        },
        { status: 400 }
      );
    }

    const { workspaceId, isNew } = await getWorkspaceId();
    const state = generateOAuthState("gmail", workspaceId);
    const authUrl = buildGmailAuthUrl(state, req.nextUrl.origin);

    const shouldRedirect = req.nextUrl.searchParams.get("redirect") === "true";

    const response = shouldRedirect
      ? NextResponse.redirect(authUrl)
      : NextResponse.json({ success: true, authUrl });

    setOAuthStateCookie(response, "gmail", state);
    if (isNew) {
      setWorkspaceCookie(response, workspaceId);
    }

    return response;
  } catch (error) {
    console.error("[Gmail Connect] Error starting OAuth flow:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate Gmail OAuth flow.",
      },
      { status: 500 }
    );
  }
}
