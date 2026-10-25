import { NextRequest, NextResponse } from "next/server";
import { 
  validateOAuthState, 
  clearOAuthStateCookie 
} from "@/lib/automation/oauth/oauth-state";
import { 
  exchangeGoogleCode, 
  storeGoogleConnection 
} from "@/lib/automation/oauth/google-oauth";
import { setWorkspaceCookie } from "@/lib/automation/workspace-session";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle provider-level error or cancellation
  if (error) {
    const errorMsg = errorDescription || error;
    console.warn("[Google Callback] Provider error:", errorMsg);
    const redirectUrl = new URL("/automation", req.nextUrl.origin);
    redirectUrl.searchParams.set("error", `Google connection cancelled or failed: ${errorMsg}`);
    redirectUrl.searchParams.set("provider", "google_sheets");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    const redirectUrl = new URL("/automation", req.nextUrl.origin);
    redirectUrl.searchParams.set("error", "Missing code or state parameter in Google callback.");
    redirectUrl.searchParams.set("provider", "google_sheets");
    return NextResponse.redirect(redirectUrl);
  }

  // Validate state against CSRF attack and check expiration
  const stateValidation = await validateOAuthState("google_sheets", state);
  const targetPath = stateValidation.returnUrl || "/automation";

  if (!stateValidation.isValid || !stateValidation.workspaceId) {
    console.warn("[Google Callback] Invalid OAuth state:", stateValidation.error);
    const redirectUrl = new URL(targetPath, req.nextUrl.origin);
    redirectUrl.searchParams.set("error", stateValidation.error || "OAuth security verification failed.");
    redirectUrl.searchParams.set("provider", "google_sheets");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const workspaceId = stateValidation.workspaceId;
    const { tokens, profile } = await exchangeGoogleCode(code, req.nextUrl.origin);

    await storeGoogleConnection(workspaceId, tokens, profile);

    const successRedirectUrl = new URL(targetPath, req.nextUrl.origin);
    successRedirectUrl.searchParams.set("connected", "google_sheets");

    const response = NextResponse.redirect(successRedirectUrl);
    clearOAuthStateCookie(response, "google_sheets");
    setWorkspaceCookie(response, workspaceId);

    return response;
  } catch (err) {
    console.error("[Google Callback] Exchange/storage error:", err);
    const redirectUrl = new URL(targetPath, req.nextUrl.origin);
    redirectUrl.searchParams.set(
      "error", 
      err instanceof Error ? err.message : "Failed to complete Google Sheets connection."
    );
    redirectUrl.searchParams.set("provider", "google_sheets");
    return NextResponse.redirect(redirectUrl);
  }
}
