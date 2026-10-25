import { z } from "zod";

export const WorkflowTriggerSchema = z.object({
  type: z.enum(["webhook", "manual", "schedule"]),
  source: z.string().min(1, "Trigger source is required"),
  event: z.string().min(1, "Trigger event is required"),
  description: z.string().optional(),
  config: z.record(z.string(), z.any()).optional()
});

export const WorkflowStepSchema = z.object({
  id: z.string().min(1, "Step ID is required"),
  name: z.string().optional(),
  type: z.literal("action"),
  action: z.string().min(1, "Action identifier is required"),
  description: z.string().min(1, "Step description is required"),
  config: z.record(z.string(), z.any()).optional()
});

export const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().min(1, "Workflow description is required"),
  trigger: WorkflowTriggerSchema,
  steps: z.array(WorkflowStepSchema).min(1, "At least one action step is required"),
  required_integrations: z.array(z.string()),
  status: z.enum([
    "draft",
    "setup_required",
    "testing",
    "approved",
    "active",
    "paused",
    "failed",
    "archived",
  ]).optional(),
  version: z.string().optional(),
  webhookSecret: z.string().optional(),
  n8nWorkflowId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  approvedAt: z.string().optional(),
  activatedAt: z.string().optional(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const ClarificationAnswerSchema = z.object({
  question: z.string(),
  answer: z.string().min(1, "Answer cannot be empty")
});

export type ClarificationAnswer = z.infer<typeof ClarificationAnswerSchema>;

export const GenerateAutomationResponseSchema = z.object({
  status: z.enum(["success", "needs_clarification", "error"]),
  workflow: WorkflowSchema.optional(),
  questions: z.array(z.string()).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }).optional()
});

export type GenerateAutomationResponse = z.infer<typeof GenerateAutomationResponseSchema>;

export interface WorkflowValidationError {
  field?: string;
  stepId?: string;
  message: string;
  code: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: WorkflowValidationError[];
  warnings?: string[];
}

export type IntegrationConnectionStatus = "connected" | "not_connected" | "not_configured" | "expired" | "connection_failed";

export interface IntegrationAccountInfo {
  accountId?: string;
  email?: string;
  name?: string;
  workspaceName?: string;
  workspaceId?: string;
  connectedAt?: string;
  scopes?: string[];
  selectedChannel?: string;
  selectedSpreadsheet?: string;
  selectedSpreadsheetId?: string;
  selectedSheet?: string;
}

export interface IntegrationStatusInfo {
  id: string;
  name: string;
  category: string;
  status: IntegrationConnectionStatus;
  statusLabel: string;
  description: string;
  configuredEnvKeys?: string[];
  docsUrl?: string;
  oauthSupported?: boolean;
  isConfiguredInEnv?: boolean;
  isExpired?: boolean;
  account?: IntegrationAccountInfo;
}

export interface PublicIntegrationConnection {
  workspaceId: string;
  provider: "google_sheets" | "slack" | "gmail";
  status: "connected";
  account: IntegrationAccountInfo;
  updatedAt: string;
}


