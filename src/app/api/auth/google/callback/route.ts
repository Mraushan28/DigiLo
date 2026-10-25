import { NextRequest, NextResponse } from "next/server";
import { authenticateWithGoogle } from "@/lib/auth/user-service";
import { setSessionCookie } from "@/lib/auth/session";
import { claimDraftWorkflow } from "@/lib/automation/draft-session";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const isMock = searchParams.get("mock") === "true";
  const error = searchParams.get("error");
  const origin = req.nextUrl.origin;

  if (error) {
    const redirectUrl = new URL("/automation", origin);
    redirectUrl.searchParams.set("auth_error", `Google login failed: ${error}`);
    return NextResponse.redirect(redirectUrl);
  }

  // Support dev mock if Google console is unconfigured
  if (isMock) {
    const mockEmail = searchParams.get("email") || "dev.user@digilo.tech";
    const mockName = searchParams.get("name") || "Digilo Developer";

    const authResult = await authenticateWithGoogle({
      email: mockEmail,
      name: mockName,
    });

    const claimedDraft = await claimDraftWorkflow(authResult.workspace.id, authResult.user.id);
    const targetUrl = claimedDraft?.claimed && claimedDraft.workflowId
      ? new URL(`/dashboard/workflows/${claimedDraft.workflowId}`, origin)
      : new URL("/automation", origin);

    if (!claimedDraft?.claimed) {
      targetUrl.searchParams.set("auth_success", "google");
    }

    const res = NextResponse.redirect(targetUrl);
    setSessionCookie(res, authResult.token);
    if (claimedDraft?.claimed) {
      res.cookies.delete("digilo_draft_workflow");
    }

    return res;
  }

  if (!code) {
    const redirectUrl = new URL("/automation", origin);
    redirectUrl.searchParams.set("auth_error", "Missing authorization code from Google.");
    return NextResponse.redirect(redirectUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    const redirectUrl = new URL("/automation", origin);
    redirectUrl.searchParams.set("auth_error", "Server is missing Google OAuth client configuration.");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[Google Auth Callback] Token exchange failed:", errBody);
      const redirectUrl = new URL("/automation", origin);
      redirectUrl.searchParams.set("auth_error", "Google token exchange failed.");
      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenRes.json();

    // 2. Fetch user profile
    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!profileRes.ok) {
      const redirectUrl = new URL("/automation", origin);
      redirectUrl.searchParams.set("auth_error", "Failed to retrieve user profile from Google.");
      return NextResponse.redirect(redirectUrl);
    }

    const profile = await profileRes.json();

    if (!profile.email) {
      const redirectUrl = new URL("/automation", origin);
      redirectUrl.searchParams.set("auth_error", "No email returned by Google account.");
      return NextResponse.redirect(redirectUrl);
    }

    // 3. Register or sign in user to workspace
    const authResult = await authenticateWithGoogle({
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      avatarUrl: profile.picture
    });

    // Auto-claim pending draft
    const claimedDraft = await claimDraftWorkflow(authResult.workspace.id, authResult.user.id);
    const targetUrl = claimedDraft?.claimed && claimedDraft.workflowId
      ? new URL(`/dashboard/workflows/${claimedDraft.workflowId}`, origin)
      : new URL("/automation", origin);

    if (!claimedDraft?.claimed) {
      targetUrl.searchParams.set("auth_success", "google");
    }

    const res = NextResponse.redirect(targetUrl);
    setSessionCookie(res, authResult.token);
    if (claimedDraft?.claimed) {
      res.cookies.delete("digilo_draft_workflow");
    }

    return res;
  } catch (err: unknown) {
    console.error("[Google Auth Callback] Exception:", err);
    const redirectUrl = new URL("/automation", origin);
    redirectUrl.searchParams.set(
      "auth_error",
      err instanceof Error ? err.message : "Authentication exception."
    );
    return NextResponse.redirect(redirectUrl);
  }
}
