import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { updateIntegrationAccount } from "@/lib/automation/storage/integration-store";
import { listGoogleWorksheets } from "@/lib/automation/oauth/google-oauth";
import { getWorkflowById, saveWorkflow } from "@/lib/automation/workflow-service";

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await getWorkspaceId();
    const body = await req.json();
    const { spreadsheetName, sheetName, spreadsheetId, workflowId } = body;

    const normSpreadsheetName = (spreadsheetName || "").trim();
    const normSheetName = (sheetName || "").trim() || "Sheet1";
    const normSpreadsheetId = (spreadsheetId || "").trim();

    if (!normSpreadsheetName) {
      return NextResponse.json(
        { success: false, error: "Spreadsheet name is required." },
        { status: 400 }
      );
    }

    // Attempt to validate exact worksheet title against live Google Sheets metadata if ID is provided
    let resolvedTab = normSheetName;
    if (normSpreadsheetId) {
      try {
        const worksheets = await listGoogleWorksheets(workspaceId, normSpreadsheetId);
        const matched = worksheets.find(
          (w) => w === normSheetName || w.trim().toLowerCase() === normSheetName.toLowerCase()
        );
        if (matched) {
          resolvedTab = matched; // Use exact title from metadata
        } else if (worksheets.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Worksheet tab '${normSheetName}' does not exist in spreadsheet '${normSpreadsheetName}'. Available tabs: ${worksheets.join(", ")}.`,
            },
            { status: 400 }
          );
        }
      } catch (err) {
        console.warn("[Google Select] Live worksheet check error during save:", err);
      }
    }

    await updateIntegrationAccount(workspaceId, "google_sheets", {
      selectedSpreadsheet: normSpreadsheetName,
      selectedSpreadsheetId: normSpreadsheetId || undefined,
      selectedSheet: resolvedTab,
    });

    // If workflowId is provided, also sync the workflow's google_sheets step config
    let updatedWorkflow = null;
    if (workflowId) {
      try {
        const workflow = await getWorkflowById(workspaceId, workflowId);
        if (workflow) {
          const sheetsStep = workflow.steps.find((s) => s.action === "google_sheets.add_row");
          if (sheetsStep) {
            sheetsStep.config = {
              ...sheetsStep.config,
              spreadsheet: normSpreadsheetName,
              spreadsheetId: normSpreadsheetId || undefined,
              sheetName: resolvedTab,
            };
            workflow.updatedAt = new Date().toISOString();
            updatedWorkflow = await saveWorkflow(workspaceId, workflow);
          }
        }
      } catch (wfErr) {
        console.warn("[Google Select] Failed to sync workflow step config:", wfErr);
      }
    }

    return NextResponse.json({
      success: true,
      selectedSpreadsheet: normSpreadsheetName,
      selectedSpreadsheetId: normSpreadsheetId,
      selectedSheet: resolvedTab,
      workflow: updatedWorkflow,
    });
  } catch (error) {
    console.error("[Google Select] Error updating selection:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save spreadsheet selection."
      },
      { status: 500 }
    );
  }
}
