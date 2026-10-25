import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// 1. Password & Session
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { createSessionToken, verifySessionToken, SessionPayload } from "../src/lib/auth/session";
import { registerUser, loginUser, authenticateWithGoogle } from "../src/lib/auth/user-service";

// 2. Draft preservation
import {
  createEncryptedDraftCookieValue,
  readEncryptedDraftCookieValue,
} from "../src/lib/automation/draft-session";
import { Workflow } from "../src/types/automation";

// 3. Vault & Storage
import {
  saveIntegrationRecord,
  getIntegrationRecord,
  migrateFileStoreToMongo,
} from "../src/lib/automation/storage/integration-store";
import { encryptToken, decryptToken } from "../src/lib/automation/crypto";

// 4. MongoDB Models
import {
  UserModel,
  WorkspaceModel,
  WorkflowModel,
  WorkflowVersionModel,
  ExecutionModel,
  MetricModel,
  IntegrationCredentialModel,
} from "../src/lib/mongodb/models";

async function runPhase2TestSuite() {
  console.log("=========================================================");
  console.log("   DIGILO PHASE 2: PERSISTENCE & MULTI-TENANT AUTH TESTS ");
  console.log("=========================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // ---------------------------------------------------------
  // SECTION 1: PASSWORD HASHING (SCRYPT)
  // ---------------------------------------------------------
  await test("1.1 Scrypt hashes password with unique salts", async () => {
    const password = "SuperSecretPassword123!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    assert.ok(hash1.includes(":"), "Hash must follow saltHex:derivedKeyHex format");
    assert.ok(hash2.includes(":"), "Hash must follow saltHex:derivedKeyHex format");
    assert.notEqual(hash1, hash2, "Two hashes of same password must differ due to unique salts");
  });

  await test("1.2 Password verification succeeds on match and rejects mismatch", async () => {
    const password = "CorrectHorseBatteryStaple!";
    const hash = await hashPassword(password);

    const match = await verifyPassword(password, hash);
    assert.equal(match, true, "Valid password should verify as true");

    const mismatch = await verifyPassword("WrongPassword!", hash);
    assert.equal(mismatch, false, "Invalid password should verify as false");
  });

  // ---------------------------------------------------------
  // SECTION 2: SESSION MANAGEMENT (HMAC-SHA256 SIGNED)
  // ---------------------------------------------------------
  await test("2.1 Creates tamper-proof signed session token", () => {
    const payload: Omit<SessionPayload, "exp"> = {
      userId: "usr_test123",
      email: "test@digilo.tech",
      name: "Test User",
      workspaceId: "ws_test_tenant",
      role: "owner",
    };

    const token = createSessionToken(payload);
    assert.ok(token.includes("."), "Session token must be separated by dot");

    const verified = verifySessionToken(token);
    assert.ok(verified, "Session token must verify successfully");
    assert.equal(verified?.userId, "usr_test123");
    assert.equal(verified?.workspaceId, "ws_test_tenant");
    assert.equal(verified?.role, "owner");
  });

  await test("2.2 Rejects tampered session tokens", () => {
    const payload: Omit<SessionPayload, "exp"> = {
      userId: "usr_alice",
      email: "alice@digilo.tech",
      name: "Alice",
      workspaceId: "ws_alice",
      role: "owner",
    };

    const token = createSessionToken(payload);
    const [, sig] = token.split(".");

    // Tamper payload body to escalate to admin
    const tamperedBody = Buffer.from(
      JSON.stringify({ ...payload, workspaceId: "ws_victim_tenant", exp: Date.now() + 100000 })
    ).toString("base64url");

    const tamperedToken = `${tamperedBody}.${sig}`;
    const verified = verifySessionToken(tamperedToken);
    assert.equal(verified, null, "Tampered session payload must be rejected");
  });

  // ---------------------------------------------------------
  // SECTION 3: MULTI-TENANT USER SERVICE & WORKSPACE PROVISIONING
  // ---------------------------------------------------------
  const testEmail = `tenant_${Date.now()}@example.com`;
  let registeredWorkspaceId = "";

  await test("3.1 Registers new user and provisions tenant workspace", async () => {
    const result = await registerUser({
      email: testEmail,
      password: "StrongPassword123!",
      name: "Acme Corp Admin",
    });

    assert.ok(result.user.id, "User must have an ID");
    assert.equal(result.user.email, testEmail);
    assert.ok(result.workspace.id, "Workspace must be provisioned");
    assert.equal(result.workspace.role, "owner");
    assert.ok(result.token, "Session token must be returned");

    registeredWorkspaceId = result.workspace.id;
  });

  await test("3.2 Prevents duplicate email registration", async () => {
    await assert.rejects(
      async () => {
        await registerUser({
          email: testEmail,
          password: "AnotherPassword123!",
          name: "Duplicate User",
        });
      },
      /already exists/i,
      "Duplicate registration should throw error"
    );
  });

  await test("3.3 Logs in registered user and resolves correct workspaceId", async () => {
    const loginResult = await loginUser({
      email: testEmail,
      password: "StrongPassword123!",
    });

    assert.equal(loginResult.user.email, testEmail);
    assert.equal(loginResult.workspace.id, registeredWorkspaceId, "Workspace ID must match registered workspace");
    assert.ok(loginResult.token);

    const session = verifySessionToken(loginResult.token);
    assert.equal(session?.workspaceId, registeredWorkspaceId, "Session token must bind to workspaceId");
  });

  await test("3.4 Google OAuth SSO authenticates and binds to tenant workspace", async () => {
    const googleEmail = `google_${Date.now()}@example.com`;
    const googleResult = await authenticateWithGoogle({
      email: googleEmail,
      name: "Google SSO User",
      avatarUrl: "https://example.com/avatar.png",
    });

    assert.equal(googleResult.user.email, googleEmail);
    assert.ok(googleResult.workspace.id);
    assert.ok(googleResult.token);

    // Subsequent login with same Google account returns same workspace
    const reAuth = await authenticateWithGoogle({
      email: googleEmail,
      name: "Google SSO User",
    });
    assert.equal(reAuth.workspace.id, googleResult.workspace.id, "Subsequent SSO must resolve same workspace");
  });

  // ---------------------------------------------------------
  // SECTION 4: UNAUTHENTICATED DRAFT PRESERVATION
  // ---------------------------------------------------------
  const sampleWorkflow: Workflow = {
    id: "wf_draft_test_1",
    name: "Draft Lead Pipeline",
    description: "Preserved unauthenticated workflow draft",
    status: "draft",
    trigger: {
      type: "webhook",
      source: "website",
      event: "lead.created",
      description: "Triggers on contact form submit",
      config: { path: "/lead", method: "POST" },
    },
    steps: [
      {
        id: "step_ai_1",
        name: "Analyze Lead",
        type: "action",
        action: "ai.analyze",
        description: "Qualify lead score",
        config: { systemPrompt: "Score lead from 1 to 10" },
      },
    ],
    required_integrations: ["Digilo Webhook", "OpenAI"],
    createdAt: new Date().toISOString(),
  };

  await test("4.1 Encrypts draft workflow into session cookie (AES-256-GCM)", () => {
    const cookieValue = createEncryptedDraftCookieValue(sampleWorkflow);
    assert.ok(cookieValue, "Cookie value must be generated");
    assert.ok(cookieValue.includes(":"), "Must be in iv:authTag:cipher format");

    // Decrypt
    const decrypted = readEncryptedDraftCookieValue(cookieValue);
    assert.ok(decrypted, "Decrypted workflow must not be null");
    assert.equal(decrypted?.name, sampleWorkflow.name);
    assert.equal(decrypted?.steps.length, 1);
    assert.equal(decrypted?.steps[0].action, "ai.analyze");
  });

  await test("4.2 Rejects corrupted or invalid draft cookies", () => {
    const corrupted = "corrupted_payload.invalid_tag.invalid_ciphertext";
    const result = readEncryptedDraftCookieValue(corrupted);
    assert.equal(result, null, "Corrupted draft cookie must safely return null without throwing");
  });

  // ---------------------------------------------------------
  // SECTION 5: VAULT MIGRATION & MULTI-TENANT ISOLATION
  // ---------------------------------------------------------
  await test("5.1 Encrypts and stores integration credentials per workspaceId", async () => {
    const wsA = "ws_tenant_alpha";
    const wsB = "ws_tenant_beta";

    await saveIntegrationRecord({
      workspaceId: wsA,
      provider: "slack",
      status: "connected",
      account: {
        accountId: "team_alpha",
        name: "Alpha Slack Team",
        connectedAt: new Date().toISOString(),
      },
      encryptedTokens: {
        accessTokenCipher: encryptToken("xoxb-alpha-token-secret"),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Check workspace A has credentials
    const recA = await getIntegrationRecord(wsA, "slack");
    assert.ok(recA, "Workspace A must have record");
    assert.equal(recA?.account?.accountId, "team_alpha");
    assert.equal(decryptToken(recA?.encryptedTokens.accessTokenCipher || ""), "xoxb-alpha-token-secret");

    // Check workspace B is strictly isolated
    const recB = await getIntegrationRecord(wsB, "slack");
    assert.equal(recB, null, "Workspace B must NOT see Workspace A credentials");
  });

  await test("5.2 Filesystem vault migration function executes safely", async () => {
    const result = await migrateFileStoreToMongo();
    assert.ok(typeof result === "number", "Migrated count must be a number");
  });

  // ---------------------------------------------------------
  // SECTION 6: MONGODB SCHEMAS VALIDATION
  // ---------------------------------------------------------
  await test("6.1 All required Mongoose models are properly provisioned", () => {
    assert.ok(UserModel.modelName, "UserModel exists");
    assert.ok(WorkspaceModel.modelName, "WorkspaceModel exists");
    assert.ok(WorkflowModel.modelName, "WorkflowModel exists");
    assert.ok(WorkflowVersionModel.modelName, "WorkflowVersionModel exists");
    assert.ok(ExecutionModel.modelName, "ExecutionModel exists");
    assert.ok(MetricModel.modelName, "MetricModel exists");
    assert.ok(IntegrationCredentialModel.modelName, "IntegrationCredentialModel exists");

    // Verify tenant indexing
    const workflowIndexes = WorkflowModel.schema.indexes();
    const hasWorkspaceIndex = workflowIndexes.some((idx) => {
      const fields = idx[0] as Record<string, number>;
      return fields && "workspaceId" in fields;
    });
    assert.ok(hasWorkspaceIndex, "Workflow schema must have compound index on workspaceId");
  });

  console.log("\n=========================================================");
  console.log(`   PHASE 2 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2TestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
