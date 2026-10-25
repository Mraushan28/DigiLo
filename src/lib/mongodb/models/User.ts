import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  avatarUrl?: string;
  defaultWorkspaceId: string;
  role: "admin" | "member" | "viewer";
  providers: ("credentials" | "google")[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    avatarUrl: {
      type: String,
      required: false,
    },
    defaultWorkspaceId: {
      type: String,
      required: [true, "Default workspace ID is required"],
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "member",
    },
    providers: {
      type: [String],
      enum: ["credentials", "google"],
      default: ["credentials"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model in Next.js hot reloads
export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
