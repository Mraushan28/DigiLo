import { NextResponse } from "next/server";
import { generateAutomationPlan } from "@/lib/ai/automation-planner";
import { z } from "zod";

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1, "Please provide an automation prompt.").max(2000, "Prompt is too long."),
  clarificationAnswers: z.array(
    z.object({
      question: z.string(),
      answer: z.string()
    })
  ).optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const parseResult = GenerateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: parseResult.error.issues[0].message
        }
      }, { status: 400 });
    }

    const { prompt, clarificationAnswers } = parseResult.data;

    const result = await generateAutomationPlan(prompt, clarificationAnswers);


    if (result.status === "error") {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    if (result.status === "needs_clarification") {
      return NextResponse.json({
        success: true,
        status: "needs_clarification",
        questions: result.questions
      });
    }

    return NextResponse.json({
      success: true,
      status: "success",
      workflow: result.workflow
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({
      success: false,
      error: { code: "SERVER_ERROR", message: "An unexpected error occurred." }
    }, { status: 500 });
  }
}
