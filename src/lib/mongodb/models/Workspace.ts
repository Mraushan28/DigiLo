import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorkspaceMember {
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  ownerId: string;
  members: IWorkspaceMember[];
  plan: "starter" | "growth" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Workspace slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: [true, "Owner ID is required"],
      index: true,
    },
    members: {
      type: [WorkspaceMemberSchema],
      default: [],
    },
    plan: {
      type: String,
      enum: ["starter", "growth", "enterprise"],
      default: "starter",
    },
  },
  {
    timestamps: true,
  }
);

WorkspaceSchema.index({ ownerId: 1 });
WorkspaceSchema.index({ "members.userId": 1 });

export const WorkspaceModel: Model<IWorkspace> =
  (mongoose.models.Workspace as Model<IWorkspace>) ||
  mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);
