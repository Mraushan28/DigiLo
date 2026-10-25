import { NextRequest, NextResponse } from "next/server";
import { isGoogleOAuthConfigured, buildGoogleAuthUrl } from "@/lib/automation/oauth/google-oauth";
import { generateOAuthState, setOAuthStateCookie } from "@/lib/automation/oauth/oauth-state";
import { getWorkspaceId, setWorkspaceCookie } from "@/lib/automation/workspace-session";

export async function GET(req: NextRequest) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured in server environment."
        },
        { status: 400 }
      );
    }

    const { workspaceId, isNew } = await getWorkspaceId();
    const returnUrl = req.nextUrl.searchParams.get("returnUrl") || 
      (req.nextUrl.searchParams.get("workflowId") ? `/dashboard/workflows/${req.nextUrl.searchParams.get("workflowId")}` : undefined);
    const state = generateOAuthState("google_sheets", workspaceId, returnUrl);
    const authUrl = buildGoogleAuthUrl(state, req.nextUrl.origin);

    const shouldRedirect = req.nextUrl.searchParams.get("redirect") === "true";

    const response = shouldRedirect
      ? NextResponse.redirect(authUrl)
      : NextResponse.json({ success: true, authUrl });

    setOAuthStateCookie(response, "google_sheets", state);
    if (isNew) {
      setWorkspaceCookie(response, workspaceId);
    }

    return response;
  } catch (error) {
    console.error("[Google Connect] Error starting OAuth flow:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate Google OAuth flow."
      },
      { status: 500 }
    );
  }
}
