import OpenAI from "openai";
import { buildAutomationPlannerSystemPrompt } from "./prompts";
import { GenerateAutomationResponseSchema, GenerateAutomationResponse } from "../../types/automation";
import { getDefaultConfig, getActionDefinition, isActionSupported } from "../automation/action-registry";
import { isTriggerSupported } from "../automation/trigger-registry";
import { validateWorkflow, calculateRequiredIntegrations } from "../automation/workflow-validator";

let openai: OpenAI;

export async function generateAutomationPlan(
  prompt: string,
  clarificationAnswers?: { question: string; answer: string }[]
): Promise<GenerateAutomationResponse> {
  if (!process.env.NVIDIA_API_KEY) {
    return {
      status: "error",
      error: { code: "SERVER_ERROR", message: "NVIDIA API key not configured." }
    };
  }
  
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    });
  }

  try {
    console.log("[NVIDIA] request started");
    const start = Date.now();
    
    // Construct user content with optional clarification answers
    let userPrompt = prompt;
    if (clarificationAnswers && clarificationAnswers.length > 0) {
      userPrompt += "\n\nUser Clarifications to previous questions:\n" +
        clarificationAnswers
          .filter(ca => ca.answer?.trim())
          .map(ca => `- Question: ${ca.question}\n  Answer: ${ca.answer}`)
          .join("\n");
    }

    // Add 90 second timeout using AbortController (allows adequate time for reasoning models)
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 90000);

    const completion = await openai.chat.completions.create({
      model: process.env.NVIDIA_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: buildAutomationPlannerSystemPrompt() },
        { role: "user", content: userPrompt }
      ],
      temperature: 0,
      max_tokens: 1000,
      stream: false,
      reasoning_effort: "low"
    }, { signal: controller.signal });
    
    clearTimeout(timeout);
    
    const duration = Date.now() - start;
    console.log(`[NVIDIA] response received`);
    console.log(`[NVIDIA] inference duration: ${duration} ms`);

    const content = completion.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("NVIDIA returned an empty response");
    }
    
    console.log("[AI] content received");

    // Clean up markdown blocks from response
    let rawContent = content;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      rawContent = jsonMatch[1];
    }
    rawContent = rawContent.trim();
    
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(rawContent);
      console.log("[AI] JSON parsed");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "JSON parsing error";
      console.error("JSON Parsing Failed:", errMsg);
      return {
        status: "error",
        error: { code: "JSON_PARSE_ERROR", message: "Failed to parse AI response into valid JSON format." }
      };
    }
    
    // Zod validation as a structural safety check
    const validationResult = GenerateAutomationResponseSchema.safeParse(parsedOutput);
    
    if (!validationResult.success) {
      console.error("Zod Validation Failed:", validationResult.error);
      return {
        status: "error",
        error: { 
          code: "VALIDATION_FAILED", 
          message: `AI generated an invalid workflow format: ${validationResult.error.issues[0].path.join(".")} - ${validationResult.error.issues[0].message}` 
        }
      };
    }

    console.log("[AI] Zod validation passed");
    const finalResponse = validationResult.data;

    // Workflow post-processing and Dynamic Integration Catalog Validation
    if (finalResponse.status === "success" && finalResponse.workflow) {
      const workflow = finalResponse.workflow;

      // 1. Guardrail against unsupported triggers
      if (workflow.trigger && !isTriggerSupported(workflow.trigger.type)) {
        return {
          status: "needs_clarification",
          questions: [
            `Trigger type '${workflow.trigger.type}' is not supported. Supported triggers are Webhook (for external forms/APIs) and Manual Trigger. Which trigger would you like to use?`
          ]
        };
      }
      
      // 2. Guardrail against unsupported actions: Catch invented/hallucinated integrations
      for (const step of workflow.steps) {
        if (!isActionSupported(step.action)) {
          const actionStr = String(step.action);
          const serviceName = actionStr.includes(".") ? actionStr.split(".")[0] : actionStr;
          const formattedService = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
          return {
            status: "needs_clarification",
            questions: [
              `Your automation request requires '${formattedService}', which is not currently in Digilo's supported integration catalog. Supported integrations are Webhook, OpenAI, Google Sheets, and Slack. Would you like to save this data to Google Sheets or send notifications via Slack instead?`
            ]
          };
        }
      }

      // 3. User intent analysis: ensure actions strictly match requested intent
      const allUserInput = [
        userPrompt,
        ...(clarificationAnswers || []).map(ca => `${ca.question} ${ca.answer}`)
      ].join(" ").toLowerCase();

      const hasStorageIntent = /\b(sheet|sheets|spreadsheet|row|save|saved|saving|store|stored|storing|record|recorded|recording|log|logged|logging|database|table|append|excel|drive)\b/i.test(allUserInput);
      const hasNotificationIntent = /\b(slack|notify|notified|notifying|notification|notifications|alert|alerts|alerting|message|messages|messaging|ping|pinging|channel|inform|tell\s+my\s+team)\b/i.test(allUserInput);

      // Filter out actions unprompted by user intent (prevent unwanted defaults like unrequested Google Sheets or Slack)
      workflow.steps = workflow.steps.filter((step) => {
        if (step.action === "google_sheets.add_row" && !hasStorageIntent) {
          console.log("[Planner] Filtered out unrequested google_sheets.add_row action based on user intent.");
          return false;
        }
        if (step.action === "slack.send_message" && !hasNotificationIntent) {
          console.log("[Planner] Filtered out unrequested slack.send_message action based on user intent.");
          return false;
        }
        return true;
      });

      // If all steps were filtered out, ensure primary intent (e.g. AI analysis) is preserved
      if (workflow.steps.length === 0) {
        workflow.steps.push({
          id: "step_1",
          type: "action",
          action: "ai.analyze",
          name: "AI Lead Analysis & Scoring",
          description: "Analyze incoming lead data, evaluate qualification, and compute a lead score and summary.",
          config: {
            prompt: "Evaluate lead contact details, company size, and project scope. Return urgency score and executive summary."
          }
        });
      }

      // Re-index and enrich steps with catalog defaults & proper names
      workflow.steps = workflow.steps.map((step, idx) => {
        const def = getActionDefinition(step.action);
        const defaults = getDefaultConfig(step.action);
        return {
          ...step,
          id: `step_${idx + 1}`,
          name: step.name || def?.name || `Step ${idx + 1}`,
          config: {
            ...defaults,
            ...(step.config || {})
          }
        };
      });

      // 4. Verify and align workflow description with actual remaining actions
      const hasSheetsAction = workflow.steps.some(s => s.action === "google_sheets.add_row");
      const hasSlackAction = workflow.steps.some(s => s.action === "slack.send_message");
      const hasAiAction = workflow.steps.some(s => s.action === "ai.analyze");

      if (!hasSheetsAction) {
        workflow.description = workflow.description
          .replace(/,?\s*(which\s+is\s+then\s+|and\s+|then\s+)?(saved|save|stored|store|recorded|record)\s+(it\s+)?(to\s+|in\s+)?(a\s+)?google\s*sheets?(\s+spreadsheet)?/gi, "")
          .replace(/,?\s*save(s)?\s+(it|data|records)?\s+(to\s+|in\s+)?google\s*sheets?/gi, "")
          .trim();
      }

      if (!hasSlackAction) {
        workflow.description = workflow.description
          .replace(/,?\s*(which\s+is\s+then\s+|and\s+|then\s+)?(sent|send|posted|notified|alerted)\s+(to\s+)?(a\s+)?slack(\s+channel)?/gi, "")
          .replace(/,?\s*(and\s+)?(alert|alerting|notify|notifying)\s+(the\s+team\s+|sales\s+team\s+)?on\s+slack/gi, "")
          .trim();
      }

      // Clean up punctuation
      workflow.description = workflow.description.replace(/,\s*\.?$/, ".").trim();
      if (!workflow.description.endsWith(".")) {
        workflow.description += ".";
      }

      if (!hasSheetsAction && !hasSlackAction && hasAiAction) {
        if (/google\s*sheets?/i.test(workflow.description) || /slack/i.test(workflow.description) || workflow.description.length < 25) {
          workflow.description = "Receives new lead submissions via webhook and analyzes the lead using AI to generate a lead score and summary.";
          workflow.name = "LEAD AI ANALYSIS & SCORING";
        }
      }

      // 5. Synchronize required integrations based strictly on the workflow's trigger and actions
      workflow.required_integrations = calculateRequiredIntegrations(workflow);
      workflow.status = "draft";

      // 5. Comprehensive validation before returning to UI
      const validation = validateWorkflow(workflow);
      if (!validation.isValid) {
        const firstError = validation.errors[0];
        return {
          status: "error",
          error: {
            code: firstError.code,
            message: firstError.message
          }
        };
      }
    }

    return finalResponse;

  } catch (error: unknown) {
    const err = error as { name?: string; message?: string; status?: number; type?: string; code?: string };
    if (err.name === 'AbortError' || err.message?.includes('abort')) {
      console.error("NVIDIA Error: NVIDIA inference timed out");
      return {
        status: "error",
        error: { code: "TIMEOUT", message: "NVIDIA inference timed out. Please try again." }
      };
    }
    console.error("OpenAI Error:", err);
    return {
      status: "error",
      error: { 
        code: "AI_GENERATION_FAILED", 
        message: err.message || "We couldn't generate your automation. Please try again.",
        details: {
          status: err.status,
          type: err.type,
          code: err.code
        }
      }
    };
  }
}
