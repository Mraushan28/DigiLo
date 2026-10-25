import { NextRequest, NextResponse } from "next/server";
import { validateOAuthState, clearOAuthStateCookie } from "@/lib/automation/oauth/oauth-state";
import { exchangeGmailCodeForTokens, fetchGmailUserProfile, saveGmailConnection } from "@/lib/automation/oauth/gmail-oauth";
import { setWorkspaceCookie } from "@/lib/automation/workspace-session";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const errorMsg = errorDescription || error;
    console.warn("[Gmail Callback] Provider error:", errorMsg);
    const redirectUrl = new URL("/automation", req.nextUrl.origin);
    redirectUrl.searchParams.set("error", `Gmail connection cancelled: ${errorMsg}`);
    redirectUrl.searchParams.set("provider", "gmail");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    const redirectUrl = new URL("/automation", req.nextUrl.origin);
    redirectUrl.searchParams.set("error", "Missing code or state parameter in Gmail callback.");
    redirectUrl.searchParams.set("provider", "gmail");
    return NextResponse.redirect(redirectUrl);
  }

  const stateValidation = await validateOAuthState("gmail", state);
  if (!stateValidation.isValid || !stateValidation.workspaceId) {
    console.warn("[Gmail Callback] Invalid OAuth state:", stateValidation.error);
    const redirectUrl = new URL("/automation", req.nextUrl.origin);
    redirectUrl.searchParams.set("error", stateValidation.error || "OAuth security verification failed.");
    redirectUrl.searchParams.set("provider", "gmail");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const workspaceId = stateValidation.workspaceId;
    const tokens = await exchangeGmailCodeForTokens(code, req.nextUrl.origin);
    const profile = await fetchGmailUserProfile(tokens.access_token);

    await saveGmailConnection(workspaceId, tokens, profile);

    const successRedirectUrl = new URL("/automation", req.nextUrl.origin);
    successRedirectUrl.searchParams.set("connected", "gmail");

    const response = NextResponse.redirect(successRedirectUrl);
    clearOAuthStateCookie(response, "gmail");
    setWorkspaceCookie(response, workspaceId);

    return response;
  } catch (err) {
    console.error("[Gmail Callback] Token exchange failed:", err);
    const redirectUrl = new URL("/automation", req.nextUrl.origin);
    redirectUrl.searchParams.set("error", "Failed to complete Gmail connection. Please retry.");
    redirectUrl.searchParams.set("provider", "gmail");
    return NextResponse.redirect(redirectUrl);
  }
}
