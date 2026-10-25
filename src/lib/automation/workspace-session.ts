import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentSession } from "@/lib/auth/session";

export const WORKSPACE_COOKIE_NAME = "digilo_workspace_id";

export interface WorkspaceSessionResult {
  workspaceId: string;
  isNew: boolean;
  isAuthenticated: boolean;
}

/**
 * Retrieves the workspace ID bound to the authenticated user session,
 * or from the incoming cookies, or generates a new secure UUID.
 */
export async function getWorkspaceId(): Promise<WorkspaceSessionResult> {
  // 1. Check if authenticated user session exists
  try {
    const session = await getCurrentSession();
    if (session?.workspaceId && isValidWorkspaceId(session.workspaceId)) {
      return { workspaceId: session.workspaceId, isNew: false, isAuthenticated: true };
    }
  } catch {
    // Continue to cookie check if session verification fails
  }

  // 2. Fallback to anonymous workspace session cookie
  const cookieStore = await cookies();
  const existing = cookieStore.get(WORKSPACE_COOKIE_NAME)?.value;

  if (existing && isValidWorkspaceId(existing)) {
    return { workspaceId: existing, isNew: false, isAuthenticated: false };
  }

  // 3. Generate new secure UUID v4
  const newWorkspaceId = crypto.randomUUID();
  return { workspaceId: newWorkspaceId, isNew: true, isAuthenticated: false };
}

/**
 * Sets the workspace session cookie on a NextResponse object.
 */
export function setWorkspaceCookie(response: NextResponse, workspaceId: string): void {
  response.cookies.set({
    name: WORKSPACE_COOKIE_NAME,
    value: workspaceId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 // 1 year persistence
  });
}

function isValidWorkspaceId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  // UUID v4 format verification OR 24-hex ObjectId OR ws_ prefixed ID
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    /^[0-9a-f]{24}$/i.test(id) ||
    /^ws_[0-9a-zA-Z_-]+$/i.test(id)
  );
}
