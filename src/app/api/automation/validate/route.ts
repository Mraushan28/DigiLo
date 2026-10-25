import { NextResponse } from "next/server";
import { WorkflowSchema } from "@/types/automation";
import { validateWorkflow } from "@/lib/automation/workflow-validator";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const workflow = body?.workflow;

    if (!workflow) {
      return NextResponse.json({
        success: false,
        error: { code: "MISSING_WORKFLOW", message: "Workflow payload is required." }
      }, { status: 400 });
    }

    // Check basic schema
    const schemaResult = WorkflowSchema.safeParse(workflow);
    const validationResult = validateWorkflow(workflow);

    const isFullyValid = schemaResult.success && validationResult.isValid;

    return NextResponse.json({
      success: true,
      isValid: isFullyValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings || [],
      schemaIssues: schemaResult.success ? [] : schemaResult.error.issues.map(i => ({
        path: i.path.join("."),
        message: i.message
      }))
    });
  } catch (error) {
    console.error("Workflow validation API error:", error);
    return NextResponse.json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to validate workflow." }
    }, { status: 500 });
  }
}
