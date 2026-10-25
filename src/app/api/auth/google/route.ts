import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { authenticateWithGoogle } from "@/lib/auth/user-service";
import { setSessionCookie } from "@/lib/auth/session";
import { claimDraftWorkflow } from "@/lib/automation/draft-session";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = "openid email profile";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Generate tamper-resistant state
  const state = crypto.randomBytes(24).toString("hex");

  if (!clientId) {
    // If Google OAuth credentials are not yet set in .env.local, provide clear response
    return NextResponse.json({
      configured: false,
      message: "GOOGLE_CLIENT_ID is not configured in server environment.",
      // Development mock fallback URL if requested
      mockAuthUrl: `${origin}/api/auth/google/callback?mock=true&state=${state}`
    }, { status: 200 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "select_account",
    state
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  const acceptsJson = req.headers.get("accept")?.includes("application/json");
  if (acceptsJson) {
    return NextResponse.json({ configured: true, authUrl });
  }

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("digilo_google_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600 // 10 minutes
  });
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, avatarUrl, credential } = body;

    let targetEmail = email;
    let targetName = name;
    let targetAvatar = avatarUrl;

    // If a Google JWT credential (ID Token) was passed from Google One Tap / Sign In button
    if (credential && typeof credential === "string") {
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
          targetEmail = payload.email || targetEmail;
          targetName = payload.name || targetName;
          targetAvatar = payload.picture || targetAvatar;
        }
      } catch (err) {
        console.warn("[Google Auth POST] Could not decode credential JWT:", err);
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Email is required for Google authentication." },
        { status: 400 }
      );
    }

    const authResult = await authenticateWithGoogle({
      email: targetEmail,
      name: targetName || targetEmail.split("@")[0],
      avatarUrl: targetAvatar,
    });

    const res = NextResponse.json({
      success: true,
      user: authResult.user,
      workspace: authResult.workspace,
    });

    setSessionCookie(res, authResult.token);

    // Auto-claim any unauthenticated draft workflow into the user's workspace
    const claimedDraft = await claimDraftWorkflow(authResult.workspace.id);
    if (claimedDraft) {
      res.cookies.delete("digilo_draft_workflow");
    }

    return res;
  } catch (err: unknown) {
    console.error("[Google Auth POST] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to authenticate with Google." },
      { status: 500 }
    );
  }
}
