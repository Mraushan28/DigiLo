import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStepExecutionResult {
  stepId: string;
  stepName: string;
  action: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  errorMessage?: string;
  errorRemediation?: string;
}

export interface IExecution extends Document {
  workspaceId: string;
  workflowId: string;
  n8nExecutionId: string;
  status: "success" | "failed" | "running" | "cancelled";
  startedAt: Date;
  finishedAt?: Date;
  durationMs: number;
  triggerEvent: {
    source: string;
    event: string;
    redactedSummary?: string;
  };
  stepResults: IStepExecutionResult[];
  metricsEffect: {
    leadsIngested: number;
    sheetsRowsWritten: number;
    notificationsDelivered: number;
  };
  retryEligible: boolean;
  retryCount: number;
  submissionId?: string;
  idempotencyKey?: string;
  lastError?: string;
  slackNotificationStatus?: "sent" | "skipped" | "failed" | "pending";
  sheetsRowStatus?: "appended" | "skipped" | "failed" | "pending";
  createdAt: Date;
  updatedAt: Date;
}

const StepExecutionResultSchema = new Schema<IStepExecutionResult>(
  {
    stepId: { type: String, required: true },
    stepName: { type: String, required: true },
    action: { type: String, required: true },
    status: { type: String, enum: ["success", "failed", "skipped"], required: true },
    durationMs: { type: Number, default: 0 },
    inputSummary: { type: Schema.Types.Mixed },
    outputSummary: { type: Schema.Types.Mixed },
    errorMessage: { type: String },
    errorRemediation: { type: String },
  },
  { _id: false }
);

const ExecutionSchema = new Schema<IExecution>(
  {
    workspaceId: { type: String, required: true, index: true },
    workflowId: { type: String, required: true, index: true },
    n8nExecutionId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["success", "failed", "running", "cancelled"],
      default: "running",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    durationMs: { type: Number, default: 0 },
    triggerEvent: {
      source: { type: String, default: "webhook" },
      event: { type: String, default: "event" },
      redactedSummary: { type: String },
    },
    stepResults: { type: [StepExecutionResultSchema], default: [] },
    metricsEffect: {
      leadsIngested: { type: Number, default: 0 },
      sheetsRowsWritten: { type: Number, default: 0 },
      notificationsDelivered: { type: Number, default: 0 },
    },
    retryEligible: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0 },
    submissionId: { type: String, index: true },
    idempotencyKey: { type: String, index: true },
    lastError: { type: String },
    slackNotificationStatus: {
      type: String,
      enum: ["sent", "skipped", "failed", "pending"],
      default: "pending",
    },
    sheetsRowStatus: {
      type: String,
      enum: ["appended", "skipped", "failed", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

ExecutionSchema.index({ workspaceId: 1, workflowId: 1, startedAt: -1 });

export const ExecutionModel: Model<IExecution> =
  (mongoose.models.Execution as Model<IExecution>) ||
  mongoose.model<IExecution>("Execution", ExecutionSchema);
