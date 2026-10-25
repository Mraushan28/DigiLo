import mongoose, { Schema, Document, Model } from "mongoose";
import { IWorkflowStep, IWorkflowTrigger, WorkflowStepSchema, WorkflowTriggerSchema } from "./Workflow";

export interface IWorkflowVersion extends Document {
  workspaceId: string;
  workflowId: string;
  version: string;
  name: string;
  description: string;
  trigger: IWorkflowTrigger;
  steps: IWorkflowStep[];
  required_integrations: string[];
  changelog?: string;
  createdBy?: string;
  createdAt: Date;
}

const WorkflowVersionSchema = new Schema<IWorkflowVersion>(
  {
    workspaceId: { type: String, required: true, index: true },
    workflowId: { type: String, required: true, index: true },
    version: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    trigger: { type: WorkflowTriggerSchema, required: true },
    steps: { type: [WorkflowStepSchema], required: true },
    required_integrations: { type: [String], default: [] },
    changelog: { type: String },
    createdBy: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

WorkflowVersionSchema.index({ workspaceId: 1, workflowId: 1, version: 1 }, { unique: true });

export const WorkflowVersionModel: Model<IWorkflowVersion> =
  (mongoose.models.WorkflowVersion as Model<IWorkflowVersion>) ||
  mongoose.model<IWorkflowVersion>("WorkflowVersion", WorkflowVersionSchema);
