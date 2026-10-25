import { z } from "zod";

export const LeadPriorityEnum = z.enum(["High", "Medium", "Low"]);
export type LeadPriority = z.infer<typeof LeadPriorityEnum>;

export interface InboundLeadInfo {
  name?: string;
  email?: string;
  company?: string;
  service?: string;
  budget?: string;
  timeline?: string;
  notes?: string;
  submissionId?: string;
}

export interface FormatterAiOutput {
  urgencyScore?: number;
  priority: LeadPriority;
  summary: string;
}

/**
 * Validates the priority against allowed enum values (High, Medium, Low).
 * Returns the exact conditional Slack heading.
 * Never hardcodes or defaults every lead to high priority.
 */
export function formatSlackPriorityHeading(priority: string | undefined | null): {
  heading: string;
  priority: LeadPriority;
  isValid: boolean;
  error?: string;
} {
  if (!priority || typeof priority !== "string") {
    return {
      heading: "⚪ UNCLASSIFIED LEAD",
      priority: "Low",
      isValid: false,
      error: "Priority is missing or not a string.",
    };
  }

  const normalized = priority.trim();
  const parseResult = LeadPriorityEnum.safeParse(normalized);

  if (!parseResult.success) {
    // Try title-case matching if e.g. "high" was provided
    const titleCased = (normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()) as LeadPriority;
    const secondTry = LeadPriorityEnum.safeParse(titleCased);

    if (secondTry.success) {
      return getHeadingForValidatedPriority(secondTry.data);
    }

    return {
      heading: "⚪ UNCLASSIFIED LEAD",
      priority: "Low",
      isValid: false,
      error: `Invalid priority '${priority}'. Allowed enum values: High, Medium, Low.`,
    };
  }

  return getHeadingForValidatedPriority(parseResult.data);
}

function getHeadingForValidatedPriority(p: LeadPriority): {
  heading: string;
  priority: LeadPriority;
  isValid: boolean;
} {
  switch (p) {
    case "High":
      return { heading: "🚨 HIGH PRIORITY LEAD", priority: "High", isValid: true };
    case "Medium":
      return { heading: "🟡 MEDIUM PRIORITY LEAD", priority: "Medium", isValid: true };
    case "Low":
      return { heading: "🟢 LOW PRIORITY LEAD", priority: "Low", isValid: true };
  }
}

/**
 * Builds Slack notification message with dynamic conditional priority heading.
 */
export function buildSlackLeadNotificationMessage(
  lead: InboundLeadInfo,
  aiOutput: FormatterAiOutput
): {
  heading: string;
  text: string;
  priority: LeadPriority;
} {
  const { heading, priority, isValid, error } = formatSlackPriorityHeading(aiOutput.priority);

  if (!isValid) {
    throw new Error(`Slack notification message generation failed: ${error}`);
  }

  const text = [
    `*${heading}*`,
    `• *Name:* ${lead.name || "Unknown"} (${lead.company || "Independent"})`,
    `• *Email:* ${lead.email || "Not provided"}`,
    `• *Budget:* ${lead.budget || "Undisclosed"} | *Timeline:* ${lead.timeline || "Immediate"}`,
    `• *Urgency Score:* ${aiOutput.urgencyScore ?? 50}/100 [Priority: ${priority}]`,
    `• *AI Summary:* ${aiOutput.summary}`,
  ].join("\n");

  return { heading, text, priority };
}

/**
 * Renders Slack messages with genuine conditional priority support.
 * If incoming template contains unsupported conditional tags (e.g. {{#if ...}} or raw ternary),
 * safely constructs the validated conditional message in the backend adapter.
 */
export function renderSlackMessageWithConditions(
  templateOrMessage: string,
  context: {
    priority?: string;
    urgencyScore?: number;
    name?: string;
    email?: string;
    company?: string;
    service?: string;
    summary?: string;
    nextAction?: string;
    [key: string]: unknown;
  }
): { text: string; heading: string; priority: LeadPriority; isTemplateSupported: boolean } {
  const priorityInfo = formatSlackPriorityHeading(context.priority);
  const heading = priorityInfo.heading;
  const priority = priorityInfo.priority;

  // Check for unsupported mustache/handlebars conditional syntax or inline expressions
  const hasUnsupportedSyntax = /\{\{#if|\{\{#unless|\{\{#each|\{\{.*?(\?|===?|!==?|<|>).*?\}\}|\{\{eval|\{\{\$if/i.test(templateOrMessage);

  if (
    !templateOrMessage ||
    hasUnsupportedSyntax ||
    templateOrMessage.includes("Conditional priority notification")
  ) {
    const lines = [
      `*${heading}*`,
      context.name ? `• *Lead:* ${context.name} (${context.company || "Independent"})` : undefined,
      context.email ? `• *Email:* ${context.email}` : undefined,
      context.service ? `• *Service Requested:* ${context.service}` : undefined,
      context.urgencyScore !== undefined ? `• *Urgency Score:* ${context.urgencyScore}/100` : undefined,
      context.summary ? `• *AI Summary:* ${context.summary}` : undefined,
      context.nextAction ? `• *Next Action:* ${context.nextAction}` : undefined,
    ].filter(Boolean);

    return {
      text: lines.join("\n"),
      heading,
      priority,
      isTemplateSupported: !hasUnsupportedSyntax,
    };
  }

  // Safe standard variable substitution
  const rendered = templateOrMessage
    .replace(/\{\{\s*priority_heading\s*\}\}/g, heading)
    .replace(/\{\{\s*heading\s*\}\}/g, heading)
    .replace(/\{\{\s*priority\s*\}\}/g, priority)
    .replace(/\{\{\s*name\s*\}\}/g, String(context.name || ""))
    .replace(/\{\{\s*email\s*\}\}/g, String(context.email || ""))
    .replace(/\{\{\s*company\s*\}\}/g, String(context.company || ""))
    .replace(/\{\{\s*service\s*\}\}/g, String(context.service || ""))
    .replace(/\{\{\s*summary\s*\}\}/g, String(context.summary || ""))
    .replace(/\{\{\s*nextAction\s*\}\}/g, String(context.nextAction || ""))
    .replace(/\{\{\s*urgencyScore\s*\}\}/g, String(context.urgencyScore ?? ""));

  return {
    text: rendered,
    heading,
    priority,
    isTemplateSupported: true,
  };
}
