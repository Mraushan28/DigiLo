import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { listGoogleWorksheets } from "@/lib/automation/oauth/google-oauth";

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await getWorkspaceId();
    const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: "Missing spreadsheetId parameter." },
        { status: 400 }
      );
    }

    const sheets = await listGoogleWorksheets(workspaceId, spreadsheetId);

    return NextResponse.json({
      success: true,
      sheets
    });
  } catch (error) {
    console.error("[Google Sheets] Error listing worksheet tabs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load worksheet tabs."
      },
      { status: 400 }
    );
  }
}
