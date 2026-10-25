import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMetric extends Document {
  workspaceId: string;
  workflowId: string;
  date: string; // YYYY-MM-DD
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  leadsIngested: number;
  sheetsRowsWritten: number;
  notificationsDelivered: number;
  createdAt: Date;
  updatedAt: Date;
}

const MetricSchema = new Schema<IMetric>(
  {
    workspaceId: { type: String, required: true, index: true },
    workflowId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    totalRuns: { type: Number, default: 0 },
    successfulRuns: { type: Number, default: 0 },
    failedRuns: { type: Number, default: 0 },
    leadsIngested: { type: Number, default: 0 },
    sheetsRowsWritten: { type: Number, default: 0 },
    notificationsDelivered: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

MetricSchema.index({ workspaceId: 1, workflowId: 1, date: 1 }, { unique: true });

export const MetricModel: Model<IMetric> =
  (mongoose.models.Metric as Model<IMetric>) ||
  mongoose.model<IMetric>("Metric", MetricSchema);
