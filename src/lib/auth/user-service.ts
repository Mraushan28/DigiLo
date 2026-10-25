import crypto from "node:crypto";
import { connectToDatabase, isMongoConnected } from "@/lib/mongodb/client";
import { UserModel, IUser } from "@/lib/mongodb/models/User";
import { WorkspaceModel, IWorkspace } from "@/lib/mongodb/models/Workspace";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken } from "./session";

// In-memory fallback stores for offline dev / test resilience
const memoryUsers = new Map<string, {
  id: string;
  email: string;
  passwordHash?: string;
  name: string;
  avatarUrl?: string;
  defaultWorkspaceId: string;
  role: "admin" | "member" | "viewer";
  providers: ("credentials" | "google")[];
  createdAt: string;
}>();

const memoryWorkspaces = new Map<string, {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: Array<{ userId: string; role: "owner" | "admin" | "member"; joinedAt: string }>;
  plan: "starter" | "growth" | "enterprise";
  createdAt: string;
}>();

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    defaultWorkspaceId: string;
    role: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    role: "owner" | "admin" | "member";
  };
  token: string;
}

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

/**
 * Registers a new user with email and password, provisioning an isolated default workspace.
 */
export async function registerUser(params: {
  email: string;
  password?: string;
  name: string;
  provider?: "credentials" | "google";
  avatarUrl?: string;
}): Promise<AuthResult> {
  const email = params.email.toLowerCase().trim();
  const name = params.name.trim();

  if (!email || !email.includes("@")) {
    throw new Error("A valid email address is required.");
  }
  if (!name) {
    throw new Error("Name is required.");
  }

  const workspaceId = `ws_${crypto.randomUUID()}`;
  const userId = `usr_${crypto.randomUUID()}`;
  const workspaceSlug = generateSlug(name);
  const passwordHash = params.password ? await hashPassword(params.password) : undefined;
  const provider = params.provider || "credentials";

  // 1. Try MongoDB persistence if available
  try {
    const conn = await connectToDatabase();
    if (conn && isMongoConnected()) {
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        throw new Error("An account with this email address already exists.");
      }

      // Create workspace first
      const workspaceDoc = await WorkspaceModel.create({
        name: `${name}'s Workspace`,
        slug: workspaceSlug,
        ownerId: userId,
        members: [{ userId, role: "owner", joinedAt: new Date() }],
        plan: "starter",
      });

      const actualWorkspaceId = workspaceDoc._id.toString();

      // Create user
      const userDoc = await UserModel.create({
        email,
        passwordHash,
        name,
        avatarUrl: params.avatarUrl,
        defaultWorkspaceId: actualWorkspaceId,
        role: "member",
        providers: [provider],
      });

      const actualUserId = userDoc._id.toString();

      // Update ownerId to real ObjectId string
      workspaceDoc.ownerId = actualUserId;
      workspaceDoc.members[0].userId = actualUserId;
      await workspaceDoc.save();

      const token = createSessionToken({
        userId: actualUserId,
        email,
        name,
        workspaceId: actualWorkspaceId,
        role: "owner",
      });

      return {
        user: {
          id: actualUserId,
          email,
          name,
          avatarUrl: params.avatarUrl,
          defaultWorkspaceId: actualWorkspaceId,
          role: "member",
        },
        workspace: {
          id: actualWorkspaceId,
          name: workspaceDoc.name,
          slug: workspaceDoc.slug,
          role: "owner",
        },
        token,
      };
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("already exists")) {
      throw err;
    }
    console.warn("[UserService] MongoDB registration failed, falling back to in-memory:", err);
  }

  // 2. In-memory fallback
  for (const u of memoryUsers.values()) {
    if (u.email === email) {
      throw new Error("An account with this email address already exists.");
    }
  }

  memoryWorkspaces.set(workspaceId, {
    id: workspaceId,
    name: `${name}'s Workspace`,
    slug: workspaceSlug,
    ownerId: userId,
    members: [{ userId, role: "owner", joinedAt: new Date().toISOString() }],
    plan: "starter",
    createdAt: new Date().toISOString(),
  });

  memoryUsers.set(userId, {
    id: userId,
    email,
    passwordHash,
    name,
    avatarUrl: params.avatarUrl,
    defaultWorkspaceId: workspaceId,
    role: "member",
    providers: [provider],
    createdAt: new Date().toISOString(),
  });

  const token = createSessionToken({
    userId,
    email,
    name,
    workspaceId,
    role: "owner",
  });

  return {
    user: {
      id: userId,
      email,
      name,
      avatarUrl: params.avatarUrl,
      defaultWorkspaceId: workspaceId,
      role: "member",
    },
    workspace: {
      id: workspaceId,
      name: `${name}'s Workspace`,
      slug: workspaceSlug,
      role: "owner",
    },
    token,
  };
}

/**
 * Authenticates an existing user via email & password.
 */
export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = params.email.toLowerCase().trim();

  // 1. Try MongoDB
  try {
    const conn = await connectToDatabase();
    if (conn && isMongoConnected()) {
      const user = await UserModel.findOne({ email }).lean<IUser>();
      if (!user) {
        throw new Error("Invalid email or password.");
      }

      if (!user.passwordHash) {
        throw new Error("This account uses Google Sign-In. Please sign in with Google.");
      }

      const isValid = await verifyPassword(params.password, user.passwordHash);
      if (!isValid) {
        throw new Error("Invalid email or password.");
      }

      const workspace = await WorkspaceModel.findById(user.defaultWorkspaceId).lean<IWorkspace>();
      const workspaceId = workspace ? workspace._id.toString() : user.defaultWorkspaceId;
      const workspaceName = workspace ? workspace.name : `${user.name}'s Workspace`;
      const workspaceSlug = workspace ? workspace.slug : "default-workspace";

      const token = createSessionToken({
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        workspaceId,
        role: "owner",
      });

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          defaultWorkspaceId: workspaceId,
          role: user.role,
        },
        workspace: {
          id: workspaceId,
          name: workspaceName,
          slug: workspaceSlug,
          role: "owner",
        },
        token,
      };
    }
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes("Invalid email") || err.message.includes("Google Sign-In"))) {
      throw err;
    }
    console.warn("[UserService] MongoDB login error, falling back to in-memory:", err);
  }

  // 2. In-memory fallback
  let foundUser;
  for (const u of memoryUsers.values()) {
    if (u.email === email) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser || !foundUser.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const isValid = await verifyPassword(params.password, foundUser.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  const workspace = memoryWorkspaces.get(foundUser.defaultWorkspaceId) || {
    id: foundUser.defaultWorkspaceId,
    name: `${foundUser.name}'s Workspace`,
    slug: "default",
    role: "owner" as const,
  };

  const token = createSessionToken({
    userId: foundUser.id,
    email: foundUser.email,
    name: foundUser.name,
    workspaceId: workspace.id,
    role: "owner",
  });

  return {
    user: {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      avatarUrl: foundUser.avatarUrl,
      defaultWorkspaceId: workspace.id,
      role: foundUser.role,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: "owner",
    },
    token,
  };
}

/**
 * Handles Google OAuth Single Sign-On login or registration.
 */
export async function authenticateWithGoogle(params: {
  email: string;
  name: string;
  avatarUrl?: string;
}): Promise<AuthResult> {
  const email = params.email.toLowerCase().trim();

  // Try MongoDB
  try {
    const conn = await connectToDatabase();
    if (conn && isMongoConnected()) {
      const user = await UserModel.findOne({ email });

      if (!user) {
        // Register new Google user
        return await registerUser({
          email,
          name: params.name,
          avatarUrl: params.avatarUrl,
          provider: "google",
        });
      }

      // Existing user: ensure "google" is in providers
      if (!user.providers.includes("google")) {
        user.providers.push("google");
        await user.save();
      }

      const workspace = await WorkspaceModel.findById(user.defaultWorkspaceId).lean<IWorkspace>();
      const workspaceId = workspace ? workspace._id.toString() : user.defaultWorkspaceId;
      const workspaceName = workspace ? workspace.name : `${user.name}'s Workspace`;
      const workspaceSlug = workspace ? workspace.slug : "default-workspace";

      const token = createSessionToken({
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        workspaceId,
        role: "owner",
      });

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          defaultWorkspaceId: workspaceId,
          role: user.role,
        },
        workspace: {
          id: workspaceId,
          name: workspaceName,
          slug: workspaceSlug,
          role: "owner",
        },
        token,
      };
    }
  } catch (err) {
    console.warn("[UserService] MongoDB Google auth error, using fallback:", err);
  }

  // Memory fallback
  for (const u of memoryUsers.values()) {
    if (u.email === email) {
      const workspace = memoryWorkspaces.get(u.defaultWorkspaceId) || {
        id: u.defaultWorkspaceId,
        name: `${u.name}'s Workspace`,
        slug: "default",
      };
      const token = createSessionToken({
        userId: u.id,
        email: u.email,
        name: u.name,
        workspaceId: workspace.id,
        role: "owner",
      });
      return {
        user: {
          id: u.id,
          email: u.email,
          name: u.name,
          avatarUrl: u.avatarUrl,
          defaultWorkspaceId: workspace.id,
          role: u.role,
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          role: "owner",
        },
        token,
      };
    }
  }

  return await registerUser({
    email,
    name: params.name,
    avatarUrl: params.avatarUrl,
    provider: "google",
  });
}
