import { NextRequest, NextResponse } from "next/server";
import { 
  validateOAuthState, 
  clearOAuthStateCookie 
} from "@/lib/automation/oauth/oauth-state";
import { 
  exchangeSlackCode, 
  storeSlackConnection 
} from "@/lib/automation/oauth/slack-oauth";
import { setWorkspaceCookie } from "@/lib/automation/workspace-session";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle provider cancellation or denial
  if (error) {
    console.warn("[Slack Callback] Provider error:", error);
    const redirectUrl = new URL("/automation", req.nextUrl.origin);
    redirectUrl.searchParams.set("error", `Slack installation cancelled: ${error}`);
    redirectUrl.searchParams.set("provider", "slack");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    const redirectUrl = new URL("/automation", req.nextUrl.origin);
    redirectUrl.searchParams.set("error", "Missing code or state parameter in Slack callback.");
    redirectUrl.searchParams.set("provider", "slack");
    return NextResponse.redirect(redirectUrl);
  }

  // Validate state against CSRF
  const stateValidation = await validateOAuthState("slack", state);
  const targetPath = stateValidation.returnUrl || "/automation";

  if (!stateValidation.isValid || !stateValidation.workspaceId) {
    console.warn("[Slack Callback] Invalid OAuth state:", stateValidation.error);
    const redirectUrl = new URL(targetPath, req.nextUrl.origin);
    redirectUrl.searchParams.set("error", stateValidation.error || "OAuth security verification failed.");
    redirectUrl.searchParams.set("provider", "slack");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const workspaceId = stateValidation.workspaceId;
    const accessData = await exchangeSlackCode(code, req.nextUrl.origin);

    await storeSlackConnection(workspaceId, accessData);

    const successRedirectUrl = new URL(targetPath, req.nextUrl.origin);
    successRedirectUrl.searchParams.set("connected", "slack");

    const response = NextResponse.redirect(successRedirectUrl);
    clearOAuthStateCookie(response, "slack");
    setWorkspaceCookie(response, workspaceId);

    return response;
  } catch (err) {
    console.error("[Slack Callback] Exchange/storage error:", err);
    const redirectUrl = new URL(targetPath, req.nextUrl.origin);
    redirectUrl.searchParams.set(
      "error", 
      err instanceof Error ? err.message : "Failed to complete Slack integration."
    );
    redirectUrl.searchParams.set("provider", "slack");
    return NextResponse.redirect(redirectUrl);
  }
}
