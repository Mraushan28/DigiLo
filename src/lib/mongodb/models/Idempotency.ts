import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIdempotencyRecord extends Document {
  workspaceId: string;
  submissionId: string;
  idempotencyKey: string;
  workflowId?: string;
  status: "processing" | "completed" | "failed";
  executionId: string;
  responsePayload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const IdempotencySchema = new Schema<IIdempotencyRecord>(
  {
    workspaceId: { type: String, required: true },
    submissionId: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    workflowId: { type: String },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    executionId: { type: String, required: true },
    responsePayload: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index for strict tenant-scoped idempotency
IdempotencySchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });

// 24-hour TTL index for automatic expiration
IdempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const IdempotencyModel: Model<IIdempotencyRecord> =
  mongoose.models.Idempotency || mongoose.model<IIdempotencyRecord>("Idempotency", IdempotencySchema);
