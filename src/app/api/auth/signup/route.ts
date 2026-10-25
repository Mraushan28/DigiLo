import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth/user-service";
import { setSessionCookie } from "@/lib/auth/session";
import { claimDraftWorkflow, clearDraftFromResponse } from "@/lib/automation/draft-session";
import { z } from "zod";

const SignupSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  name: z.string().min(1, "Name is required."),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = SignupSchema.safeParse(body);

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

    const { email, password, name } = parseResult.data;

    // Register user & provision default workspace
    const authResult = await registerUser({ email, password, name });

    // Build response and attach HTTP-only session cookie
    const response = NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: authResult.user,
      workspace: authResult.workspace,
    });

    setSessionCookie(response, authResult.token);

    // Check if there is an unauthenticated draft workflow to claim
    const claimResult = await claimDraftWorkflow(authResult.workspace.id, authResult.user.id);
    if (claimResult.claimed && claimResult.workflowId) {
      clearDraftFromResponse(response);
      return NextResponse.json({
        success: true,
        message: "Account created and draft workflow claimed.",
        user: authResult.user,
        workspace: authResult.workspace,
        claimedWorkflowId: claimResult.workflowId,
        redirectUrl: `/dashboard/workflows/${claimResult.workflowId}`,
        wasApproved: claimResult.wasApproved,
      }, { headers: response.headers });
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create account.";
    return NextResponse.json(
      {
        success: false,
        error: { code: "SIGNUP_FAILED", message },
      },
      { status: 400 }
    );
  }
}
