import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({
      success: true,
      authenticated: false,
      user: null,
      workspace: null,
    });
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
    },
    workspace: {
      id: session.workspaceId,
      role: session.role,
    },
  });
}
