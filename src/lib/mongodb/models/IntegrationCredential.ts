import mongoose, { Schema, Document, Model } from "mongoose";
import { IntegrationAccountInfo } from "@/types/automation";

export interface IEncryptedTokens {
  accessTokenCipher: string;
  refreshTokenCipher?: string;
  expiresAt?: number;
}

export interface IIntegrationCredential extends Document {
  workspaceId: string;
  provider: "google_sheets" | "slack" | "gmail";
  status: "connected" | "expired";
  account: IntegrationAccountInfo;
  encryptedTokens: IEncryptedTokens;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationCredentialSchema = new Schema<IIntegrationCredential>(
  {
    workspaceId: { type: String, required: true, index: true },
    provider: { type: String, enum: ["google_sheets", "slack", "gmail"], required: true },
    status: { type: String, enum: ["connected", "expired"], default: "connected" },
    account: { type: Schema.Types.Mixed, default: {} },
    encryptedTokens: {
      accessTokenCipher: { type: String, required: true },
      refreshTokenCipher: { type: String },
      expiresAt: { type: Number },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

IntegrationCredentialSchema.index({ workspaceId: 1, provider: 1 }, { unique: true });

export const IntegrationCredentialModel: Model<IIntegrationCredential> =
  (mongoose.models.IntegrationCredential as Model<IIntegrationCredential>) ||
  mongoose.model<IIntegrationCredential>("IntegrationCredential", IntegrationCredentialSchema);
