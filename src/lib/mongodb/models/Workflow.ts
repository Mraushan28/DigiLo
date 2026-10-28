import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorkflowStep {
  id: string;
  name?: string;
  type: "action";
  action: string;
  description: string;
  config?: Record<string, unknown>;
}

export interface IWorkflowTrigger {
  type: "webhook" | "manual" | string;
  source: string;
  event: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface IWorkflow extends Document {
  id?: string;
  workspaceId: string;
  name: string;
  description: string;
  version: string;
  status: "draft" | "setup_required" | "testing" | "approved" | "active" | "paused" | "failed" | "archived";
  trigger: IWorkflowTrigger;
  steps: IWorkflowStep[];
  required_integrations: string[];
  n8nWorkflowId?: string;
  approvedAt?: Date;
  activatedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowTriggerSchema = new Schema<IWorkflowTrigger>(
  {
    type: { type: String, required: true },
    source: { type: String, required: true },
    event: { type: String, required: true },
    description: { type: String },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

export const WorkflowStepSchema = new Schema<IWorkflowStep>(
  {
    id: { type: String, required: true },
    name: { type: String },
    type: { type: String, enum: ["action"], default: "action" },
    action: { type: String, required: true },
    description: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const WorkflowSchema = new Schema<IWorkflow>(
  {
    id: {
      type: String,
      required: false,
      index: true,
    },
    workspaceId: {
      type: String,
      required: [true, "Workspace ID is required for tenant isolation"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Workflow name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Workflow description is required"],
      trim: true,
    },
    version: {
      type: String,
      default: "1.0.0",
    },
    status: {
      type: String,
      enum: ["draft", "setup_required", "testing", "approved", "active", "paused", "failed", "archived"],
      default: "draft",
      index: true,
    },
    trigger: {
      type: WorkflowTriggerSchema,
      required: true,
    },
    steps: {
      type: [WorkflowStepSchema],
      required: true,
      default: [],
    },
    required_integrations: {
      type: [String],
      default: [],
    },
    n8nWorkflowId: {
      type: String,
      required: false,
    },
    approvedAt: {
      type: Date,
      required: false,
    },
    activatedAt: {
      type: Date,
      required: false,
    },
    createdBy: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    id: false, // Prevents Mongoose from creating a virtual 'id' getter that shadows the schema 'id' field with _id.toString()
  }
);

// Compound indexes for tenant isolation and listing workflows
WorkflowSchema.index({ workspaceId: 1, createdAt: -1 });
WorkflowSchema.index({ workspaceId: 1, status: 1 });
WorkflowSchema.index({ workspaceId: 1, id: 1 });

export const WorkflowModel: Model<IWorkflow> =
  (mongoose.models.Workflow as Model<IWorkflow>) ||
  mongoose.model<IWorkflow>("Workflow", WorkflowSchema);
