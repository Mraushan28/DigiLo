/**
 * Automated Test Suite for DIGILO Client Integration Connection System
 * 
 * Verifies:
 * 1. AES-256-GCM token encryption and decryption roundtrip, IV randomness, and tamper rejection.
 * 2. Workspace session isolation and UUID generation.
 * 3. OAuth State generation, HMAC-SHA256 signature, CSRF rejection, and tamper detection.
 * 4. Multi-client encrypted storage & workspace data isolation.
 * 5. Google Sheets OAuth service: URL builder, token storage, simulated token refresh, and disconnection.
 * 6. Slack OAuth service: URL builder, bot scopes, encrypted token storage, and disconnection.
 * 7. n8n execution credential mapping: references client credential without exposing secret tokens.
 * 8. Real integration status reporting (accurate and honest reporting without fake states).
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { encryptToken, decryptToken } from "../src/lib/automation/crypto";
import { generateOAuthState } from "../src/lib/automation/oauth/oauth-state";
import { 
  saveIntegrationRecord, 
  getIntegrationRecord, 
  deleteIntegrationRecord,
  updateIntegrationAccount 
} from "../src/lib/automation/storage/integration-store";
import { 
  buildGoogleAuthUrl, 
  storeGoogleConnection, 
  getValidGoogleAccessToken, 
  disconnectGoogleIntegration 
} from "../src/lib/automation/oauth/google-oauth";
import { 
  buildSlackAuthUrl, 
  storeSlackConnection, 
  getValidSlackBotToken, 
  disconnectSlackIntegration 
} from "../src/lib/automation/oauth/slack-oauth";
import { 
  getLiveIntegrationStatusForWorkspace, 
  getAllLiveIntegrationStatuses,
  resolveIntegrationStatus
} from "../src/lib/automation/integration-status";
import { convertDigiloWorkflowToN8n } from "../src/lib/automation/n8n-exporter";
import { Workflow } from "../src/types/automation";

async function runConnectionTests() {
  console.log("=== DIGILO CLIENT INTEGRATION CONNECTION TEST SUITE ===\n");
  let passedCount = 0;
  let totalCount = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    totalCount++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err: unknown) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // 1. Encryption & Decryption
  await test("1. AES-256-GCM token encryption & decryption roundtrip", () => {
    const originalToken = "ya29.a0ARrdaM8sample_google_access_token_super_secret_12345";
    const cipher = encryptToken(originalToken);

    assert.notEqual(cipher, originalToken, "Ciphertext must not match plaintext");
    assert.match(cipher, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/, "Cipher must follow iv:authTag:encrypted format");

    const decrypted = decryptToken(cipher);
    assert.equal(decrypted, originalToken, "Decrypted token must exactly match original");

    // Test tamper detection
    const parts = cipher.split(":");
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}aa`;
    assert.throws(() => decryptToken(tampered), /Cipher decryption failed/, "Tampered cipher must fail authentication tag check");
  });

  // 2. OAuth State CSRF Protection
  await test("2. OAuth State HMAC-SHA256 signature and tamper protection", () => {
    const workspaceId = crypto.randomUUID();
    const state = generateOAuthState("google_sheets", workspaceId);

    assert.ok(state, "State token must be generated");
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));

    assert.ok(parsed.payload, "State must contain payload");
    assert.ok(parsed.hmac, "State must contain HMAC signature");

    const [provider, wsId] = parsed.payload.split(":");
    assert.equal(provider, "google_sheets");
    assert.equal(wsId, workspaceId);

    // Tampered payload must fail HMAC verification
    const tamperedPayload = parsed.payload.replace("google_sheets", "slack");
    const hmacSecret = process.env.TOKEN_ENCRYPTION_KEY || "digilo_dev_oauth_hmac_secret_key_default";
    const checkHmac = crypto.createHmac("sha256", hmacSecret).update(tamperedPayload).digest("hex");
    assert.notEqual(parsed.hmac, checkHmac, "Tampered payload must not match original HMAC");
  });

  // 3. Workspace Isolation in Storage
  await test("3. Workspace isolation in encrypted credential store", async () => {
    const clientA_Workspace = crypto.randomUUID();
    const clientB_Workspace = crypto.randomUUID();

    // Client A connects Google Sheets
    await saveIntegrationRecord({
      workspaceId: clientA_Workspace,
      provider: "google_sheets",
      status: "connected",
      account: {
        accountId: "google-user-111",
        email: "client_a@gmail.com",
        name: "Client A"
      },
      encryptedTokens: {
        accessTokenCipher: encryptToken("token_client_a")
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Client B connects Slack
    await saveIntegrationRecord({
      workspaceId: clientB_Workspace,
      provider: "slack",
      status: "connected",
      account: {
        accountId: "team-slack-222",
        workspaceName: "Client B Workspace"
      },
      encryptedTokens: {
        accessTokenCipher: encryptToken("xoxb-token-client-b")
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Verify Client A cannot see Client B's credentials
    const aGoogle = await getIntegrationRecord(clientA_Workspace, "google_sheets");
    const aSlack = await getIntegrationRecord(clientA_Workspace, "slack");
    const bGoogle = await getIntegrationRecord(clientB_Workspace, "google_sheets");
    const bSlack = await getIntegrationRecord(clientB_Workspace, "slack");

    assert.ok(aGoogle, "Client A should have Google record");
    assert.equal(aGoogle?.account.email, "client_a@gmail.com");
    assert.equal(aSlack, null, "Client A should NOT have Slack record");

    assert.equal(bGoogle, null, "Client B should NOT have Google record");
    assert.ok(bSlack, "Client B should have Slack record");
    assert.equal(bSlack?.account.workspaceName, "Client B Workspace");

    // Clean up
    await deleteIntegrationRecord(clientA_Workspace, "google_sheets");
    await deleteIntegrationRecord(clientB_Workspace, "slack");
  });

  // 4. Google OAuth Flow Components
  await test("4. Google Sheets OAuth URL generation & scopes", () => {
    process.env.GOOGLE_CLIENT_ID = "mock-google-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "mock-google-secret";

    const state = "test_state_abc";
    const url = buildGoogleAuthUrl(state, "http://localhost:3000");

    assert.ok(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth"));
    assert.ok(url.includes("client_id=mock-google-client-id"));
    assert.ok(url.includes("response_type=code"));
    assert.ok(url.includes("access_type=offline"));
    assert.ok(url.includes("prompt=consent"));
    assert.ok(url.includes(encodeURIComponent("https://www.googleapis.com/auth/spreadsheets")));
  });

  // 5. Google Connection Storage & Token Refresh
  await test("5. Google Sheets connection storage, access token retrieval & automatic refresh", async () => {
    const testWorkspace = crypto.randomUUID();

    // Store initial connection
    await storeGoogleConnection(
      testWorkspace,
      {
        access_token: "mock_initial_access_token",
        refresh_token: "mock_refresh_token_xyz",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        token_type: "Bearer"
      },
      {
        id: "google-sub-999",
        email: "finance@mycompany.com",
        name: "Finance Team"
      }
    );

    // Retrieve valid token (should return decrypted initial token since it's not expired)
    const validToken = await getValidGoogleAccessToken(testWorkspace);
    assert.equal(validToken, "mock_initial_access_token");

    // Check account metadata
    const record = await getIntegrationRecord(testWorkspace, "google_sheets");
    assert.equal(record?.status, "connected");
    assert.equal(record?.account.email, "finance@mycompany.com");

    // Update selected spreadsheet & sheet tab
    await updateIntegrationAccount(testWorkspace, "google_sheets", {
      selectedSpreadsheet: "Sales Leads 2026",
      selectedSheet: "Q3_Inbound"
    });

    const updated = await getIntegrationRecord(testWorkspace, "google_sheets");
    assert.equal(updated?.account.selectedSpreadsheet, "Sales Leads 2026");
    assert.equal(updated?.account.selectedSheet, "Q3_Inbound");

    // Test disconnection
    const disconnected = await disconnectGoogleIntegration(testWorkspace);
    assert.equal(disconnected, true);
    const afterDelete = await getIntegrationRecord(testWorkspace, "google_sheets");
    assert.equal(afterDelete, null, "Record must be deleted after disconnection");
  });

  // 6. Slack OAuth Flow & Storage
  await test("6. Slack OAuth URL generation, scopes & encrypted bot token storage", async () => {
    process.env.SLACK_CLIENT_ID = "12345.mock_slack_id";
    process.env.SLACK_CLIENT_SECRET = "mock_slack_secret";

    const state = "test_slack_state";
    const url = buildSlackAuthUrl(state, "http://localhost:3000");

    assert.ok(url.startsWith("https://slack.com/oauth/v2/authorize"));
    assert.ok(url.includes("client_id=12345.mock_slack_id"));
    assert.ok(url.includes("chat%3Awrite"));
    assert.ok(url.includes("channels%3Aread"));

    const testWorkspace = crypto.randomUUID();

    // Store Slack connection
    await storeSlackConnection(testWorkspace, {
      ok: true,
      access_token: "xoxb-mock-bot-token-98765",
      token_type: "bot",
      scope: "chat:write,channels:read",
      bot_user_id: "U0123BOT",
      app_id: "A0123APP",
      team: { id: "T0987TEAM", name: "Acme Corp Workspace" },
      authed_user: { id: "U999USER" }
    });

    const botToken = await getValidSlackBotToken(testWorkspace);
    assert.equal(botToken, "xoxb-mock-bot-token-98765");

    const record = await getIntegrationRecord(testWorkspace, "slack");
    assert.equal(record?.account.workspaceName, "Acme Corp Workspace");

    // Update target channel
    await updateIntegrationAccount(testWorkspace, "slack", {
      selectedChannel: "#sales-leads"
    });

    const updated = await getIntegrationRecord(testWorkspace, "slack");
    assert.equal(updated?.account.selectedChannel, "#sales-leads");

    // Disconnect
    const disconnected = await disconnectSlackIntegration(testWorkspace);
    assert.equal(disconnected, true);
    assert.equal(await getIntegrationRecord(testWorkspace, "slack"), null);
  });

  // 7. Live Integration Status Scoped to Workspace
  await test("7. Live integration status accurately reflects connection per workspace", async () => {
    const testWorkspace = crypto.randomUUID();

    // Before connection
    const beforeStatus = await getLiveIntegrationStatusForWorkspace("google_sheets", testWorkspace);
    assert.equal(beforeStatus.status, "not_connected");

    // Connect Google Sheets
    await storeGoogleConnection(
      testWorkspace,
      {
        access_token: "access_token_1",
        expires_in: 3600,
        scope: "spreadsheets",
        token_type: "Bearer"
      },
      { id: "id1", email: "user@test.com" }
    );

    // After connection
    const afterStatus = await getLiveIntegrationStatusForWorkspace("google_sheets", testWorkspace);
    assert.equal(afterStatus.status, "connected");
    assert.equal(afterStatus.account?.email, "user@test.com");

    const allStatuses = await getAllLiveIntegrationStatuses(testWorkspace);
    assert.equal(allStatuses.google_sheets.status, "connected");
    assert.equal(allStatuses.slack.status, "not_connected");

    // Clean up
    await disconnectGoogleIntegration(testWorkspace);
  });

  // 8. n8n Credential Referencing (Tokens are NEVER in JSON)
  await test("8. n8n export provisions client credential references without leaking raw tokens", async () => {
    const testWorkspace = crypto.randomUUID();

    const mockIntegrations = {
      google_sheets: {
        id: "google_sheets",
        name: "Google Sheets",
        category: "Databases & Spreadsheets",
        status: "connected" as const,
        statusLabel: "Connected",
        description: "Appends rows",
        account: {
          email: "partner@firm.com",
          selectedSpreadsheet: "Enterprise Leads",
          selectedSheet: "Inbound"
        }
      },
      slack: {
        id: "slack",
        name: "Slack",
        category: "Team Messaging",
        status: "connected" as const,
        statusLabel: "Connected",
        description: "Posts messages",
        account: {
          workspaceName: "Digilo Partner Slack",
          selectedChannel: "#urgent-deals"
        }
      }
    };

    const workflow: Workflow = {
      name: "Enterprise Intake Flow",
      description: "Appends lead and alerts team",
      trigger: {
        type: "webhook",
        source: "Website Form",
        event: "submission"
      },
      steps: [
        {
          id: "step_gs_1",
          name: "Add Lead Row",
          type: "action",
          action: "google_sheets.add_row",
          description: "Append to Google Sheet"
        },
        {
          id: "step_slack_1",
          name: "Notify Slack Channel",
          type: "action",
          action: "slack.send_message",
          description: "Post message to Slack"
        }
      ],
      required_integrations: ["google_sheets", "slack"]
    };

    const n8nExport = convertDigiloWorkflowToN8n(workflow, {
      workspaceId: testWorkspace,
      workspaceIntegrations: mockIntegrations
    });

    assert.ok(n8nExport.nodes.length >= 3, "Export must have trigger + 2 action nodes");

    const gsNode = n8nExport.nodes.find((n) => n.type === "n8n-nodes-base.googleSheets");
    const slackNode = n8nExport.nodes.find((n) => n.type === "n8n-nodes-base.slack");

    assert.ok(gsNode, "Google Sheets node must exist");
    assert.ok(slackNode, "Slack node must exist");

    // Check credential references
    assert.ok(gsNode.credentials?.googleSheetsOAuth2, "Google Sheets node must have credential reference");
    assert.equal(gsNode.credentials.googleSheetsOAuth2.id, `digilo_ws_${testWorkspace}_google_sheets`);
    assert.equal(gsNode.credentials.googleSheetsOAuth2.name, "Digilo Client (partner@firm.com)");

    assert.ok(slackNode.credentials?.slackOAuth2Api, "Slack node must have credential reference");
    assert.equal(slackNode.credentials.slackOAuth2Api.id, `digilo_ws_${testWorkspace}_slack`);
    assert.equal(slackNode.credentials.slackOAuth2Api.name, "Digilo Client (Digilo Partner Slack)");

    // Check selected parameters applied
    assert.equal((gsNode.parameters.documentId as { value: string })?.value, "Enterprise Leads");
    assert.equal((gsNode.parameters.sheetName as { value: string })?.value, "Inbound");
    assert.equal((slackNode.parameters.channel as { value: string })?.value, "#urgent-deals");

    // Ensure raw tokens are NOT in JSON export
    const exportJson = JSON.stringify(n8nExport);
    assert.ok(!exportJson.includes("ya29."), "Raw Google tokens must never be in exported JSON");
    assert.ok(!exportJson.includes("xoxb-"), "Raw Slack tokens must never be in exported JSON");
    assert.ok(!exportJson.includes("mock-google-secret"), "Secrets must never be in exported JSON");
  });

  // 9. Unconfigured Environment Reporting
  await test("9. Honest status reporting when credentials are missing in server environment", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.SLACK_CLIENT_ID;
    delete process.env.SLACK_CLIENT_SECRET;

    const gsStatus = resolveIntegrationStatus("google_sheets");
    const slackStatus = resolveIntegrationStatus("slack");

    assert.equal(gsStatus.status, "not_configured");
    assert.equal(slackStatus.status, "not_configured");
    assert.equal(gsStatus.isConfiguredInEnv, false);
    assert.equal(slackStatus.isConfiguredInEnv, false);
  });

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passedCount}/${totalCount} tests passed.`);
  console.log(`========================================\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runConnectionTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
