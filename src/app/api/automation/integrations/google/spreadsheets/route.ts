import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { listGoogleSpreadsheets } from "@/lib/automation/oauth/google-oauth";

export async function GET() {
  try {
    const { workspaceId } = await getWorkspaceId();
    const spreadsheets = await listGoogleSpreadsheets(workspaceId);

    return NextResponse.json({
      success: true,
      spreadsheets
    });
  } catch (error) {
    console.error("[Google Spreadsheets] Error listing spreadsheets:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load Google Spreadsheets."
      },
      { status: 400 }
    );
  }
}
