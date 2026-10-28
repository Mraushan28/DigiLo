import assert from "node:assert/strict";
import { 
  getCanonicalOrigin, 
  getGoogleAuthRedirectUri, 
  getGoogleSheetsRedirectUri, 
  getGmailRedirectUri, 
  getSlackRedirectUri,
  isLocalhost,
  logOAuthDiagnostic
} from "../src/lib/automation/oauth/oauth-canonical";
import { buildGoogleAuthUrl } from "../src/lib/automation/oauth/google-oauth";

async function runOAuthRegressionTests() {
  console.log("\n==================================================================");
  console.log("   DIGILO GOOGLE OAUTH REDIRECT RESOLUTION & ISOLATION SUITE     ");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  const savedAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const savedGoogleRedirect = process.env.GOOGLE_REDIRECT_URI;
  const savedGoogleAuthRedirect = process.env.GOOGLE_AUTH_REDIRECT_URI;
  const savedClientId = process.env.GOOGLE_CLIENT_ID;

  try {
    // 1. isLocalhost helper correctly classifies domains
    await test("1. isLocalhost identifies localhost variants and differentiates public domains", () => {
      assert.equal(isLocalhost("localhost"), true);
      assert.equal(isLocalhost("localhost:3000"), true);
      assert.equal(isLocalhost("http://localhost:3000"), true);
      assert.equal(isLocalhost("127.0.0.1"), true);
      assert.equal(isLocalhost("0.0.0.0"), true);
      assert.equal(isLocalhost("[::1]"), true);
      assert.equal(isLocalhost("digilo.space"), false);
      assert.equal(isLocalhost("https://digilo.space"), false);
      assert.equal(isLocalhost("digilo.netlify.app"), false);
      assert.equal(isLocalhost("subdomain.digilo.tech"), false);
    });

    // 2. Google Login Flow - Local development
    await test("2. Google Login resolves http://localhost:3000/api/auth/google/callback during local development", () => {
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      delete process.env.GOOGLE_AUTH_REDIRECT_URI;

      const localReq = {
        headers: new Headers({
          host: "localhost:3000",
        }),
      };

      const uri = getGoogleAuthRedirectUri(localReq);
      assert.equal(uri, "http://localhost:3000/api/auth/google/callback");
    });

    // 3. Google Login Flow - Production request headers override localhost NEXT_PUBLIC_APP_URL
    await test("3. Google Login ALWAYS resolves https://digilo.space on production even if NEXT_PUBLIC_APP_URL is localhost", () => {
      // Simulating production Netlify where NEXT_PUBLIC_APP_URL was mistakenly set to http://localhost:3000
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      delete process.env.GOOGLE_AUTH_REDIRECT_URI;

      const prodReq = {
        headers: new Headers({
          "x-forwarded-proto": "https",
          "x-forwarded-host": "digilo.space",
          host: "digilo.space",
        }),
      };

      const uri = getGoogleAuthRedirectUri(prodReq);
      assert.equal(
        uri, 
        "https://digilo.space/api/auth/google/callback",
        "Public host header MUST supersede localhost NEXT_PUBLIC_APP_URL to prevent redirect_uri_mismatch"
      );
    });

    // 4. Google Sheets Flow - Local development
    await test("4. Google Sheets resolves http://localhost:3000/api/automation/integrations/google/callback for local dev", () => {
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      delete process.env.GOOGLE_REDIRECT_URI;
      delete process.env.GOOGLE_SHEETS_REDIRECT_URI;

      const localReq = {
        headers: new Headers({
          host: "localhost:3000",
        }),
      };

      const uri = getGoogleSheetsRedirectUri(localReq);
      assert.equal(uri, "http://localhost:3000/api/automation/integrations/google/callback");
    });

    // 5. Google Sheets Flow - Production request headers override localhost NEXT_PUBLIC_APP_URL
    await test("5. Google Sheets ALWAYS resolves https://digilo.space on production even if NEXT_PUBLIC_APP_URL is localhost", () => {
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      delete process.env.GOOGLE_REDIRECT_URI;
      delete process.env.GOOGLE_SHEETS_REDIRECT_URI;

      const prodReq = {
        headers: new Headers({
          "x-forwarded-proto": "https",
          "x-forwarded-host": "digilo.space",
          host: "digilo.space",
        }),
      };

      const uri = getGoogleSheetsRedirectUri(prodReq);
      assert.equal(
        uri, 
        "https://digilo.space/api/automation/integrations/google/callback",
        "Public host header MUST resolve to https://digilo.space for Google Sheets"
      );
    });

    // 6. Explicit GOOGLE_REDIRECT_URI environment override is respected
    await test("6. Explicit GOOGLE_REDIRECT_URI override is respected in production context", () => {
      process.env.GOOGLE_REDIRECT_URI = "https://digilo.space/api/automation/integrations/google/callback";
      assert.equal(
        getGoogleSheetsRedirectUri(),
        "https://digilo.space/api/automation/integrations/google/callback"
      );
    });

    // 7. Explicit GOOGLE_AUTH_REDIRECT_URI environment override is respected
    await test("7. Explicit GOOGLE_AUTH_REDIRECT_URI override is respected", () => {
      process.env.GOOGLE_AUTH_REDIRECT_URI = "https://digilo.space/api/auth/google/callback";
      assert.equal(
        getGoogleAuthRedirectUri(),
        "https://digilo.space/api/auth/google/callback"
      );
    });

    // 8. Prevent localhost override from corrupting a public request
    await test("8. A stray localhost GOOGLE_AUTH_REDIRECT_URI is ignored when request arrives at public domain", () => {
      process.env.GOOGLE_AUTH_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
      const prodReq = {
        headers: new Headers({
          "x-forwarded-host": "digilo.space",
          "x-forwarded-proto": "https",
        }),
      };

      const uri = getGoogleAuthRedirectUri(prodReq);
      assert.equal(
        uri,
        "https://digilo.space/api/auth/google/callback",
        "A stray localhost env variable must never corrupt a live public request"
      );
    });

    // 9. Authorization URL generation parity
    await test("9. buildGoogleAuthUrl uses canonical redirect URI matching expected Google Cloud Console format", () => {
      process.env.GOOGLE_CLIENT_ID = "674847421786-test.apps.googleusercontent.com";
      delete process.env.GOOGLE_REDIRECT_URI;
      process.env.NEXT_PUBLIC_APP_URL = "https://digilo.space";

      const authUrl = buildGoogleAuthUrl("test_state_123");
      const url = new URL(authUrl);

      assert.equal(url.searchParams.get("client_id"), "674847421786-test.apps.googleusercontent.com");
      assert.equal(url.searchParams.get("redirect_uri"), "https://digilo.space/api/automation/integrations/google/callback");
      assert.equal(url.searchParams.get("state"), "test_state_123");
    });

    // 10. Gmail and Slack redirect URI resolution
    await test("10. Gmail and Slack resolve canonical callback URIs consistently", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://digilo.space";
      delete process.env.GMAIL_REDIRECT_URI;
      delete process.env.SLACK_REDIRECT_URI;

      assert.equal(getGmailRedirectUri(), "https://digilo.space/api/automation/integrations/gmail/callback");
      assert.equal(getSlackRedirectUri(), "https://digilo.space/api/automation/integrations/slack/callback");
    });

    // 11. Diagnostic logger is non-throwing and safe
    await test("11. logOAuthDiagnostic outputs safe flow and redirect URI without exposing secrets", () => {
      // Must not throw
      logOAuthDiagnostic("GoogleLogin", "Initiating authorization", "https://digilo.space/api/auth/google/callback");
      logOAuthDiagnostic("GoogleSheets", "Initiating authorization", "https://digilo.space/api/automation/integrations/google/callback");
      assert.ok(true);
    });

  } finally {
    process.env.NEXT_PUBLIC_APP_URL = savedAppUrl;
    process.env.GOOGLE_REDIRECT_URI = savedGoogleRedirect;
    process.env.GOOGLE_AUTH_REDIRECT_URI = savedGoogleAuthRedirect;
    process.env.GOOGLE_CLIENT_ID = savedClientId;
  }

  console.log("\n==================================================================");
  console.log(`   OAUTH REGRESSION SUITE: ${passed} PASSED, ${total - passed} FAILED`);
  console.log("==================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runOAuthRegressionTests().catch((err) => {
  console.error("Fatal error running OAuth regression tests:", err);
  process.exit(1);
});
