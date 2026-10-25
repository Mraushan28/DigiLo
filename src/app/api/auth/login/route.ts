import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth/user-service";
import { setSessionCookie } from "@/lib/auth/session";
import { claimDraftWorkflow, clearDraftFromResponse } from "@/lib/automation/draft-session";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    const authResult = await loginUser({ email, password });

    const response = NextResponse.json({
      success: true,
      message: "Signed in successfully.",
      user: authResult.user,
      workspace: authResult.workspace,
    });

    setSessionCookie(response, authResult.token);

    // Claim pending draft workflow if exists
    const claimResult = await claimDraftWorkflow(authResult.workspace.id, authResult.user.id);
    if (claimResult.claimed && claimResult.workflowId) {
      clearDraftFromResponse(response);
      return NextResponse.json({
        success: true,
        message: "Signed in and draft workflow claimed.",
        user: authResult.user,
        workspace: authResult.workspace,
        claimedWorkflowId: claimResult.workflowId,
        redirectUrl: `/dashboard/workflows/${claimResult.workflowId}`,
        wasApproved: claimResult.wasApproved,
      }, { headers: response.headers });
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to sign in.";
    return NextResponse.json(
      {
        success: false,
        error: { code: "AUTH_FAILED", message },
      },
      { status: 401 }
    );
  }
}
