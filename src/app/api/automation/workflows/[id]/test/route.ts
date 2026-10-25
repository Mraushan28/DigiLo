import { NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/automation/workspace-session";
import { getWorkflowById } from "@/lib/automation/workflow-service";
import { executeDryRunTest } from "@/lib/automation/n8n-client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workspaceId } = await getWorkspaceId();
    const body = await req.json().catch(() => ({}));

    const workflow = await getWorkflowById(workspaceId, id);
    if (!workflow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Workflow '${id}' not found.` } },
        { status: 404 }
      );
    }

    const testResult = await executeDryRunTest(workflow, workspaceId, body.payload);
    const isSuccess = testResult.status === "success";
    const failedStep = testResult.stepResults.find((s) => s.status === "failed");

    return NextResponse.json(
      {
        success: isSuccess,
        message: isSuccess
          ? "Dry-run test completed successfully with verified step outputs."
          : `Dry-run test failed: ${failedStep?.errorMessage || "Review step diagnostics for remediation."}`,
        testResult,
        error: isSuccess
          ? undefined
          : {
              code: "STEP_EXECUTION_FAILED",
              message: failedStep?.errorMessage || "One or more steps failed during test execution.",
              stepId: failedStep?.stepId,
            },
      },
      { status: isSuccess ? 200 : 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow test execution failed.";
    return NextResponse.json(
      { success: false, error: { code: "TEST_FAILED", message } },
      { status: 500 }
    );
  }
}
